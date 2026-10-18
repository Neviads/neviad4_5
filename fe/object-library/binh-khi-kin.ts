/* OBJECT-META
{
  "catalog": "Bình khí kín có van",
  "title": "Bình khí kín bằng thép sơn bạc có cổ ren và van khoá: tay gạt van nối với đồng hồ áp suất nhỏ, đế chắn tròn chống lăn",
  "fill": "#cbd5e1",
  "anchor": "Giữa đáy bình, chạm mặt bàn.",
  "useWhen": ["Cần bình thép kín 0,5 L có van khoá và đồng hồ nhỏ 0–2,5 MPa cho thí nghiệm khí.","Cần tay gạt van để đóng mở (đóng khi song song thân van)."],
  "avoidWhen": ["Cần đồng hồ áp suất lớn riêng thang kPa: dùng ap-ke-kim.","Cần bình thuỷ tinh có chất lỏng để thấy mực: dùng binh-tam-giac.","Bình thép không nhìn thấy bên trong, không minh hoạ được phân tử khí."],
  "size": { "width": 0.082, "height": 0.185 },
  "parts": [
    { "name": "valve", "label": "Tay van", "motion": "rotate", "min": 0, "max": 90, "description": "Góc quay của tay gạt van quanh trục, độ theo chiều kim đồng hồ; 0° là tay nằm ngang theo thân van (van đóng), 90° là tay dựng thẳng đứng (van mở)." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy bình." },
    { "name": "valve", "description": "Trục tay gạt van." },
    { "name": "gauge", "description": "Tâm đồng hồ áp suất ở cổ bình." },
    { "name": "outlet", "description": "Cửa ra khí của van, phía bên phải." }
  ],
  "notes": "Bình thép cao 0,12 m (không kể cổ), đường kính 0,07 m, thể tích 0,5 L chịu được 2 MPa; cổ ren có van khoá và đồng hồ đo áp suất dải 0–2,5 MPa. Van đóng khi tay gạt song song với thân van, mở khi vuông góc. fill là màu sơn bạc của bình."
}
*/
const makeGasCylinder = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const brass = [0, "#78350f", 0.3, "#fde68a", 0.65, "#d97706", 1, "#451a03"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const R = 0.035;
  const top = -0.12;

  // Đế chắn tròn và bóng đổ.
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.001), radiusX: m(R + 0.01), radiusY: m(0.0035), fill: "rgba(0,0,0,0.4)", listening: false }));
  group.add(new Konva.Rect({ x: m(-R - 0.004), y: m(-0.011), width: m((R + 0.004) * 2), height: m(0.011), cornerRadius: m(0.003), ...lin(0, 0, m((R + 0.004) * 2), 0, [0, "#1f2937", 0.3, "#6b7280", 1, "#030712"]), stroke: "#000", strokeWidth: lw, listening: false }));
  // Thân bình: trụ bo tròn đáy và vai, gradient kim loại, vệt phản chiếu và nhãn.
  group.add(new Konva.Line({ points: [m(-R), m(-0.011), m(-R), m(top + 0.022), m(-R + 0.002), m(top + 0.012), m(-0.022), m(top + 0.004), m(-0.0135), m(top - 0.0005), m(0.0135), m(top - 0.0005), m(0.022), m(top + 0.004), m(R - 0.002), m(top + 0.012), m(R), m(top + 0.022), m(R), m(-0.011)], closed: true, tension: 0.3, ...lin(m(-R), 0, m(R), 0, [0, "#475569", 0.2, "#f8fafc", 0.45, fill, 0.85, "#64748b", 1, "#1e293b"]), stroke: "#1e293b", strokeWidth: lw * 1.2, lineJoin: "round", listening: false }));
  group.add(ln([-R + 0.0065, top + 0.03, -R + 0.0065, -0.02], "rgba(255,255,255,0.75)", lw * 2.6));
  group.add(ln([R - 0.006, top + 0.036, R - 0.006, -0.03], "rgba(0,0,0,0.25)", lw * 1.6));
  group.add(new Konva.Rect({ x: m(-R), y: m(-0.075), width: m(R * 2), height: m(0.026), fill: "rgba(37,99,235,0.88)", listening: false }));
  group.add(new Konva.Rect({ x: m(-R), y: m(-0.075), width: m(R * 2), height: m(0.0022), fill: "rgba(255,255,255,0.55)", listening: false }));
  group.add(new Konva.Text({ x: m(-R), y: m(-0.0675), width: m(R * 2), align: "center", text: "KHÍ NÉN\n2 MPa", fontSize: m(0.0072), fontStyle: "bold", fill: "#eff6ff", lineHeight: 1.1, listening: false }));

  // Cổ ren đồng thau và thân van.
  group.add(new Konva.Rect({ x: m(-0.0125), y: m(top - 0.012), width: m(0.025), height: m(0.012), cornerRadius: m(0.0015), ...lin(0, 0, m(0.025), 0, brass), stroke: "#451a03", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 3; i += 1) group.add(ln([-0.0125, top - 0.0105 + i * 0.0033, 0.0125, top - 0.0095 + i * 0.0033], "rgba(67,20,7,0.55)", lw * 0.8));
  group.add(new Konva.Rect({ x: m(-0.0165), y: m(top - 0.035), width: m(0.033), height: m(0.024), cornerRadius: m(0.003), ...lin(0, 0, m(0.033), 0, brass), stroke: "#451a03", strokeWidth: lw * 1.1, listening: false }));
  group.add(ln([-0.0125, top - 0.0325, -0.0125, top - 0.0135], "rgba(255,255,255,0.5)", lw * 1.4));
  // Cửa ra khí nằm bên phải thân van và đồng hồ áp suất bên trái.
  group.add(new Konva.Rect({ x: m(0.0155), y: m(top - 0.0275), width: m(0.014), height: m(0.011), cornerRadius: m(0.0018), ...lin(0, 0, 0, m(0.011), brass), stroke: "#451a03", strokeWidth: lw * 0.9, listening: false }));
  group.add(new Konva.Rect({ x: m(0.0285), y: m(top - 0.0295), width: m(0.005), height: m(0.015), cornerRadius: m(0.001), ...lin(0, 0, m(0.005), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(ln([-0.0155, top - 0.0215, -0.0235, top - 0.0215], "#b45309", m(0.0042)));
  group.add(new Konva.Circle({ x: m(-0.0335), y: m(top - 0.0215), radius: m(0.0105), ...lin(m(-0.0105), m(-0.0105), m(0.0105), m(0.0105), steel), stroke: "#1e293b", strokeWidth: lw * 1.1, listening: false }));
  group.add(new Konva.Circle({ x: m(-0.0335), y: m(top - 0.0215), radius: m(0.0087), fill: "#fefce8", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  for (let i = 0; i <= 10; i += 1) {
    const a = ((-215 + i * 25) * Math.PI) / 180;
    group.add(ln([-0.0335 + 0.0078 * Math.cos(a), top - 0.0215 + 0.0078 * Math.sin(a), -0.0335 + 0.0063 * Math.cos(a), top - 0.0215 + 0.0063 * Math.sin(a)], "#1f2937", lw * 0.6));
  }
  const na = (-215 + 6.4 * 25) * Math.PI / 180;
  group.add(ln([-0.0335, top - 0.0215, -0.0335 + 0.0068 * Math.cos(na), top - 0.0215 + 0.0068 * Math.sin(na)], "#dc2626", lw * 1.1));
  group.add(new Konva.Circle({ x: m(-0.0335), y: m(top - 0.0215), radius: m(0.0014), fill: "#1f2937", listening: false }));
  group.add(new Konva.Arc({ x: m(-0.0335), y: m(top - 0.0215), innerRadius: m(0.0072), outerRadius: m(0.0087), angle: 50, rotation: 205, fill: "rgba(255,255,255,0.5)", listening: false }));

  // BỘ PHẬN QUAY: tay gạt van (cần dẹt với núm tròn nhựa đỏ). Gốc nhóm ở trục van trên đỉnh thân van.
  const vx = 0;
  const vy = top - 0.0355;
  group.add(new Konva.Circle({ x: m(vx), y: m(vy), radius: m(0.0058), ...lin(m(-0.0058), m(-0.0058), m(0.0058), m(0.0058), brass), stroke: "#451a03", strokeWidth: lw * 0.8, listening: false }));
  const valve = new Konva.Group({ x: m(vx), y: m(vy) });
  valve.add(new Konva.Rect({ x: m(-0.0035), y: m(-0.0058), width: m(0.036), height: m(0.0116), cornerRadius: m(0.004), ...lin(0, 0, 0, m(0.0116), [0, "#fecaca", 0.35, "#dc2626", 1, "#450a0a"]), stroke: "#450a0a", strokeWidth: lw, listening: false }));
  valve.add(new Konva.Circle({ x: m(0.032), radius: m(0.0072), fillRadialGradientStartPoint: { x: m(-0.002), y: m(-0.002) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0072), fillRadialGradientColorStops: [0, "#fecaca", 0.5, "#dc2626", 1, "#450a0a"], stroke: "#450a0a", strokeWidth: lw * 0.8, listening: false }));
  valve.add(new Konva.Circle({ radius: m(0.0024), fill: "#e2e8f0", stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
  valve.add(ln([0, -0.0035, 0.026, -0.0035], "rgba(255,255,255,0.55)", lw * 1.1));
  group.add(valve);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.006), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { valve: { node: valve, motion: "rotate" as const, min: 0, max: 90 } },
    points: { base: { x: 0, y: 0 }, valve: { x: m(vx), y: m(vy) }, gauge: { x: m(-0.0335), y: m(top - 0.0215) }, outlet: { x: m(0.0335), y: m(top - 0.022) } },
  };
};
