/* OBJECT-META
{
  "catalog": "Bóng đèn sợi đốt (có đui)",
  "title": "Bóng đèn sợi đốt 6 V ren xoáy E27 thu nhỏ: bóng thuỷ tinh trong, sợi đốt xoắn trên hai trụ, đui ren đồng và núm tiếp xúc",
  "fill": "#fef3c7",
  "anchor": "Giữa đáy đui, chạm mặt bàn.",
  "useWhen": ["Cần bóng đèn sợi đốt 6 V – 3 W, đui ren E27, thấy sợi đốt xoắn trên hai trụ.","Cần bóng chuyển trạng thái tắt/sáng, sợi chuyển vàng trắng và có hào quang."],
  "avoidWhen": ["Cần đèn LED: dùng den-led.","Cần đèn để bàn có hộp, thấu kính, chiếu chùm sáng: dùng den-chieu.","Bóng nhỏ đứng trên bàn, không có đế đèn hay công tắc kèm theo."],
  "size": { "width": 0.034, "height": 0.106 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy đui." },
    { "name": "filament", "description": "Giữa sợi đốt trong bóng." },
    { "name": "contact", "description": "Núm tiếp xúc ở đáy đui." }
  ],
  "notes": "Bóng đèn 6 V – 3 W, bầu thuỷ tinh đường kính 0,056 m, đui ren dài 0,028 m; đứng trên mặt bàn nên đáy đui chạm bàn. Trong hình bóng ở trạng thái tắt, sợi đốt xám sẫm; khi sáng sợi chuyển vàng trắng và hào quang do cảnh vẽ. fill là màu hào quang khi sáng."
}
*/
const makeBulb = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const R = 0.028;
  const cy = -0.075;

  // Đui ren đồng: thân trụ với các vòng ren xoắn, vòng cách điện sứ và núm tiếp xúc ở đáy.
  group.add(new Konva.Rect({ x: m(-0.0085), y: m(-0.003), width: m(0.017), height: m(0.003), cornerRadius: m(0.0015), ...lin(m(-0.0085), 0, m(0.0085), 0, [0, "#fde68a", 0.5, "#b45309", 1, "#451a03"]), stroke: "#431407", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0125), y: m(-0.0285), width: m(0.025), height: m(0.026), cornerRadius: m(0.002), ...lin(m(-0.0125), 0, m(0.0125), 0, [0, "#6b7280", 0.25, "#f1f5f9", 0.6, "#cbd5e1", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.007), shadowOpacity: 0.4, shadowOffset: { x: m(0.0012), y: m(0.0025) }, listening: false }));
  for (let i = 0; i < 5; i += 1) {
    const y = -0.0255 + i * 0.0049;
    group.add(new Konva.Line({ points: [m(-0.0125), m(y + 0.0012), m(0), m(y - 0.0006), m(0.0125), m(y + 0.0018)], stroke: "rgba(15,23,42,0.7)", strokeWidth: lw * 1.1, tension: 0.4, listening: false }));
    group.add(new Konva.Line({ points: [m(-0.0125), m(y + 0.0003), m(0), m(y - 0.0015), m(0.0125), m(y + 0.0009)], stroke: "rgba(255,255,255,0.55)", strokeWidth: lw * 0.7, tension: 0.4, listening: false }));
  }
  group.add(new Konva.Rect({ x: m(-0.0115), y: m(-0.0345), width: m(0.023), height: m(0.007), cornerRadius: m(0.0012), ...lin(m(-0.0115), 0, m(0.0115), 0, [0, "#e5e7eb", 0.5, "#9ca3af", 1, "#334155"]), stroke: "#475569", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.011), y: m(-0.0365), width: m(0.022), height: m(0.003), fill: "#f8fafc", stroke: "#94a3b8", strokeWidth: lw * 0.5, listening: false }));

  // Cổ bóng và bầu thuỷ tinh: bầu tròn nối cổ thon, lớp thuỷ tinh có viền sáng, vệt phản chiếu.
  const NW = 0.011;
  const JS = Math.sqrt(R * R - NW * NW);
  group.add(new Konva.Shape({ fillRadialGradientStartPoint: { x: m(-0.011), y: m(cy - 0.012) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: m(cy) }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "rgba(255,255,255,0.45)", 0.55, "rgba(226,232,240,0.14)", 1, "rgba(148,163,184,0.35)"], stroke: "rgba(226,232,240,0.9)", strokeWidth: m(0.0018), lineJoin: "round", shadowColor: fill, shadowBlur: m(0.006), shadowOpacity: 0.25, listening: false, sceneFunc: (ctx, shape) => {
    ctx.beginPath();
    ctx.moveTo(m(-NW), m(-0.037));
    ctx.lineTo(m(-NW), m(cy + JS));
    ctx.arc(0, m(cy), m(R), Math.atan2(JS, -NW), Math.atan2(JS, NW) + Math.PI * 2, false);
    ctx.lineTo(m(NW), m(-0.037));
    ctx.closePath();
    ctx.fillStrokeShape(shape);
  } }));
  // Trụ thuỷ tinh đỡ sợi, hai trụ dây dẫn từ đui đi lên và sợi đốt xoắn giữa hai đầu trụ.
  group.add(new Konva.Rect({ x: m(-0.0045), y: m(-0.05), width: m(0.009), height: m(0.0135), ...lin(m(-0.0045), 0, m(0.0045), 0, [0, "rgba(148,163,184,0.7)", 0.5, "rgba(241,245,249,0.8)", 1, "rgba(100,116,139,0.7)"]), stroke: "rgba(15,23,42,0.4)", strokeWidth: lw * 0.6, listening: false }));
  group.add(ln([-0.0015, -0.037, -0.0015, -0.049, -0.009, cy - 0.001], "#9ca3af", lw * 1.1));
  group.add(ln([0.0015, -0.037, 0.0015, -0.049, 0.009, cy - 0.001], "#9ca3af", lw * 1.1));
  const fil: number[] = [];
  const turns = 11;
  for (let i = 0; i <= turns * 2; i += 1) {
    const x = -0.0085 + (i * 0.017) / (turns * 2);
    fil.push(x, cy - 0.001 + (i % 2 === 0 ? -0.0035 : 0.0035));
  }
  group.add(ln(fil, "#1e293b", lw * 1.3));
  group.add(ln(fil.map((v, i) => (i % 2 === 1 ? v - 0.0004 : v)), "#94a3b8", lw * 0.7));
  group.add(ln([-0.009, cy - 0.001, -0.0105, cy - 0.01], "#9ca3af", lw));
  group.add(ln([0.009, cy - 0.001, 0.0105, cy - 0.01], "#9ca3af", lw));

  // Phản chiếu cửa sổ trên bầu và điểm sáng nhỏ.
  group.add(new Konva.Arc({ x: 0, y: m(cy), innerRadius: m(R - 0.0085), outerRadius: m(R - 0.0045), angle: 62, rotation: 205, fill: "rgba(255,255,255,0.75)", listening: false }));
  group.add(new Konva.Circle({ x: m(-0.019), y: m(cy - 0.019), radius: m(0.0028), fill: "#fff", listening: false }));
  group.add(new Konva.Text({ x: m(-0.011), y: m(-0.0275), width: m(0.022), align: "center", text: "6V 3W", fontSize: m(0.0042), fontStyle: "bold", fill: "#1e293b", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.008), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, filament: { x: 0, y: m(cy - 0.001) }, contact: { x: 0, y: m(-0.0015) } } };
};
