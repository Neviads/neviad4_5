/* OBJECT-META
{
  "catalog": "Bình điện phân + điện cực",
  "title": "Bình điện phân dung dịch đồng sunfat: bể thuỷ tinh có dung dịch xanh, hai điện cực đồng treo trên thanh ngang, bọt khí và lớp đồng bám vào catot",
  "fill": "#38bdf8",
  "anchor": "Giữa đáy bình, chạm mặt bàn.",
  "useWhen": ["Cần bình điện phân CuSO₄ có hai điện cực đồng, anot trái (+), catot phải (−).","Cần minh hoạ đồng bám vào catot và bọt khí nổi lên ở điện cực."],
  "avoidWhen": ["Cần bể nước trong suốt thấy tia sáng: dùng be-nuoc, bình này đựng dung dịch xanh.","Chỉ dùng điện cực đồng với CuSO₄, không phải chất điện phân khác.","Bình nhỏ 0,12 m, không kèm nguồn điện hay ampe kế."],
  "size": { "width": 0.12, "height": 0.115 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy bình." },
    { "name": "anode", "description": "Đầu nối anot (điện cực nối cực +, bên trái)." },
    { "name": "cathode", "description": "Đầu nối catot (điện cực nối cực −, bên phải)." },
    { "name": "solution", "description": "Giữa khối dung dịch." }
  ],
  "notes": "Bình thuỷ tinh 0,12 m × 0,09 m chứa dung dịch CuSO₄ cao 0,07 m; hai điện cực đồng 0,03 m × 0,065 m cách nhau 0,06 m. Anot (trái, nối +) tan dần, lớp đồng đỏ bám vào catot (phải, nối −); bọt khí nhỏ nổi lên ở điện cực. fill là màu dung dịch."
}
*/
const makeElectrolysisCell = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const W = 0.12;
  const H = 0.09;
  const top = -H;
  const SOL = 0.07;
  const sy = -SOL;

  group.add(new Konva.Rect({ x: m(-W / 2), y: m(top), width: m(W), height: m(H), cornerRadius: m(0.003), fill: "rgba(186,230,253,0.1)", stroke: "rgba(226,240,252,0.9)", strokeWidth: m(0.0028), shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.005) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.0028), y: m(-0.006), width: m(W - 0.0056), height: m(0.006), fill: "rgba(148,163,184,0.45)", listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.0028), y: m(sy), width: m(W - 0.0056), height: m(SOL - 0.006), ...lin(0, 0, 0, m(SOL), [0, "rgba(125,211,252,0.65)", 1, "rgba(3,105,161,0.88)"]), listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.0028), y: m(sy - 0.0008), width: m(W - 0.0056), height: m(0.0022), fill: "rgba(224,242,254,0.95)", listening: false }));

  group.add(new Konva.Rect({ x: m(-0.056), y: m(top - 0.0095), width: m(0.112), height: m(0.0065), cornerRadius: m(0.002), ...lin(0, 0, 0, m(0.0065), steel), stroke: "#334155", strokeWidth: lw * 0.9, listening: false }));
  for (const [x, c, cc] of [[-0.03, "#ef4444", "#7f1d1d"], [0.03, "#1f2937", "#030712"]] as [number, string, string][]) {
    group.add(new Konva.Rect({ x: m(x - 0.0035), y: m(top - 0.0175), width: m(0.007), height: m(0.008), ...lin(0, 0, m(0.007), 0, steel), stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(top - 0.0205), radius: m(0.0048), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0048), fillRadialGradientColorStops: [0, "#fff", 0.35, c, 1, cc], stroke: cc, strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Text({ x: m(x - 0.004), y: m(top - 0.0335), width: m(0.008), align: "center", text: x < 0 ? "+" : "−", fontSize: m(0.0085), fontStyle: "bold", fill: x < 0 ? "#fca5a5" : "#cbd5e1", listening: false }));
  }

  const plate = (x: number, rough: boolean) => {
    const w = 0.03;
    const h = 0.065;
    const y0 = top - 0.003;
    group.add(new Konva.Rect({ x: m(x - w / 2), y: m(y0), width: m(w), height: m(h), cornerRadius: m(0.0014), ...lin(0, 0, m(w), 0, [0, "#7c2d12", 0.3, "#f4a261", 0.6, "#c2410c", 1, "#431407"]), stroke: "#431407", strokeWidth: lw, listening: false }));
    group.add(ln([x - w / 2 + 0.0035, y0 + 0.003, x - w / 2 + 0.0035, y0 + h - 0.003], "rgba(255,237,213,0.55)", lw * 1.6));
    if (rough) {
      for (let i = 0; i < 6; i += 1) group.add(new Konva.Ellipse({ x: m(x - 0.006 + (i % 3) * 0.0095), y: m(sy + 0.012 + i * 0.005), radiusX: m(0.0035), radiusY: m(0.0018), fill: "rgba(67,20,7,0.45)", listening: false }));
    } else {
      group.add(new Konva.Rect({ x: m(x - w / 2 + 0.0008), y: m(sy + 0.001), width: m(w - 0.0016), height: m(y0 + h - sy - 0.003), fill: "rgba(251,146,60,0.18)", listening: false }));
      for (let i = 0; i < 9; i += 1) group.add(new Konva.Circle({ x: m(x - 0.011 + (i % 3) * 0.011), y: m(sy + 0.01 + Math.floor(i / 3) * 0.015), radius: m(0.0016), fill: "rgba(254,215,170,0.85)", listening: false }));
    }
    group.add(new Konva.Rect({ x: m(x - 0.0035), y: m(top - 0.003), width: m(0.007), height: m(0.0075), ...lin(0, 0, m(0.007), 0, steel), stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
  };
  plate(-0.03, true);
  plate(0.03, false);
  group.add(ln([-0.03, top - 0.0095, -0.03, top - 0.0175], "#e2e8f0", lw * 1.5));
  group.add(ln([0.03, top - 0.0095, 0.03, top - 0.0175], "#e2e8f0", lw * 1.5));

  for (const [x, ys] of [[-0.012, [0, 0.01, 0.022, 0.035]], [0.012, [0.004, 0.015, 0.028]], [0.052, [0.002, 0.013]], [-0.052, [0.006, 0.02]]] as [number, number[]][]) {
    for (const [i, y] of ys.entries()) group.add(new Konva.Circle({ x: m(x + (i % 2 ? 0.002 : -0.002)), y: m(sy + 0.012 + y), radius: m(0.0019), fill: "rgba(255,255,255,0.45)", stroke: "rgba(255,255,255,0.8)", strokeWidth: lw * 0.6, listening: false }));
  }
  group.add(ln([-W / 2 + 0.0055, top + 0.004, -W / 2 + 0.0055, -0.008], "rgba(255,255,255,0.55)", lw * 1.8));
  group.add(ln([-W / 2 + 0.003, top + 0.002, W / 2 - 0.003, top + 0.002], "rgba(255,255,255,0.55)", lw * 1.2));
  group.add(new Konva.Text({ x: m(-W / 2 + 0.008), y: m(-0.016), text: "CuSO₄", fontSize: m(0.0062), fontStyle: "bold", fill: fill, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.006), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, anode: { x: m(-0.03), y: m(top - 0.0205) }, cathode: { x: m(0.03), y: m(top - 0.0205) }, solution: { x: 0, y: m(sy / 2) } } };
};
