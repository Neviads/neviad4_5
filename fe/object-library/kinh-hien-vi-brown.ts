/* OBJECT-META
{
  "catalog": "Kính hiển vi quan sát chuyển động Brown",
  "title": "Kính hiển vi sinh học đặt tiêu bản hạt phấn hoa trong nước, bên trái là vòng tròn phóng to trường nhìn với các hạt chuyển động hỗn loạn và vết quỹ đạo gấp khúc",
  "fill": "#1e293b",
  "anchor": "Giữa đáy đế kính hiển vi, chạm mặt bàn.",
  "useWhen": ["Cần kính hiển vi kèm vòng tròn trường nhìn phóng to có hạt phấn hoa và vết quỹ đạo Brown.", "Cảnh thí nghiệm chuyển động Brown, tổng phóng đại 400 lần, tiêu bản giọt nước."],
  "avoidWhen": ["Cần kính hiển vi thường quan sát tế bào, có ống nâng hạ lấy nét: dùng kinh-hien-vi.", "Cần mô hình phân tử chuyển động nhiệt: dùng phan-tu-khi; vật này không có bộ phận chuyển động."],
  "size": { "width": 0.219, "height": 0.324 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy đế." },
    { "name": "stage", "description": "Giữa bàn đặt mẫu." },
    { "name": "eyepiece", "description": "Mặt trên thị kính." },
    { "name": "field", "description": "Tâm vòng tròn trường nhìn phóng to bên trái." }
  ],
  "notes": "Kính cao 0,26 m, tổng độ phóng đại 400 lần. Tiêu bản là giọt nước nhỏ chứa hạt phấn hoa đường kính khoảng 1–2 µm; trong vòng tròn trường nhìn (đường kính 0,09 m, vẽ phóng to) hạt chuyển động hỗn loạn do va chạm của các phân tử nước, vết gấp khúc là vị trí hạt sau từng khoảng thời gian bằng nhau. fill là màu sơn thân và đế."
}
*/
const makeBrownMicroscope = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const enamel = [0, "#9ca3af", 0.28, fill, 1, "#030712"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const col = (x: number, y: number, w: number, h: number, stops: (number | string)[], r = 0.0015) => new Konva.Rect({ x: m(x), y: m(y), width: m(w), height: m(h), cornerRadius: m(r), ...lin(0, 0, m(w), 0, stops), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cx = 0.0;

  // Đế móng ngựa, bốn chân cao su.
  group.add(new Konva.Rect({ x: m(-0.07), y: m(-0.026), width: m(0.14), height: m(0.026), cornerRadius: m(0.009), ...lin(0, 0, 0, m(0.026), enamel), stroke: "#030712", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(ln([-0.062, -0.0235, 0.06, -0.0235], "rgba(255,255,255,0.28)", lw * 1.4));
  // Thân cong bên phải: nét đen, sơn, vệt sáng.
  const arm = [0.045, -0.02, 0.054, -0.09, 0.046, -0.18, 0.012, -0.238, -0.0, -0.25];
  group.add(new Konva.Line({ points: arm.map(m), stroke: "#030712", strokeWidth: m(0.035), lineCap: "round", lineJoin: "round", tension: 0.45, listening: false }));
  group.add(new Konva.Line({ points: arm.map(m), stroke: fill, strokeWidth: m(0.03), lineCap: "round", lineJoin: "round", tension: 0.45, listening: false }));
  group.add(new Konva.Line({ points: arm.map((v, i) => m(i % 2 === 0 ? v - 0.0085 : v - 0.003)), stroke: "rgba(255,255,255,0.26)", strokeWidth: m(0.005), lineCap: "round", lineJoin: "round", tension: 0.45, listening: false }));
  // Bàn đặt mẫu, tiêu bản kính có giọt nước chứa hạt phấn, kẹp lò xo, tụ quang và đèn.
  group.add(col(-0.058, -0.1, 0.085, 0.008, steel));
  group.add(new Konva.Rect({ x: m(-0.0455), y: m(-0.1055), width: m(0.046), height: m(0.0055), cornerRadius: m(0.0008), fill: "rgba(186,230,253,0.8)", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Ellipse({ x: m(cx - 0.0225), y: m(-0.1075), radiusX: m(0.0075), radiusY: m(0.0016), fill: "rgba(125,211,252,0.9)", stroke: "#0369a1", strokeWidth: lw * 0.5, listening: false }));
  for (const [x, y] of [[-0.0265, -0.1078], [-0.0225, -0.1082], [-0.0195, -0.1076]] as [number, number][]) group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(0.0008), fill: "#facc15", listening: false }));
  group.add(col(-0.0345, -0.088, 0.0125, 0.009, steel));
  group.add(col(-0.0525, -0.052, 0.044, 0.028, [0, "#374151", 0.3, "#9ca3af", 1, "#111827"], 0.003));
  group.add(new Konva.Ellipse({ x: m(-0.0305), y: m(-0.052), radiusX: m(0.022), radiusY: m(0.0045), fill: "#fde68a", stroke: "#78350f", strokeWidth: lw * 0.6, shadowColor: "#fbbf24", shadowBlur: m(0.012), shadowOpacity: 0.9, listening: false }));
  // Hai núm lấy nét.
  for (const [r, stops] of [[0.0165, [0, "#6b7280", 0.4, "#e5e7eb", 1, "#374151"]], [0.0105, [0, "#475569", 0.4, "#cbd5e1", 1, "#1f2937"]]] as [number, (number | string)[]][]) {
    group.add(new Konva.Circle({ x: m(0.052), y: m(-0.125), radius: m(r), ...lin(m(-r), m(-r), m(r), m(r), stops), stroke: "#0f172a", strokeWidth: lw, listening: false }));
    for (let i = 0; i < 20; i += 1) {
      const a = (i * Math.PI) / 10;
      group.add(ln([0.052 + (r - 0.0022) * Math.cos(a), -0.125 + (r - 0.0022) * Math.sin(a), 0.052 + (r - 0.0006) * Math.cos(a), -0.125 + (r - 0.0006) * Math.sin(a)], "rgba(15,23,42,0.6)", lw * 0.8));
    }
  }
  group.add(new Konva.Circle({ x: m(0.052), y: m(-0.125), radius: m(0.0035), fill: "#0f172a", listening: false }));
  // Đầu thân và ống kính cố định: thị kính, ống, đĩa vật kính, vật kính.
  group.add(new Konva.Rect({ x: m(-0.0575), y: m(-0.268), width: m(0.07), height: m(0.032), cornerRadius: m(0.006), ...lin(0, 0, 0, m(0.032), enamel), stroke: "#030712", strokeWidth: lw, listening: false }));
  group.add(col(-0.0455, -0.29, 0.032, 0.125, [0, "#111827", 0.28, "#4b5563", 0.55, "#1f2937", 1, "#030712"], 0.002));
  group.add(col(-0.0465, -0.222, 0.034, 0.005, steel, 0.001));
  group.add(col(-0.0465, -0.2, 0.034, 0.003, steel, 0.001));
  group.add(col(-0.0395, -0.316, 0.02, 0.03, steel));
  group.add(col(-0.0425, -0.322, 0.026, 0.01, [0, "#0b1220", 0.4, "#374151", 1, "#020617"], 0.003));
  group.add(new Konva.Ellipse({ x: m(-0.0295), y: m(-0.3225), radiusX: m(0.0085), radiusY: m(0.0016), fill: "rgba(56,189,248,0.7)", listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0515), m(-0.17), m(-0.0075), m(-0.17), m(-0.0145), m(-0.151), m(-0.0445), m(-0.151)], closed: true, ...lin(0, 0, m(0.044), 0, [0, "#6b7280", 0.35, "#e5e7eb", 1, "#374151"]), stroke: "#0f172a", strokeWidth: lw, lineJoin: "round", listening: false }));
  group.add(ln([-0.0465, -0.153, -0.0595, -0.128], "#0f172a", m(0.0105)));
  group.add(ln([-0.0465, -0.153, -0.0595, -0.128], "#9ca3af", m(0.0075)));
  group.add(col(-0.037, -0.153, 0.015, 0.032, [0, "#334155", 0.3, "#f8fafc", 0.6, "#94a3b8", 1, "#1e293b"]));
  group.add(col(-0.034, -0.121, 0.009, 0.003, [0, "#334155", 0.4, "#e2e8f0", 1, "#334155"], 0.001));

  // Vòng tròn trường nhìn phóng to (bên trái): nền sáng xanh, hạt phấn tròn có nhân và vết quỹ đạo.
  const fx = -0.1;
  const fy = -0.19;
  const fr = 0.045;
  group.add(ln([-0.04, -0.3225, -0.075, -0.275, fx + fr * 0.55, fy - fr * 0.83], "rgba(148,163,184,0.7)", lw * 0.8));
  group.add(new Konva.Line({ points: [m(-0.0295), m(-0.3225), m(fx + fr * 0.96), m(fy + fr * 0.25)], stroke: "rgba(148,163,184,0.5)", strokeWidth: lw * 0.7, dash: [m(0.003), m(0.0025)], listening: false }));
  group.add(new Konva.Circle({ x: m(fx), y: m(fy), radius: m(fr + 0.004), ...lin(m(-fr), m(-fr), m(fr), m(fr), steel), stroke: "#0f172a", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Circle({ x: m(fx), y: m(fy), radius: m(fr), fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(fr), fillRadialGradientColorStops: [0, "#e0f2fe", 0.75, "#7dd3fc", 1, "#0c4a6e"], stroke: "#0f172a", strokeWidth: lw, listening: false }));
  const tracks: number[][] = [
    [-0.018, -0.012, -0.008, -0.022, 0.0, -0.01, -0.01, -0.004, -0.004, 0.008, 0.01, 0.002],
    [0.016, 0.018, 0.006, 0.026, 0.014, 0.034, 0.026, 0.026, 0.02, 0.014],
    [0.014, -0.028, 0.026, -0.02, 0.02, -0.01, 0.03, -0.004, 0.018, 0.002],
    [-0.03, 0.01, -0.022, 0.022, -0.032, 0.03, -0.022, 0.034],
  ];
  for (const t of tracks) group.add(new Konva.Line({ points: t.map((v, i) => m(i % 2 === 0 ? fx + v : fy + v)), stroke: "rgba(7,89,133,0.85)", strokeWidth: lw * 1.1, lineJoin: "round", listening: false }));
  for (const t of tracks) {
    const n = t.length;
    group.add(new Konva.Circle({ x: m(fx + t[n - 2]), y: m(fy + t[n - 1]), radius: m(0.0042), fill: "#facc15", stroke: "#a16207", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Circle({ x: m(fx + t[n - 2] - 0.0012), y: m(fy + t[n - 1] - 0.0012), radius: m(0.0011), fill: "rgba(255,255,255,0.8)", listening: false }));
  }
  for (const [x, y] of [[-0.012, 0.03], [0.024, 0.0], [-0.004, -0.032]] as [number, number][]) group.add(new Konva.Circle({ x: m(fx + x), y: m(fy + y), radius: m(0.0008), fill: "rgba(255,255,255,0.7)", listening: false }));
  group.add(new Konva.Arc({ x: m(fx), y: m(fy), innerRadius: m(fr - 0.006), outerRadius: m(fr - 0.002), angle: 55, rotation: 205, fill: "rgba(255,255,255,0.55)", listening: false }));
  group.add(new Konva.Text({ x: m(fx - fr), y: m(fy + fr + 0.0085), width: m(fr * 2), align: "center", text: "hạt phấn hoa ×400", fontSize: m(0.0068), fill: "#e2e8f0", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(0.008), width: m(0.2), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, stage: { x: m(-0.0225), y: m(-0.1) }, eyepiece: { x: m(-0.0295), y: m(-0.322) }, field: { x: m(fx), y: m(fy) } } };
};
