/* OBJECT-META
{
  "catalog": "Khe hẹp, khe Young (hai khe)",
  "title": "Khe Young: tấm kính phủ mực đen có hai khe song song trong khung slide, hình phóng to hai khe và các kích thước a, d",
  "fill": "#0b0f19",
  "anchor": "Giữa hai khe (đường trung trực của hai khe), trên trục chính.",
  "useWhen": ["Cần tấm có hai khe song song a = 0,5 mm cho thí nghiệm giao thoa ánh sáng Young.", "Cảnh có nguồn sáng ở bên trái, màn ở bên phải, khe nằm ngang trên trục chính."],
  "avoidWhen": ["Cần một khe đơn hay khe hẹp nhiễu xạ: vật này có sẵn hai khe, khác loại.", "Cần đèn khe ánh sáng đi kèm: dùng den-khe; a và bề rộng khe vẽ phóng to, không đúng tỉ lệ thật."],
  "size": { "width": 0.104, "height": 0.163 },
  "parts": [],
  "points": [
    { "name": "mid", "description": "Giữa hai khe, trên trục chính." },
    { "name": "slit1", "description": "Tâm khe trên." },
    { "name": "slit2", "description": "Tâm khe dưới, cách khe trên một khoảng a (vẽ phóng to)." },
    { "name": "holder", "description": "Chân giá đỡ ở mặt bàn." }
  ],
  "notes": "Hai khe rộng 0,05 mm cách nhau a = 0,5 mm; trong hình phóng to trên khung, bề rộng khe và khoảng cách a được vẽ to hơn thật để nhìn thấy (a vẽ 0,02 m, khe rộng 0,004 m). Khe vẽ nằm ngang để ánh sáng đi từ trái sang phải; hệ vân giao thoa trên màn do cảnh vẽ. fill là màu lớp phủ đen."
}
*/
const makeYoungSlits = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cy = -0.12;
  const A = 0.02;
  const SLIT_W = 0.004;

  // Đế gang, trụ thép và kẹp giữ khung slide.
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.006), radiusX: m(0.05), radiusY: m(0.0065), ...lin(m(-0.05), 0, m(0.05), 0, [0, "#475569", 0.3, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.004), y: m(cy + 0.065), width: m(0.008), height: m(-cy - 0.071), ...lin(m(-0.004), 0, m(0.004), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.016), y: m(cy + 0.058), width: m(0.032), height: m(0.012), cornerRadius: m(0.003), ...lin(m(-0.016), 0, m(0.016), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));

  // Khung slide nhựa trắng 5 cm × 5 cm: viền sáng, nền kính trong và vùng phủ đen ở giữa.
  group.add(new Konva.Rect({ x: m(-0.043), y: m(cy - 0.043), width: m(0.086), height: m(0.086), cornerRadius: m(0.003), ...lin(m(-0.043), m(cy - 0.043), m(0.043), m(cy + 0.043), [0, "#ffffff", 0.5, "#e2e8f0", 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.034), y: m(cy - 0.034), width: m(0.068), height: m(0.068), cornerRadius: m(0.002), fill: "rgba(186,230,253,0.5)", stroke: "#94a3b8", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0315), y: m(cy - 0.0315), width: m(0.063), height: m(0.063), cornerRadius: m(0.0015), ...lin(0, m(cy - 0.0315), 0, m(cy + 0.0315), [0, "#1f2937", 0.5, fill, 1, "#000"]), listening: false }));
  // Hai khe: dải sáng ngang, hai khe song song cách nhau a.
  for (const dy of [-A / 2, A / 2]) {
    group.add(new Konva.Rect({ x: m(-0.027), y: m(cy + dy - SLIT_W / 2), width: m(0.054), height: m(SLIT_W), fill: "#fffbe6", shadowColor: "#fde047", shadowBlur: m(0.01), shadowOpacity: 0.9, listening: false }));
    group.add(new Konva.Line({ points: [m(-0.025), m(cy + dy), m(0.025), m(cy + dy)], stroke: "#fff", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  }
  // Kích thước a: mũi tên hai đầu giữa hai khe, và d / 2a bên trái.
  group.add(new Konva.Arrow({ points: [m(0.032), m(cy - A / 2 + 0.0008), m(0.032), m(cy + A / 2 - 0.0008)], stroke: "#fbbf24", fill: "#fbbf24", strokeWidth: lw, pointerLength: m(0.0035), pointerWidth: m(0.003), pointerAtBeginning: true, listening: false }));
  group.add(ln([0.027, cy - A / 2, 0.036, cy - A / 2], "#fbbf24", lw * 0.8));
  group.add(ln([0.027, cy + A / 2, 0.036, cy + A / 2], "#fbbf24", lw * 0.8));
  group.add(new Konva.Text({ x: m(0.0345), y: m(cy - 0.004), text: "a", fontSize: m(0.0105), fontStyle: "italic bold", fill: "#fbbf24", listening: false }));
  // Trục chính đi qua giữa hai khe.
  group.add(new Konva.Line({ points: [m(-0.052), m(cy), m(0.052), m(cy)], stroke: "rgba(251,191,36,0.55)", strokeWidth: lw, dash: [m(0.004), m(0.003)], listening: false }));
  group.add(new Konva.Text({ x: m(-0.042), y: m(cy + 0.034), text: "S₁ S₂", fontSize: m(0.0075), fill: "#334155", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.008), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { mid: { x: 0, y: m(cy) }, slit1: { x: 0, y: m(cy - A / 2) }, slit2: { x: 0, y: m(cy + A / 2) }, holder: { x: 0, y: 0 } } };
};
