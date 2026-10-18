/* OBJECT-META
{
  "catalog": "Lá vàng mỏng",
  "title": "Lá vàng mỏng cho thí nghiệm tán xạ: tấm vàng ánh kim kẹp trong khung tròn nhôm trên giá, kèm hình phóng to các nguyên tử vàng trong một lát cắt",
  "fill": "#facc15",
  "anchor": "Tâm lá vàng.",
  "useWhen": ["Cần lá vàng mỏng 0,5 µm trong khung nhôm tròn cho thí nghiệm tán xạ hạt alpha Rutherford.", "Cảnh cần hình phóng to các nguyên tử vàng kèm điểm center nhận chùm alpha."],
  "avoidWhen": ["Cần nguồn hạt alpha hay hạt alpha: dùng nguon-phong-xa, hat-alpha.", "Cần màn huỳnh quang hiện vết tán xạ: dùng man-huynh-quang; lá vàng không kèm màn hay nguồn."],
  "size": { "width": 0.123, "height": 0.125 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm lá vàng, nơi chùm alpha tới." },
    { "name": "frameTop", "description": "Mép trên của khung." },
    { "name": "base", "description": "Chân giá ở mặt bàn." }
  ],
  "notes": "Lá vàng dày khoảng 0,5 µm (vài nghìn lớp nguyên tử), đường kính 0,04 m, kẹp trong khung nhôm tròn 0,06 m trên giá thép. Hình tròn nhỏ ở phía dưới phóng to cấu trúc mạng các nguyên tử vàng mà hạt alpha xuyên qua. fill là màu vàng của lá."
}
*/
const makeGoldFoil = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cy = -0.095;
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];

  group.add(new Konva.Ellipse({ x: 0, y: m(-0.006), radiusX: m(0.036), radiusY: m(0.0058), fillLinearGradientStartPoint: { x: m(-0.036), y: 0 }, fillLinearGradientEndPoint: { x: m(0.036), y: 0 }, fillLinearGradientColorStops: [0, "#475569", 0.3, "#e2e8f0", 1, "#334155"], stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0035), y: m(cy + 0.03), width: m(0.007), height: m(-0.006 - cy - 0.03), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(0.007), y: 0 }, fillLinearGradientColorStops: steel, stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0135), y: m(cy + 0.028), width: m(0.027), height: m(0.01), cornerRadius: m(0.0025), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(0.027), y: 0 }, fillLinearGradientColorStops: [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"], stroke: "#1e293b", strokeWidth: lw, listening: false }));

  // Khung nhôm tròn kẹp lá vàng.
  group.add(new Konva.Circle({ x: 0, y: m(cy), radius: m(0.03), fillLinearGradientStartPoint: { x: m(-0.03), y: m(-0.03) }, fillLinearGradientEndPoint: { x: m(0.03), y: m(0.03) }, fillLinearGradientColorStops: [0, "#f8fafc", 0.5, "#94a3b8", 1, "#334155"], stroke: "#0f172a", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(cy), radius: m(0.0215), fillLinearGradientStartPoint: { x: m(-0.02), y: m(-0.02) }, fillLinearGradientEndPoint: { x: m(0.02), y: m(0.02) }, fillLinearGradientColorStops: [0, "#fef9c3", 0.3, fill, 0.7, "#ca8a04", 1, "#713f12"], stroke: "#713f12", strokeWidth: lw, listening: false }));
  group.add(new Konva.Arc({ x: 0, y: m(cy), innerRadius: m(0.0145), outerRadius: m(0.0185), angle: 62, rotation: 200, fill: "rgba(255,255,255,0.7)", listening: false }));
  for (const [dx, dy, rr] of [[0.006, -0.004, 0.004], [-0.008, 0.008, 0.003], [0.01, 0.01, 0.0025]] as [number, number, number][]) group.add(new Konva.Ellipse({ x: m(dx), y: m(cy + dy), radiusX: m(rr * 1.6), radiusY: m(rr * 0.5), fill: "rgba(255,255,255,0.3)", rotation: 25, listening: false }));
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) group.add(new Konva.Circle({ x: m(sx * 0.0255), y: m(cy + sy * 0.0255), radius: m(0.0024), fill: "#e2e8f0", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));

  // Hình phóng to: một lát cắt gồm các hàng nguyên tử vàng trong vòng tròn.
  const lx = 0.068;
  const ly = cy;
  group.add(new Konva.Circle({ x: m(lx + 0.0), y: m(ly), radius: m(0.0185), fill: "#0b1220", stroke: "#fbbf24", strokeWidth: lw * 1.2, listening: false }));
  for (let r = -2; r <= 2; r += 1) for (let c = -2; c <= 2; c += 1) {
    const x = lx + c * 0.0062 + (r % 2 ? 0.0031 : 0);
    const y = ly + r * 0.0055;
    if ((x - lx) ** 2 + (y - ly) ** 2 > 0.0148 ** 2) continue;
    group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(0.0024), fillRadialGradientStartPoint: { x: m(-0.0007), y: m(-0.0008) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0024), fillRadialGradientColorStops: [0, "#ffffff", 0.35, fill, 1, "#854d0e"], listening: false }));
  }
  group.add(new Konva.Line({ points: [m(0.0215), m(cy - 0.004), m(lx - 0.0185), m(ly - 0.004), m(0.0215), m(cy + 0.004), m(lx - 0.0185), m(ly + 0.004)], stroke: "rgba(251,191,36,0.5)", strokeWidth: lw * 0.8, dash: [m(0.002), m(0.0015)], listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.008), width: m(0.12), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: m(cy) }, frameTop: { x: 0, y: m(cy - 0.03) }, base: { x: 0, y: 0 } } };
};
