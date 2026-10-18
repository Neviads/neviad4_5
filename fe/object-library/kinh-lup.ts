/* OBJECT-META
{
  "catalog": "Kính lúp",
  "title": "Kính lúp cầm tay: thấu kính hội tụ tiêu cự 0,08 m trong vành kim loại, tay cầm nhựa đen có vân chống trơn",
  "fill": "#cbd5e1",
  "anchor": "Quang tâm của kính lúp (tâm thấu kính).",
  "useWhen": ["Cần kính lúp cầm tay là thấu kính hội tụ f = 0,08 m, tay cầm nghiêng 30°.", "Cảnh vật đặt trong tiêu cự cho ảnh ảo lớn hơn, độ bội giác khoảng 3,1."],
  "avoidWhen": ["Cần thấu kính đặt trên giá quang học, không tay cầm: dùng thau-kinh-hoi-tu.", "Cần kính hiển vi độ phóng đại lớn: dùng kinh-hien-vi; kính lúp chỉ khoảng 3 lần."],
  "size": { "width": 0.16, "height": 0.111 },
  "parts": [],
  "points": [
    { "name": "opticalCenter", "description": "Quang tâm O của thấu kính." },
    { "name": "rimTop", "description": "Mép trên của vành." },
    { "name": "handleEnd", "description": "Đầu tay cầm." }
  ],
  "notes": "Thấu kính hội tụ lồi hai mặt đường kính 0,07 m, tiêu cự f = 0,08 m (độ bội giác 25/f ≈ 3,1). Tay cầm dài 0,1 m nghiêng 30° về phía dưới bên trái. Vật đặt trong khoảng tiêu cự cho ảnh ảo cùng chiều, lớn hơn vật. fill là màu vành kim loại."
}
*/
const makeMagnifier = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.035;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const dir = (Math.PI * 150) / 180;
  const hx = Math.cos(dir);
  const hy = Math.sin(dir);

  // Tay cầm: thân nhựa đen nở dần về cuối, có các rãnh ngang chống trơn và nẹp bạc nối vành.
  group.add(new Konva.Line({ points: [m((R + 0.012) * hx), m((R + 0.012) * hy), m((R + 0.1) * hx), m((R + 0.1) * hy)], stroke: "#030712", strokeWidth: m(0.0215), lineCap: "round", shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, shadowOffset: { x: m(0.003), y: m(0.004) }, listening: false }));
  group.add(new Konva.Line({ points: [m((R + 0.012) * hx), m((R + 0.012) * hy), m((R + 0.1) * hx), m((R + 0.1) * hy)], stroke: "#1f2937", strokeWidth: m(0.017), lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m((R + 0.015) * hx + 0.0038 * hy), m((R + 0.015) * hy - 0.0038 * hx), m((R + 0.092) * hx + 0.0038 * hy), m((R + 0.092) * hy - 0.0038 * hx)], stroke: "rgba(255,255,255,0.28)", strokeWidth: lw * 1.8, lineCap: "round", listening: false }));
  for (let i = 0; i < 10; i += 1) {
    const t = R + 0.03 + i * 0.0064;
    group.add(new Konva.Line({ points: [m(t * hx - 0.0078 * hy), m(t * hy + 0.0078 * hx), m(t * hx + 0.0078 * hy), m(t * hy - 0.0078 * hx)], stroke: "rgba(0,0,0,0.65)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  }
  // Đầu nối bằng bạc giữa vành và tay cầm.
  group.add(new Konva.Line({ points: [m((R - 0.002) * hx), m((R - 0.002) * hy), m((R + 0.02) * hx), m((R + 0.02) * hy)], stroke: "#475569", strokeWidth: m(0.0125), lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m((R - 0.002) * hx), m((R - 0.002) * hy), m((R + 0.02) * hx), m((R + 0.02) * hy)], stroke: "#e2e8f0", strokeWidth: m(0.0085), lineCap: "round", listening: false }));

  // Vành kim loại hình chuông đôi: vành ngoài sáng, rãnh trong tối, thấu kính trong suốt phía trong.
  group.add(new Konva.Circle({ radius: m(R + 0.008), ...lin(m(-R - 0.008), m(-R - 0.008), m(R + 0.008), m(R + 0.008), [0, "#f8fafc", 0.4, fill, 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.003), y: m(0.005) }, listening: false }));
  group.add(new Konva.Circle({ radius: m(R + 0.0035), ...lin(m(R), m(R), m(-R), m(-R), [0, "#334155", 0.5, "#cbd5e1", 1, "#475569"]), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Circle({ radius: m(R), fillRadialGradientStartPoint: { x: m(-0.012), y: m(-0.014) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "rgba(255,255,255,0.78)", 0.5, "rgba(186,230,253,0.35)", 1, "rgba(56,189,248,0.42)"], stroke: "rgba(15,23,42,0.5)", strokeWidth: lw, listening: false }));
  // Dấu hiệu thấu kính: vòng đồng tâm mờ thể hiện độ dày, vệt sáng cong và điểm sáng.
  for (const r of [0.8, 0.55, 0.3]) group.add(new Konva.Circle({ radius: m(R * r), stroke: "rgba(255,255,255,0.28)", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(R - 0.0095), outerRadius: m(R - 0.0045), angle: 75, rotation: 200, fill: "rgba(255,255,255,0.78)", listening: false }));
  group.add(new Konva.Ellipse({ x: m(0.014), y: m(0.012), radiusX: m(0.0085), radiusY: m(0.0035), rotation: 35, fill: "rgba(255,255,255,0.3)", listening: false }));
  group.add(new Konva.Circle({ x: m(-0.015), y: m(-0.018), radius: m(0.0032), fill: "#ffffff", listening: false }));
  group.add(new Konva.Circle({ radius: m(0.0015), fill: "rgba(15,23,42,0.5)", listening: false }));
  group.add(new Konva.Text({ x: m(0.026), y: m(-R - 0.0125), text: "×3", fontSize: m(0.0105), fontStyle: "bold", fill: "#cbd5e1", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.07), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: { opticalCenter: { x: 0, y: 0 }, rimTop: { x: 0, y: m(-R - 0.008) }, handleEnd: { x: m((R + 0.1) * hx), y: m((R + 0.1) * hy) } },
  };
};
