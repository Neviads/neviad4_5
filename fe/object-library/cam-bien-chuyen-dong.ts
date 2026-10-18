/* OBJECT-META
{
  "catalog": "Cảm biến chuyển động (siêu âm)",
  "title": "Cảm biến chuyển động siêu âm: hộp nhựa xanh, đầu phát thu tròn lưới vàng, đèn báo và cáp USB",
  "fill": "#1d4ed8",
  "anchor": "Tâm mặt đầu phát siêu âm (mặt phát).",
  "useWhen": ["Cần cảm biến siêu âm đo vị trí, vận tốc, nhìn từ phía trước vào đầu phát lưới vàng.","Cần hộp xanh có đèn báo và cáp USB nối máy tính."],
  "avoidWhen": ["Cần đo lực treo: dùng cam-bien-luc.","Vẽ nhìn trực diện mặt phát, khác nhiều vật nhìn ngang.","Chùm siêu âm và xung phản xạ không có sẵn, phải do cảnh vẽ thêm."],
  "size": {
    "width": 0.117,
    "height": 0.115
  },
  "parts": [],
  "points": [
    {
      "name": "face",
      "description": "Tâm mặt đầu phát; chùm siêu âm đi vuông góc ra ngoài mặt phẳng hình."
    },
    {
      "name": "led",
      "description": "Đèn báo trạng thái."
    },
    {
      "name": "cable",
      "description": "Chỗ cáp USB ra khỏi thân."
    }
  ],
  "notes": "Vẽ nhìn từ phía trước vào đầu phát: một vòng lưới vàng lõm trong hộp, hai vòng tròn đồng tâm. Chùm siêu âm và các xung phản xạ do cảnh vẽ (metrics.items). fill là màu vỏ nhựa."
}
*/
const makeMotionSensor = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.114;
  const H = 0.082;
  const R = 0.031;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Cáp USB: sợi xoắn nhẹ đi xuống từ cạnh dưới.
  group.add(new Konva.Line({ points: [m(0.025), m(H / 2 - 0.002), m(0.027), m(H / 2 + 0.012), m(0.05), m(H / 2 + 0.02), m(0.06), m(H / 2 + 0.033)], stroke: "#0b0f19", strokeWidth: m(0.0042), tension: 0.5, lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(0.025), m(H / 2 - 0.002), m(0.027), m(H / 2 + 0.012), m(0.05), m(H / 2 + 0.02), m(0.06), m(H / 2 + 0.033)], stroke: "rgba(255,255,255,0.13)", strokeWidth: m(0.0012), tension: 0.5, lineCap: "round", listening: false }));

  // Thân hộp nhựa bo góc có gờ bảo vệ.
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(-H / 2), width: m(W), height: m(H), cornerRadius: m(0.012), ...lin(m(-W / 2), m(-H / 2), m(W / 2), m(H / 2), [0, "#93c5fd", 0.2, fill, 0.85, "#0b1e63", 1, "#050c24"]), stroke: "#020617", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.016), shadowOpacity: 0.5, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.005), y: m(-H / 2 + 0.005), width: m(W - 0.01), height: m(H - 0.01), cornerRadius: m(0.009), stroke: "rgba(191,219,254,0.35)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: [m(-W / 2 + 0.012), m(-H / 2 + 0.0035), m(W / 2 - 0.012), m(-H / 2 + 0.0035)], stroke: "rgba(255,255,255,0.55)", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));

  // Đầu phát: khoang tròn lõm, lưới vàng với các vòng đồng tâm và lỗ.
  group.add(new Konva.Circle({ radius: m(R + 0.004), ...lin(m(-R), m(-R), m(R), m(R), [0, "#020617", 1, "#1e3a8a"]), stroke: "#000", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ radius: m(R), fillRadialGradientStartPoint: { x: m(-0.008), y: m(-0.01) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "#fde68a", 0.5, "#d4a73a", 1, "#7c5a1a"], stroke: "#4a3510", strokeWidth: lw, listening: false }));
  for (let r = 0.006; r < R; r += 0.0045) group.add(new Konva.Circle({ radius: m(r), stroke: "rgba(74,53,16,0.45)", strokeWidth: lw * 0.8, listening: false }));
  for (let i = 0; i < 24; i += 1) {
    const a = (i * Math.PI * 2) / 24;
    group.add(new Konva.Line({ points: [m(0.003 * Math.cos(a)), m(0.003 * Math.sin(a)), m((R - 0.002) * Math.cos(a)), m((R - 0.002) * Math.sin(a))], stroke: "rgba(74,53,16,0.28)", strokeWidth: lw * 0.7, listening: false }));
  }
  group.add(new Konva.Circle({ radius: m(0.0085), fillRadialGradientStartPoint: { x: m(-0.0025), y: m(-0.003) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0085), fillRadialGradientColorStops: [0, "#fff7d1", 0.5, "#c8962f", 1, "#6b4a10"], stroke: "#4a3510", strokeWidth: lw, listening: false }));
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(R - 0.005), outerRadius: m(R - 0.0025), angle: 60, rotation: 205, fill: "rgba(255,255,255,0.5)", listening: false }));

  // Nhãn, đèn báo và vạch chọn khoảng đo (hai chế độ: gần/xa).
  group.add(new Konva.Text({ x: m(-W / 2 + 0.008), y: m(-H / 2 + 0.0075), text: "MOTION", fontSize: m(0.0072), fontStyle: "bold", fill: "#dbeafe", listening: false }));
  group.add(new Konva.Text({ x: m(-W / 2 + 0.008), y: m(H / 2 - 0.0165), text: "0,15 – 6 m", fontSize: m(0.0058), fill: "#bfdbfe", listening: false }));
  group.add(new Konva.Circle({ x: m(W / 2 - 0.011), y: m(-H / 2 + 0.011), radius: m(0.0028), fill: "#22c55e", shadowColor: "#22c55e", shadowBlur: m(0.007), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Rect({ x: m(W / 2 - 0.028), y: m(H / 2 - 0.0165), width: m(0.019), height: m(0.0085), cornerRadius: m(0.004), fill: "#0b0f19", stroke: "#475569", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Circle({ x: m(W / 2 - 0.0215), y: m(H / 2 - 0.0123), radius: m(0.0033), fill: "#cbd5e1", listening: false }));
  group.add(new Konva.Rect({ x: m(0.0205), y: m(H / 2 - 0.004), width: m(0.009), height: m(0.005), cornerRadius: m(0.001), fill: "#0b0f19", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-W / 2), y: m(H / 2 + 0.006), width: m(W), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { face: { x: 0, y: 0 }, led: { x: m(W / 2 - 0.011), y: m(-H / 2 + 0.011) }, cable: { x: m(0.025), y: m(H / 2) } } };
};
