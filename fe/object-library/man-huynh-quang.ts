/* OBJECT-META
{
  "catalog": "Màn huỳnh quang ZnS / kính hiển vi đếm chớp",
  "title": "Kính hiển vi đếm chớp của thí nghiệm Rutherford: màn ZnS huỳnh quang gắn ở đầu ống kính xoay quanh bệ tròn có vạch độ, tâm là vị trí lá vàng",
  "fill": "#4ade80",
  "anchor": "Tâm bệ tròn, nơi đặt lá vàng.",
  "useWhen": ["Cần kính đếm chớp có màn ZnS xoay quanh lá vàng trong thí nghiệm tán xạ Rutherford.","Cần bệ tròn chia độ để đọc góc tán xạ của hạt alpha."],
  "avoidWhen": ["Cần màn trắng hứng ảnh quang học: dùng man-chan.","Cần kính hiển vi quan sát vật nhỏ thông thường: dùng kinh-hien-vi.","Chưa có lá vàng và nguồn alpha, phải ghép thêm la-vang và hat-alpha."],
  "size": { "width": 0.256, "height": 0.152 },
  "parts": [
    { "name": "scope", "label": "Kính hiển vi đếm chớp", "motion": "rotate", "min": -150, "max": 150, "description": "Góc quay của kính hiển vi quanh tâm bệ, độ theo chiều kim đồng hồ khi nhìn từ trên xuống; 0° là kính nằm ngang phía bên phải, chĩa vào tâm." }
  ],
  "points": [
    { "name": "center", "description": "Tâm bệ tròn, chỗ đặt lá vàng." },
    { "name": "screen", "description": "Màn ZnS ở đầu ống khi kính ở 0°." },
    { "name": "eyepiece", "description": "Thị kính ở đuôi ống khi kính ở 0°." }
  ],
  "notes": "Hình vẽ nhìn từ trên xuống: bệ tròn bán kính 0,07 m chia độ mỗi 10°, ống kính dài 0,12 m có màn ZnS cách tâm 0,04 m; khi hạt alpha đập vào màn ZnS nó loé sáng và người quan sát đếm chớp qua thị kính. Quay kính từ −150° đến +150° để đo số hạt tán xạ theo góc. fill là màu loé sáng của ZnS."
}
*/
const makeScintillationScope = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const TR = 0.07;
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const tb = (g: Konva.Group, x0: number, x1: number, hw: number, stops: (number | string)[]) => g.add(new Konva.Rect({ x: m(x0), y: m(-hw), width: m(x1 - x0), height: m(hw * 2), cornerRadius: m(0.002), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(hw * 2) }, fillLinearGradientColorStops: stops, stroke: "#030712", strokeWidth: lw, listening: false }));

  // Bệ tròn chia độ: mặt tối viền thép, vạch mỗi 5°, số mỗi 30°.
  group.add(new Konva.Circle({ radius: m(TR + 0.006), fillLinearGradientStartPoint: { x: m(-TR), y: m(-TR) }, fillLinearGradientEndPoint: { x: m(TR), y: m(TR) }, fillLinearGradientColorStops: steel, stroke: "#0f172a", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.45, shadowOffset: { x: m(0.003), y: m(0.005) }, listening: false }));
  group.add(new Konva.Circle({ radius: m(TR - 0.002), fill: "#0b1220", stroke: "#475569", strokeWidth: lw * 0.8, listening: false }));
  for (let d = 0; d < 360; d += 5) {
    const a = (d * Math.PI) / 180;
    const r1 = TR + 0.0035;
    const r2 = r1 - (d % 30 === 0 ? 0.0075 : 0.004);
    group.add(new Konva.Line({ points: [m(r1 * Math.cos(a)), m(r1 * Math.sin(a)), m(r2 * Math.cos(a)), m(r2 * Math.sin(a))], stroke: d % 30 === 0 ? "#0f172a" : "rgba(15,23,42,0.7)", strokeWidth: d % 30 === 0 ? lw : lw * 0.55, listening: false }));
  }
  for (let d = 0; d < 360; d += 30) {
    const a = (d * Math.PI) / 180;
    group.add(new Konva.Text({ x: m((TR - 0.0135) * Math.cos(a) - 0.008), y: m((TR - 0.0135) * Math.sin(a) - 0.0032), width: m(0.016), align: "center", text: String(d), fontSize: m(0.0055), fill: "#94a3b8", listening: false }));
  }
  // Lá vàng ở tâm: đĩa nhỏ có giá đỡ và chùm alpha từ nguồn bên trái.
  group.add(new Konva.Rect({ x: m(-0.0028), y: m(-0.015), width: m(0.0056), height: m(0.03), cornerRadius: m(0.001), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(0.0056), y: 0 }, fillLinearGradientColorStops: [0, "#fef9c3", 0.5, "#facc15", 1, "#854d0e"], stroke: "#713f12", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.06), 0, m(-0.003), 0], stroke: "rgba(251,191,36,0.55)", strokeWidth: lw, dash: [m(0.004), m(0.003)], listening: false }));
  group.add(new Konva.Rect({ x: m(-0.064), y: m(-0.0085), width: m(0.012), height: m(0.017), fill: "#374151", stroke: "#0f172a", strokeWidth: lw, listening: false }));

  // BỘ PHẬN QUAY: kính hiển vi chĩa về phía +x, gốc nhóm là tâm bệ: màn ZnS, ống vật kính, thân và thị kính.
  const scope = new Konva.Group();
  scope.add(new Konva.Line({ points: [m(0.025), 0, m(0.1), 0], stroke: "rgba(15,23,42,0.5)", strokeWidth: m(0.002), listening: false }));
  tb(scope, 0.035, 0.1, 0.0075, [0, "#e2e8f0", 0.35, "#475569", 1, "#030712"]);
  tb(scope, 0.038, 0.044, 0.0095, steel);
  tb(scope, 0.0905, 0.1, 0.0095, steel);
  tb(scope, 0.1, 0.152, 0.0115, [0, "#9ca3af", 0.3, "#1f2937", 1, "#030712"]);
  tb(scope, 0.152, 0.17, 0.0085, steel);
  tb(scope, 0.17, 0.18, 0.011, [0, "#4b5563", 0.5, "#111827", 1, "#030712"]);
  scope.add(new Konva.Rect({ x: m(0.0345), y: m(-0.0105), width: m(0.0044), height: m(0.021), fill: fill, stroke: "#14532d", strokeWidth: lw * 0.8, shadowColor: fill, shadowBlur: m(0.008), shadowOpacity: 0.9, listening: false }));
  scope.add(new Konva.Text({ x: m(0.045), y: m(-0.0075), text: "ZnS", fontSize: m(0.006), fontStyle: "bold", fill: "#f1f5f9", listening: false }));
  scope.add(new Konva.Line({ points: [m(0.106), m(-0.0105), m(0.146), m(-0.0105)], stroke: "rgba(255,255,255,0.25)", strokeWidth: lw * 1.3, listening: false }));
  scope.add(new Konva.Circle({ x: m(0.127), y: m(0.0145), radius: m(0.0042), fillLinearGradientStartPoint: { x: m(-0.004), y: m(-0.004) }, fillLinearGradientEndPoint: { x: m(0.004), y: m(0.004) }, fillLinearGradientColorStops: [0, "#e2e8f0", 1, "#334155"], stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  group.add(scope);
  group.add(new Konva.Circle({ radius: m(0.0034), fill: "#e2e8f0", stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(0.085), width: m(0.2), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { scope: { node: scope, motion: "rotate" as const, min: -150, max: 150 } },
    points: { center: { x: 0, y: 0 }, screen: { x: m(0.0366), y: 0 }, eyepiece: { x: m(0.18), y: 0 } },
  };
};
