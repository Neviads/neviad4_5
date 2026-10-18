/* OBJECT-META
{
  "catalog": "Cân xoắn Coulomb",
  "title": "Cân xoắn Coulomb nhìn từ trên xuống: hộp tròn thuỷ tinh chia độ, thanh ngang treo bằng sợi xoắn mảnh mang quả cầu A và đối trọng, quả cầu B cố định và núm xoắn ở nắp",
  "fill": "#e2e8f0",
  "anchor": "Điểm treo của sợi xoắn, tâm cân.",
  "useWhen": ["Cần cân xoắn Coulomb nhìn từ trên xuống, có thang chia độ 360 độ, hai quả cầu A và B và núm xoắn.","Cần thanh ngang quay quanh sợi xoắn dưới lực đẩy tĩnh điện giữa hai quả cầu."],
  "avoidWhen": ["Cần hai quả cầu tích điện treo dây bên nhau nhìn ngang: dùng qua-cau-tich-dien hoặc qua-cau-bac.","Cần nhìn nghiêng thấy chiều cao hộp: vật này là hình nhìn từ trên, bỏ qua chiều cao."],
  "size": { "width": 0.168, "height": 0.168 },
  "parts": [
    { "name": "beam", "label": "Thanh treo", "motion": "rotate", "min": -40, "max": 40, "description": "Góc quay của thanh ngang cùng quả cầu A quanh sợi xoắn, độ theo chiều kim đồng hồ khi nhìn từ trên xuống; 0° là thanh nằm ngang chạm quả cầu B." },
    { "name": "knob", "label": "Núm xoắn", "motion": "rotate", "min": -180, "max": 180, "description": "Góc xoay của núm ở đầu trên sợi xoắn, độ theo chiều kim đồng hồ; xoắn sợi để cân bằng lực đẩy giữa hai quả cầu." }
  ],
  "points": [
    { "name": "center", "description": "Điểm treo của sợi xoắn, tâm cân." },
    { "name": "sphereA", "description": "Tâm quả cầu A động ở đầu thanh bên trái khi thanh nằm ngang." },
    { "name": "sphereB", "description": "Tâm quả cầu B cố định gần quả cầu A." },
    { "name": "knob", "description": "Tâm núm xoắn." }
  ],
  "notes": "Hộp thuỷ tinh tròn đường kính 0,14 m có thang chia độ 360°, chiều cao hộp bỏ qua trong hình nhìn từ trên. Thanh ngang dài 0,09 m: đầu trái mang quả cầu A (bán kính 0,006 m), đầu phải mang đối trọng bằng giấy; quả cầu B cố định ở cạnh quả cầu A qua một lỗ trên nắp. Lực đẩy giữa A và B làm thanh quay, góc xoắn của sợi tỉ lệ với lực. fill là màu thang chia độ."
}
*/
const makeTorsionBalance = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const R = 0.07;
  const AR = 0.0425;
  const sphere = (g: Konva.Group, x: number, y: number, r: number, c: string) => {
    g.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fillRadialGradientStartPoint: { x: m(-r * 0.35), y: m(-r * 0.35) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#ffffff", 0.35, c, 1, "#0f172a"], stroke: "#0f172a", strokeWidth: lw * 0.8, shadowColor: "#000", shadowBlur: m(0.005), shadowOpacity: 0.4, shadowOffset: { x: m(0.0008), y: m(0.0016) }, listening: false }));
    g.add(new Konva.Circle({ x: m(x - r * 0.35), y: m(y - r * 0.35), radius: m(r * 0.2), fill: "#fff", listening: false }));
  };

  // Hộp tròn: viền đồng, nền thuỷ tinh tối và vòng thang chia độ in trắng.
  group.add(new Konva.Circle({ radius: m(R + 0.007), ...lin(m(-R - 0.007), m(-R - 0.007), m(R + 0.007), m(R + 0.007), [0, "#f8fafc", 0.4, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.015), shadowOpacity: 0.45, shadowOffset: { x: m(0.003), y: m(0.005) }, listening: false }));
  group.add(new Konva.Circle({ radius: m(R), fillRadialGradientStartPoint: { x: m(-0.02), y: m(-0.02) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "rgba(30,64,175,0.35)", 0.6, "rgba(15,23,42,0.85)", 1, "rgba(2,6,23,0.95)"], stroke: "#475569", strokeWidth: lw * 0.9, listening: false }));
  for (let d = 0; d < 360; d += 2) {
    const a = (d * Math.PI) / 180;
    const major = d % 10 === 0;
    const r1 = R - 0.0012;
    const r2 = r1 - (major ? 0.0065 : 0.0032);
    group.add(ln([r1 * Math.cos(a), r1 * Math.sin(a), r2 * Math.cos(a), r2 * Math.sin(a)], fill, major ? lw : lw * 0.55));
  }
  for (let d = 0; d < 360; d += 30) {
    const a = (d * Math.PI) / 180;
    group.add(new Konva.Text({ x: m((R - 0.0155) * Math.cos(a) - 0.007), y: m((R - 0.0155) * Math.sin(a) - 0.0035), width: m(0.014), align: "center", text: String(d), fontSize: m(0.0055), fill: fill, listening: false }));
  }
  group.add(new Konva.Arc({ innerRadius: m(R - 0.0045), outerRadius: m(R - 0.0025), angle: 60, rotation: 215, fill: "rgba(255,255,255,0.3)", listening: false }));

  // Quả cầu B cố định, treo trên thanh nhựa cắm từ ngoài qua lỗ nắp. Đầu quả cầu chạm quả cầu A khi 0°.
  group.add(ln([-AR - 0.012, 0.0, -R - 0.004, 0.0], "#0b1220", m(0.0042)));
  group.add(ln([-AR - 0.012, 0.0, -R - 0.004, 0.0], "#94a3b8", m(0.0028)));
  group.add(new Konva.Rect({ x: m(-R - 0.014), y: m(-0.005), width: m(0.012), height: m(0.01), cornerRadius: m(0.002), ...lin(0, 0, m(0.012), 0, [0, "#475569", 0.4, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 0.8, listening: false }));
  const fixed = new Konva.Group();
  sphere(fixed, -AR - 0.012 - 0.006, 0, 0.006, "#38bdf8");
  group.add(fixed);

  // BỘ PHẬN QUAY: thanh ngang nhẹ + quả cầu A bên trái + đối trọng giấy bên phải, gốc ở điểm treo.
  const beam = new Konva.Group();
  beam.add(new Konva.Line({ points: [m(-AR + 0.005), 0, m(0.0425), 0], stroke: "#0b1220", strokeWidth: m(0.0032), lineCap: "round", listening: false }));
  beam.add(new Konva.Line({ points: [m(-AR + 0.005), 0, m(0.0425), 0], stroke: "#fde68a", strokeWidth: m(0.0022), lineCap: "round", listening: false }));
  sphere(beam, -AR, 0, 0.006, "#f87171");
  beam.add(new Konva.Rect({ x: m(0.038), y: m(-0.0075), width: m(0.0065), height: m(0.015), ...lin(0, 0, m(0.0065), 0, [0, "#f8fafc", 1, "#cbd5e1"]), stroke: "#94a3b8", strokeWidth: lw * 0.7, listening: false }));
  group.add(beam);

  // Sợi xoắn từ tâm lên núm: nhìn từ trên là chấm; núm có thang vạch chỉ góc xoắn và bàn xoay.
  const knob = new Konva.Group();
  knob.add(new Konva.Circle({ radius: m(0.0125), fill: "#020617", shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.5, shadowOffset: { x: m(0.0012), y: m(0.002) }, listening: false }));
  knob.add(new Konva.Circle({ radius: m(0.0115), ...lin(m(-0.0115), m(-0.0115), m(0.0115), m(0.0115), [0, "#f8fafc", 0.4, "#94a3b8", 1, "#1f2937"]), stroke: "#030712", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 20; i += 1) {
    const a = (i * Math.PI) / 10;
    knob.add(ln([0.0092 * Math.cos(a), 0.0092 * Math.sin(a), 0.0113 * Math.cos(a), 0.0113 * Math.sin(a)], "rgba(15,23,42,0.6)", lw * 0.8));
  }
  knob.add(new Konva.Line({ points: [0, 0, 0, m(-0.0112)], stroke: "#dc2626", strokeWidth: lw * 2.2, lineCap: "round", listening: false }));
  knob.add(new Konva.Circle({ radius: m(0.0034), fill: "#1e293b", listening: false }));
  group.add(knob);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.09), y: m(R + 0.01), width: m(0.18), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { beam: { node: beam, motion: "rotate" as const, min: -40, max: 40 }, knob: { node: knob, motion: "rotate" as const, min: -180, max: 180 } },
    points: { center: { x: 0, y: 0 }, sphereA: { x: m(-AR), y: 0 }, sphereB: { x: m(-AR - 0.018), y: 0 }, knob: { x: 0, y: 0 } },
  };
};
