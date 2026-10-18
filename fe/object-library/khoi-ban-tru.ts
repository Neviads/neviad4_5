/* OBJECT-META
{
  "catalog": "Khối bán trụ / bản mặt song song",
  "title": "Khối thuỷ tinh bán trụ (nửa hình trụ) đặt trên bàn xoay có thước độ: mặt phẳng ở bên trái, mặt cong ở bên phải",
  "fill": "#bae6fd",
  "anchor": "Tâm mặt phẳng của khối (điểm tia sáng đi vào), trên trục quay của bàn xoay.",
  "useWhen": ["Cần khối thuỷ tinh bán trụ trên bàn xoay có thước độ để đo góc tới, góc khúc xạ, phản xạ toàn phần.", "Cảnh cho tia sáng đi vào tâm mặt phẳng, ra mặt cong không bị lệch."],
  "avoidWhen": ["Cần lăng kính tam giác tán sắc: dùng lang-kinh.", "Cần thấu kính hội tụ có tiêu cự hay hội tụ chùm tia: dùng thau-kinh-hoi-tu; bản mặt song song phải ghép hai khối."],
  "size": { "width": 0.18, "height": 0.18 },
  "parts": [
    { "name": "block", "label": "Khối bán trụ", "motion": "rotate", "min": -60, "max": 60, "description": "Góc quay của khối quanh tâm mặt phẳng, độ; dương là quay cùng chiều kim đồng hồ. Bàn xoay đứng yên với thước độ." }
  ],
  "points": [
    { "name": "center", "description": "Tâm mặt phẳng: điểm tia tới (tia truyền thẳng tới tâm mặt cong khi không bị lệch)." },
    { "name": "arcMid", "description": "Giữa mặt cong khi chưa quay, cách tâm 0,06 m về bên phải." },
    { "name": "flatTop", "description": "Đầu trên của mặt phẳng khi chưa quay." },
    { "name": "flatBottom", "description": "Đầu dưới của mặt phẳng khi chưa quay." }
  ],
  "notes": "Bán kính mặt cong 0,06 m, dày 0,014 m (hình khối nhìn nghiêng). Đặt mặt phẳng hướng vào nguồn sáng, tia tới đi qua tâm sẽ không lệch khi ra khỏi mặt cong. Để dùng làm bản mặt song song thì cảnh vẽ hai khối đối nhau. fill là màu thuỷ tinh."
}
*/
const makeHalfCylinder = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.06;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Bàn xoay đen: đĩa tròn có thước độ chia 5° và hai trục vuông góc.
  group.add(new Konva.Circle({ radius: m(0.088), ...lin(m(-0.088), m(-0.088), m(0.088), m(0.088), [0, "#e2e8f0", 0.4, "#64748b", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.003), y: m(0.006) }, listening: false }));
  group.add(new Konva.Circle({ radius: m(0.0825), fill: "#0b1220", stroke: "#475569", strokeWidth: lw, listening: false }));
  for (let d = 0; d < 360; d += 5) {
    const a = (d * Math.PI) / 180;
    const major = d % 30 === 0;
    const r1 = 0.0825;
    const r2 = r1 - (major ? 0.0095 : 0.0048);
    group.add(ln([r1 * Math.sin(a), -r1 * Math.cos(a), r2 * Math.sin(a), -r2 * Math.cos(a)], "#e2e8f0", major ? lw * 1.2 : lw * 0.6));
    if (major) group.add(new Konva.Text({ x: m(0.0735 * Math.sin(a)), y: m(-0.0735 * Math.cos(a)), width: m(0.016), offsetX: m(0.008), offsetY: m(0.0033), rotation: d, align: "center", text: String(d), fontSize: m(0.0055), fontStyle: "bold", fill: "#cbd5e1", listening: false }));
  }
  group.add(ln([-0.0755, 0, 0.0755, 0], "rgba(148,163,184,0.5)", lw));
  group.add(ln([0, -0.0755, 0, 0.0755], "rgba(148,163,184,0.5)", lw));
  for (let i = 1; i < 8; i += 1) {
    group.add(ln([-0.0075 + 0, -i * 0.01, 0.0075, -i * 0.01], "rgba(148,163,184,0.6)", lw * 0.8));
    group.add(ln([i * 0.01, -0.0075, i * 0.01, 0.0075], "rgba(148,163,184,0.6)", lw * 0.8));
  }

  // BỘ PHẬN QUAY: khối bán trụ; gốc nhóm là tâm mặt phẳng. Mặt phẳng ở bên trái (x = 0), mặt cong ở bên phải.
  const block = new Konva.Group({ x: 0, y: 0 });
  const arc: number[] = [];
  const n = 40;
  for (let i = 0; i <= n; i += 1) {
    const a = -Math.PI / 2 + (i / n) * Math.PI;
    arc.push(m(R * Math.cos(a)), m(R * Math.sin(a)));
  }
  // Bóng và mặt trên (thấy nghiêng 0,014 m phía dưới-bên trái).
  block.add(new Konva.Line({ points: arc.map((v, i) => (i % 2 === 0 ? v - m(0.0045) : v + m(0.0055))), closed: true, fill: "rgba(14,116,144,0.55)", stroke: "rgba(224,242,254,0.7)", strokeWidth: lw, lineJoin: "round", listening: false }));
  block.add(new Konva.Line({ points: arc, closed: true, lineJoin: "round", ...lin(0, m(-R), m(R), m(R), [0, "rgba(224,242,254,0.75)", 0.45, "rgba(125,211,252,0.4)", 1, "rgba(14,116,144,0.6)"]), stroke: "rgba(241,245,249,0.95)", strokeWidth: lw * 1.8, shadowColor: "#38bdf8", shadowBlur: m(0.014), shadowOpacity: 0.5, listening: false }));
  const gloss: number[] = [];
  for (let i = 5; i <= 18; i += 1) {
    const a = -Math.PI / 2 + (i / n) * Math.PI;
    gloss.push(m((R - 0.0075) * Math.cos(a)), m((R - 0.0075) * Math.sin(a)));
  }
  block.add(new Konva.Line({ points: gloss, stroke: "rgba(255,255,255,0.8)", strokeWidth: lw * 2, lineCap: "round", lineJoin: "round", listening: false }));
  block.add(new Konva.Line({ points: [m(0.0035), m(-R + 0.005), m(0.0035), m(R - 0.005)], stroke: "rgba(255,255,255,0.75)", strokeWidth: lw * 1.8, lineCap: "round", listening: false }));
  block.add(new Konva.Line({ points: [m(0), m(-R), m(0), m(R)], stroke: "rgba(241,245,249,0.95)", strokeWidth: lw * 1.8, lineCap: "round", listening: false }));
  block.add(new Konva.Circle({ x: 0, y: 0, radius: m(0.0034), fill: "#dc2626", stroke: "#450a0a", strokeWidth: lw * 0.7, listening: false }));
  group.add(block);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.09), y: m(0.098), width: m(0.18), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { block: { node: block, motion: "rotate" as const, min: -60, max: 60 } },
    points: { center: { x: 0, y: 0 }, arcMid: { x: m(R), y: 0 }, flatTop: { x: 0, y: m(-R) }, flatBottom: { x: 0, y: m(R) } },
  };
};
