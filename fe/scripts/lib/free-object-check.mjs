// Cổng kiểm tra của agent tạo vật thể (backend: NodeDrawObjectValidator). Vật là HÌNH không có vật lý: `(p, ppm, fill, label) => { group, parts, points }`.
// Luôn hỏi: code có chạy được và dựng ra hình không. Khi kịch bản đã chốt hình học (`geometry`), còn đo: khung bao đúng kích thước (mét × ppm) ở hai
// tỉ lệ, nhóm ngoài không bị dời, đủ các bộ phận chuyển động (nhóm con nằm trong vật, đúng kiểu chuyển động và khoảng) và đủ các điểm có tên.
// Nó KHÔNG chấm hình đẹp hay giống thật. Phần còn lại là an toàn: code của model chạy trong Node, nên vẫn quét các từ cho phép thoát khỏi hộp cát.
import { createRequire } from "node:module";
import { join } from "node:path";
import vm from "node:vm";
import { createFakeKonva } from "./draw-object-harness.mjs";
import { renderGroupPng } from "./konva-svg.mjs";

const FORBIDDEN = /\b(fetch|eval|XMLHttpRequest|WebSocket|localStorage|sessionStorage|document|window|import|require|setTimeout|setInterval|requestAnimationFrame|globalThis|Function|process|constructor|__proto__)\b/;
const FACTORY = /(?:^|\n)\s*(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)\s*(?:=|\()/g;
/** Dấu hiệu vật đang tự làm vật lý; chỉ cảnh báo, vì một chữ như `time` có thể là nhãn. */
const PHYSICS = /\b(velocity|speed|dt|mass|gravity|acceleration|Date|elapsed|set|inputs)\b/g;
const PPM_A = 100;
const PPM_B = 200;
const SIZE_TOLERANCE = 0.2;
/** Màu thân (tham số fill) khi dựng ảnh cho người vẽ xem: thép trung tính, để ảnh không bị chê vì màu đo đạc. */
const IMAGE_FILL = "#60758b";

const finite = (value) => typeof value === "number" && Number.isFinite(value);
const entries = (value) => (value && typeof value === "object" ? Object.entries(value) : []);
const num = (value, fallback = 0) => (finite(value) ? value : fallback);

/** Tên hàm dựng vật: ưu tiên tên dạng makeXxx, nếu không thì khai báo đầu tiên ở cấp cao nhất. */
export function factoryName(code) {
  const names = [...code.matchAll(FACTORY)].map((m) => m[1]);
  return names.find((name) => /^make[A-Z0-9_]/.test(name)) ?? names[0] ?? null;
}

// ── Khung bao trên Konva giả ─────────────────────────────────────────────────
// Ma trận affine [a, b, c, d, e, f]: x' = a·x + c·y + e, y' = b·x + d·y + f (giống Konva.Transform).
const IDENTITY = [1, 0, 0, 1, 0, 0];
const multiply = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** Phép biến đổi của chính một nút: dời (x, y), quay, co giãn, rồi trừ offset; cùng thứ tự với Konva. */
function ownTransform(attrs) {
  const r = (num(attrs.rotation) * Math.PI) / 180;
  const sx = num(attrs.scaleX, 1), sy = num(attrs.scaleY, 1);
  const cos = Math.cos(r), sin = Math.sin(r);
  const base = [cos * sx, sin * sx, -sin * sy, cos * sy, num(attrs.x), num(attrs.y)];
  return multiply(base, [1, 0, 0, 1, -num(attrs.offsetX), -num(attrs.offsetY)]);
}

/** Các điểm cục bộ đủ để bao một hình (trước phép biến đổi của chính nó, sau offset đã có trong ownTransform). Chữ không tính: nhãn được phép ló ra. */
function localPoints(kind, a) {
  switch (kind) {
    case "Rect": case "Image": return [[0, 0], [num(a.width), num(a.height)]];
    case "Circle": { const r = num(a.radius); return [[-r, -r], [r, r]]; }
    case "Ellipse": { const rx = num(a.radiusX, num(a.radius?.x)), ry = num(a.radiusY, num(a.radius?.y)); return [[-rx, -ry], [rx, ry]]; }
    case "Ring": case "Arc": case "Star": { const r = num(a.outerRadius, num(a.radius)); return [[-r, -r], [r, r]]; }
    case "Wedge": case "RegularPolygon": { const r = num(a.radius); return [[-r, -r], [r, r]]; }
    case "Line": case "Arrow": {
      const pts = Array.isArray(a.points) ? a.points : [];
      const out = [];
      for (let i = 0; i + 1 < pts.length; i += 2) if (finite(pts[i]) && finite(pts[i + 1])) out.push([pts[i], pts[i + 1]]);
      return out;
    }
    default: return [];
  }
}

/** Khung bao của mọi hình trong cây của `root`, tính trong hệ toạ độ của root (không gồm phép biến đổi của root). */
export function boundingBox(root) {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const visit = (node, matrix, depth) => {
    if (!node || depth > 40 || node.__attrs?.visible === false) return;
    const m = multiply(matrix, ownTransform(node.__attrs));
    for (const [x, y] of localPoints(node.__kind, node.__attrs)) {
      const [px, py] = apply(m, x, y);
      box.minX = Math.min(box.minX, px); box.maxX = Math.max(box.maxX, px);
      box.minY = Math.min(box.minY, py); box.maxY = Math.max(box.maxY, py);
    }
    for (const child of node.__children ?? []) visit(child, m, depth + 1);
  };
  for (const child of root.__children ?? []) visit(child, IDENTITY, 0);
  return Number.isFinite(box.minX) ? { ...box, width: box.maxX - box.minX, height: box.maxY - box.minY } : null;
}

function contains(root, target) {
  const seen = new Set();
  const walk = (node) => {
    if (!node || seen.has(node)) return false;
    seen.add(node);
    return node === target || (node.__children ?? []).some(walk);
  };
  return (root.__children ?? []).some(walk);
}

// ── Kiểm tra ─────────────────────────────────────────────────────────────────

/** `feRoot` là thư mục fe/ (có node_modules với typescript). Trả về { check(code, geometry?) } với kết quả { problems, report, js, meta }. */
export function createFreeChecker(feRoot) {
  const ts = createRequire(join(feRoot, "package.json"))("typescript");

  /** Dựng vật một lần trong một Konva giả mới; trả { made, group, registry } hoặc { error }. */
  function build(js, name, ppm, fill = "#f472b6") {
    const { Konva, registry } = createFakeKonva();
    const ctx = vm.createContext({ Konva, getSimulationFontFamily: () => "Arial", console: { log() {}, warn() {}, error() {} } });
    try {
      vm.runInContext(`${js}\n;globalThis.__make = ${name};`, ctx, { timeout: 2000 });
      const made = vm.runInContext(`__make({ x: 0, y: 0 }, ${ppm}, ${JSON.stringify(fill)}, "m")`, ctx, { timeout: 2000 });
      if (!made || typeof made !== "object") return { error: "Hàm phải trả về một đối tượng { group, parts, points } (hoặc một Konva.Group)." };
      const group = made.group ?? (typeof made.add === "function" ? made : null);
      if (!group || !group.__attrs) return { error: "Đối tượng trả về không có `group` (Konva.Group)." };
      return { made, group, registry };
    } catch (error) {
      return { error: `Chạy hàm vẽ bị lỗi: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  function check(code, geometry) {
    const problems = [];
    const report = [];
    if (typeof code !== "string" || !code.trim()) return { problems: ["Chưa có code."], report, js: null, meta: null };
    const forbidden = code.match(FORBIDDEN);
    if (forbidden) return { problems: [`Code dùng từ bị cấm vì lý do an toàn: ${forbidden[1]}.`], report, js: null, meta: null };
    const out = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext }, reportDiagnostics: true });
    const syntax = (out.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
    if (syntax.length) return { problems: syntax.slice(0, 5).map((e) => `Lỗi cú pháp TypeScript: ${e}`), report, js: null, meta: null };
    const name = factoryName(code);
    if (!name) return { problems: ["Không thấy hàm dựng vật (một `const makeXxx = (p, ppm, fill, label) => ...` ở cấp cao nhất)."], report, js: null, meta: null };

    const a = build(out.outputText, name, PPM_A);
    if (a.error) return { problems: [a.error], report, js: null, meta: null };
    if (a.registry.length < 2) problems.push("Chưa dựng được hình nào (hàm không tạo nhóm con hay hình Konva).");
    const b = build(out.outputText, name, PPM_B);
    if (b.error) return { problems: [b.error], report, js: null, meta: null };

    // Nhóm ngoài thuộc về cảnh: vật không được tự dời, quay hay co giãn nó.
    const ga = a.group.__attrs;
    if (num(ga.x) !== 0 || num(ga.y) !== 0) problems.push(`Nhóm ngoài phải nằm đúng tại p (đang ở ${num(ga.x)}, ${num(ga.y)} khi p = (0, 0)): đặt vật là việc của cảnh.`);
    if (num(ga.rotation) !== 0 || num(ga.scaleX, 1) !== 1 || num(ga.scaleY, 1) !== 1) problems.push("Nhóm ngoài không được quay hay co giãn: vẽ thẳng các hình bằng mét × ppm.");

    const boxA = boundingBox(a.group);
    const boxB = boundingBox(b.group);
    const size = boxA ? { width: boxA.width / PPM_A, height: boxA.height / PPM_A } : null;
    const measured = boxA && boxB && boxA.width > 0 && boxA.height > 0;
    if (measured) report.push(`khung bao: ${size.width.toFixed(3)} m × ${size.height.toFixed(3)} m (đo ở ppm = ${PPM_A})`);
    // Kích thước và tỉ lệ chỉ bắt buộc khi kịch bản đã chốt hình học; vẽ thử ngoài thí nghiệm thì chỉ cần chạy được.
    if (geometry && !measured) problems.push("Không đo được khung bao của hình (chưa có hình khép kín nào ngoài chữ).");
    if (geometry && measured) {
      const ratio = Math.max(boxB.width / boxA.width, boxB.height / boxA.height) / 2;
      if (Math.abs(ratio - 1) > 0.1) problems.push(`Hình không co giãn theo ppm (ppm gấp đôi thì khung bao gấp ${(ratio * 2).toFixed(2)} lần): viết mọi độ dài bằng mét × ppm, đừng kẹp cỡ bằng số pixel cố định.`);
    }

    const parts = entries(a.made.parts).map(([key, d]) => ({ name: key, node: d?.node, motion: String(d?.motion ?? ""), axis: d?.axis ? String(d.axis) : "", min: d?.min, max: d?.max }));
    const points = entries(a.made.points).map(([key, d]) => ({ name: key, x: d?.x, y: d?.y }));
    for (const part of parts) {
      if (!part.node || part.node.__kind !== "Group") problems.push(`Bộ phận \`${part.name}\` cần \`node\` là một Konva.Group con riêng.`);
      else if (!contains(a.group, part.node)) problems.push(`Nhóm con của bộ phận \`${part.name}\` chưa được thêm vào bên trong vật.`);
    }
    for (const point of points) if (!finite(point.x) || !finite(point.y)) problems.push(`Điểm \`${point.name}\` cần toạ độ { x, y } là số.`);

    if (geometry) {
      const W = num(geometry.width), H = num(geometry.height);
      if (boxA && W > 0 && H > 0) {
        const dw = size.width / W - 1, dh = size.height / H - 1;
        if (Math.abs(dw) > SIZE_TOLERANCE || Math.abs(dh) > SIZE_TOLERANCE)
          problems.push(`Kích thước phải là ${W} m × ${H} m (±${SIZE_TOLERANCE * 100}%), đang đo được ${size.width.toFixed(3)} m × ${size.height.toFixed(3)} m: sửa các độ dài (mét × ppm).`);
      }
      const declaredParts = new Map(parts.map((p) => [p.name, p]));
      for (const want of geometry.parts ?? []) {
        const got = declaredParts.get(want.name);
        declaredParts.delete(want.name);
        if (!got) { problems.push(`Thiếu bộ phận \`${want.name}\` trong \`parts\` (${want.motion === "slide" ? `trượt ${want.axis}` : "quay"}, ${want.min} đến ${want.max}).`); continue; }
        if (got.motion !== want.motion) problems.push(`Bộ phận \`${want.name}\` phải có motion "${want.motion}".`);
        if (want.motion === "slide" && got.axis !== want.axis) problems.push(`Bộ phận \`${want.name}\` phải có axis "${want.axis}".`);
        if (!finite(got.min) || !finite(got.max) || Math.abs(got.min - want.min) > 1e-9 || Math.abs(got.max - want.max) > 1e-9)
          problems.push(`Bộ phận \`${want.name}\` phải khai min ${want.min} và max ${want.max}.`);
      }
      for (const extra of declaredParts.keys()) problems.push(`Bộ phận \`${extra}\` không có trong hình học của kịch bản: gộp nó vào hình đứng yên.`);
      const declaredPoints = new Map(points.map((p) => [p.name, p]));
      const pad = boxA ? 0.1 * Math.max(boxA.width, boxA.height) : 0;
      for (const want of geometry.points ?? []) {
        const got = declaredPoints.get(want.name);
        if (!got) { problems.push(`Thiếu điểm \`${want.name}\` trong \`points\` (${want.description ?? ""}).`); continue; }
        if (boxA && finite(got.x) && finite(got.y) && (got.x < boxA.minX - pad || got.x > boxA.maxX + pad || got.y < boxA.minY - pad || got.y > boxA.maxY + pad))
          problems.push(`Điểm \`${want.name}\` (${got.x.toFixed(1)}, ${got.y.toFixed(1)}) nằm ngoài hình: đặt nó đúng chỗ trên vật.`);
      }
    }

    const physics = [...new Set([...code.replace(/\/\/.*$/gm, "").matchAll(PHYSICS)].map((m) => m[1]))];
    if (physics.length) report.push(`⚠ có từ ${physics.join(", ")}: vật chỉ là hình, không tự chuyển động hay tính vật lý`);
    report.push(`✓ chạy được, dựng ${a.registry.length} nút hình Konva`);
    report.push(parts.length ? `bộ phận chuyển động: ${parts.map((p) => p.name).join(", ")}` : "không có bộ phận chuyển động");
    if (points.length) report.push(`điểm có tên: ${points.map((p) => p.name).join(", ")}`);

    const meta = {
      name,
      size,
      moving: parts.map(({ name: n, motion, axis, min, max }) => ({ name: n, motion, axis, min: num(min), max: num(max) })),
      points: points.map((p) => ({ name: p.name, x: num(p.x) / PPM_A, y: num(p.y) / PPM_A })),
      inputs: [], outputs: [], ports: [],
    };
    // `compiled` chỉ để dựng ảnh (images), kể cả khi còn lỗi; người gọi không gửi nó đi như `js`.
    return { problems, report, js: problems.length ? null : out.outputText, meta, compiled: { js: out.outputText, name, size, parts: meta.moving } };
  }

  /**
   * "Mắt" cho người vẽ: ảnh PNG của vật dựng thật (Konva giả → SVG → sharp), vừa khung 960×640 trên nền cảnh mô phỏng. Một ảnh ở tư thế
   * nghỉ; nếu có bộ phận chuyển động thì thêm một ảnh mọi bộ phận ở mức tối đa (áp tư thế như shared/object-pose.ts: trượt theo trục bằng
   * mét × ppm, quay bằng độ). Vật đứng trên gốc của nó (đáy ở y = 0) thì vẽ cả đường sàn. Trả [{ label, dataUrl }]; lỗi thì [].
   */
  async function images(compiled) {
    if (!compiled?.js || !compiled.size || !(compiled.size.width > 0) || !(compiled.size.height > 0)) return [];
    const W = 960, H = 640, FLOOR = 560;
    const ppm = Math.min((0.72 * W) / compiled.size.width, (0.72 * (FLOOR - 40)) / compiled.size.height);
    const shot = async (label, posed) => {
      const built = build(compiled.js, compiled.name, ppm, IMAGE_FILL);
      if (built.error) return null;
      if (posed) for (const part of compiled.parts) {
        const node = built.made.parts?.[part.name]?.node;
        if (!node?.__attrs) continue;
        if (part.motion === "rotate") node.__attrs.rotation = num(node.__attrs.rotation) + part.max;
        else {
          const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[part.axis] ?? [0, -1];
          node.__attrs.x = num(node.__attrs.x) + dx * part.max * ppm;
          node.__attrs.y = num(node.__attrs.y) + dy * part.max * ppm;
        }
      }
      const box = boundingBox(built.group);
      if (!box) return null;
      const standing = Math.abs(box.maxY) <= 0.04 * box.height;
      const x = W / 2 - (box.minX + box.maxX) / 2;
      const y = standing ? FLOOR : H / 2 - (box.minY + box.maxY) / 2;
      const png = await renderGroupPng(feRoot, built.group, { width: W, height: H, x, y, floorY: standing ? FLOOR : undefined, label });
      return { label, dataUrl: `data:image/png;base64,${png.toString("base64")}` };
    };
    try {
      const list = [await shot("tư thế nghỉ", false)];
      if (compiled.parts?.length) list.push(await shot(`bộ phận chuyển động ở mức tối đa (${compiled.parts.map((p) => `${p.name} ${p.max}${p.motion === "rotate" ? "°" : " m"}`).join(", ")})`, true));
      return list.filter(Boolean);
    } catch {
      return [];
    }
  }

  return { check, images };
}
