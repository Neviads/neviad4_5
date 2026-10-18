#!/usr/bin/env bash
set -Eeuo pipefail

# Deploy source over SSH, then let Coolify build and manage it.
# Run in Git Bash/WSL: ./scripts/deploy-vps.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[[ -f "$ROOT_DIR/.deploy.env" ]] && source "$ROOT_DIR/.deploy.env"

VPS_HOST="${VPS_HOST:-103.72.56.152}"
VPS_USER="${VPS_USER:-root}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/p036_vps}"
REMOTE_DIR="${REMOTE_DIR:-/opt/p036}"
APP_HOST="${APP_HOST:-$VPS_HOST}"
DEPLOY_TIMEOUT_SECONDS="${DEPLOY_TIMEOUT_SECONDS:-900}"
DEPLOY_POLL_SECONDS="${DEPLOY_POLL_SECONDS:-5}"
COOLIFY_URL="${COOLIFY_URL:-http://${VPS_HOST}:8000}"
COOLIFY_SERVICE_UUID="${COOLIFY_SERVICE_UUID:-nc0o0ookscsk448soo80ggc0}"
PUBLIC_FRONTEND_URL="${PUBLIC_FRONTEND_URL:-http://neviad4.${VPS_HOST}.sslip.io}"
PUBLIC_BACKEND_URL="${PUBLIC_BACKEND_URL:-http://api-neviad4.${VPS_HOST}.sslip.io}"
PUBLIC_BACKEND_WS_URL="${PUBLIC_BACKEND_WS_URL:-ws://api-neviad4.${VPS_HOST}.sslip.io/ws}"
PUSH_APP_ENV="${PUSH_APP_ENV:-true}"
ARCHIVE="$(mktemp "${TMPDIR:-/tmp}/p036.XXXXXX.tar.gz")"

