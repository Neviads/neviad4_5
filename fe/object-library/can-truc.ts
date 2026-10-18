/* OBJECT-META
{
  "catalog": "Cần trục / cần cẩu",
  "title": "Cần trục tháp: tháp thép dàn lưới trên móng bê tông, cần ngang có xe con chạy dọc, cáp và móc nâng, cabin và đối trọng",
  "fill": "#f59e0b",
  "anchor": "Giữa chân tháp, trên mặt móng bê tông.",
  "useWhen": ["Cần cần trục tháp có xe con chạy dọc cần ngang và móc nâng hạ bằng cáp.","Cần mô phỏng nâng vật nặng với xe con trượt và móc hạ xuống theo mét."],
  "avoidWhen": ["Cần ròng rọc, palăng đơn giản nâng vật: dùng rong-roc-co-dinh hoặc rong-roc-dong.","Cần thang máy cabin treo cáp: dùng thang-may; cần trục này chỉ là cần tháp ngoài trời."],
  "size": { "width": 1.02, "height": 1.0 },
  "parts": [
    { "name": "trolley", "label": "Xe con", "motion": "slide", "axis": "right", "min": 0, "max": 0.5, "description": "Vị trí xe con trên cần ngang (mét) tính từ gần tháp; cáp và móc đi theo." },
    { "name": "hook", "label": "Móc nâng", "motion": "slide", "axis": "down", "min": 0, "max": 0.45, "description": "Độ hạ của khối móc từ xe con xuống (mét); cáp dài ra bằng đúng chừng đó." }
  ],
  "points": [
    { "name": "base", "description": "Giữa chân tháp." },
    { "name": "jibStart", "description": "Gốc cần ngang, ngay trên đỉnh tháp." },
    { "name": "trolleyRest", "description": "Tâm xe con ở vị trí gần tháp nhất." },
    { "name": "hookRest", "description": "Đỉnh móc ở tư thế cuộn cao nhất; vị trí thật = hookRest + trolley sang phải + hook xuống." }
  ],
  "notes": "Tháp cao 0,72 m, cần ngang dài 0,8 m về phía phải và 0,22 m về phía trái mang đối trọng. Xe con chạy trên ray dưới cần; cáp thẳng đứng từ xe con xuống khối móc, chiều dài cáp = hook. fill là màu sơn vàng của cần trục."
}
*/
const makeTowerCrane = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const MAST_H = 0.72;
  const MAST_W = 0.05;
  const JIB_Y = -MAST_H - 0.07;
  const JIB_R = 0.8;
  const JIB_L = 0.22;
  const JIB_H = 0.04;
  const TROLLEY_X = 0.12;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0016));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const dark = "#92580a";

  /** Dàn lưới: hai thanh biên và các thanh chéo hình chữ V giữa hai đường x1..x2 (hoặc y1..y2). */
  const lattice = (x1: number, y1: number, x2: number, y2: number, thick: number, vertical: boolean, cells: number) => {
    const g = new Konva.Group({ listening: false });
    if (vertical) {
      g.add(ln([x1, y1, x1, y2], fill, m(0.0055)));
      g.add(ln([x2, y1, x2, y2], fill, m(0.0055)));
      const h = (y2 - y1) / cells;
      for (let i = 0; i < cells; i += 1) {
        const ya = y1 + i * h;
        g.add(ln([x1, ya, x2, ya + h], fill, m(0.0035)));
        g.add(ln([x2, ya, x1, ya + h], dark, m(0.0028)));
        g.add(ln([x1, ya + h, x2, ya + h], fill, m(0.0035)));
      }
    } else {
      g.add(ln([x1, y1, x2, y1], fill, m(0.0055)));
      g.add(ln([x1, y1 + thick, x2, y1 + thick], fill, m(0.0055)));
      const w = (x2 - x1) / cells;
      for (let i = 0; i < cells; i += 1) {
        const xa = x1 + i * w;
        g.add(ln([xa, y1 + thick, xa + w / 2, y1], fill, m(0.0035)));
        g.add(ln([xa + w / 2, y1, xa + w, y1 + thick], dark, m(0.0028)));
      }
    }
    return g;
  };

  // Móng bê tông và đối trọng bê tông đặt dưới đất cạnh chân tháp.
  group.add(new Konva.Rect({ x: m(-0.17), y: m(-0.04), width: m(0.34), height: m(0.04), cornerRadius: m(0.004), ...lin(0, m(-0.04), 0, 0, [0, "#d1d5db", 1, "#6b7280"]), stroke: "#374151", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  for (const x of [-0.14, -0.1, 0.1, 0.14]) group.add(new Konva.Circle({ x: m(x), y: m(-0.034), radius: m(0.004), fill: "#9ca3af", stroke: "#374151", strokeWidth: lw * 0.6, listening: false }));
  // Tháp dàn lưới và hai chân hình thang ở dưới.
  group.add(new Konva.Rect({ x: m(-MAST_W / 2 - 0.004), y: m(-MAST_H - 0.04), width: m(MAST_W + 0.008), height: m(MAST_H), fill: "rgba(245,158,11,0.18)", listening: false }));
  group.add(lattice(-MAST_W / 2, -MAST_H - 0.04, MAST_W / 2, -0.04, 0, true, 15));
  group.add(new Konva.Line({ points: [m(-MAST_W / 2 - 0.012), m(-0.04), m(-MAST_W / 2), m(-0.075), m(MAST_W / 2), m(-0.075), m(MAST_W / 2 + 0.012), m(-0.04)], closed: true, ...lin(m(-MAST_W / 2), 0, m(MAST_W / 2), 0, [0, "#fbbf24", 0.5, fill, 1, dark]), stroke: dark, strokeWidth: lw, listening: false }));
  // Đầu tháp có buồng điều khiển nhìn xuyên kính và đỉnh nhọn A.
  group.add(new Konva.Line({ points: [m(-MAST_W / 2), m(-MAST_H - 0.04), m(0), m(-MAST_H - 0.17), m(MAST_W / 2), m(-MAST_H - 0.04)], closed: true, fill: "rgba(245,158,11,0.18)", stroke: fill, strokeWidth: m(0.0045), lineJoin: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(-MAST_W / 2 - 0.058), y: m(-MAST_H - 0.058), width: m(0.058), height: m(0.05), cornerRadius: m(0.004), ...lin(0, m(-MAST_H - 0.058), 0, m(-MAST_H - 0.008), [0, "#fde68a", 0.2, fill, 1, dark]), stroke: dark, strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-MAST_W / 2 - 0.048), y: m(-MAST_H - 0.05), width: m(0.036), height: m(0.026), cornerRadius: m(0.002), ...lin(0, m(-MAST_H - 0.05), 0, m(-MAST_H - 0.024), [0, "#bae6fd", 1, "#0369a1"]), stroke: "#0c4a6e", strokeWidth: lw * 0.7, listening: false }));
  group.add(ln([-MAST_W / 2 - 0.046, -MAST_H - 0.0485, -MAST_W / 2 - 0.03, -MAST_H - 0.0485], "rgba(255,255,255,0.75)", lw));

  // Cần ngang dàn lưới hai nhánh: nhánh dài bên phải mang xe con, nhánh ngắn bên trái mang đối trọng.
  group.add(lattice(-JIB_L, JIB_Y, JIB_R, JIB_Y, JIB_H, false, 28));
  group.add(new Konva.Rect({ x: m(-0.205), y: m(JIB_Y + JIB_H), width: m(0.062), height: m(0.058), cornerRadius: m(0.003), ...lin(0, m(JIB_Y + JIB_H), 0, m(JIB_Y + JIB_H + 0.058), [0, "#d1d5db", 0.4, "#9ca3af", 1, "#4b5563"]), stroke: "#374151", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.138), y: m(JIB_Y + JIB_H), width: m(0.046), height: m(0.046), cornerRadius: m(0.003), ...lin(0, m(JIB_Y + JIB_H), 0, m(JIB_Y + JIB_H + 0.046), [0, "#d1d5db", 0.4, "#9ca3af", 1, "#4b5563"]), stroke: "#374151", strokeWidth: lw, listening: false }));
  group.add(new Konva.Text({ x: m(-0.205), y: m(JIB_Y + JIB_H + 0.02), width: m(0.062), align: "center", text: "CW", fontSize: m(0.011), fontStyle: "bold", fill: "#1f2937", listening: false }));
  // Dây giằng từ đỉnh tháp xuống hai đầu cần.
  group.add(ln([0, -MAST_H - 0.17, JIB_R - 0.06, JIB_Y], "#0b0f19", m(0.0022)));
  group.add(ln([0, -MAST_H - 0.17, -JIB_L + 0.03, JIB_Y], "#0b0f19", m(0.0022)));
  // Ray chạy xe con dưới cần.
  group.add(new Konva.Rect({ x: m(0.02), y: m(JIB_Y + JIB_H + 0.0), width: m(JIB_R - 0.04), height: m(0.007), fill: "#374151", stroke: "#111827", strokeWidth: lw * 0.7, listening: false }));

  // BỘ PHẬN TRƯỢT 1: xe con trên ray. Gốc nhóm là tâm xe con, ở mép dưới cần.
  const trolley = new Konva.Group({ x: m(TROLLEY_X), y: m(JIB_Y + JIB_H + 0.007) });
  trolley.add(new Konva.Rect({ x: m(-0.028), y: m(-0.011), width: m(0.056), height: m(0.02), cornerRadius: m(0.003), ...lin(0, m(-0.011), 0, m(0.009), [0, "#fde68a", 0.3, fill, 1, dark]), stroke: dark, strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.35, listening: false }));
  for (const x of [-0.02, 0.02]) trolley.add(new Konva.Circle({ x: m(x), y: m(-0.003), radius: m(0.0058), fill: "#1f2937", stroke: "#d1d5db", strokeWidth: lw * 0.8, listening: false }));
  // BỘ PHẬN TRƯỢT 2: móc nâng hạ theo cáp, nằm trong nhóm xe con nên đi cùng nó.
  const hook = new Konva.Group({ x: 0, y: m(0.065) });
  const cableLen = () => Math.max(0, ((hook.y() || 0) / ppm) - 0.01);
  trolley.add(new Konva.Shape({ stroke: "#0b0f19", strokeWidth: m(0.0034), lineCap: "round", listening: false, sceneFunc: (ctx, shape) => { ctx.beginPath(); ctx.moveTo(m(-0.0048), m(0.008)); ctx.lineTo(m(-0.0048), m(0.01 + cableLen())); ctx.moveTo(m(0.0048), m(0.008)); ctx.lineTo(m(0.0048), m(0.01 + cableLen())); ctx.fillStrokeShape(shape); } }));
  trolley.add(new Konva.Shape({ stroke: "#9ca3af", strokeWidth: m(0.001), lineCap: "round", listening: false, sceneFunc: (ctx, shape) => { ctx.beginPath(); ctx.moveTo(m(-0.0048), m(0.008)); ctx.lineTo(m(-0.0048), m(0.01 + cableLen())); ctx.moveTo(m(0.0048), m(0.008)); ctx.lineTo(m(0.0048), m(0.01 + cableLen())); ctx.fillStrokeShape(shape); } }));
  hook.add(new Konva.Rect({ x: m(-0.018), y: m(-0.016), width: m(0.036), height: m(0.026), cornerRadius: m(0.004), ...lin(m(-0.018), 0, m(0.018), 0, [0, "#fde68a", 0.3, fill, 1, dark]), stroke: dark, strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.35, listening: false }));
  hook.add(new Konva.Circle({ x: 0, y: m(-0.003), radius: m(0.0075), fill: "#374151", stroke: "#d1d5db", strokeWidth: lw * 0.8, listening: false }));
  hook.add(new Konva.Line({ points: [0, m(0.01), 0, m(0.022), m(0.0125), m(0.032), m(0.0125), m(0.046), 0, m(0.052), m(-0.011), m(0.0445)], stroke: "#d1d5db", strokeWidth: m(0.0058), lineCap: "round", lineJoin: "round", tension: 0.3, shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.35, listening: false }));
  trolley.add(hook);
  group.add(trolley);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.17), y: m(0.01), width: m(0.34), align: "center", text: label, fontSize: m(0.024), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      trolley: { node: trolley, motion: "slide" as const, axis: "right" as const, min: 0, max: 0.5 },
      hook: { node: hook, motion: "slide" as const, axis: "down" as const, min: 0, max: 0.45 },
    },
    points: { base: { x: 0, y: 0 }, jibStart: { x: 0, y: m(JIB_Y) }, trolleyRest: { x: m(TROLLEY_X), y: m(JIB_Y + JIB_H + 0.007) }, hookRest: { x: m(TROLLEY_X), y: m(JIB_Y + JIB_H + 0.007 + 0.065 + 0.01) } },
  };
};
