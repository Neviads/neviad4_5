#!/usr/bin/env bash
set -Eeuo pipefail

# Based on Neviad-system/scripts/start-fedora.sh: cloud-database launcher for Linux.
SKIP_BE=0
SKIP_FE=0
BE_PORT=""
FE_PORT=""

usage() {
    cat <<'EOF'
Usage: scripts/start.sh [--skip-be] [--skip-fe]
  --skip-be, -SkipBe   Skip the Python backend and database validation.
  --skip-fe, -SkipFe   Skip Next.js.
  -h, --help           Show this help.
EOF
}

for arg in "$@"; do
    case "$arg" in
        --skip-be|-SkipBe) SKIP_BE=1 ;;
        --skip-fe|-SkipFe) SKIP_FE=1 ;;
        -h|--help) usage; exit 0 ;;
        *) printf 'Unknown argument: %s\n' "$arg" >&2; usage >&2; exit 2 ;;
    esac
done

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
BE_DIR="$ROOT_DIR/be"
FE_DIR="$ROOT_DIR/fe"
BE_URL="http://localhost:$BE_PORT"
FE_URL="http://localhost:$FE_PORT"
LOG_DIR="${TMPDIR:-/tmp}/neviad-start-$$"
mkdir -p "$LOG_DIR"
BG_PIDS=()
BG_NAMES=()
TAIL_PIDS=()
TEARDOWN_DONE=0

step() { printf '\n\033[36m>>> %s\033[0m\n' "$1"; }
ok() { printf '\033[32m  [OK] %s\033[0m\n' "$1"; }
warn() { printf '\033[33m  [WARN] %s\033[0m\n' "$1"; }
fail() { printf '\033[31m  [ERROR] %s\033[0m\n' "$1" >&2; }
info() { printf '\033[90m    %s\033[0m\n' "$1"; }

require_command() {
    command -v "$1" >/dev/null 2>&1 && return
    fail "$1 is not installed or not in PATH. ${2:-Install it and retry.}"
    exit 1
}

trim() {
    local value="$1"
    value="${value%$'\r'}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    printf '%s' "$value"
}