log() {
    printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

cleanup() { rm -f "$ARCHIVE"; }
on_error() {
    local status=$?
    printf '\n[ERROR] Deployment stopped at line %s (exit %s).\n' "$1" "$status" >&2
    exit "$status"
}

trap cleanup EXIT
trap 'on_error $LINENO' ERR

for command in ssh scp tar curl base64 node; do
    command -v "$command" >/dev/null || { echo "Missing: $command" >&2; exit 1; }
done
[[ -f "$SSH_KEY" ]] || { echo "SSH key not found: $SSH_KEY" >&2; exit 1; }
[[ -n "${COOLIFY_TOKEN:-}" ]] || { echo "COOLIFY_TOKEN missing in .deploy.env" >&2; exit 1; }
if [[ "$PUSH_APP_ENV" == "true" && ! -f "$ROOT_DIR/.env" ]]; then
    echo "Missing $ROOT_DIR/.env. Create it or run with PUSH_APP_ENV=false to keep the VPS environment file." >&2
    exit 1
fi

log "1/5 Checking SSH access to ${VPS_USER}@${VPS_HOST}"
ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "${VPS_USER}@${VPS_HOST}" 'exit 0' || {
    echo "SSH access failed; nothing was uploaded." >&2; exit 1;
}
log "SSH access confirmed"

log "2/5 Packing source files"
tar --exclude=.git --exclude=.deploy.env --exclude=.env --exclude=be/.env \
    --exclude=fe/.env.local --exclude=fe/.env.production --exclude=fe/node_modules \
    --exclude=fe/.next --exclude=be/target \
    -C "$ROOT_DIR" -czf "$ARCHIVE" .
log "Archive ready: $(du -h "$ARCHIVE" | awk '{print $1}')"

log "3/5 Uploading source to ${REMOTE_DIR}"
scp -i "$SSH_KEY" "$ARCHIVE" "${VPS_USER}@${VPS_HOST}:/tmp/p036-deploy.tar.gz"
if [[ "$PUSH_APP_ENV" == "true" ]]; then
    log "Uploading application environment file (.env)"
    scp -i "$SSH_KEY" "$ROOT_DIR/.env" "${VPS_USER}@${VPS_HOST}:/tmp/p036-app.env"
fi

log "4/5 Preparing source and Dockerfiles on VPS"
ssh -i "$SSH_KEY" "${VPS_USER}@${VPS_HOST}" \
    "REMOTE_DIR='$REMOTE_DIR' PUSH_APP_ENV='$PUSH_APP_ENV' bash -s" <<'REMOTE'
set -Eeuo pipefail
mkdir -p "$REMOTE_DIR"
find "$REMOTE_DIR" -mindepth 1 -maxdepth 1 ! -name .env -exec rm -rf {} +
tar -xzf /tmp/p036-deploy.tar.gz -C "$REMOTE_DIR"
rm -f /tmp/p036-deploy.tar.gz
if [[ "$PUSH_APP_ENV" == "true" ]]; then
  install -m 600 /tmp/p036-app.env "$REMOTE_DIR/.env"
  rm -f /tmp/p036-app.env
elif [[ ! -f "$REMOTE_DIR/.env" ]]; then
  db_password="$(openssl rand -hex 24)"; jwt_secret="$(openssl rand -hex 32)"
  cat >"$REMOTE_DIR/.env" <<EOF
POSTGRES_DB=neviad
POSTGRES_USER=neviad
POSTGRES_PASSWORD=$db_password
DB_URL=jdbc:postgresql://db:5432/neviad
DB_USERNAME=neviad
DB_PASSWORD=$db_password
FLYWAY_ENABLED=true
APP_PORT=8080
APP_ARTIFACT_BROWSER_ENABLED=false
APP_AUTH_JWT_SECRET=$jwt_secret
APP_AI_OPENAI_API_KEY=
APP_AI_DEEPSEEK_API_KEY=
EOF
  chmod 600 "$REMOTE_DIR/.env"
fi
cat >>"$REMOTE_DIR/.env" <<EOF
EOF
cat >"$REMOTE_DIR/be/Dockerfile" <<'EOF'
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY be/pom.xml .
RUN mvn -B -q dependency:go-offline
COPY be/src ./src
RUN mvn -B -q -DskipTests package
# The agents' check gates are Node scripts of fe/ (typescript, konva, sharp); the backend runs them from /app/fe.
FROM node:22-bookworm-slim AS fe-tools
WORKDIR /app/fe
COPY fe/package.json fe/package-lock.json ./
RUN npm ci --ignore-scripts
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=fe-tools /app/fe/node_modules /app/fe/node_modules
COPY fe/package.json /app/fe/package.json
COPY fe/scripts /app/fe/scripts
COPY fe/lib/assembly /app/fe/lib/assembly
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
EOF
cat >"$REMOTE_DIR/fe/Dockerfile" <<'EOF'
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
RUN npm run build
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
EOF
REMOTE

log "Source prepared. Updating Coolify Compose configuration"

compose="$(cat <<EOF
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    env_file: $REMOTE_DIR/.env
    volumes: [p036-coolify-postgres:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 10
  backend:
    build: {context: $REMOTE_DIR, dockerfile: be/Dockerfile}
    restart: unless-stopped
    env_file: $REMOTE_DIR/.env
    environment:
      APP_CORS_ALLOWED_ORIGINS: $PUBLIC_FRONTEND_URL
      APP_PIPELINE_FE_ROOT: /app/fe
      SERVICE_URL_BACKEND_8080: /
    depends_on: {db: {condition: service_healthy}}
  frontend:
    build:
      context: $REMOTE_DIR/fe
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: $PUBLIC_BACKEND_URL
        NEXT_PUBLIC_WS_URL: $PUBLIC_BACKEND_WS_URL
    restart: unless-stopped
    environment:
      SERVICE_URL_FRONTEND_3000: /
    depends_on: [backend]
volumes:
  p036-coolify-postgres:
EOF
)"
compose_base64="$(printf '%s' "$compose" | base64 | tr -d '\r\n')"

log "5/5 Requesting a Coolify deployment for service ${COOLIFY_SERVICE_UUID}"
curl --fail-with-body --silent --show-error -X PATCH \
  -H "Authorization: Bearer $COOLIFY_TOKEN" -H 'Content-Type: application/json' \
  --data "{\"docker_compose_raw\":\"$compose_base64\",\"instant_deploy\":false,\"urls\":[{\"name\":\"frontend\",\"url\":\"$PUBLIC_FRONTEND_URL:3000\"},{\"name\":\"backend\",\"url\":\"$PUBLIC_BACKEND_URL:8080\"}]}" \
  "$COOLIFY_URL/api/v1/services/$COOLIFY_SERVICE_UUID" >/dev/null

log "Compose saved. Sending deploy request to Coolify"
curl --fail-with-body --silent --show-error -X POST \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  "$COOLIFY_URL/api/v1/deploy?uuid=$COOLIFY_SERVICE_UUID&force=true"

deadline=$((SECONDS + DEPLOY_TIMEOUT_SECONDS))

http_status() {
  curl --connect-timeout 3 --max-time 5 --silent --output /dev/null \
    --write-out '%{http_code}' "$1" || true
}

log "Waiting for Coolify to finish (up to ${DEPLOY_TIMEOUT_SECONDS}s)"
while (( SECONDS < deadline )); do
  service_json="$(curl --fail-with-body --silent --show-error \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    "$COOLIFY_URL/api/v1/services/$COOLIFY_SERVICE_UUID")"
  frontend_url="$(printf '%s' "$service_json" | node -e 'let b="";process.stdin.on("data",d=>b+=d).on("end",()=>{const s=JSON.parse(b);const a=(s.applications||[]).find(x=>x.name==="frontend");process.stdout.write(a?.fqdn||"")})')"
  backend_url="$(printf '%s' "$service_json" | node -e 'let b="";process.stdin.on("data",d=>b+=d).on("end",()=>{const s=JSON.parse(b);const a=(s.applications||[]).find(x=>x.name==="backend");process.stdout.write(a?.fqdn||"")})')"
  # Coolify's FQDN includes the target container port; visitors use the proxy
  # on normal HTTP/HTTPS ports, not the container's internal port.
  frontend_url="${frontend_url/:3000/}"
  backend_url="${backend_url/:8080/}"
  frontend_status="000"
  backend_status="000"
  [[ -n "$frontend_url" ]] && frontend_status="$(http_status "$frontend_url")"
  [[ -n "$backend_url" ]] && backend_status="$(http_status "${backend_url%/}/api/health")"
  if [[ "$frontend_status" == "200" && "$backend_status" == "200" ]]; then
    log "Web is ready"
    printf '\nFrontend: %s\nBackend health: %s/api/health\n' "$frontend_url" "${backend_url%/}"
    exit 0
  fi
  printf '[%s] Waiting: frontend HTTP %s, backend health HTTP %s\n' \
    "$(date '+%H:%M:%S')" "${frontend_status:-000}" "${backend_status:-000}"
  sleep "$DEPLOY_POLL_SECONDS"
done

printf '\n[ERROR] Coolify did not make the web reachable within %ss. Check p036-coolify logs in Coolify.\n' \
  "$DEPLOY_TIMEOUT_SECONDS" >&2
exit 1
