/* OBJECT-META
{
  "catalog": "Kính lọc màu",
  "title": "Kính lọc màu đỏ bằng thuỷ tinh tấm vuông trong khung kim loại có tay cầm, cạnh khung hở để cắm vào giá",
  "fill": "#ef4444",
  "anchor": "Tâm tấm kính lọc.",
  "useWhen": ["Cần tấm kính lọc màu vuông 0,06 m trong khung có tay cầm, cắm vào giá trên đường truyền ánh sáng.", "Cảnh cần chỉ cho một dải màu đi qua (đỏ 620–700 nm); đổi màu bằng fill."],
  "avoidWhen": ["Cần lọc phân cực xoay được theo góc: dùng kinh-phan-cuc.", "Cần lăng kính tán sắc ánh sáng trắng: dùng lang-kinh; kính lọc không tán sắc."],
  "size": { "width": 0.1, "height": 0.15 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm tấm kính lọc, trên trục chính." },
    { "name": "handle", "description": "Đầu tay cầm ở phía dưới." }
  ],
  "notes": "Tấm kính vuông 0,06 m × 0,06 m. Chỉ cho một dải màu đi qua (đỏ: 620–700 nm), hấp thụ phần còn lại; đổi màu bằng cách đổi tham số fill (xanh lục, xanh dương, vàng …). Mặt sau của tấm kính hiện bóng mờ để thấy tính trong suốt. fill là màu của kính lọc."
}
*/
const makeColorFilter = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cy = -0.115;
  const S = 0.06;

  // Chân đế tròn và thanh tay cầm thép nối với khung.
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.006), radiusX: m(0.05), radiusY: m(0.0065), ...lin(m(-0.05), 0, m(0.05), 0, [0, "#475569", 0.3, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.004), y: m(cy + S / 2 + 0.003), width: m(0.008), height: m(-cy - S / 2 - 0.009), ...lin(m(-0.004), 0, m(0.004), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0165), y: m(cy + S / 2 - 0.0005), width: m(0.033), height: m(0.012), cornerRadius: m(0.003), ...lin(m(-0.0165), 0, m(0.0165), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));

  // Kính lọc: tấm kính nhuộm màu trong khung nhôm vát, bóng đổ nhuộm màu xuống mặt phía sau.
  group.add(new Konva.Rect({ x: m(-S / 2 + 0.008), y: m(cy - S / 2 + 0.006), width: m(S), height: m(S), cornerRadius: m(0.002), fill: fill, opacity: 0.2, listening: false }));
  group.add(new Konva.Rect({ x: m(-S / 2 - 0.004), y: m(cy - S / 2 - 0.004), width: m(S + 0.008), height: m(S + 0.008), cornerRadius: m(0.004), ...lin(m(-S / 2), m(cy - S / 2), m(S / 2), m(cy + S / 2), [0, "#f8fafc", 0.5, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(-S / 2), y: m(cy - S / 2), width: m(S), height: m(S), cornerRadius: m(0.0015), fill: fill, opacity: 0.78, stroke: "rgba(15,23,42,0.45)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-S / 2), y: m(cy - S / 2), width: m(S), height: m(S), cornerRadius: m(0.0015), ...lin(m(-S / 2), m(cy - S / 2), m(S / 2), m(cy + S / 2), [0, "rgba(255,255,255,0.55)", 0.22, "rgba(255,255,255,0.1)", 0.5, "rgba(0,0,0,0)", 1, "rgba(0,0,0,0.3)"]), listening: false }));
  group.add(new Konva.Line({ points: [m(-S / 2 + 0.0055), m(cy - S / 2 + 0.0055), m(-S / 2 + 0.0055), m(cy + S / 2 - 0.0055)], stroke: "rgba(255,255,255,0.7)", strokeWidth: lw * 2.2, lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(-S / 2 + 0.01), m(cy - S / 2 + 0.0035), m(S / 2 - 0.01), m(cy - S / 2 + 0.0035)], stroke: "rgba(255,255,255,0.55)", strokeWidth: lw * 1.6, lineCap: "round", listening: false }));
  // Bốn ốc ở góc khung.
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) group.add(new Konva.Circle({ x: m(sx * (S / 2 + 0.0015)), y: m(cy + sy * (S / 2 + 0.0015)), radius: m(0.0021), fill: "#e2e8f0", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Text({ x: m(-S / 2), y: m(cy + S / 2 - 0.0125), width: m(S), align: "center", text: "620–700 nm", fontSize: m(0.0062), fontStyle: "bold", fill: "rgba(255,255,255,0.88)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.008), width: m(0.12), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: m(cy) }, handle: { x: 0, y: m(cy + S / 2 + 0.03) } } };
};
