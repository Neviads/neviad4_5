/* OBJECT-META
{
  "catalog": "Động cơ nhiệt (xi lanh, pít tông, bánh đà)",
  "title": "Mô hình động cơ nhiệt: xi lanh đồng đun nóng bằng đèn cồn, pít tông và thanh truyền nối với tay quay trên bánh đà gang lớn",
  "fill": "#d97706",
  "anchor": "Giữa đế gỗ, dưới xi lanh.",
  "useWhen": ["Cần động cơ nhiệt có xi lanh đồng, pít tông, thanh truyền và bánh đà, đun bằng đèn cồn.", "Cảnh chuyển nhiệt năng thành cơ năng với hành trình pít tông 0,03 m và bánh đà quay."],
  "avoidWhen": ["Cần xi lanh kín chỉ có pít tông, không có bánh đà: dùng xi-lanh-pit-tong.", "Cần động cơ điện: dùng dong-co-dien; vật này không có dây điện hay cực nguồn."],
  "size": { "width": 0.206, "height": 0.2 },
  "parts": [
    { "name": "piston", "label": "Pít tông", "motion": "slide", "axis": "up", "min": 0, "max": 0.03, "description": "Độ nâng pít tông khỏi vị trí thấp nhất, mét; thanh truyền tự nối pít tông với tay quay trên bánh đà." },
    { "name": "flywheel", "label": "Bánh đà", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của bánh đà và tay quay quanh trục, độ theo chiều kim đồng hồ; 0° là tay quay chỉ sang phải." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đế gỗ." },
    { "name": "cylinder", "description": "Giữa xi lanh." },
    { "name": "axle", "description": "Trục bánh đà." },
    { "name": "burner", "description": "Đầu đèn cồn đun đáy xi lanh." }
  ],
  "notes": "Xi lanh đồng đường kính 0,04 m, hành trình pít tông 0,03 m; bánh đà gang đường kính 0,08 m, tay quay bán kính 0,018 m. Khí trong xi lanh nóng lên nở ra đẩy pít tông đi lên, thanh truyền quay bánh đà, bánh đà đưa pít tông trở lại. Thanh truyền được vẽ nối pít tông và tay quay tại mỗi vị trí. fill là màu đồng thau của xi lanh."
}
*/
const makeHeatEngine = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const brass = [0, "#78350f", 0.28, "#fde68a", 0.65, fill, 1, "#451a03"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const CX = -0.045;
  const FX = 0.05;
  const FY = -0.125;
  const CR = 0.018;
  const cylTop = -0.1;
  const cylBot = -0.05;
  const CW = 0.02;
  const pinRest = -0.15;

  // Đế gỗ dày có vân.
  group.add(new Konva.Rect({ x: m(-0.098), y: m(-0.012), width: m(0.196), height: m(0.012), cornerRadius: m(0.003), ...lin(0, 0, 0, m(0.012), [0, "#d6a15a", 0.5, "#a16207", 1, "#5a2d0c"]), stroke: "#3b1d08", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  for (let i = 0; i < 4; i += 1) group.add(ln([-0.092 + i * 0.002, -0.0095 + i * 0.0022, 0.092 - i * 0.003, -0.0097 + i * 0.0022], "rgba(60,30,10,0.3)", lw * 0.7));

  // Đèn cồn nhỏ dưới xi lanh: thân thuỷ tinh, cổ đồng, ngọn lửa đỏ cam.
  group.add(new Konva.Ellipse({ x: m(CX), y: m(-0.034), radiusX: m(0.02), radiusY: m(0.024), fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.026), fillRadialGradientColorStops: [0, "rgba(251,146,60,0.4)", 1, "rgba(251,146,60,0)"], listening: false }));
  for (const [hk, wk, c] of [[1, 1, "#f97316"], [0.68, 0.6, "#fbbf24"], [0.36, 0.3, "#fef9c3"]] as [number, number, string][]) {
    group.add(new Konva.Line({ points: [m(CX), m(-0.0215), m(CX + 0.0072 * wk), m(-0.0215 - 0.007 * hk), m(CX + 0.0032 * wk), m(-0.0215 - 0.0165 * hk), m(CX), m(-0.0215 - 0.026 * hk), m(CX - 0.0032 * wk), m(-0.0215 - 0.0165 * hk), m(CX - 0.0072 * wk), m(-0.0215 - 0.007 * hk)], closed: true, tension: 0.45, fill: c, opacity: 0.92, listening: false }));
  }
  group.add(new Konva.Line({ points: [m(CX - 0.017), m(-0.012), m(CX - 0.021), m(-0.0105), m(CX - 0.0145), m(-0.0215), m(CX + 0.0145), m(-0.0215), m(CX + 0.021), m(-0.0105), m(CX + 0.017), m(-0.012)], closed: true, tension: 0.25, ...lin(m(CX - 0.02), 0, m(CX + 0.02), 0, [0, "rgba(255,255,255,0.6)", 0.4, "rgba(186,230,253,0.28)", 1, "rgba(71,85,105,0.6)"]), stroke: "rgba(226,240,252,0.9)", strokeWidth: lw * 1.2, lineJoin: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(CX - 0.0055), y: m(-0.0265), width: m(0.011), height: m(0.007), cornerRadius: m(0.0014), ...lin(0, 0, m(0.011), 0, brass), stroke: "#451a03", strokeWidth: lw * 0.8, listening: false }));

  // Bàn đỡ xi lanh (trụ sắt từ đế lên) và xi lanh đồng: ống hình trụ hở đỉnh, đáy đun hơi sẫm.
  group.add(new Konva.Rect({ x: m(-0.0905), y: m(-0.038), width: m(0.006), height: m(0.026), ...lin(0, 0, m(0.006), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0905), y: m(cylBot - 0.0015), width: m(0.0435), height: m(0.0048), ...lin(0, 0, 0, m(0.0048), steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(CX - CW), y: m(cylTop), width: m(CW * 2), height: m(cylBot - cylTop), cornerRadius: m(0.002), ...lin(0, 0, m(CW * 2), 0, brass), stroke: "#451a03", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(CX - CW + 0.0025), y: m(cylTop + 0.0015), width: m(CW * 2 - 0.005), height: m(cylBot - cylTop - 0.0055), fill: "#271405", listening: false }));
  group.add(new Konva.Rect({ x: m(CX - CW), y: m(cylBot - 0.014), width: m(CW * 2), height: m(0.014), cornerRadius: m(0.002), ...lin(0, 0, 0, m(0.014), [0, "rgba(220,38,38,0)", 1, "rgba(220,38,38,0.55)"]), listening: false }));
  group.add(ln([CX - CW + 0.003, cylTop + 0.004, CX - CW + 0.003, cylBot - 0.004], "rgba(255,255,255,0.6)", lw * 1.8));
  group.add(new Konva.Rect({ x: m(CX - CW - 0.003), y: m(cylTop - 0.0016), width: m(CW * 2 + 0.006), height: m(0.0048), cornerRadius: m(0.0015), ...lin(0, 0, m(CW * 2 + 0.006), 0, [0, "#fef3c7", 0.5, "#d97706", 1, "#78350f"]), stroke: "#451a03", strokeWidth: lw * 0.8, listening: false }));

  // Khí nóng trong xi lanh: nền hồng cam từ đáy tới mặt dưới pít tông; kích thước đọc từ bộ phận trượt.
  const piston = new Konva.Group({ x: 0, y: 0 });
  const lift = () => Math.max(0, -(piston.y() || 0) / ppm);
  group.add(new Konva.Shape({ fill: "#fb923c", opacity: 0.38, listening: false, sceneFunc: (ctx, shape) => { ctx.beginPath(); ctx.rect(m(CX - CW + 0.0025), m(-0.0525 - lift()), m(CW * 2 - 0.005), m(0.0525 - 0.0055 + lift() - 0.0)); ctx.fillStrokeShape(shape); } }));
  // Pít tông: đĩa thép ép sát thành xi lanh, hai vòng cao su, thanh pít tông chui ra miệng ống.
  piston.add(new Konva.Rect({ x: m(CX - 0.0035), y: m(pinRest), width: m(0.007), height: m(-0.062 - pinRest), ...lin(0, 0, m(0.007), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  piston.add(new Konva.Rect({ x: m(CX - CW + 0.0025), y: m(-0.0625), width: m(CW * 2 - 0.005), height: m(0.0105), cornerRadius: m(0.0015), ...lin(0, 0, m(CW * 2 - 0.005), 0, steel), stroke: "#334155", strokeWidth: lw * 0.9, listening: false }));
  for (const y of [-0.0605, -0.0535]) piston.add(new Konva.Rect({ x: m(CX - CW + 0.0018), y: m(y - 0.001), width: m(CW * 2 - 0.0036), height: m(0.002), fill: "#111827", listening: false }));
  piston.add(new Konva.Rect({ x: m(CX - 0.0045), y: m(pinRest - 0.003), width: m(0.009), height: m(0.01), cornerRadius: m(0.002), ...lin(0, 0, m(0.009), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  piston.add(new Konva.Circle({ x: m(CX), y: m(pinRest), radius: m(0.0026), fill: "#475569", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(piston);

  // Trụ đỡ bánh đà bằng sắt, ổ trục và bánh đà gang.
  group.add(new Konva.Rect({ x: m(FX - 0.0065), y: m(FY), width: m(0.013), height: m(-0.012 - FY), ...lin(0, 0, m(0.013), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(FX - 0.016), y: m(-0.022), width: m(0.032), height: m(0.01), cornerRadius: m(0.002), ...lin(0, 0, m(0.032), 0, [0, "#475569", 0.4, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  const fly = new Konva.Group({ x: m(FX), y: m(FY) });
  fly.add(new Konva.Circle({ radius: m(0.04), ...lin(m(-0.04), m(-0.04), m(0.04), m(0.04), [0, "#475569", 0.3, "#d1d5db", 0.7, "#6b7280", 1, "#111827"]), stroke: "#030712", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  fly.add(new Konva.Circle({ radius: m(0.031), fill: "#1f2937", stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  for (let i = 0; i < 6; i += 1) {
    const a = (i * Math.PI) / 3;
    fly.add(new Konva.Line({ points: [m(0.006 * Math.cos(a)), m(0.006 * Math.sin(a)), m(0.0305 * Math.cos(a)), m(0.0305 * Math.sin(a))], stroke: "#0f172a", strokeWidth: m(0.0062), lineCap: "round", listening: false }));
    fly.add(new Konva.Line({ points: [m(0.006 * Math.cos(a)), m(0.006 * Math.sin(a)), m(0.0305 * Math.cos(a)), m(0.0305 * Math.sin(a))], stroke: "#9ca3af", strokeWidth: m(0.0042), lineCap: "round", listening: false }));
  }
  fly.add(new Konva.Arc({ innerRadius: m(0.0325), outerRadius: m(0.0385), angle: 70, rotation: 205, fill: "rgba(255,255,255,0.4)", listening: false }));
  fly.add(new Konva.Circle({ radius: m(0.0082), ...lin(m(-0.008), m(-0.008), m(0.008), m(0.008), steel), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  fly.add(new Konva.Circle({ radius: m(0.0028), fill: "#1e293b", listening: false }));
  fly.add(new Konva.Circle({ x: m(CR), radius: m(0.0036), fill: "#dc2626", stroke: "#450a0a", strokeWidth: lw * 0.7, listening: false }));
  group.add(fly);

  // Thanh truyền: nối chốt trên cần pít tông tới chốt trên tay quay, tính theo vị trí hiện tại của hai bộ phận.
  const pinEnds = () => {
    const a = ((fly.rotation() || 0) * Math.PI) / 180;
    return { x0: CX, y0: pinRest - lift(), x1: FX + CR * Math.cos(a), y1: FY + CR * Math.sin(a) };
  };
  group.add(new Konva.Shape({ stroke: "#0f172a", strokeWidth: m(0.0065), lineCap: "round", listening: false, sceneFunc: (ctx, shape) => { const e = pinEnds(); ctx.beginPath(); ctx.moveTo(m(e.x0), m(e.y0)); ctx.lineTo(m(e.x1), m(e.y1)); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Shape({ stroke: "#cbd5e1", strokeWidth: m(0.0045), lineCap: "round", listening: false, sceneFunc: (ctx, shape) => { const e = pinEnds(); ctx.beginPath(); ctx.moveTo(m(e.x0), m(e.y0)); ctx.lineTo(m(e.x1), m(e.y1)); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Shape({ fill: "#f8fafc", stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false, sceneFunc: (ctx, shape) => { const e = pinEnds(); ctx.beginPath(); ctx.arc(m(e.x1), m(e.y1), m(0.0032), 0, Math.PI * 2, false); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Shape({ fill: "#f8fafc", stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false, sceneFunc: (ctx, shape) => { const e = pinEnds(); ctx.beginPath(); ctx.arc(m(e.x0), m(e.y0), m(0.0028), 0, Math.PI * 2, false); ctx.fillStrokeShape(shape); } }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.006), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      piston: { node: piston, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.03 },
      flywheel: { node: fly, motion: "rotate" as const, min: 0, max: 360 },
    },
    points: { base: { x: 0, y: 0 }, cylinder: { x: m(CX), y: m((cylTop + cylBot) / 2) }, axle: { x: m(FX), y: m(FY) }, burner: { x: m(CX), y: m(-0.0215) } },
  };
};
