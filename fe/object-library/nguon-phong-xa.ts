/* OBJECT-META
{
  "catalog": "Nguồn phóng xạ (hộp chì có lỗ)",
  "title": "Nguồn phóng xạ trong hộp chì cắt dọc: khối chì dày, khoang chứa chất phóng xạ và rãnh hẹp cho chùm hạt thoát ra ở phía trước, có biển cảnh báo",
  "fill": "#64748b",
  "anchor": "Giữa đáy hộp, chạm mặt bàn.",
  "useWhen": ["Cần nguồn hạt phóng xạ (alpha, beta) bọc chì, chỉ cho chùm hẹp thoát ra một phía.", "Cảnh minh hoạ che chắn bằng chì hoặc tạo chùm hạt hẹp hướng sang phải."],
  "avoidWhen": ["Cần ống đếm hạt: dùng ong-geiger; cần nguyên tử hay hạt nhân riêng lẻ: dùng nguyen-tu-bohr.", "Vật chỉ là hộp cắt dọc cố định, chùm hạt phải do cảnh tự vẽ."],
  "size": { "width": 0.074, "height": 0.07 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy hộp." },
    { "name": "source", "description": "Tâm chất phóng xạ trong khoang." },
    { "name": "aperture", "description": "Miệng lỗ cho chùm hạt thoát ra ở mặt phải." }
  ],
  "notes": "Khối chì 0,06 m × 0,06 m, thành dày ≥ 0,02 m hấp thụ tia; khoang chứa mẫu radi/poloni đường kính 0,008 m, rãnh hẹp rộng 0,004 m mở sang phải để thành chùm hạt hẹp. Chùm hạt do cảnh vẽ. fill là màu chì."
}
*/
const makeLeadSource = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const W = 0.06;
  const H = 0.06;
  const cy = -0.034;

  group.add(new Konva.Rect({ x: m(-W / 2 - 0.004), y: m(-0.004), width: m(W + 0.008), height: m(0.004), cornerRadius: m(0.001), fill: "#0f172a", listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(-H - 0.004), width: m(W), height: m(H), cornerRadius: m(0.003), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(W), y: m(H) }, fillLinearGradientColorStops: [0, "#cbd5e1", 0.35, fill, 1, "#1e293b"], stroke: "#0f172a", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.5, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  for (let i = 0; i < 5; i += 1) group.add(new Konva.Line({ points: [m(-W / 2 + 0.004), m(-H + i * 0.011), m(W / 2 - 0.004), m(-H + i * 0.011 + 0.002)], stroke: "rgba(15,23,42,0.16)", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Line({ points: [m(-W / 2 + 0.003), m(-H - 0.0015), m(W / 2 - 0.003), m(-H - 0.0015)], stroke: "rgba(255,255,255,0.5)", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));
  // Khoang chứa và rãnh thoát.
  group.add(new Konva.Rect({ x: m(0), y: m(cy - 0.002), width: m(W / 2), height: m(0.004), fill: "#020617", listening: false }));
  group.add(new Konva.Circle({ x: m(-0.003), y: m(cy), radius: m(0.0095), fill: "#020617", stroke: "#475569", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: m(-0.003), y: m(cy), radius: m(0.0042), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0042), fillRadialGradientColorStops: [0, "#fff", 0.4, "#86efac", 1, "#15803d"], shadowColor: "#4ade80", shadowBlur: m(0.01), shadowOpacity: 0.9, listening: false }));
  // Biển cảnh báo bức xạ ba cánh.
  const ax = -0.018;
  const ay = -0.012;
  group.add(new Konva.Circle({ x: m(ax), y: m(ay), radius: m(0.0095), fill: "#facc15", stroke: "#1f2937", strokeWidth: lw, listening: false }));
  for (let k = 0; k < 3; k += 1) group.add(new Konva.Arc({ x: m(ax), y: m(ay), innerRadius: m(0.0018), outerRadius: m(0.0075), angle: 60, rotation: k * 120 - 120, fill: "#111827", listening: false }));
  group.add(new Konva.Circle({ x: m(ax), y: m(ay), radius: m(0.0014), fill: "#111827", listening: false }));
  group.add(new Konva.Text({ x: m(0.002), y: m(-0.0155), width: m(0.026), align: "center", text: "Pb", fontSize: m(0.0078), fontStyle: "bold", fill: "rgba(15,23,42,0.75)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.006), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, source: { x: m(-0.003), y: m(cy) }, aperture: { x: m(W / 2), y: m(cy) } } };
};
