/* OBJECT-META
{
  "catalog": "Lông vũ",
  "title": "Lông vũ trắng nhẹ: cọng lông cong nhẹ, hai phiến lông mịn xẻ thành từng sợi và tơ mịn ở gốc",
  "fill": "#f8fafc",
  "anchor": "Tâm lông vũ (giữa cọng lông).",
  "useWhen": ["Cần lông vũ nhẹ (khoảng 0,1 g, dài 0,14 m) cho thí nghiệm rơi trong không khí hay trong ống Newton.", "Cảnh cần vật cản không khí lớn, xoay cả vật để rơi nghiêng ngẫu nhiên."],
  "avoidWhen": ["Cần vật nặng rơi tự do để so sánh: dùng vien-bi, qua-cau-bac.", "Cần ống hút chân không đựng lông vũ: dùng ong-newton; lông vũ vẽ dựng đứng, không có sẵn ống."],
  "size": { "width": 0.04, "height": 0.14 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm lông vũ." },
    { "name": "tip", "description": "Đầu nhọn của phiến lông ở phía trên." },
    { "name": "quill", "description": "Gốc cọng lông (phần cứng ở dưới)." }
  ],
  "notes": "Lông dài 0,14 m, nặng khoảng 0,1 g, vẽ dựng đứng (đầu nhọn quay lên). Nhìn rõ hai phiến mịn xẻ thành từng sợi, nhờ đó cảnh vẽ lông rơi nghiêng theo ngẫu nhiên bằng cách xoay cả vật. fill là màu lông."
}
*/
const makeFeather = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const LEN = 0.14;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0006));
  const group = new Konva.Group({ x: p.x, y: p.y });

  /** Cọng lông: đường cong nhẹ từ gốc (dưới) lên đỉnh; x lệch theo hàm bậc hai. */
  const spine = (t: number): [number, number] => [0.006 * Math.sin(t * Math.PI * 0.9) - 0.002 * t, LEN / 2 - t * LEN];
  /** Độ rộng nửa phiến tại vị trí t (0 ở gốc, 1 ở đỉnh): hình giọt nước, rộng nhất ở khoảng 0,55. */
  const width = (t: number) => (t < 0.18 ? 0 : 0.0165 * Math.sin(((t - 0.18) / 0.82) * Math.PI) ** 0.85);

  // Bóng mờ phía dưới để lông nổi trên nền tối.
  group.add(new Konva.Ellipse({ x: m(0.002), y: m(0.002), radiusX: m(0.018), radiusY: m(0.074), fill: "rgba(148,163,184,0.12)", listening: false }));

  // Hai phiến: nhiều sợi lông nhỏ (barb) chạy xiên từ cọng ra mép, màu trắng ngà đổi nhẹ.
  const barbs = 70;
  for (const side of [-1, 1]) {
    for (let i = 0; i < barbs; i += 1) {
      const t = 0.12 + (i / (barbs - 1)) * 0.86;
      const [sx, sy] = spine(t);
      const w = width(t) * (0.92 + 0.12 * Math.sin(i * 1.7));
      if (w <= 0.0006) continue;
      const slant = 0.012 + 0.006 * t;
      const ex = sx + side * w;
      const ey = sy - slant * (1 - t * 0.35);
      const shade = (i + (side > 0 ? 3 : 0)) % 4;
      group.add(new Konva.Line({ points: [m(sx), m(sy), m(sx + side * w * 0.55), m(sy - slant * 0.35), m(ex), m(ey)], stroke: ["#ffffff", "#f1f5f9", "#e2e8f0", "#f8fafc"][shade], strokeWidth: lw * (shade === 0 ? 2.1 : 1.7), lineCap: "round", tension: 0.4, opacity: 0.96, listening: false }));
    }
  }
  // Vài khe xẻ làm phiến lông rách nhẹ ở mép, như lông thật.
  for (const [t, side] of [[0.45, -1], [0.62, 1], [0.78, -1]] as const) {
    const [sx, sy] = spine(t);
    group.add(new Konva.Line({ points: [m(sx + side * 0.004), m(sy - 0.004), m(sx + side * (width(t) + 0.0006)), m(sy - 0.0128)], stroke: "rgba(15,23,42,0.35)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  }
  // Cọng lông cứng: nửa dưới trong suốt, nửa trên chuyển sang sợi mảnh.
  const stem: number[] = [];
  for (let i = 0; i <= 24; i += 1) {
    const [x, y] = spine(i / 24);
    stem.push(m(x), m(y));
  }
  group.add(new Konva.Line({ points: stem, stroke: "#cbd5e1", strokeWidth: m(0.0023), lineCap: "round", tension: 0.3, listening: false }));
  group.add(new Konva.Line({ points: stem, stroke: "#f8fafc", strokeWidth: m(0.0011), lineCap: "round", tension: 0.3, listening: false }));
  const lowerStem: number[] = [];
  for (let i = 0; i <= 5; i += 1) {
    const [x, y] = spine(i / 24 * 1.0);
    lowerStem.push(m(x), m(y));
  }
  group.add(new Konva.Line({ points: lowerStem, stroke: "#9ca3af", strokeWidth: m(0.0022), lineCap: "round", listening: false }));
  // Chân lông: tơ mịn xoè ra hai bên ở gốc.
  const [qx, qy] = spine(0.1);
  for (let i = 0; i < 9; i += 1) {
    const s = i % 2 === 0 ? -1 : 1;
    const k = Math.floor(i / 2);
    group.add(new Konva.Line({ points: [m(qx), m(qy - k * 0.0028), m(qx + s * (0.0045 + k * 0.0012)), m(qy - 0.004 - k * 0.0035), m(qx + s * (0.0065 + k * 0.0018)), m(qy - 0.011 - k * 0.0035)], stroke: "rgba(241,245,249,0.95)", strokeWidth: lw * 1.4, lineCap: "round", tension: 0.5, listening: false }));
  }
  // Vệt sáng dọc phiến phải.
  group.add(new Konva.Line({ points: [m(0.0045), m(0.03), m(0.0085), m(-0.005), m(0.0055), m(-0.04)], stroke: "rgba(255,255,255,0.5)", strokeWidth: lw * 2.4, lineCap: "round", tension: 0.4, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(0.024), y: m(-0.004), text: label, fontSize: m(0.009), fill: "#e2e8f0", listening: false }));
  }

  const tip = spine(1);
  const root = spine(0);
  return { group, parts: {}, points: { center: { x: 0, y: 0 }, tip: { x: m(tip[0]), y: m(tip[1]) }, quill: { x: m(root[0]), y: m(root[1]) } } };
};
