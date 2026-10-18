/* OBJECT-META
{
  "catalog": "Quả cầu kim loại tích điện (trên chân cách điện)",
  "title": "Quả cầu kim loại đặc bóng loáng gắn trên trụ cách điện bằng nhựa trong suốt, đế nặng có chân tròn, dấu + phân bố trên mặt cầu",
  "fill": "#cbd5e1",
  "anchor": "Giữa chân đế, chạm mặt bàn.",
  "useWhen": ["Cần quả cầu đồng mạ crôm bán kính 0,03 m trên trụ cách điện acrylic và đế gang tròn, dấu + trên mặt cầu.","Cần minh hoạ điện tích phân bố đều trên cầu dẫn."],
  "avoidWhen": ["Cần quả cầu bấc nhẹ treo dây để thử hút đẩy: dùng qua-cau-bac.","Cần máy phát tĩnh điện kiểu Van de Graaff: dùng may-phat-tinh-dien."],
  "size": { "width": 0.072, "height": 0.148 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa chân đế." },
    { "name": "center", "description": "Tâm quả cầu." },
    { "name": "top", "description": "Đỉnh quả cầu." }
  ],
  "notes": "Quả cầu đồng mạ crôm bán kính 0,03 m, trụ cách điện (acrylic) dài 0,07 m đường kính 0,01 m, đế gang tròn bán kính 0,035 m. Điện tích phân bố đều trên mặt cầu; điện trường ngoài như của điện tích điểm đặt tại tâm. fill là màu kim loại mạ."
}
*/
const makeChargedSphere = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.03;
  const cy = -0.118;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Đế gang tròn: elip dày với mặt trên sáng.
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.004), radiusX: m(0.035), radiusY: m(0.0065), ...lin(0, 0, m(0.07), 0, [0, "#475569", 0.3, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.0075), radiusX: m(0.0165), radiusY: m(0.0035), fill: "#e2e8f0", stroke: "#475569", strokeWidth: lw * 0.7, listening: false }));
  // Trụ cách điện acrylic trong suốt, gắn vòng thép hai đầu.
  group.add(new Konva.Rect({ x: m(-0.005), y: m(cy + R - 0.002), width: m(0.01), height: m(0.07 + 0.004), cornerRadius: m(0.002), ...lin(0, 0, m(0.01), 0, [0, "rgba(186,230,253,0.55)", 0.3, "rgba(255,255,255,0.75)", 0.7, "rgba(125,211,252,0.3)", 1, "rgba(30,64,175,0.35)"]), stroke: "rgba(226,240,252,0.95)", strokeWidth: lw, listening: false }));
  group.add(ln([-0.0025, cy + R + 0.002, -0.0025, cy + R + 0.066], "rgba(255,255,255,0.85)", lw * 1.2));
  group.add(new Konva.Rect({ x: m(-0.0075), y: m(-0.016), width: m(0.015), height: m(0.007), cornerRadius: m(0.0015), ...lin(0, 0, m(0.015), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0075), y: m(cy + R + 0.0), width: m(0.015), height: m(0.006), cornerRadius: m(0.0015), ...lin(0, 0, m(0.015), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));

  // Quả cầu crôm bóng: gradient hướng sáng trên-trái, phản chiếu môi trường chân trời, bóng cực đại trắng.
  group.add(new Konva.Circle({ x: 0, y: m(cy), radius: m(R), fillRadialGradientStartPoint: { x: m(-0.011), y: m(-0.012) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: m(0.004), y: m(0.004) }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "#ffffff", 0.2, "#e2e8f0", 0.55, fill, 0.85, "#64748b", 1, "#1e293b"], stroke: "#334155", strokeWidth: lw * 1.1, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.5, shadowOffset: { x: m(0.003), y: m(0.005) }, listening: false }));
  group.add(new Konva.Arc({ x: 0, y: m(cy), innerRadius: m(R - 0.0085), outerRadius: m(R - 0.0045), angle: 62, rotation: 200, fill: "rgba(255,255,255,0.8)", listening: false }));
  group.add(new Konva.Ellipse({ x: m(0.002), y: m(cy + 0.017), radiusX: m(0.016), radiusY: m(0.0055), fill: "rgba(30,41,59,0.28)", listening: false }));
  group.add(ln([-0.027, cy + 0.002, 0.027, cy + 0.002], "rgba(15,23,42,0.18)", lw * 1.1));
  group.add(new Konva.Circle({ x: m(-0.0125), y: m(cy - 0.0145), radius: m(0.0042), fill: "#fff", listening: false }));
  // Điện tích dương phân bố đều ở mặt cầu: các dấu + nhỏ đỏ.
  for (let k = 0; k < 10; k += 1) {
    const a = ((k * 36 + 12) * Math.PI) / 180;
    const x = Math.cos(a) * (R - 0.0045);
    const y = cy + Math.sin(a) * (R - 0.0045);
    group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(0.0034), fill: "rgba(220,38,38,0.88)", stroke: "#7f1d1d", strokeWidth: lw * 0.5, listening: false }));
    group.add(ln([x - 0.002, y, x + 0.002, y], "#fff", lw * 0.8));
    group.add(ln([x, y - 0.002, x, y + 0.002], "#fff", lw * 0.8));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.006), width: m(0.12), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, center: { x: 0, y: m(cy) }, top: { x: 0, y: m(cy - R) } } };
};
