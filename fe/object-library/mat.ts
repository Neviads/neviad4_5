/* OBJECT-META
{
  "catalog": "Mắt (mặt cắt: thuỷ tinh thể, võng mạc)",
  "title": "Mô hình mắt người phóng to, mặt cắt dọc: giác mạc, mống mắt và đồng tử, thuỷ tinh thể, dịch kính, võng mạc và dây thần kinh thị giác",
  "fill": "#f1f5f9",
  "anchor": "Tâm nhãn cầu.",
  "useWhen": ["Cần mắt người mặt cắt dọc có giác mạc, đồng tử, thuỷ tinh thể và võng mạc, cho bài quang học của mắt.","Cần minh hoạ tia sáng hội tụ qua thuỷ tinh thể lên võng mạc hoặc điểm vàng."],
  "avoidWhen": ["Cần mô hình máy ảnh có cảm biến: dùng may-anh.","Cần thấu kính hội tụ rời để dựng ảnh: dùng thau-kinh-hoi-tu.","Cần kính lúp hoặc kính cận và viễn: dùng kinh-lup, mắt này không kèm kính."],
  "size": { "width": 0.15, "height": 0.095 },
  "parts": [
    { "name": "lens", "label": "Độ phồng thuỷ tinh thể", "motion": "slide", "axis": "right", "min": 0, "max": 0.004, "description": "Nửa trước của thuỷ tinh thể dịch về phía giác mạc, mét; càng lớn thì thuỷ tinh thể càng dày và phồng (nhìn gần), bằng 0 là dẹt nhất (nhìn xa)." }
  ],
  "points": [
    { "name": "center", "description": "Tâm nhãn cầu." },
    { "name": "lensCenter", "description": "Tâm thuỷ tinh thể ở trạng thái dẹt, trên trục thị giác." },
    { "name": "cornea", "description": "Đỉnh giác mạc, nơi ánh sáng vào mắt." },
    { "name": "fovea", "description": "Điểm vàng trên võng mạc, đối diện đồng tử." }
  ],
  "notes": "Mô hình phóng to khoảng 3,3 lần: nhãn cầu bán kính 0,04 m (mắt thật 0,012 m), trục thị giác nằm ngang, ánh sáng đi vào từ bên phải. Thuỷ tinh thể phồng lên khi nhìn gần, dẹt khi nhìn xa; ảnh phải hiện trên võng mạc (phía sau). fill là màu củng mạc (lòng trắng)."
}
*/
const makeEye = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.04;
  const LX = 0.011;
  const LH = 0.0125;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0012));
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Dây thần kinh thị giác nối ra phía sau, hơi lệch xuống dưới trục.
  group.add(ln([-0.036, 0.008, -0.056, 0.014, -0.075, 0.011], "#5b3a1a", m(0.0105)));
  group.add(ln([-0.036, 0.008, -0.056, 0.014, -0.075, 0.011], "#fde68a", m(0.0082)));
  group.add(ln([-0.04, 0.0055, -0.056, 0.011, -0.074, 0.0085], "rgba(255,255,255,0.55)", lw));

  // Củng mạc (lòng trắng) và giác mạc nhô ra phía trước.
  group.add(new Konva.Circle({ radius: m(R), fillRadialGradientStartPoint: { x: m(-0.012), y: m(-0.015) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "#ffffff", 0.7, fill, 1, "#94a3b8"], stroke: "#475569", strokeWidth: lw * 1.4, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Ellipse({ x: m(0.0375), y: 0, radiusX: m(0.0125), radiusY: m(0.0215), fill: "rgba(186,230,253,0.55)", stroke: "#38bdf8", strokeWidth: lw, listening: false }));
  // Hắc mạc (mỏng, sẫm) rồi võng mạc đỏ cam trên nửa sau lòng mắt.
  group.add(new Konva.Circle({ radius: m(R - 0.0025), fill: "rgba(254,243,199,0.55)", stroke: "#78350f", strokeWidth: lw * 1.3, listening: false }));
  // Dịch kính trong suốt, thuỷ dịch ở buồng trước.
  group.add(new Konva.Circle({ radius: m(R - 0.0042), fillRadialGradientStartPoint: { x: m(-0.008), y: m(-0.008) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R - 0.004), fillRadialGradientColorStops: [0, "rgba(224,242,254,0.95)", 1, "rgba(125,211,252,0.55)"], listening: false }));
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(R - 0.0053), outerRadius: m(R - 0.0023), angle: 200, rotation: 80, fill: "#ef4444", stroke: "#7f1d1d", strokeWidth: lw * 0.5, listening: false }));
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(R - 0.0053), outerRadius: m(R - 0.0042), angle: 200, rotation: 80, fill: "rgba(255,255,255,0.35)", listening: false }));
  group.add(new Konva.Ellipse({ x: m(-R + 0.003), y: 0, radiusX: m(0.0016), radiusY: m(0.0045), fill: "#facc15", stroke: "#a16207", strokeWidth: lw * 0.5, listening: false }));
  // Thuỷ dịch buồng trước.
  group.add(new Konva.Ellipse({ x: m(0.0285), y: 0, radiusX: m(0.0145), radiusY: m(0.0205), fill: "rgba(207,250,254,0.55)", listening: false }));

  // Cơ mi và dây chằng treo thuỷ tinh thể.
  for (const s of [-1, 1]) {
    group.add(new Konva.Line({ points: [m(LX + 0.003), m(s * 0.0205), m(LX - 0.005), m(s * 0.0345), m(LX - 0.012), m(s * 0.0345), m(LX - 0.002), m(s * (LH + 0.003))], closed: true, fill: "#fb923c", stroke: "#9a3412", strokeWidth: lw * 0.8, lineJoin: "round", listening: false }));
    group.add(ln([LX - 0.0005, s * (LH + 0.0012), LX + 0.001, s * 0.024], "rgba(120,53,15,0.7)", lw * 0.6));
    // Mống mắt: hai cánh nâu quanh đồng tử.
    group.add(new Konva.Line({ points: [m(0.0215), m(s * 0.0205), m(0.0215), m(s * 0.0072), m(0.0175), m(s * 0.0072), m(0.0175), m(s * 0.0205)], closed: true, fill: "#92400e", stroke: "#451a03", strokeWidth: lw * 0.8, lineJoin: "round", listening: false }));
    group.add(ln([0.0197, s * 0.0205, 0.0197, s * 0.0085], "rgba(251,191,36,0.55)", lw * 0.7));
  }

  // BỘ PHẬN TRƯỢT: nửa trước của thuỷ tinh thể, kèm dải đệm lấp khe khi dịch chuyển.
  const lens = new Konva.Group();
  lens.add(new Konva.Rect({ x: m(LX - 0.004), y: m(-LH), width: m(0.004), height: m(LH * 2), fill: "#fde68a", listening: false }));
  lens.add(new Konva.Ellipse({ x: m(LX), y: 0, radiusX: m(0.0075), radiusY: m(LH), fill: "#fde68a", stroke: "#b45309", strokeWidth: lw * 0.9, listening: false }));
  lens.add(new Konva.Ellipse({ x: m(LX + 0.0012), y: m(-0.002), radiusX: m(0.0035), radiusY: m(LH - 0.004), fill: "rgba(255,255,255,0.45)", listening: false }));
  group.add(lens);
  // Nửa sau cố định che phần sau của thuỷ tinh thể.
  const RX = 0.0075;
  const K = 0.5523;
  group.add(new Konva.Shape({ fill: "#fcd34d", stroke: "#b45309", strokeWidth: lw * 0.9, listening: false, sceneFunc: (ctx, shape) => {
    ctx.beginPath();
    ctx.moveTo(m(LX), m(-LH));
    ctx.bezierCurveTo(m(LX - RX * K), m(-LH), m(LX - RX), m(-LH * K), m(LX - RX), 0);
    ctx.bezierCurveTo(m(LX - RX), m(LH * K), m(LX - RX * K), m(LH), m(LX), m(LH));
    ctx.closePath();
    ctx.fillStrokeShape(shape);
  } }));

  // Chú thích nhỏ có đường dẫn: giác mạc, thuỷ tinh thể, võng mạc.
  const tag = (x: number, y: number, tx: number, ty: number, text: string, align: "left" | "right") => {
    group.add(ln([x, y, tx, ty], "rgba(226,232,240,0.7)", lw * 0.6));
    group.add(new Konva.Text({ x: m(align === "left" ? tx + 0.0015 : tx - 0.0515), y: m(ty - 0.0035), width: m(0.05), align, text, fontSize: m(0.0058), fill: "#e2e8f0", listening: false }));
  };
  tag(0.0498, -0.012, 0.062, -0.026, "giác mạc", "left");
  tag(LX, -0.0075, 0.04, -0.045, "thuỷ tinh thể", "left");
  tag(-R + 0.0035, -0.014, -0.047, -0.03, "võng mạc", "right");

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.046), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { lens: { node: lens, motion: "slide" as const, axis: "right" as const, min: 0, max: 0.004 } },
    points: { center: { x: 0, y: 0 }, lensCenter: { x: m(LX), y: 0 }, cornea: { x: m(0.05), y: 0 }, fovea: { x: m(-R + 0.003), y: 0 } },
  };
};
