// Bộ nạp module: chạy được code TypeScript nằm trong bản sao (IndexedDB) mà không cần server biên dịch.
//
// Thuần: không import tương đối và không dùng API của trình duyệt, nên Node cũng nạp thẳng được file này để kiểm thử.
//   - `read`      đọc nguồn một file của bản sao (null khi không có file đó);
//   - `transform` đổi TS/TSX thành CommonJS (sucrase), do bên ngoài đưa vào;
//   - `host`      các thư viện trang đã có sẵn (react, konva, ...), khoá là tên import.
// `require` là đồng bộ nhưng đọc IndexedDB thì không, nên nạp theo hai bước: (1) đi theo import, đọc và biên dịch cả đồ thị phụ
// thuộc vào bộ nhớ; (2) chạy đồng bộ từ file vào.

export type HostModules = Record<string, unknown>;
export type Transform = (code: string, path: string) => string;
export type LoaderOptions = {
  read: (path: string) => Promise<string | null>;
  transform: Transform;
  host: HostModules;
};
export type Loader = {
  /** Chạy file (và mọi file nó import) rồi trả về `exports` của nó. Gọi lại với file khác thì dùng chung các module đã chạy. */
  load: (entry: string) => Promise<Record<string, unknown>>;
};

export class ModuleLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModuleLoadError";
  }
}

type Target = { kind: "file"; path: string } | { kind: "host"; name: string };
type Prepared = { code: string; requires: Map<string, Target> };

const REQUIRE = /\brequire\(\s*["']([^"']+)["']\s*\)/g;
const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"];
const HAS_EXTENSION = /\.(ts|tsx)$/;

/** Đường dẫn của `spec` (bắt đầu bằng `.`) tính từ file `from`, chuẩn hoá, không dấu `.` hay `..`. */
export function joinPath(from: string, spec: string): string {
  const parts = from.split("/").slice(0, -1);
  for (const segment of spec.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (parts.length === 0) throw new ModuleLoadError(`import "${spec}" trong ${from} đi ra ngoài thư mục gốc của bản sao.`);
      parts.pop();
    } else parts.push(segment);
  }
  return parts.join("/");
}

/** Các `require("...")` có trong mã đã biên dịch, mỗi chuỗi một lần. */
export function requiredSpecs(code: string): string[] {
  const found = new Set<string>();
  for (const match of code.matchAll(REQUIRE)) found.add(match[1]);
  return [...found];
}

export function createModuleLoader(options: LoaderOptions): Loader {
  const { read, transform, host } = options;
  const sources = new Map<string, string | null>();
  const prepared = new Map<string, Prepared>();
  const executed = new Map<string, { exports: Record<string, unknown> }>();

  async function source(path: string): Promise<string | null> {
    if (!sources.has(path)) sources.set(path, await read(path));
    return sources.get(path) ?? null;
  }

  /** File thật mà `spec` chỉ tới: thử đúng tên, rồi thêm .ts, .tsx, /index.ts, /index.tsx. */
  async function resolveFile(from: string, spec: string): Promise<string> {
    const base = joinPath(from, spec);
    const candidates = HAS_EXTENSION.test(base) ? [base] : EXTENSIONS.map((extension) => `${base}${extension}`);
    for (const candidate of candidates) if ((await source(candidate)) !== null) return candidate;
    throw new ModuleLoadError(`Không tìm thấy module "${spec}" mà ${from} import (đã thử ${candidates.join(", ")}).`);
  }

  async function prepare(path: string): Promise<void> {
    if (prepared.has(path)) return;
    const text = await source(path);
    if (text === null) throw new ModuleLoadError(`Không tìm thấy file ${path} trong bản sao.`);
    let code: string;
    try {
      code = transform(text, path);
    } catch (error) {
      throw new ModuleLoadError(`Lỗi biên dịch ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
    const entry: Prepared = { code, requires: new Map() };
    prepared.set(path, entry); // đăng ký trước khi đi tiếp để import vòng không lặp mãi
    const next: string[] = [];
    for (const spec of requiredSpecs(code)) {
      if (spec.startsWith(".")) {
        const resolved = await resolveFile(path, spec);
        entry.requires.set(spec, { kind: "file", path: resolved });
        next.push(resolved);
      } else if (spec in host) {
        entry.requires.set(spec, { kind: "host", name: spec });
      } else {
        throw new ModuleLoadError(`${path} import "${spec}", nhưng trang chỉ có sẵn: ${Object.keys(host).join(", ")}.`);
      }
    }
    for (const target of next) await prepare(target);
  }

  function run(path: string): Record<string, unknown> {
    const cached = executed.get(path);
    if (cached) return cached.exports;
    const box = { exports: {} as Record<string, unknown> }; // đóng vai `module` của CommonJS
    executed.set(path, box); // trước khi chạy, để import vòng nhận được exports đang dở thay vì treo
    const info = prepared.get(path);
    if (!info) throw new ModuleLoadError(`Chưa chuẩn bị file ${path}.`);
    const require = (spec: string): unknown => {
      const target = info.requires.get(spec);
      if (!target) throw new ModuleLoadError(`${path} gọi require("${spec}") mà bộ nạp không dò thấy.`);
      return target.kind === "host" ? host[target.name] : run(target.path);
    };
    try {
      new Function("require", "module", "exports", info.code)(require, box, box.exports);
    } catch (error) {
      executed.delete(path); // lần sau chạy lại từ đầu thay vì dùng exports dở
      if (error instanceof ModuleLoadError) throw error;
      throw new ModuleLoadError(`Lỗi khi chạy ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return box.exports;
  }

  return {
    async load(entry: string): Promise<Record<string, unknown>> {
      await prepare(entry);
      return run(entry);
    },
  };
}
