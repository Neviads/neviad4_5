/* OBJECT-META
{
  "catalog": "Nến",
  "title": "Cây nến trắng đặt trên đĩa kim loại nhỏ: thân sáp có giọt chảy, bấc đen, vũng sáp lỏng ở đỉnh và ngọn lửa ba lớp tạo quầng sáng",
  "fill": "#f97316",
  "anchor": "Giữa đáy chân nến, chạm mặt bàn.",
  "useWhen": ["Cần cây nến trắng trên đĩa kim loại, ngọn lửa ba lớp phát sáng, làm nguồn sáng hoặc nhiệt nhỏ.","Cần vật sáng có chiều cao vài cm đặt trước thấu kính hoặc gương."],
  "avoidWhen": ["Cần bóng đèn hoặc nguồn laser rõ nét: dùng bong-den hoặc laser.","Cần vật sáng hình mũi tên hoặc chữ F cho bài ảnh: dùng vat-sang.","Ngọn lửa tĩnh, không dao động theo thời gian."],
  "size": { "width": 0.07, "height": 0.174 },
  "parts": [
    { "name": "flame", "label": "Cỡ ngọn lửa", "motion": "slide", "axis": "up", "min": 0, "max": 0.01, "description": "Độ nâng bấc, mét; 0 là ngọn nhỏ (cao 0,028 m), 0,01 là ngọn lớn (cao 0,044 m)." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy chân nến." },
    { "name": "wick", "description": "Đầu bấc, chân ngọn lửa." },
    { "name": "waxTop", "description": "Giữa mặt sáp lỏng ở đỉnh nến." }
  ],
  "notes": "Nến cao 0,085 m, đường kính 0,022 m, đặt trên đĩa thép đường kính 0,06 m; đỉnh có vũng sáp lỏng, hai giọt sáp chảy xuống thân. Ngọn lửa cao 0,028–0,044 m có lõi xanh ở chân, vùng vàng và rìa cam. fill là màu rìa ngọn lửa."
}
*/
const makeCandle = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const R = 0.011;
  const top = -0.1;
  const wickTop = top - 0.011;

  // Ngọn lửa phía sau thân nến, kích thước đọc từ bộ phận trượt.
  const flame = new Konva.Group({ x: 0, y: 0 });
  const size = () => Math.min(1, Math.max(0, -(flame.y() || 0) / ppm / 0.01));
  const path = (ctx: Konva.Context, h: number, w: number) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(m(w), m(-h * 0.2), m(w * 0.45), m(-h * 0.65), 0, m(-h));
    ctx.bezierCurveTo(m(-w * 0.45), m(-h * 0.65), m(-w), m(-h * 0.2), 0, 0);
    ctx.closePath();
  };
  group.add(new Konva.Ellipse({ x: 0, y: m(wickTop - 0.02), radiusX: m(0.035), radiusY: m(0.04), fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.04), fillRadialGradientColorStops: [0, "rgba(251,191,36,0.4)", 1, "rgba(251,191,36,0)"], listening: false }));
  for (const [hk, wk, c, o] of [[1, 1, fill, 0.85], [0.78, 0.62, "#fbbf24", 0.95], [0.5, 0.36, "#fef9c3", 1], [0.26, 0.2, "#60a5fa", 0.9]] as [number, number, string, number][]) {
    group.add(new Konva.Shape({ x: 0, y: m(wickTop + 0.0005), fill: c, opacity: o, listening: false, sceneFunc: (ctx, shape) => { const s = size(); path(ctx, (0.028 + 0.016 * s) * hk, (0.0075 + 0.003 * s) * wk); ctx.fillStrokeShape(shape); } }));
  }
  group.add(flame);

  // Đĩa kim loại nhỏ và bóng đổ.
  group.add(new Konva.Ellipse({ x: m(0.002), y: m(-0.001), radiusX: m(0.032), radiusY: m(0.0035), fill: "rgba(0,0,0,0.4)", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.03), y: m(-0.0045), width: m(0.06), height: m(0.0045), cornerRadius: m(0.002), ...lin(0, 0, m(0.06), 0, [0, "#475569", 0.3, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.0045), radiusX: m(0.03), radiusY: m(0.0022), ...lin(m(-0.03), 0, m(0.03), 0, [0, "#64748b", 0.4, "#f8fafc", 1, "#475569"]), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Ellipse({ x: m(0.003), y: m(0.0), radiusX: m(0.011), radiusY: m(0.0016), fill: "rgba(255,255,255,0.8)", listening: false }));
  // Thân nến: trụ sáp trắng ngà có gradient, vệt sáng và vết sọc dọc, giọt sáp chảy.
  group.add(new Konva.Rect({ x: m(-R), y: m(top), width: m(R * 2), height: m(-0.0055 - top), ...lin(0, 0, m(R * 2), 0, [0, "#d6d3d1", 0.25, "#fffbeb", 0.6, "#fef3c7", 1, "#a8a29e"]), stroke: "#78716c", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.007), shadowOpacity: 0.35, shadowOffset: { x: m(0.0015), y: m(0.003) }, listening: false }));
  group.add(ln([-R + 0.0032, top + 0.004, -R + 0.0032, -0.009], "rgba(255,255,255,0.8)", lw * 2));
  group.add(ln([R - 0.003, top + 0.01, R - 0.003, -0.012], "rgba(120,113,108,0.35)", lw * 1.4));
  group.add(new Konva.Line({ points: [m(-R + 0.0015), m(top + 0.002), m(-R + 0.0015), m(top + 0.022), m(-R + 0.0042), m(top + 0.0305), m(-R + 0.0069), m(top + 0.022), m(-R + 0.0069), m(top + 0.002)], closed: true, tension: 0.4, fill: "#fff7ed", stroke: "rgba(168,162,158,0.7)", strokeWidth: lw * 0.7, lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(R - 0.0069), m(top + 0.002), m(R - 0.0069), m(top + 0.012), m(R - 0.0045), m(top + 0.0165), m(R - 0.0021), m(top + 0.012), m(R - 0.0021), m(top + 0.002)], closed: true, tension: 0.4, fill: "#fff7ed", stroke: "rgba(168,162,158,0.7)", strokeWidth: lw * 0.7, lineJoin: "round", listening: false }));
  // Vũng sáp lỏng trong suốt ở đỉnh và bấc đen cong nhẹ có đầu cháy đỏ.
  group.add(new Konva.Ellipse({ x: 0, y: m(top), radiusX: m(R), radiusY: m(0.0028), fill: "#fef3c7", stroke: "#a8a29e", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Ellipse({ x: 0, y: m(top), radiusX: m(R - 0.0025), radiusY: m(0.002), fill: "rgba(253,224,71,0.55)", listening: false }));
  group.add(new Konva.Line({ points: [0, m(top), m(0.0006), m(top - 0.006), 0, m(wickTop)], stroke: "#0f172a", strokeWidth: m(0.0016), lineCap: "round", tension: 0.5, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(wickTop), radius: m(0.0011), fill: "#ef4444", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.006), width: m(0.12), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { flame: { node: flame, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.01 } },
    points: { base: { x: 0, y: 0 }, wick: { x: 0, y: m(wickTop) }, waxTop: { x: 0, y: m(top) } },
  };
};
