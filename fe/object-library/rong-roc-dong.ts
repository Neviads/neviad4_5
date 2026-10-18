/* OBJECT-META
{
  "catalog": "Ròng rọc động / palăng",
  "title": "Palăng hai ròng rọc: khối cố định trên xà, khối động mang móc tải, dây vòng qua cả hai và đầu tự do thả xuống",
  "fill": "#cbd5e1",
  "anchor": "Tâm móc treo của khối ròng rọc cố định ở trên cùng.",
  "useWhen": ["Cần palăng hai ròng rọc: khối cố định trên xà, khối động có móc tải, dây vòng qua cả hai.","Cần lợi 2 lần về lực, thiệt 2 lần về đường đi."],
  "avoidWhen": ["Chỉ cần ròng rọc đổi hướng lực: dùng rong-roc-co-dinh.","Dây đã tích hợp, đầu tự do thả bên trái; cần cách mắc dây khác thì không dùng được."],
  "size": { "width": 0.107, "height": 0.326 },
  "parts": [
    { "name": "movable", "label": "Khối ròng rọc động", "motion": "slide", "axis": "up", "min": 0, "max": 0.14, "description": "Độ nâng của khối động lên so với vị trí thấp nhất (mét); dây dài được kéo xuống 2·h ở đầu tự do." },
    { "name": "wheelTop", "label": "Bánh khối cố định", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của bánh ròng rọc cố định (độ)." },
    { "name": "wheelBottom", "label": "Bánh khối động", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của bánh ròng rọc động (độ), nằm trong khối động nên cũng theo nó lên xuống." }
  ],
  "points": [
    { "name": "topHook", "description": "Tâm móc treo của khối cố định." },
    { "name": "loadHook", "description": "Tâm móc tải ở tư thế thấp nhất; vị trí thật = loadHook − movable (đi lên)." },
    { "name": "freeEnd", "description": "Đầu tự do của dây (nơi người kéo)." }
  ],
  "notes": "Hai bánh bán kính 0,026 m. Dây vắt từ đầu cố định dưới khối trên, xuống vòng dưới bánh động, lên vòng qua bánh cố định rồi thả xuống ở bên trái: lợi 2 lần về lực, thiệt 2 lần về đường đi. Dây vẽ lại theo vị trí khối động. fill là màu thép của má."
}
*/
const makeBlockAndTackle = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.026;
  const TOP_Y = 0.075;
  const LOW_Y = 0.235;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, fill, 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  /** Một khối ròng rọc: má thép, bánh có nan, trục; trả về nhóm bánh (quay) cho bộ phận. */
  const block = (parent: Konva.Group, cy: number): Konva.Group => {
    parent.add(new Konva.Line({ points: [m(-R - 0.009), m(cy - 0.012), m(-R - 0.01), m(cy + 0.012), m(-0.014), m(cy + R + 0.01), m(0.014), m(cy + R + 0.01), m(R + 0.01), m(cy + 0.012), m(R + 0.009), m(cy - 0.012), m(0.014), m(cy - R - 0.01), m(-0.014), m(cy - R - 0.01)], closed: true, tension: 0.3, ...lin(m(-R), 0, m(R), 0, [0, "#475569", 0.3, "#cbd5e1", 0.7, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 1.1, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.35, listening: false }));
    const wheel = new Konva.Group({ x: 0, y: m(cy) });
    wheel.add(new Konva.Circle({ radius: m(R - 0.0015), ...lin(m(-R), m(-R), m(R), m(R), [0, "#f8fafc", 0.3, fill, 0.8, "#475569", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw * 1.2, listening: false }));
    wheel.add(new Konva.Circle({ radius: m(R - 0.0055), ...lin(m(R), m(R), m(-R), m(-R), [0, "#334155", 0.5, "#94a3b8", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
    for (let i = 0; i < 5; i += 1) {
      const a = (i * 2 * Math.PI) / 5;
      wheel.add(new Konva.Line({ points: [m(0.005 * Math.cos(a)), m(0.005 * Math.sin(a)), m((R - 0.0075) * Math.cos(a)), m((R - 0.0075) * Math.sin(a))], stroke: "#cbd5e1", strokeWidth: m(0.0034), lineCap: "round", listening: false }));
    }
    wheel.add(new Konva.Circle({ radius: m(0.0068), ...lin(m(-0.0068), m(-0.0068), m(0.0068), m(0.0068), steel), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
    wheel.add(new Konva.Circle({ radius: m(0.003), fill: "#334155", listening: false }));
    wheel.add(new Konva.Circle({ x: m(R - 0.0042), y: 0, radius: m(0.0012), fill: "#dc2626", listening: false }));
    parent.add(wheel);
    return wheel;
  };

  // Khối cố định phía trên: móc treo, cổ nối, má và bánh.
  group.add(new Konva.Line({ points: [0, m(0.036), 0, m(0.018), m(0.0085), m(0.0115), m(0.0085), m(0.001), 0, m(-0.005), m(-0.0085), m(0.001), m(-0.0085), m(0.0075)], stroke: "#e2e8f0", strokeWidth: m(0.0042), lineCap: "round", lineJoin: "round", tension: 0.28, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.004), y: m(0.03), width: m(0.008), height: m(TOP_Y - R - 0.03 - 0.008), ...lin(m(-0.004), 0, m(0.004), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  const wheelTop = block(group, TOP_Y);

  // BỘ PHẬN TRƯỢT: khối động (má, bánh, cổ nối, móc tải). Gốc nhóm là tâm bánh động ở vị trí thấp nhất.
  const movable = new Konva.Group({ x: 0, y: m(LOW_Y) });
  const wheelBottom = block(movable, 0);
  movable.add(new Konva.Rect({ x: m(-0.004), y: m(R + 0.008), width: m(0.008), height: m(0.016), ...lin(m(-0.004), 0, m(0.004), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  movable.add(new Konva.Line({ points: [0, m(R + 0.023), 0, m(R + 0.034), m(0.0085), m(R + 0.043), m(0.0085), m(R + 0.054), 0, m(R + 0.06), m(-0.0085), m(R + 0.054)], stroke: "#e2e8f0", strokeWidth: m(0.0042), lineCap: "round", lineJoin: "round", tension: 0.28, shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.3, listening: false }));
  // Dây: từ đầu cố định (dưới khối trên) xuống bánh động, vòng dưới bánh, lên bánh cố định, vòng trên rồi thả xuống bên trái.
  // Tâm bánh động (mét) đọc thẳng từ vị trí nhóm: ở tư thế nghỉ là LOW_Y, nâng lên thì nhỏ đi.
  const my = () => (movable.y() || 0) / ppm;
  const rope = (ctx: Konva.Context) => {
    const y = my();
    ctx.beginPath();
    ctx.moveTo(m(-R + 0.0015), m(TOP_Y + R + 0.012));
    ctx.lineTo(m(-R + 0.0015), m(y));
    ctx.arc(0, m(y), m(R - 0.0015), Math.PI, 0, true);
    ctx.lineTo(m(R - 0.0015), m(TOP_Y));
    ctx.arc(0, m(TOP_Y), m(R - 0.0015), 0, Math.PI, true);
    ctx.bezierCurveTo(m(-R - 0.004), m(TOP_Y + 0.04), m(-R - 0.03), m(TOP_Y + 0.07), m(-R - 0.034), m(TOP_Y + 0.16));
  };
  group.add(new Konva.Shape({ stroke: "#0b0f19", strokeWidth: m(0.0042), lineCap: "round", lineJoin: "round", listening: false, sceneFunc: (ctx, shape) => { rope(ctx); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Shape({ stroke: "#b8793a", strokeWidth: m(0.0028), lineCap: "round", lineJoin: "round", dash: [m(0.003), m(0.0017)], listening: false, sceneFunc: (ctx, shape) => { rope(ctx); ctx.fillStrokeShape(shape); } }));
  group.add(movable);
  // Cái gắn đầu dây cố định: kẹp nhỏ dưới má khối trên.
  group.add(new Konva.Rect({ x: m(-R - 0.0035), y: m(TOP_Y + R + 0.0085), width: m(0.0085), height: m(0.007), cornerRadius: m(0.002), fill: "#94a3b8", stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  // Tay nắm ở đầu tự do.
  group.add(new Konva.Rect({ x: m(-R - 0.045), y: m(TOP_Y + 0.16), width: m(0.022), height: m(0.012), cornerRadius: m(0.004), ...lin(0, m(TOP_Y + 0.16), 0, m(TOP_Y + 0.172), [0, "#fca5a5", 0.4, "#dc2626", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.8, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(R + 0.02), y: m(TOP_Y - 0.006), text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      movable: { node: movable, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.14 },
      wheelTop: { node: wheelTop, motion: "rotate" as const, min: 0, max: 360 },
      wheelBottom: { node: wheelBottom, motion: "rotate" as const, min: 0, max: 360 },
    },
    points: { topHook: { x: 0, y: m(-0.005) }, loadHook: { x: 0, y: m(LOW_Y + R + 0.06) }, freeEnd: { x: m(-R - 0.034), y: m(TOP_Y + 0.16) } },
  };
};