load_env() {
    local env_file="$ROOT_DIR/.env"
    [[ -f "$env_file" ]] || { warn ".env not found; using application defaults."; return; }
    info "Loading .env"
    local line key value
    while IFS= read -r line || [[ -n "$line" ]]; do
        line="${line%$'\r'}"
        [[ "$line" =~ ^[[:space:]]*$ || "$line" =~ ^[[:space:]]*# || "$line" != *=* ]] && continue
        key="$(trim "${line%%=*}")"
        value="$(trim "${line#*=}")"
        [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || { warn "Skipping invalid env key: $key"; continue; }
        [[ "$value" == \"*\" && "$value" == *\" && ${#value} -ge 2 ]] && value="${value:1:${#value}-2}"
        [[ "$value" == \'*\' && "$value" == *\' && ${#value} -ge 2 ]] && value="${value:1:${#value}-2}"
        export "$key=$value"
    done < "$env_file"
}

configure_ports() {
    # The ports are set only in .env (APP_PORT, NEXT_PORT); see .env.example.
    local name
    for name in APP_PORT NEXT_PORT; do
        [[ -n "${!name:-}" ]] || { fail "$name is not set. Add it to .env (see .env.example)."; exit 1; }
    done
    BE_PORT="$APP_PORT"
    FE_PORT="$NEXT_PORT"
    BE_URL="http://localhost:$BE_PORT"
    FE_URL="http://localhost:$FE_PORT"
}

port_lines() { ss -ltnpH 2>/dev/null | awk -v port=":$1" '$4 ~ port "$" { print }'; }
port_in_use() { [[ -n "$(port_lines "$1")" ]]; }
port_pids() { port_lines "$1" | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | sort -u; }

port_process_info() {
    local pid
    local pids=()
    mapfile -t pids < <(port_pids "$1")
    if [[ ${#pids[@]} -eq 0 ]]; then port_lines "$1"; return; fi
    for pid in "${pids[@]}"; do
        ps -p "$pid" -o pid=,comm=,args= 2>/dev/null || printf 'PID %s (details unavailable)\n' "$pid"
    done
}

confirm_kill_port() {
    local port="$1" name="$2" answer pid
    local pids=()
    mapfile -t pids < <(port_pids "$port")
    [[ ${#pids[@]} -gt 0 && -t 0 ]] || return 1
    printf '\n'
    warn "Port $port ($name) is in use by:"
    port_process_info "$port" | sed 's/^/      /'
    read -r -p "  Kill the process(es) above to free port $port? [y/N] " answer
    [[ "$answer" =~ ^[Yy]([Ee][Ss])?$ ]] || return 1
    for pid in "${pids[@]}"; do
        kill "$pid" 2>/dev/null && ok "Sent SIGTERM to PID $pid" || warn "Could not terminate PID $pid"
    done
    sleep 1
    if port_in_use "$port"; then
        for pid in "${pids[@]}"; do kill -KILL "$pid" 2>/dev/null || true; done
        sleep 1
    fi
    ! port_in_use "$port"
}

check_ports() {
    step "Checking required ports"
    require_command ss "On Fedora: sudo dnf install iproute"
    local errors=()
    if [[ "$SKIP_BE" -eq 0 ]] && port_in_use "$BE_PORT" && ! confirm_kill_port "$BE_PORT" "Backend (FastAPI)"; then
        errors+=("$BE_PORT (Backend): $(port_process_info "$BE_PORT" | tr '\n' '; ')")
    fi
    if [[ "$SKIP_FE" -eq 0 ]] && port_in_use "$FE_PORT" && ! confirm_kill_port "$FE_PORT" "Frontend (Next.js)"; then
        errors+=("$FE_PORT (Frontend): $(port_process_info "$FE_PORT" | tr '\n' '; ')")
    fi
    if [[ ${#errors[@]} -gt 0 ]]; then
        fail "Required ports are blocked:"
        printf '  %s\n' "${errors[@]}" >&2
        exit 1
    fi
    ok "Required ports are free"
}

get_jdbc_host_port() {
    local url="$1"
    JDBC_HOST=""; JDBC_PORT=""
    if [[ "$url" =~ ^(jdbc:)?postgres(ql)?://([^/:?@]+@)?([^/:?]+):([0-9]+)(/|$|\?) ]]; then
        JDBC_HOST="${BASH_REMATCH[4]}"; JDBC_PORT="${BASH_REMATCH[5]}"; return 0
    fi
    if [[ "$url" =~ ^(jdbc:)?postgres(ql)?://([^/:?@]+@)?([^/:?]+)(/|$|\?) ]]; then
        JDBC_HOST="${BASH_REMATCH[4]}"; JDBC_PORT=5432; return 0
    fi
    return 1
}

tcp_port_open() {
    local host="$1" port="$2" address
    # Supabase pooler hostnames can resolve to several load-balancer IPs. Bash's
    # /dev/tcp tries one address in resolver order and may spend the whole
    # timeout on an unreachable address even though another address is healthy.
    # Probe each IPv4 address independently so the launcher does not reject a
    # reachable transaction pooler on port 6543.
    if command -v getent >/dev/null 2>&1; then
        while read -r address; do
            [[ -n "$address" ]] || continue
            timeout 5 bash -c ':</dev/tcp/$1/$2' _ "$address" "$port" >/dev/null 2>&1 && return 0
        done < <(getent ahostsv4 "$host" | awk '{print $1}' | sort -u)
        return 1
    fi
    timeout 5 bash -c ':</dev/tcp/$1/$2' _ "$host" "$port" >/dev/null 2>&1
}

validate_database() {
    [[ "$SKIP_BE" -eq 1 ]] && return
    step "Validating Supabase database"
    [[ -n "${DB_URL:-}" && -n "${DB_USERNAME:-}" && -n "${DB_PASSWORD:-}" ]] || { fail "DB_URL, DB_USERNAME, and DB_PASSWORD must be set in .env."; exit 1; }
    get_jdbc_host_port "$DB_URL" || { fail "DB_URL must be a PostgreSQL URL (jdbc:postgresql://... or postgresql://...)."; exit 1; }
    tcp_port_open "$JDBC_HOST" "$JDBC_PORT" || { fail "Cannot reach Supabase at $JDBC_HOST:$JDBC_PORT."; exit 1; }
    ok "Supabase PostgreSQL is reachable ($JDBC_HOST:$JDBC_PORT)"
}

tail_with_prefix() {
    tail -n +1 -F "$2" 2>/dev/null | while IFS= read -r line; do printf '  [%s] %s\n' "$1" "$line"; done &
    TAIL_PIDS+=("$!")
}

cleanup() {
    [[ "$TEARDOWN_DONE" -eq 1 ]] && return
    TEARDOWN_DONE=1
    local pid
    for pid in "${TAIL_PIDS[@]:-}"; do kill "$pid" 2>/dev/null || true; done
    for pid in "${BG_PIDS[@]:-}"; do kill -0 "$pid" 2>/dev/null && kill -- "-$pid" 2>/dev/null || true; done
    sleep 1
    for pid in "${BG_PIDS[@]:-}"; do kill -0 "$pid" 2>/dev/null && kill -KILL -- "-$pid" 2>/dev/null || true; done
}

stop_all() { printf '\n\033[33m  %s\033[0m\n' "${1:-Shutting down ...}"; cleanup; ok "All services stopped."; exit 1; }
trap 'stop_all "Interrupted"' INT TERM
trap cleanup EXIT

wait_for_url() {
    local url="$1" label="$2" timeout_seconds="$3" started now elapsed
    info "Waiting for $label ($url) ..."
    started="$(date +%s)"
    while ! curl -fsS --max-time 3 "$url" >/dev/null 2>&1; do
        now="$(date +%s)"; elapsed=$((now - started))
        [[ "$elapsed" -ge "$timeout_seconds" ]] && return 1
        sleep 2
    done
    ok "$label is ready"
}

conda_python() {
    # The python of the conda env "neviad-be" (conda env create -f be/environment.yml), or nothing.
    command -v conda >/dev/null 2>&1 || return 0
    local prefix
    prefix="$(conda env list 2>/dev/null | awk '$1 == "neviad-be" { print $NF }')"
    [[ -n "$prefix" && -x "$prefix/bin/python" ]] && printf '%s' "$prefix/bin/python"
    return 0
}

system_python() {
    # A Python 3.11+ with the venv module, installed on this machine, or nothing.
    local candidate
    for candidate in python3.13 python3.12 python3.11 python3 python; do
        command -v "$candidate" >/dev/null 2>&1 || continue
        "$candidate" -c "import sys, venv, ensurepip; sys.exit(0 if sys.version_info >= (3, 11) else 1)" >/dev/null 2>&1 \
            && { command -v "$candidate"; return 0; }
    done
    return 0
}

venv_python() {
    # Runs inside $(...): only the python path goes to stdout, progress goes to stderr.
    # be/.venv, created with the machine's Python on first run; the backend is (re)installed into it whenever be/pyproject.toml changes.
    local venv_dir="$BE_DIR/.venv" python="$BE_DIR/.venv/bin/python" stamp="$BE_DIR/.venv/.neviad-installed" system wanted
    if [[ ! -x "$python" ]]; then
        system="$(system_python)"
        if [[ -z "$system" ]]; then
            fail "Python 3.11 or newer (with venv) is not installed. Install it (Ubuntu/Debian: sudo apt install python3 python3-venv; macOS: brew install python@3.12) and run this script again."
            exit 1
        fi
        info "Creating $venv_dir with $system" >&2
        "$system" -m venv "$venv_dir" >&2 || { fail "Could not create $venv_dir."; exit 1; }
    fi
    wanted="$(sha256sum "$BE_DIR/pyproject.toml" | cut -d' ' -f1)"
    if [[ "$(cat "$stamp" 2>/dev/null)" != "$wanted" ]] || ! "$python" -c "import beneviadsystem" >/dev/null 2>&1; then
        info "Installing the backend into $venv_dir (first run or changed dependencies) ..." >&2
        "$python" -m pip install --disable-pip-version-check --quiet -e "$BE_DIR" >&2 || { fail "Installing the backend failed."; exit 1; }
        printf '%s\n' "$wanted" > "$stamp"
    fi
    printf '%s' "$python"
}

backend_python() {
    # NEVIAD_PYTHON wins; else the conda env "neviad-be" if it exists; else be/.venv, made and kept up to date by this script.
    if [[ -n "${NEVIAD_PYTHON:-}" ]]; then
        "$NEVIAD_PYTHON" -c "import beneviadsystem" >/dev/null 2>&1 \
            || { fail "The backend is not installed for NEVIAD_PYTHON=$NEVIAD_PYTHON. Run: $NEVIAD_PYTHON -m pip install -e be"; exit 1; }
        printf '%s' "$NEVIAD_PYTHON"; return
    fi
    local conda
    conda="$(conda_python)"
    if [[ -n "$conda" ]] && "$conda" -c "import beneviadsystem" >/dev/null 2>&1; then printf '%s' "$conda"; return; fi
    venv_python
}

start_backend() {
    [[ "$SKIP_BE" -eq 1 ]] && return
    step "Starting Backend - FastAPI (port $BE_PORT)"
    require_command setsid "Install util-linux."
    require_command curl "Install curl."
    local python
    python="$(backend_python)" || exit 1
    info "Python: $python"
    local log_file="$LOG_DIR/backend.log"
    : > "$log_file"
    setsid bash -c 'cd "$1" && exec "$2" -m beneviadsystem' _ "$BE_DIR" "$python" >>"$log_file" 2>&1 &
    BG_PIDS+=("$!"); BG_NAMES+=("Backend (FastAPI)")
    tail_with_prefix BE "$log_file"
    wait_for_url "$BE_URL/api/health" "Backend" 120 || { fail "Backend did not start. Log: $log_file"; stop_all "Backend failed"; }
}

start_frontend() {
    [[ "$SKIP_FE" -eq 1 ]] && return
    step "Starting Frontend - Next.js dev (port $FE_PORT)"
    require_command npm "Install Node.js/npm."
    require_command setsid "Install util-linux."
    require_command curl "Install curl."
    if [[ ! -d "$FE_DIR/node_modules" ]]; then
        info "Installing frontend dependencies ..."
        (cd "$FE_DIR" && npm ci)
    fi
    local log_file="$LOG_DIR/frontend.log"
    : > "$log_file"
    setsid bash -c 'cd "$1" && exec npm run dev -- --port "$2"' _ "$FE_DIR" "$FE_PORT" >>"$log_file" 2>&1 &
    BG_PIDS+=("$!"); BG_NAMES+=("Frontend (Next.js)")
    tail_with_prefix FE "$log_file"
    wait_for_url "$FE_URL" "Frontend" 90 || { fail "Frontend did not start. Log: $log_file"; stop_all "Frontend failed"; }
}

monitor_processes() {
    info "Logs: $LOG_DIR"
    while true; do
        sleep 3
        local index pid name exit_code
        for index in "${!BG_PIDS[@]}"; do
            pid="${BG_PIDS[$index]}"; name="${BG_NAMES[$index]}"
            if ! kill -0 "$pid" 2>/dev/null; then
                set +e; wait "$pid"; exit_code=$?; set -e
                fail "$name crashed (exit code $exit_code)."
                stop_all "$name crashed"
            fi
        done
    done
}

main() {
    load_env
    configure_ports
    check_ports
    validate_database
    start_backend
    start_frontend
    printf '\n\033[32m========================================================\033[0m\n'
    printf '\033[32m  All services are running!\033[0m\n'
    printf '\033[32m========================================================\033[0m\n'
    [[ "$SKIP_BE" -eq 0 ]] && printf '  Backend:  %s\n' "$BE_URL"
    [[ "$SKIP_FE" -eq 0 ]] && printf '  Frontend: %s\n' "$FE_URL"
    printf '\n\033[33m  Press Ctrl+C to stop all services.\033[0m\n\n'
    monitor_processes
}

main
