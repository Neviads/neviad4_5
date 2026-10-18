/* OBJECT-META
{
  "catalog": "Đèn cồn (có ngọn lửa)",
  "title": "Đèn cồn thuỷ tinh: thân bầu chứa cồn, cổ ống đồng giữ bấc, ngọn lửa ba lớp (lõi xanh, vùng vàng, rìa cam) có vầng sáng",
  "fill": "#f97316",
  "anchor": "Giữa đáy đèn, chạm mặt bàn.",
  "useWhen": ["Cần đèn cồn có ngọn lửa để đun nóng, đổi cỡ ngọn lửa bằng độ nâng bấc.", "Cảnh đun nước, thí nghiệm nhiệt hoặc nóng chảy cần nguồn nhiệt kiểu phòng thí nghiệm."],
  "avoidWhen": ["Cần bếp đun điện có công suất xác định: dùng bep-dien.", "Ngọn lửa chỉ đổi cỡ 0,04–0,064 m; không mô phỏng đổi công suất hay đo nhiệt lượng cấp."],
  "size": { "width": 0.08, "height": 0.174 },
  "parts": [
    { "name": "flame", "label": "Cỡ ngọn lửa", "motion": "slide", "axis": "up", "min": 0, "max": 0.01, "description": "Độ nâng bấc, mét; 0 là ngọn nhỏ (cao 0,04 m), 0,01 là ngọn lớn nhất (cao 0,064 m, rộng hơn)." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy đèn." },
    { "name": "wick", "description": "Đầu bấc, chân ngọn lửa." },
    { "name": "flameTip", "description": "Chóp ngọn lửa ở cỡ nhỏ nhất." }
  ],
  "notes": "Bầu thuỷ tinh đường kính 0,07 m, cao 0,055 m chứa cồn 0,03 m; cổ đồng đường kính 0,022 m có bấc vải; ngọn lửa cao 0,04–0,064 m, nhiệt độ vùng ngọn khoảng 500–800 °C. Vùng nóng nhất là phần ngoài lõi xanh. fill là màu rìa ngọn lửa."
}
*/
const makeSpiritLamp = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const wickY = -0.098;

  // Ngọn lửa đi sau thân: vầng sáng, rìa cam, vùng vàng và lõi xanh; kích thước đọc từ bộ phận trượt.
  const flame = new Konva.Group({ x: 0, y: 0 });
  const size = () => Math.min(1, Math.max(0, -(flame.y() || 0) / ppm / 0.01));
  const path = (ctx: Konva.Context, h: number, w: number) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(m(w), m(-h * 0.2), m(w * 0.45), m(-h * 0.65), 0, m(-h));
    ctx.bezierCurveTo(m(-w * 0.45), m(-h * 0.65), m(-w), m(-h * 0.2), 0, 0);
    ctx.closePath();
  };
  const layers: [number, number, string, number][] = [[1, 1, fill, 0.85], [0.78, 0.62, "#fbbf24", 0.95], [0.5, 0.36, "#fef9c3", 1], [0.26, 0.2, "#60a5fa", 0.9]];
  group.add(new Konva.Ellipse({ x: 0, y: m(wickY - 0.03), radiusX: m(0.04), radiusY: m(0.045), fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.045), fillRadialGradientColorStops: [0, "rgba(251,146,60,0.35)", 1, "rgba(251,146,60,0)"], listening: false }));
  for (const [hk, wk, c, o] of layers) {
    group.add(new Konva.Shape({ x: 0, y: m(wickY - 0.001), fill: c, opacity: o, listening: false, sceneFunc: (ctx, shape) => { const s = size(); path(ctx, (0.04 + 0.024 * s) * hk, (0.0095 + 0.0035 * s) * wk); ctx.fillStrokeShape(shape); } }));
  }
  group.add(flame);

  // Bầu thuỷ tinh: bóng tròn dẹt có cồn bên trong, đáy phẳng.
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.003), radiusX: m(0.03), radiusY: m(0.004), fill: "rgba(0,0,0,0.4)", listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0115), m(-0.073), m(-0.026), m(-0.064), m(-0.035), m(-0.04), m(-0.03), m(-0.012), m(-0.02), m(-0.0015), m(0.02), m(-0.0015), m(0.03), m(-0.012), m(0.035), m(-0.04), m(0.026), m(-0.064), m(0.0115), m(-0.073)], closed: true, tension: 0.4, ...lin(m(-0.035), 0, m(0.035), 0, [0, "rgba(255,255,255,0.55)", 0.3, "rgba(186,230,253,0.25)", 1, "rgba(71,85,105,0.5)"]), stroke: "rgba(226,240,252,0.95)", strokeWidth: m(0.0022), lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0295), m(-0.0305), m(-0.0295), m(-0.012), m(-0.02), m(-0.0036), m(0.02), m(-0.0036), m(0.0295), m(-0.012), m(0.0295), m(-0.0305)], closed: true, tension: 0.35, ...lin(0, m(-0.03), 0, 0, [0, "rgba(251,191,36,0.4)", 1, "rgba(180,83,9,0.55)"]), listening: false }));
  group.add(ln([-0.0285, -0.0305, 0.0285, -0.0305], "rgba(255,255,255,0.8)", lw * 1.2));
  group.add(new Konva.Arc({ x: 0, y: m(-0.04), innerRadius: m(0.0275), outerRadius: m(0.031), angle: 55, rotation: 195, fill: "rgba(255,255,255,0.7)", listening: false }));
  group.add(new Konva.Ellipse({ x: m(-0.0225), y: m(-0.047), radiusX: m(0.0018), radiusY: m(0.008), fill: "rgba(255,255,255,0.6)", rotation: 20, listening: false }));
  group.add(new Konva.Text({ x: m(-0.02), y: m(-0.02), width: m(0.04), align: "center", text: "cồn 90°", fontSize: m(0.0056), fill: "rgba(255,255,255,0.85)", listening: false }));

  // Cổ đồng thau nối bấc: ống trụ có gờ và vành xoắn.
  group.add(new Konva.Rect({ x: m(-0.0125), y: m(-0.085), width: m(0.025), height: m(0.016), cornerRadius: m(0.002), ...lin(0, 0, m(0.025), 0, [0, "#a16207", 0.3, "#fde68a", 0.65, "#d97706", 1, "#451a03"]), stroke: "#451a03", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0155), y: m(-0.0705), width: m(0.031), height: m(0.0035), cornerRadius: m(0.001), fill: "#b45309", stroke: "#451a03", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0075), y: m(-0.0985), width: m(0.015), height: m(0.014), cornerRadius: m(0.0015), ...lin(0, 0, m(0.015), 0, [0, "#6b7280", 0.4, "#e5e7eb", 1, "#374151"]), stroke: "#1e293b", strokeWidth: lw * 0.8, listening: false }));
  group.add(ln([-0.0105, -0.081, 0.0105, -0.0805], "rgba(67,20,7,0.5)", lw * 0.7));
  group.add(ln([-0.0105, -0.076, 0.0105, -0.0755], "rgba(67,20,7,0.5)", lw * 0.7));
  group.add(new Konva.Rect({ x: m(-0.003), y: m(-0.1), width: m(0.006), height: m(0.0035), fill: "#e7e5e4", stroke: "#78716c", strokeWidth: lw * 0.5, listening: false }));
  group.add(ln([-0.0105, -0.0835, -0.0105, -0.0695], "rgba(255,255,255,0.45)", lw * 1.2));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.006), width: m(0.12), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { flame: { node: flame, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.01 } },
    points: { base: { x: 0, y: 0 }, wick: { x: 0, y: m(wickY) }, flameTip: { x: 0, y: m(wickY - 0.041) } },
  };
};
