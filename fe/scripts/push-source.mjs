// Loads a folder of fe/ into the database as one collection, writing to PostgreSQL directly (the backend only reads it). The collection
// `template` goes to its own table template_file; the others are collections of table source_file, whose old `template` rows stay untouched:
//   node scripts/push-source.mjs template neviadlike_structure    (npm run push:template) the tree the code agents work on
//   node scripts/push-source.mjs objects object-library         (npm run push:objects)  the drawn objects of /vat-the-mo-phong
//   node scripts/push-source.mjs catalog ../docs object-catalog.md (npm run push:catalog) the catalogue the library's topics come from
// An optional third argument loads only the file of that name from the folder (a collection of one file).
// The collection becomes exactly the files read here: .ts/.tsx/.md/.json (what the agent may read), no "_" folders (agents' leftovers,
// type declarations), no .d.ts. Connection: DB_URL (the backend's JDBC URL), DB_USERNAME, DB_PASSWORD from the environment or the
// repository's .env. The table is created by the backend's Flyway migration V2, so start the backend once before the first load.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const [collection, folder, only] = process.argv.slice(2);
if (!collection || !folder) fail("Cách dùng: node scripts/push-source.mjs <collection> <thư mục trong fe/> [tên file duy nhất]");
if (!/^[a-z0-9-]{1,40}$/.test(collection)) fail(`collection không hợp lệ: ${collection}`);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, folder);
if (!existsSync(source)) fail(`Không có thư mục ${source}.`);

// Same rules as the backend's SourceStore.validatePath for a readable file.
const READABLE = /\.(ts|tsx|md|json)$/;
const SAFE_PATH = /^[A-Za-z0-9_./-]+$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function collect(dir, prefix) {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  return entries.flatMap((entry) => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return entry.name.startsWith("_") ? [] : collect(join(dir, entry.name), path);
    if (!READABLE.test(entry.name) || entry.name.endsWith(".d.ts")) return [];
    if (only && entry.name !== only) return [];
    if (!SAFE_PATH.test(path) || path.includes("..")) fail(`Đường dẫn không hợp lệ (chỉ chữ, số, _ . / -): ${path}`);
    return [{ path, content: readFileSync(join(dir, entry.name), "utf8").replace(/\r\n/g, "\n") }];
  });
}

/** pg's connection settings from the backend's JDBC URL (jdbc:postgresql://host:port/db?sslmode=...). */
function connection() {
  const envFile = resolve(root, "..", ".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const { DB_URL, DB_USERNAME, DB_PASSWORD } = process.env;
  if (!DB_URL) fail("Thiếu DB_URL (đặt trong .env ở thư mục gốc, như backend).");
  const url = new URL(DB_URL.replace(/^jdbc:/, ""));
  const sslmode = url.searchParams.get("sslmode");
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres",
    user: DB_USERNAME ?? decodeURIComponent(url.username),
    password: DB_PASSWORD ?? decodeURIComponent(url.password),
    // Supabase's pooler needs TLS; its certificate chain is not in Node's store, so encrypt without verifying, as sslmode=require does.
    ssl: sslmode && sslmode !== "disable" ? { rejectUnauthorized: false } : undefined,
  };
}

/** The collection `template` has a table of its own, template_file (migration V3); the rest share source_file. */
const TEMPLATE = collection === "template";
const files = collect(source, "");
if (files.length === 0) fail(`Không có file nào để nạp trong ${folder}/ (một collection rỗng sẽ xoá hết nội dung cũ).`);

const client = new pg.Client(connection());
try {
  await client.connect();
  await client.query("BEGIN");
  const paths = files.map((file) => file.path);
  if (TEMPLATE) await client.query("DELETE FROM template_file WHERE NOT (path = ANY ($1::text[]))", [paths]);
  else await client.query("DELETE FROM source_file WHERE collection = $1 AND NOT (path = ANY ($2::text[]))", [collection, paths]);
  let changed = 0;
  for (const file of files) {
    const result = TEMPLATE
      ? await client.query(
        `INSERT INTO template_file (path, content) VALUES ($1, $2)
         ON CONFLICT (path) DO UPDATE SET content = excluded.content, updated_at = now()
         WHERE template_file.content IS DISTINCT FROM excluded.content`,
        [file.path, file.content],
      )
      : await client.query(
        `INSERT INTO source_file (collection, path, content) VALUES ($1, $2, $3)
         ON CONFLICT (collection, path) DO UPDATE SET content = excluded.content, updated_at = now()
         WHERE source_file.content IS DISTINCT FROM excluded.content`,
        [collection, file.path, file.content],
      );
    changed += result.rowCount ?? 0;
  }
  await client.query("COMMIT");
  console.log(`${collection}: ${files.length} file từ ${folder}/ (${changed} mới hoặc đã đổi)`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  const message = error instanceof Error ? error.message : String(error);
  const missing = /relation "(source_file|template_file)" does not exist/.exec(message)?.[1];
  fail(missing
    ? `Chưa có bảng ${missing}: chạy backend một lần để Flyway tạo bảng (migration ${missing === "template_file" ? "V3" : "V2"}), rồi nạp lại.`
    : `Nạp thất bại: ${message}`);
} finally {
  await client.end().catch(() => {});
}
