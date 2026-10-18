/* OBJECT-META
{
  "catalog": "Ống đong / bình chia độ",
  "title": "Ống đong thuỷ tinh 100 mL: đế lục giác, vạch chia 1 mL, miệng có mỏ rót, mặt khum chất lỏng",
  "fill": "#38bdf8",
  "anchor": "Giữa đáy ống đong, chạm mặt bàn.",
  "useWhen": ["Cần ống đong 100 mL có vạch chia 1 mL, mặt khum và mực chất lỏng điều chỉnh được để đo thể tích.", "Cảnh đo thể tích chất lỏng hay vật chìm bằng độ dâng nước, đọc theo đáy mặt khum."],
  "avoidWhen": ["Cần ống nhỏ đựng thuốc thử không cần vạch đọc: dùng ong-nghiem.", "Vật chỉ đo tới 100 mL; thể tích lớn hơn thì vượt thang."],
  "size": { "width": 0.07, "height": 0.26 },
  "parts": [
    { "name": "level", "label": "Mực chất lỏng", "motion": "slide", "axis": "up", "min": 0, "max": 0.18, "description": "Độ cao đáy mặt khum so với vạch 0 mL (mét); 0,18 m ứng với 100 mL. Khối chất lỏng bám theo lòng ống." }
  ],
  "points": [
    { "name": "bottom", "description": "Giữa đáy ống." },
    { "name": "zeroMark", "description": "Vạch 0 mL." },
    { "name": "mouth", "description": "Miệng ống." }
  ],
  "notes": "Ống cao 0,24 m, lòng ống rộng 0,034 m, vạch 0 mL cao 0,034 m trên đáy, vạch 100 mL cách vạch 0 là 0,18 m, số ghi mỗi 10 mL; đọc theo đáy mặt khum. fill là màu chất lỏng."
}
*/
const makeMeasuringCylinder = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.017;
  const TOP = 0.245;
  const ZERO = 0.034;
  const SPAN = 0.18;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Đế lục giác thuỷ tinh (nhìn ngang: hai mặt bên nghiêng).
  group.add(new Konva.Line({ points: [m(-0.034), 0, m(0.034), 0, m(0.029), m(-0.012), m(0.0095), m(-0.026), m(-0.0095), m(-0.026), m(-0.029), m(-0.012)], closed: true, ...lin(m(-0.034), 0, m(0.034), 0, [0, "rgba(125,211,252,0.5)", 0.4, "rgba(240,249,255,0.22)", 1, "rgba(14,116,144,0.55)"]), stroke: "rgba(226,232,240,0.9)", strokeWidth: lw * 1.2, lineJoin: "round", shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.3, listening: false }));
  group.add(ln([-0.028, -0.011, 0.028, -0.011], "rgba(226,232,240,0.55)", lw));

  // Mực chất lỏng (bộ phận trượt): nhóm rỗng chỉ để mang độ cao.
  const level = new Konva.Group({ x: 0, y: 0 });
  group.add(level);
  const surface = () => ZERO + Math.max(0, -(level.y() || 0) / ppm);
  group.add(new Konva.Shape({
    ...lin(0, m(-ZERO - SPAN), 0, m(-ZERO), [0, "rgba(14,165,233,0.82)", 1, "rgba(3,105,161,0.9)"]), fill,
    listening: false,
    sceneFunc: (ctx, shape) => {
      const top = surface();
      if (top <= 0.0125) return;
      // Lòng ống từ đáy trong (0,010) tới đáy mặt khum; mặt khum lõm, mép dâng cao hơn tâm 1,6 mm.
      ctx.beginPath();
      ctx.moveTo(m(-R + 0.0015), m(-0.0125));
      ctx.lineTo(m(-R + 0.0015), m(-top - 0.0016));
      ctx.quadraticCurveTo(0, m(-top + 0.0016), m(R - 0.0015), m(-top - 0.0016));
      ctx.lineTo(m(R - 0.0015), m(-0.0125));
      ctx.closePath();
      ctx.fillStrokeShape(shape);
    },
  }));
  // Đường mặt khum sáng.
  group.add(new Konva.Shape({
    stroke: "rgba(255,255,255,0.8)", strokeWidth: lw * 1.2, lineCap: "round", listening: false,
    sceneFunc: (ctx, shape) => {
      const top = surface();
      if (top <= 0.0125) return;
      ctx.beginPath();
      ctx.moveTo(m(-R + 0.0015), m(-top - 0.0016));
      ctx.quadraticCurveTo(0, m(-top + 0.0016), m(R - 0.0015), m(-top - 0.0016));
      ctx.fillStrokeShape(shape);
    },
  }));

  // Thân ống thuỷ tinh: lòng trụ, thành dày, mỏ rót ở miệng.
  group.add(new Konva.Rect({ x: m(-R), y: m(-TOP), width: m(2 * R), height: m(TOP - 0.01), ...lin(m(-R), 0, m(R), 0, [0, "rgba(186,230,253,0.4)", 0.22, "rgba(240,249,255,0.12)", 0.7, "rgba(224,242,254,0.1)", 1, "rgba(100,170,210,0.45)"]), stroke: "rgba(226,232,240,0.95)", strokeWidth: lw * 1.3, listening: false }));
  group.add(new Konva.Line({ points: [m(-R - 0.0025), m(-TOP + 0.001), m(-R), m(-TOP - 0.0006), m(-R + 0.002), m(-TOP), m(R - 0.002), m(-TOP), m(R), m(-TOP - 0.0006), m(R + 0.0025), m(-TOP + 0.001)], stroke: "rgba(241,245,249,0.95)", strokeWidth: lw * 1.6, lineCap: "round", lineJoin: "round", listening: false }));
  group.add(ln([-R + 0.003, -TOP + 0.008, -R + 0.003, -0.02], "rgba(255,255,255,0.55)", lw * 2.2));
  group.add(ln([R - 0.0035, -TOP + 0.02, R - 0.0035, -0.04], "rgba(255,255,255,0.22)", lw * 1.4));
  // Thân dưới thu nhỏ vào cổ đế.
  group.add(new Konva.Line({ points: [m(-R), m(-0.0105), m(-0.0105), m(-0.026), m(0.0105), m(-0.026), m(R), m(-0.0105)], stroke: "rgba(226,232,240,0.8)", strokeWidth: lw, listening: false }));

  // Vạch chia 1 mL, số ghi mỗi 10 mL ở bên phải.
  for (let ml = 0; ml <= 100; ml += 1) {
    const y = -ZERO - (ml / 100) * SPAN;
    const ten = ml % 10 === 0;
    const five = ml % 5 === 0;
    group.add(ln([R, y, R - (ten ? 0.0145 : five ? 0.01 : 0.006), y], "rgba(241,245,249,0.95)", ten ? lw * 1.2 : lw * 0.7));
    if (ten) group.add(new Konva.Text({ x: m(R - 0.0165 - 0.017), y: m(y - 0.0036), width: m(0.017), align: "right", text: String(ml), fontSize: m(0.0072), fontStyle: "bold", fill: "rgba(241,245,249,0.95)", listening: false }));
  }
  group.add(new Konva.Text({ x: m(-R + 0.002), y: m(-ZERO - SPAN - 0.017), text: "100 mL", fontSize: m(0.0075), fontStyle: "bold", fill: "rgba(241,245,249,0.9)", listening: false }));
  group.add(new Konva.Text({ x: m(-R + 0.0012), y: m(-ZERO + 0.0035), text: "20 °C", fontSize: m(0.0058), fill: "rgba(241,245,249,0.65)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.05), y: m(0.006), width: m(0.1), align: "center", text: label, fontSize: m(0.01), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { level: { node: level, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.18 } },
    points: { bottom: { x: 0, y: 0 }, zeroMark: { x: m(R), y: m(-ZERO) }, mouth: { x: 0, y: m(-TOP) } },
  };
};
