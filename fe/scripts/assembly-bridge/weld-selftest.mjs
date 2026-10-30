// Thử lệnh weld ngoài MCP: dựng vài mối nối, đo chất lượng lưới, thoát mã 1 nếu có ca hỏng.
// Chạy: node fe/scripts/assembly-bridge/weld-selftest.mjs
import { checker, fmt, line, loadKit, measure } from "./selftest-lib.mjs";

const kit = await loadKit("weld-selftest");
const { check, done } = checker();

const semi = (r) => ({
  pts: Array.from({ length: 17 }, (_, i) => {
    const t = (Math.PI * i) / 16;
    return [+(r * Math.sin(t)).toFixed(5), +(-r * Math.cos(t)).toFixed(5)];
  }),
});
const cyl = (r, h) => ({ pts: [[0, -h / 2], [r, -h / 2], [r, h / 2], [0, h / 2]], closed: false });

/** Dựng union và weld của hai hình a, b rồi kiểm: kín, không gấp mép, không thêm tam giác dẹt, lưới gọn, thể tích giữ. */
function weldCase(title, a, b, params, maxTris) {
  const doc = {
    id: "t", title, parts: [], joints: [], routes: [], materials: {},
    shapes: [
      { id: "a", ...a },
      { id: "b", ...b },
      { id: "u", op: "boolean", params: { op: "union" }, inputs: ["a", "b"] },
      { id: "w", op: "weld", params, inputs: ["a", "b"] },
    ],
  };
  line(`[${title}]`);
  const t0 = Date.now();
  const built = kit.buildShapes(doc, ["u", "w"]);
  const u = measure(kit, built.get("u").geometry), w = measure(kit, built.get("w").geometry);
  line(`  union : ${fmt(u)}`);
  line(`  weld  : ${fmt(w)}, ${Date.now() - t0} ms`);
  for (const s of built.get("w").info) line(`         ${s}`);
  check("kín", w.closed);
  check("không có chỗ gấp mép", w.folds === 0, `${w.folds}`);
  check("không thêm tam giác dẹt", w.slivers <= u.slivers, `${u.slivers} → ${w.slivers}`);
  check(`lưới ≤ ${maxTris} tam giác`, w.tris <= maxTris, `${w.tris}`);
  check("thể tích đổi < 1 % (weld không thêm vật liệu)", Math.abs(w.vol / u.vol - 1) < 0.01, `${((w.vol / u.vol - 1) * 100).toFixed(2)} %`);
}

weldCase(
  "ca 1: hai cầu Ø100 mm chồng 20 mm",
  { op: "lathe", params: { profile: semi(0.05), segments: 48 } },
  { op: "lathe", params: { profile: semi(0.05), segments: 48 }, offset: [0.08, 0, 0] },
  { radius: 0.02 },
  12000,
);

// giống tay áo cắm vào thân
weldCase(
  "ca 2: ống Ø114 cắm vào hộp dày 380",
  { op: "extrude", params: { outline: { pts: [[-0.19, -0.2], [0.19, -0.2], [0.19, 0.2], [-0.19, 0.2], [-0.19, -0.2]], closed: true }, plane: "xz", depth: 0.45, edgeRadius: 0.01 } },
  { op: "lathe", params: { profile: semi(0.057), segments: 48 }, offset: [0.19, 0.25, 0.0] },
  { radius: 0.03 },
  20000,
);

weldCase(
  "ca 3: ống gió Ø120, đoạn chéo 42°",
  { op: "lathe", params: { profile: cyl(0.06, 0.36), segments: 64 }, rotate: [0, 0, 90], offset: [0.11, 0.06, 0] },
  { op: "lathe", params: { profile: cyl(0.06, 0.36), segments: 64 }, rotate: [0, 0, -48], offset: [0.1, 0.2161, 0] },
  { radius: 0.015 },
  12000,
);

// ── ca 4: hai hình không chạm — phải báo lỗi ──
line("[ca 4: hai cầu cách nhau 30 cm — phải báo lỗi]");
try {
  kit.buildShapes({
    id: "t", title: "xa", parts: [], joints: [], routes: [], materials: {},
    shapes: [
      { id: "a", op: "lathe", params: { profile: semi(0.05), segments: 24 } },
      { id: "b", op: "lathe", params: { profile: semi(0.05), segments: 24 }, offset: [0.4, 0, 0] },
      { id: "w", op: "weld", params: { radius: 0.02 }, inputs: ["a", "b"] },
    ],
  }, ["w"]);
  check("báo lỗi", false, "không báo lỗi");
} catch (e) {
  check("báo lỗi", true, e.message.split("\n")[0].slice(0, 140));
}

done();
