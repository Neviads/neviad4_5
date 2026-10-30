// Thử lệnh bevel ngoài MCP: dựng vài mối nối, đo chất lượng lưới, thoát mã 1 nếu có ca hỏng.
// Chạy: node fe/scripts/assembly-bridge/bevel-selftest.mjs
import { checker, fmt, line, loadKit, measure } from "./selftest-lib.mjs";

const kit = await loadKit("bevel-selftest");
const { check, done } = checker();

const box = (x0, x1, z0, z1) => ({
  op: "extrude",
  params: { outline: { pts: [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]], closed: true }, plane: "xz", depth: 0.24, edgeRadius: 0.002 },
});
const cyl = (r, h) => ({ pts: [[0, -h / 2], [r, -h / 2], [r, h / 2], [0, h / 2]], closed: false });

/**
 * Dựng union và bevel của hai hình a, b rồi kiểm: kín, không gấp mép, không thêm tam giác dẹt, lưới gọn, và
 * thể tích tăng trong [minGrow, maxGrow] % (add phải đắp thật; cut gần như giữ nguyên).
 */
function bevelCase(title, a, b, params, { maxTris, minGrow, maxGrow }) {
  const doc = {
    id: "t", title, parts: [], joints: [], routes: [], materials: {},
    shapes: [
      { id: "a", ...a },
      { id: "b", ...b },
      { id: "u", op: "boolean", params: { op: "union" }, inputs: ["a", "b"] },
      { id: "bev", op: "bevel", params, inputs: ["a", "b"] },
    ],
  };
  line(`[${title}]`);
  const t0 = Date.now();
  const built = kit.buildShapes(doc, ["u", "bev"]);
  const u = measure(kit, built.get("u").geometry), v = measure(kit, built.get("bev").geometry);
  line(`  union : ${fmt(u)}`);
  line(`  bevel : ${fmt(v)}, ${Date.now() - t0} ms`);
  for (const s of built.get("bev").info) line(`         ${s}`);
  const grow = (v.vol / u.vol - 1) * 100;
  check("kín", v.closed);
  check("không có chỗ gấp mép", v.folds === 0, `${v.folds}`);
  check("không thêm tam giác dẹt", v.slivers <= u.slivers, `${u.slivers} → ${v.slivers}`);
  check(`lưới ≤ ${maxTris} tam giác`, v.tris <= maxTris, `${v.tris}`);
  check(`thể tích tăng ${minGrow}–${maxGrow} %`, grow >= minGrow && grow <= maxGrow, `${grow.toFixed(2)} %`);
}

const mustThrow = (title, shapes) => {
  line(`[${title}]`);
  try {
    kit.buildShapes({ id: "t", title, parts: [], joints: [], routes: [], materials: {}, shapes }, ["bev"]);
    check("báo lỗi", false, "không báo lỗi");
  } catch (e) {
    check("báo lỗi", true, e.message.split("\n")[0].slice(0, 140));
  }
};

bevelCase("ca 1: hai hộp ghép góc L — cut r = 20 mm", box(-0.1, 0.1, 0.0, 0.4), box(-0.1, 0.4, -0.1, 0.1), { mode: "cut", radius: 0.02 }, { maxTris: 5000, minGrow: 0, maxGrow: 0.5 });

bevelCase(
  "ca 2: hai trụ Ø60 vuông góc (chữ T) — add r = 15 mm",
  { op: "lathe", params: { profile: cyl(0.03, 0.4), segments: 64 }, offset: [0, 0.2, 0] },
  { op: "lathe", params: { profile: cyl(0.03, 0.4), segments: 64 }, rotate: [0, 0, 90], offset: [0.12, 0.2, 0] },
  { mode: "add", radius: 0.015 },
  { maxTris: 30000, minGrow: 2, maxGrow: 40 },
);

bevelCase(
  "ca 3: ống gió Ø120, đoạn chéo 42° — add r = 12 mm",
  { op: "lathe", params: { profile: cyl(0.06, 0.36), segments: 64 }, rotate: [0, 0, 90], offset: [0.11, 0.06, 0] },
  { op: "lathe", params: { profile: cyl(0.06, 0.36), segments: 64 }, rotate: [0, 0, -48], offset: [0.1, 0.2161, 0] },
  { mode: "add", radius: 0.012 },
  { maxTris: 30000, minGrow: 0.2, maxGrow: 40 },
);

mustThrow("ca 4: hai hộp cách nhau 25 cm — phải báo lỗi", [
  { id: "a", ...box(-0.1, 0.1, -0.1, 0.1) },
  { id: "b", ...box(0.35, 0.6, -0.1, 0.1) },
  { id: "bev", op: "bevel", params: { radius: 0.01 }, inputs: ["a", "b"] },
]);

mustThrow("ca 5: mode add mà chỉ có 1 hình — phải báo lỗi", [
  { id: "a", ...box(-0.1, 0.1, -0.1, 0.1) },
  { id: "bev", op: "bevel", params: { mode: "add" }, inputs: ["a"] },
]);

done();
