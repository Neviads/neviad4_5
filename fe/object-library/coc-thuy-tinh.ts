/* OBJECT-META
{
  "catalog": "Cốc thuỷ tinh (becher) có chất lỏng",
  "title": "Cốc thuỷ tinh becher có mỏ rót và vạch chia thể tích, chứa chất lỏng màu với mặt thoáng sáng",
  "fill": "#7dd3fc",
  "anchor": "Giữa đáy cốc, chạm mặt bàn.",
  "useWhen": ["Cần cốc becher 250 mL có mỏ rót, vạch chia 50 mL và chất lỏng có mực chỉnh được.","Cần cốc chứa nước để đun, nhúng vật hay đo thể tích khoảng 0 đến 85 mm."],
  "avoidWhen": ["Cần đọc thể tích chính xác bằng ống hẹp có vạch: dùng ong-dong.","Cần bình tràn hứng nước khi nhúng vật: dùng binh-tran; cốc này không có ống tràn."],
  "size": { "width": 0.082, "height": 0.1 },
  "parts": [
    { "name": "level", "label": "Mực chất lỏng", "motion": "slide", "axis": "up", "min": 0, "max": 0.085, "description": "Độ cao mặt chất lỏng tính từ đáy trong của cốc, mét." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy cốc." },
    { "name": "rim", "description": "Giữa miệng cốc." },
    { "name": "spout", "description": "Mỏ rót ở mép trái." }
  ],
  "notes": "Cốc 250 mL cao 0,095 m, đường kính 0,07 m, thành dày 0,002 m, vạch chia mỗi 50 mL. Chất lỏng tô theo độ cao hiện tại, đậm dần xuống đáy. fill là màu chất lỏng."
}
*/
const makeBeaker = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.07;
  const H = 0.095;
  const WALL = 0.002;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const left = -W / 2;

  group.add(new Konva.Ellipse({ x: m(0.003), y: m(-0.001), radiusX: m(W / 2 + 0.004), radiusY: m(0.003), fill: "rgba(0,0,0,0.4)", listening: false }));
  // BỘ PHẬN TRƯỢT: nhóm rỗng mang độ cao mặt chất lỏng.
  const level = new Konva.Group({ x: 0, y: 0 });
  const top = () => Math.max(0, -(level.y() || 0) / ppm);

  // Lòng cốc: nền kính nhạt và hơi tối ở đáy dày.
  group.add(new Konva.Rect({ x: m(left), y: m(-H), width: m(W), height: m(H), cornerRadius: m(0.002), fill: "rgba(186,230,253,0.1)", listening: false }));
  // Chất lỏng: tô theo độ cao, mặt trên là ellipse dẹt phản chiếu.
  group.add(new Konva.Shape({
    ...lin(0, m(-H), 0, 0, [0, "rgba(255,255,255,0.35)", 0.4, "rgba(125,211,252,0.62)", 1, "rgba(3,105,161,0.88)"]), fill, opacity: 0.95, listening: false,
    sceneFunc: (ctx, shape) => {
      const h = Math.min(H - 0.01, top());
      if (h <= 0.001) return;
      ctx.beginPath();
      ctx.moveTo(m(left + WALL), m(-0.004));
      ctx.lineTo(m(left + WALL), m(-0.004 - h));
      ctx.lineTo(m(left + W - WALL), m(-0.004 - h));
      ctx.lineTo(m(left + W - WALL), m(-0.004));
      ctx.closePath();
      ctx.fillStrokeShape(shape);
    },
  }));
  group.add(new Konva.Shape({
    stroke: "rgba(255,255,255,0.9)", strokeWidth: lw * 1.8, lineCap: "round", listening: false,
    sceneFunc: (ctx, shape) => {
      const h = Math.min(H - 0.01, top());
      if (h <= 0.001) return;
      ctx.beginPath();
      ctx.moveTo(m(left + WALL + 0.001), m(-0.004 - h));
      ctx.lineTo(m(left + W - WALL - 0.001), m(-0.004 - h));
      ctx.fillStrokeShape(shape);
    },
  }));
  group.add(level);

  // Thành cốc dày: viền sáng, lõm đáy, hai đường phản chiếu dọc và vạch chia mL.
  group.add(new Konva.Rect({ x: m(left), y: m(-H), width: m(W), height: m(H), cornerRadius: m(0.002), stroke: "rgba(226,240,252,0.95)", strokeWidth: m(0.0022), listening: false }));
  group.add(new Konva.Rect({ x: m(left), y: m(-0.0055), width: m(W), height: m(0.0055), fill: "rgba(148,163,184,0.5)", stroke: "rgba(226,240,252,0.9)", strokeWidth: lw, listening: false }));
  group.add(ln([left + 0.0055, -H + 0.004, left + 0.0055, -0.012], "rgba(255,255,255,0.75)", lw * 2.4));
  group.add(ln([left + W - 0.006, -H + 0.01, left + W - 0.006, -0.03], "rgba(255,255,255,0.35)", lw * 1.5));
  for (let i = 1; i <= 5; i += 1) {
    const y = -0.006 - i * 0.0146;
    group.add(ln([left + W - 0.016, y, left + W - 0.0035, y], "rgba(15,23,42,0.6)", i % 2 === 0 ? lw * 0.9 : lw * 0.6));
    if (i % 2 === 0) group.add(new Konva.Text({ x: m(left + W - 0.0355), y: m(y - 0.0035), width: m(0.018), align: "right", text: String(i * 50), fontSize: m(0.0045), fill: "rgba(15,23,42,0.75)", listening: false }));
  }
  // Miệng cốc: gờ viền dày và mỏ rót ở mép trái.
  group.add(new Konva.Rect({ x: m(left - 0.0025), y: m(-H - 0.0025), width: m(W + 0.005), height: m(0.0035), cornerRadius: m(0.0015), ...lin(0, 0, 0, m(0.0035), [0, "rgba(255,255,255,0.9)", 1, "rgba(148,163,184,0.7)"]), stroke: "rgba(226,240,252,0.95)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: [m(left - 0.0025), m(-H - 0.0025), m(left - 0.0095), m(-H + 0.0025), m(left - 0.0005), m(-H + 0.0065)], stroke: "rgba(226,240,252,0.95)", strokeWidth: m(0.002), lineJoin: "round", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.006), width: m(0.12), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { level: { node: level, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.085 } },
    points: { base: { x: 0, y: 0 }, rim: { x: 0, y: m(-H) }, spout: { x: m(left - 0.0095), y: m(-H + 0.0025) } },
  };
};
