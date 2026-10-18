/* OBJECT-META
{
  "catalog": "Trái Đất",
  "title": "Trái Đất nhìn từ phía trên cực Bắc: đại dương xanh, các lục địa, chỏm băng, kinh tuyến và vĩ tuyến, phần ban đêm tối ở bên phải",
  "fill": "#2563eb",
  "anchor": "Tâm Trái Đất, ngay trên trục quay.",
  "useWhen": ["Cần Trái Đất nhìn từ phía trên cực Bắc, có lục địa, kinh vĩ tuyến và nửa đêm bên phải.","Cần quay Trái Đất quanh trục 0–360° để minh hoạ ngày đêm hay vận tốc góc."],
  "avoidWhen": ["Cần Mặt Trời hoặc Mặt Trăng: dùng mat-troi hoặc mat-trang.","Cần hành tinh nói chung hay quỹ đạo: dùng hanh-tinh.","Chỉ nhìn từ trên cực Bắc, không có trục nghiêng 23,5° nhìn ngang."],
  "size": { "width": 1.0, "height": 1.0 },
  "parts": [
    { "name": "earth", "label": "Trái Đất", "motion": "rotate", "min": 0, "max": 360, "description": "Góc tự quay của Trái Đất quanh trục, độ theo chiều kim đồng hồ khi nhìn từ phía trên cực Bắc (thực tế Trái Đất quay ngược chiều kim đồng hồ khi nhìn từ trên cực Bắc xuống; góc tăng thì lục địa quay theo)." }
  ],
  "points": [
    { "name": "center", "description": "Tâm Trái Đất, trên trục quay." },
    { "name": "equator", "description": "Điểm trên xích đạo, bên phải tâm." },
    { "name": "northPole", "description": "Cực Bắc, trùng tâm hình vẽ." }
  ],
  "notes": "Hình mô phỏng sơ đồ với bán kính vẽ 0,5 m (thực 6 371 km), nhìn thẳng xuống cực Bắc nên trục quay vuông góc với mặt hình, đi qua tâm. Phần quay gồm đại dương, lục địa và lưới kinh vĩ tuyến; bóng đêm bên phải đứng yên (Mặt Trời ở bên trái). fill là màu đại dương."
}
*/
const makeEarth = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.5;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.004));
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Khí quyển phát sáng quanh Trái Đất.
  group.add(new Konva.Circle({ radius: m(R * 1.06), fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: m(R * 0.96), fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R * 1.08), fillRadialGradientColorStops: [0, "rgba(125,211,252,0.55)", 1, "rgba(125,211,252,0)"], listening: false }));

  // BỘ PHẬN QUAY: đại dương, lục địa quanh cực, chỏm băng, lưới kinh tuyến mỗi 30°.
  const earth = new Konva.Group();
  earth.add(new Konva.Circle({ radius: m(R), fillRadialGradientStartPoint: { x: m(-0.18), y: m(-0.18) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "#60a5fa", 0.55, fill, 1, "#172554"], listening: false }));
  const land = (cx: number, cy: number, w: number, h: number, rot: number, c: string) => {
    earth.add(new Konva.Ellipse({ x: m(cx), y: m(cy), radiusX: m(w), radiusY: m(h), rotation: rot, fill: c, stroke: "rgba(20,83,45,0.7)", strokeWidth: lw * 0.7, listening: false }));
    earth.add(new Konva.Ellipse({ x: m(cx - w * 0.15), y: m(cy - h * 0.2), radiusX: m(w * 0.55), radiusY: m(h * 0.5), rotation: rot, fill: "rgba(250,204,21,0.25)", listening: false }));
  };
  land(-0.17, -0.2, 0.12, 0.085, -25, "#16a34a");
  land(0.2, -0.23, 0.16, 0.07, 15, "#65a30d");
  land(0.3, 0.07, 0.1, 0.075, -50, "#15803d");
  land(-0.28, 0.12, 0.09, 0.12, 20, "#84cc16");
  land(0.02, 0.33, 0.12, 0.065, 5, "#16a34a");
  land(-0.37, -0.05, 0.05, 0.08, 0, "#4d7c0f");
  for (let i = 0; i < 12; i += 1) {
    const a = (i * Math.PI) / 6;
    earth.add(new Konva.Line({ points: [m(R * 0.22 * Math.cos(a)), m(R * 0.22 * Math.sin(a)), m(R * Math.cos(a)), m(R * Math.sin(a))], stroke: "rgba(255,255,255,0.22)", strokeWidth: lw * 0.6, listening: false }));
  }
  for (const r of [0.22, 0.5, 0.78]) earth.add(new Konva.Circle({ radius: m(R * r), stroke: "rgba(255,255,255,0.22)", strokeWidth: lw * 0.6, listening: false }));
  earth.add(new Konva.Circle({ radius: m(R * 0.2), fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R * 0.2), fillRadialGradientColorStops: [0, "#ffffff", 0.7, "#e0f2fe", 1, "rgba(224,242,254,0.5)"], listening: false }));
  earth.add(new Konva.Circle({ radius: m(0.012), fill: "#ef4444", stroke: "#7f1d1d", strokeWidth: lw * 0.6, listening: false }));
  earth.add(new Konva.Line({ points: [m(R * 0.2), 0, m(R), 0], stroke: "#fde047", strokeWidth: lw * 1.2, dash: [m(0.02), m(0.015)], listening: false }));
  group.add(earth);

  // Bóng ban đêm bên phải, mây mỏng và viền sáng, đứng yên.
  group.add(new Konva.Circle({ radius: m(R), fillLinearGradientStartPoint: { x: m(-R), y: 0 }, fillLinearGradientEndPoint: { x: m(R), y: 0 }, fillLinearGradientColorStops: [0, "rgba(255,255,255,0.14)", 0.45, "rgba(0,0,0,0)", 0.8, "rgba(2,6,23,0.55)", 1, "rgba(2,6,23,0.85)"], stroke: "rgba(186,230,253,0.7)", strokeWidth: lw, listening: false }));
  for (const [x, y, w] of [[-0.25, -0.1, 0.14], [0.05, 0.12, 0.12], [-0.05, -0.34, 0.1]] as [number, number, number][]) group.add(new Konva.Ellipse({ x: m(x), y: m(y), radiusX: m(w), radiusY: m(w * 0.28), rotation: -18, fill: "rgba(255,255,255,0.28)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.3), y: m(R + 0.06), width: m(0.6), align: "center", text: label, fontSize: m(0.06), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: { earth: { node: earth, motion: "rotate" as const, min: 0, max: 360 } }, points: { center: { x: 0, y: 0 }, equator: { x: m(R), y: 0 }, northPole: { x: 0, y: 0 } } };
};
