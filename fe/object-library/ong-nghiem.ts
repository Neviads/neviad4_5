/* OBJECT-META
{
  "catalog": "Ống nghiệm",
  "title": "Ống nghiệm thuỷ tinh đáy tròn có miệng viền dày, chứa chất lỏng màu với mặt lõm (khum) và vạch chia nhỏ",
  "fill": "#a78bfa",
  "anchor": "Đáy ống (điểm thấp nhất), ống dựng thẳng.",
  "useWhen": ["Cần ống nghiệm thuỷ tinh đáy tròn, chứa chất lỏng màu có mặt khum, mực điều chỉnh được (bộ phận level).", "Cảnh thí nghiệm hoá hay nhiệt cần ống nhỏ dựng thẳng, cao 0,15 m."],
  "avoidWhen": ["Cần đo thể tích có vạch chia mL: dùng ong-dong.", "Vật không có giá đỡ hay nút đậy; chỉ dựng thẳng đứng, không nghiêng."],
  "size": { "width": 0.026, "height": 0.152 },
  "parts": [
    { "name": "level", "label": "Mực chất lỏng", "motion": "slide", "axis": "up", "min": 0, "max": 0.12, "description": "Độ cao mặt chất lỏng tính từ đáy trong của ống, mét." }
  ],
  "points": [
    { "name": "bottom", "description": "Điểm thấp nhất của đáy ống." },
    { "name": "mouth", "description": "Giữa miệng ống." }
  ],
  "notes": "Ống nghiệm cao 0,15 m, đường kính ngoài 0,022 m, thành dày 0,0015 m, đáy bán cầu. Dựng thẳng đứng (đặt trong giá hoặc cặp). Mặt chất lỏng hơi lõm do dính ướt. fill là màu chất lỏng."
}
*/
const makeTestTube = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.011;
  const H = 0.15;
  const WALL = 0.0015;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const bodyPath = (ctx: Konva.Context, r: number, h: number) => {
    ctx.beginPath();
    ctx.moveTo(m(-r), m(-h));
    ctx.lineTo(m(-r), m(-R));
    ctx.arc(0, m(-R), m(r), Math.PI, 0, true);
    ctx.lineTo(m(r), m(-h));
  };

  group.add(new Konva.Ellipse({ x: m(0.002), y: m(-0.0005), radiusX: m(0.011), radiusY: m(0.0016), fill: "rgba(0,0,0,0.3)", listening: false }));
  const level = new Konva.Group({ x: 0, y: 0 });
  const top = () => Math.max(0, -(level.y() || 0) / ppm);
  // Lòng ống nền kính nhạt.
  group.add(new Konva.Shape({ fill: "rgba(186,230,253,0.12)", listening: false, sceneFunc: (ctx, shape) => { bodyPath(ctx, R - WALL, H); ctx.closePath(); ctx.fillStrokeShape(shape); } }));
  // Chất lỏng: từ đáy bán cầu lên mặt có khum lõm.
  group.add(new Konva.Shape({
    ...lin(m(-R), 0, m(R), 0, [0, "rgba(255,255,255,0.25)", 0.35, "rgba(167,139,250,0.65)", 1, "rgba(76,29,149,0.85)"]), fill, opacity: 0.95, listening: false,
    sceneFunc: (ctx, shape) => {
      const h = Math.min(H - 0.015, top());
      if (h <= 0.001) return;
      const r = R - WALL;
      const y = -h - WALL;
      ctx.beginPath();
      ctx.moveTo(m(-r), m(y));
      ctx.lineTo(m(-r), m(-R));
      ctx.arc(0, m(-R), m(r), Math.PI, 0, true);
      ctx.lineTo(m(r), m(y));
      ctx.quadraticCurveTo(0, m(y + 0.0022), m(-r), m(y));
      ctx.closePath();
      ctx.fillStrokeShape(shape);
    },
  }));
  group.add(new Konva.Shape({
    stroke: "rgba(255,255,255,0.9)", strokeWidth: lw * 1.4, lineCap: "round", listening: false,
    sceneFunc: (ctx, shape) => {
      const h = Math.min(H - 0.015, top());
      if (h <= 0.001) return;
      const r = R - WALL;
      const y = -h - WALL;
      ctx.beginPath();
      ctx.moveTo(m(-r), m(y));
      ctx.quadraticCurveTo(0, m(y + 0.0022), m(r), m(y));
      ctx.fillStrokeShape(shape);
    },
  }));
  group.add(level);
  // Thành ống: đường viền kép (ngoài sáng, trong tối), vệt phản chiếu dọc, vạch chia.
  group.add(new Konva.Shape({ stroke: "rgba(226,240,252,0.95)", strokeWidth: m(0.0026), lineJoin: "round", listening: false, sceneFunc: (ctx, shape) => { bodyPath(ctx, R, H); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Shape({ stroke: "rgba(15,23,42,0.35)", strokeWidth: lw * 0.7, lineJoin: "round", listening: false, sceneFunc: (ctx, shape) => { bodyPath(ctx, R - WALL, H - 0.003); ctx.fillStrokeShape(shape); } }));
  group.add(ln([-R + 0.0028, -H + 0.012, -R + 0.0028, -R - 0.002], "rgba(255,255,255,0.8)", lw * 2.2));
  group.add(ln([R - 0.0028, -H + 0.03, R - 0.0028, -0.04], "rgba(255,255,255,0.3)", lw * 1.3));
  group.add(new Konva.Arc({ x: 0, y: m(-R), innerRadius: m(R - 0.0045), outerRadius: m(R - 0.0025), angle: 55, rotation: 105, fill: "rgba(255,255,255,0.55)", listening: false }));
  for (let i = 1; i <= 10; i += 1) {
    const y = -0.015 - i * 0.0105;
    group.add(ln([R - (i % 5 === 0 ? 0.008 : 0.0045), y, R - 0.0015, y], "rgba(15,23,42,0.55)", lw * 0.6));
  }
  // Miệng ống: gờ viền dày.
  group.add(new Konva.Ellipse({ x: 0, y: m(-H), radiusX: m(R + 0.0014), radiusY: m(0.0018), stroke: "rgba(226,240,252,0.95)", strokeWidth: lw * 1.6, listening: false }));
  group.add(new Konva.Ellipse({ x: 0, y: m(-H), radiusX: m(R - 0.0006), radiusY: m(0.0011), fill: "rgba(2,6,23,0.55)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.05), y: m(0.006), width: m(0.1), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { level: { node: level, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.12 } },
    points: { bottom: { x: 0, y: 0 }, mouth: { x: 0, y: m(-H) } },
  };
};
