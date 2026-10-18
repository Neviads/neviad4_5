/* OBJECT-META
{
  "catalog": "Tàu vũ trụ / trạm vũ trụ",
  "title": "Trạm vũ trụ nhiều module: khoang trụ ở giữa, giàn thép ngang mang bốn cặp cánh pin Mặt Trời, tản nhiệt, cửa ghép nối và tàu con thoi đã ghép vào",
  "fill": "#e5e7eb",
  "anchor": "Tâm giàn thép chính, giữa trạm.",
  "useWhen": ["Cần trạm vũ trụ sơ đồ nhiều module, giàn thép, bốn cặp cánh pin Mặt Trời và tàu con thoi ghép nối.","Cần bài toán không trọng lượng trên quỹ đạo."],
  "avoidWhen": ["Cần vệ tinh nhân tạo đơn giản: dùng ve-tinh-nhan-tao; tên lửa phóng: dùng ten-lua.","Mô hình rút gọn 1,4 m so với thực 109 m, không đúng tỉ lệ chi tiết."],
  "size": { "width": 1.2, "height": 0.624 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm giàn thép chính." },
    { "name": "dock", "description": "Cửa ghép nối ở đầu bên phải của khoang." },
    { "name": "arrayLeft", "description": "Giữa cánh pin ngoài cùng bên trái." },
    { "name": "arrayRight", "description": "Giữa cánh pin ngoài cùng bên phải." }
  ],
  "notes": "Mô hình sơ đồ rộng 1,4 m (thực 109 m) gồm giàn thép 1,2 m mang bốn cặp cánh pin 0,12 m × 0,3 m ở hai đầu, ba khoang hình trụ dọc theo trục, hai tấm tản nhiệt trắng và một tàu ghép nối ở bên phải. Trạm ở quỹ đạo nên mọi vật bên trong ở trạng thái không trọng lượng. fill là màu vỏ khoang."
}
*/
const makeSpaceStation = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0035));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cyl = (x: number, y: number, w: number, h: number, c: string) => {
    group.add(new Konva.Rect({ x: m(x), y: m(y), width: m(w), height: m(h), cornerRadius: m(0.012), ...lin(0, 0, 0, m(h), [0, "#ffffff", 0.3, c, 0.75, "#64748b", 1, "#1e293b"]), stroke: "#334155", strokeWidth: lw, listening: false }));
    group.add(new Konva.Line({ points: [m(x + 0.012), m(y + h * 0.18), m(x + w - 0.012), m(y + h * 0.18)], stroke: "rgba(255,255,255,0.7)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  };
  const solar = (cx: number, cy: number, w: number, h: number) => {
    group.add(new Konva.Rect({ x: m(cx - w / 2), y: m(cy - h / 2), width: m(w), height: m(h), ...lin(0, 0, m(w), m(h), [0, "#1d4ed8", 0.5, "#1e3a8a", 1, "#0b1a4a"]), stroke: "#e2e8f0", strokeWidth: lw, listening: false }));
    for (let i = 1; i < 6; i += 1) group.add(new Konva.Line({ points: [m(cx - w / 2), m(cy - h / 2 + (i * h) / 6), m(cx + w / 2), m(cy - h / 2 + (i * h) / 6)], stroke: "rgba(147,197,253,0.4)", strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Line({ points: [m(cx), m(cy - h / 2), m(cx), m(cy + h / 2)], stroke: "rgba(147,197,253,0.4)", strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Line({ points: [m(cx - w / 2 + 0.005), m(cy - h / 2 + 0.005), m(cx - 0.005), m(cy - h / 2 + 0.005), m(cx - w / 2 + 0.005), m(cy - 0.01)], closed: true, fill: "rgba(255,255,255,0.15)", listening: false }));
  };

  // Giàn thép chính (ngang) có các thanh chéo.
  group.add(new Konva.Rect({ x: m(-0.6), y: m(-0.011), width: m(1.2), height: m(0.022), ...lin(0, 0, 0, m(0.022), [0, "#e2e8f0", 0.5, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 24; i += 1) group.add(new Konva.Line({ points: [m(-0.6 + i * 0.05), m(-0.011), m(-0.575 + i * 0.05), m(0.011), m(-0.55 + i * 0.05), m(-0.011)], stroke: "rgba(15,23,42,0.6)", strokeWidth: lw * 0.7, listening: false }));
  // Hai bộ cánh pin ở hai đầu giàn: hai cặp trên – dưới mỗi bên.
  for (const sx of [-1, 1]) {
    for (const [sy, off] of [[-1, 0.012], [1, 0.012]] as [number, number][]) {
      for (let k = 0; k < 2; k += 1) solar(sx * (0.52 - k * 0.14), sy * (off + 0.15), 0.12, 0.3);
    }
    group.add(new Konva.Line({ points: [m(sx * 0.52), m(-0.17), m(sx * 0.52), m(0.17)], stroke: "#94a3b8", strokeWidth: m(0.006), listening: false }));
    group.add(new Konva.Line({ points: [m(sx * 0.38), m(-0.17), m(sx * 0.38), m(0.17)], stroke: "#94a3b8", strokeWidth: m(0.006), listening: false }));
  }
  // Tản nhiệt trắng treo dưới giàn gần tâm.
  for (const x of [-0.17, 0.17]) {
    group.add(new Konva.Rect({ x: m(x - 0.04), y: m(0.014), width: m(0.08), height: m(0.17), ...lin(0, 0, m(0.08), 0, [0, "#f8fafc", 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw * 0.8, listening: false }));
    for (let i = 1; i < 6; i += 1) group.add(new Konva.Line({ points: [m(x - 0.04), m(0.014 + i * 0.0283), m(x + 0.04), m(0.014 + i * 0.0283)], stroke: "rgba(71,85,105,0.5)", strokeWidth: lw * 0.6, listening: false }));
  }
  // Khoang trụ ở giữa: ba module nối tiếp, chỏm tròn, cửa sổ, cửa ghép nối ở phải.
  cyl(-0.14, -0.04, 0.17, 0.08, fill);
  cyl(0.03, -0.034, 0.12, 0.068, "#f1f5f9");
  cyl(-0.28, -0.03, 0.14, 0.06, "#e2e8f0");
  for (const x of [-0.1, -0.05, 0.0]) group.add(new Konva.Circle({ x: m(x), y: m(-0.01), radius: m(0.0065), fill: "#0b1220", stroke: "#94a3b8", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(0.15), y: m(-0.014), width: m(0.02), height: m(0.028), cornerRadius: m(0.004), ...lin(0, 0, 0, m(0.028), [0, "#fef3c7", 0.5, "#d97706", 1, "#78350f"]), stroke: "#451a03", strokeWidth: lw, listening: false }));
  // Tàu ghép nối ở bên phải: thân thon, cửa sổ phía trước, hai cánh nhỏ.
  group.add(new Konva.Line({ points: [m(0.17), m(-0.012), m(0.24), m(-0.034), m(0.34), m(-0.03), m(0.37), m(-0.01), m(0.37), m(0.01), m(0.34), m(0.03), m(0.24), m(0.034), m(0.17), m(0.012)], closed: true, tension: 0.12, ...lin(0, 0, 0, m(0.07), [0, "#ffffff", 0.4, "#cbd5e1", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw, lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(0.3), m(-0.0275), m(0.355), m(-0.0235), m(0.36), m(-0.008), m(0.31), m(-0.012)], closed: true, fill: "#0b1220", stroke: "#e2e8f0", strokeWidth: lw * 0.8, lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(0.2), m(-0.03), m(0.23), m(-0.07), m(0.26), m(-0.03)], closed: true, fill: "#cbd5e1", stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Line({ points: [m(0.2), m(0.03), m(0.23), m(0.07), m(0.26), m(0.03)], closed: true, fill: "#cbd5e1", stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Circle({ radius: m(0.016), ...lin(m(-0.016), m(-0.016), m(0.016), m(0.016), [0, "#f8fafc", 1, "#475569"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.3), y: m(0.22), width: m(0.6), align: "center", text: label, fontSize: m(0.03), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, dock: { x: m(0.17), y: 0 }, arrayLeft: { x: m(-0.52), y: 0 }, arrayRight: { x: m(0.52), y: 0 } } };
};
