/* OBJECT-META
{
  "catalog": "Hành tinh (chung, có vành)",
  "title": "Hành tinh khí khổng lồ có vành đai: quả cầu có các dải mây ngang và vết xoáy, vành nhiều lớp nghiêng, đi sau và trước hành tinh",
  "fill": "#d6a15a",
  "anchor": "Tâm hành tinh.",
  "useWhen": ["Cần hành tinh có vành đai nghiêng 12°, tượng trưng cho một hành tinh trong bài định luật Kepler.", "Cảnh sơ đồ quỹ đạo, tâm hành tinh là vị trí quỹ đạo, bán kính vẽ 0,09 m."],
  "avoidWhen": ["Cần Trái Đất, Mặt Trăng hoặc Mặt Trời riêng: dùng trai-dat, mat-trang, mat-troi.", "Cần hành tinh trơn không có vành: vật này luôn vẽ vành đai nghiêng."],
  "size": { "width": 0.18, "height": 0.18 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm hành tinh." },
    { "name": "ringLeft", "description": "Mép ngoài vành bên trái." },
    { "name": "ringRight", "description": "Mép ngoài vành bên phải." }
  ],
  "notes": "Hình sơ đồ bán kính vẽ 0,09 m, vành đai ngoài bán kính 0,21 m nghiêng 12° so với phương nhìn; phần vành sau hành tinh bị che, phần trước đè lên bề mặt. Dùng minh hoạ định luật Kepler cho mọi hành tinh (tâm hành tinh là vị trí quỹ đạo). fill là màu dải mây chính."
}
*/
const makePlanet = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.09;
  const RX = 0.21;
  const RY = 0.05;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const bands: [number, number, string][] = [[0.0, 0.1, "#fde68a"], [0.1, 0.22, "#c2884a"], [0.22, 0.38, "#fcd9a0"], [0.38, 0.5, "#9a5b2a"], [0.5, 0.64, "#e7b778"], [0.64, 0.78, "#b87a3d"], [0.78, 0.9, "#f1d19b"], [0.9, 1.0, "#a8662c"]];
  const ringsRadius: [number, number, string][] = [[0.52, 0.64, "rgba(120,53,15,0.6)"], [0.64, 0.8, "rgba(253,230,138,0.9)"], [0.86, 1, "rgba(214,161,90,0.8)"]];

  // Mặt sau của vành (nửa trên elip, bị hành tinh che).
  const ringArc = (r1: number, r2: number, c: string, a0: number, a1: number) => {
    for (let t = r1; t < r2; t += 0.012) group.add(new Konva.Shape({ stroke: c, strokeWidth: m(0.0042), listening: false, sceneFunc: (ctx, shape) => { ctx.beginPath(); ctx.ellipse(0, 0, m(t * RX), m(t * RY), -0.2, a0, a1, false); ctx.fillStrokeShape(shape); } }));
  };
  const ringBack = (r1: number, r2: number, c: string) => ringArc(r1, r2, c, Math.PI, Math.PI * 2);
  const ringFront = (r1: number, r2: number, c: string) => ringArc(r1, r2, c, 0, Math.PI);
  for (const [a, b, c] of ringsRadius) ringBack(a, b, c);

  // Cầu hành tinh: nền, các dải mây ngang và vết xoáy; rìa tối và sáng lệch trên trái.
  group.add(new Konva.Circle({ radius: m(R), fill: fill, listening: false }));
  for (const [y0, y1, c] of bands) {
    const ya = -R + y0 * R * 2;
    const yb = -R + y1 * R * 2;
    const hw = (y: number) => Math.sqrt(Math.max(0, R * R - y * y));
    group.add(new Konva.Line({ points: [m(-hw(ya)), m(ya), m(hw(ya)), m(ya), m(hw(yb)), m(yb), m(-hw(yb)), m(yb)], closed: true, fill: c, opacity: 0.75, listening: false }));
  }
  group.add(new Konva.Ellipse({ x: m(0.03), y: m(0.025), radiusX: m(0.02), radiusY: m(0.011), fill: "#b91c1c", stroke: "#fecaca", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Circle({ radius: m(R), fillRadialGradientStartPoint: { x: m(-0.03), y: m(-0.035) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R * 1.05), fillRadialGradientColorStops: [0, "rgba(255,255,255,0.28)", 0.55, "rgba(0,0,0,0)", 1, "rgba(15,10,30,0.7)"], stroke: "rgba(120,53,15,0.8)", strokeWidth: lw, listening: false }));

  // Mặt trước của vành (nửa dưới elip) đè lên hành tinh.
  for (const [a, b, c] of ringsRadius) ringFront(a, b, c);
  group.add(new Konva.Shape({ stroke: "rgba(15,23,42,0.35)", strokeWidth: lw * 0.7, listening: false, sceneFunc: (ctx, shape) => { ctx.beginPath(); ctx.ellipse(0, 0, m(RX * 0.52), m(RY * 0.52), -0.2, 0, Math.PI, false); ctx.fillStrokeShape(shape); } }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.2), y: m(RY + 0.05), width: m(0.4), align: "center", text: label, fontSize: m(0.018), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, ringLeft: { x: m(-RX), y: m(RY * 0.2) }, ringRight: { x: m(RX), y: m(-RY * 0.2) } } };
};
