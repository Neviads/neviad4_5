/* OBJECT-META
{
  "catalog": "Ô tô",
  "title": "Ô tô con (sedan) nhìn ngang: thân sơn bóng có cabin kính, đèn pha và đèn hậu, tay nắm cửa, gương, hai bánh xe có vỏ, mâm 5 chấu quay được",
  "fill": "#dc2626",
  "anchor": "Điểm giữa hai bánh xe, chạm mặt đường.",
  "useWhen": ["Cần ô tô con sedan nhìn ngang, đầu xe sang phải, hai bánh quay độc lập để khớp chuyển động lăn không trượt.", "Cảnh chuyển động thẳng của xe dài 4,4 m, cần điểm neo ở trục bánh trước và sau."],
  "avoidWhen": ["Cần xe nhỏ trong thí nghiệm trên bàn: không dùng vật này, thang xe thật dài 4,4 m.", "Vật chỉ có thân sơn cố định và hai bánh quay; không có cửa mở, đèn bật tắt hay bánh lái."],
  "size": { "width": 4.42, "height": 1.62 },
  "parts": [
    { "name": "wheelFront", "label": "Bánh trước", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của bánh trước quanh trục, độ theo chiều kim đồng hồ; xe chạy sang phải thì bánh quay thuận chiều kim đồng hồ." },
    { "name": "wheelRear", "label": "Bánh sau", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của bánh sau quanh trục, độ theo chiều kim đồng hồ." }
  ],
  "points": [
    { "name": "ground", "description": "Điểm giữa hai bánh, chạm mặt đường." },
    { "name": "frontAxle", "description": "Tâm bánh trước." },
    { "name": "rearAxle", "description": "Tâm bánh sau." },
    { "name": "roof", "description": "Giữa nóc xe." },
    { "name": "bumperFront", "description": "Đầu cản trước ở độ cao tâm xe." }
  ],
  "notes": "Xe dài 4,4 m, cao 1,35 m, chiều dài cơ sở 2,6 m, bánh xe bán kính 0,32 m; đầu xe quay sang phải. Hai bánh quay độc lập để khớp chuyển động tịnh tiến (v = ωR khi lăn không trượt). fill là màu sơn thân xe."
}
*/
const makeCar = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.025));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const WR = 0.32;
  const AX = 1.3;
  const AY = -WR;
  const pts = (a: number[]) => a.map(m);

  // Bóng đổ dưới thân xe trên mặt đường.
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.01), radiusX: m(2.1), radiusY: m(0.07), fill: "rgba(0,0,0,0.45)", listening: false }));

  // Thân xe: đường bao vẽ một nét liền từ đuôi sang đầu, lồi ở mui và nắp ca-pô.
  group.add(new Konva.Line({ points: pts([-2.2, -0.62, -2.2, -0.82, -2.12, -0.92, -1.75, -0.98, -1.35, -1.16, -0.85, -1.33, -0.2, -1.35, 0.5, -1.33, 0.95, -1.08, 1.7, -1.0, 2.12, -0.9, 2.2, -0.78, 2.2, -0.52, 2.12, -0.34, -2.12, -0.34]), closed: true, tension: 0.08, ...lin(0, m(-1.35), 0, m(-0.34), [0, "#ffffff", 0.15, fill, 0.75, "#7f1d1d", 1, "#1c0505"]), stroke: "#1c0505", strokeWidth: lw, lineJoin: "round", shadowColor: "#000", shadowBlur: m(0.05), shadowOpacity: 0.35, listening: false }));
  // Ô cửa sổ: kính cabin gồm hai ô (trước/sau) cùng cột B.
  group.add(new Konva.Line({ points: pts([-1.28, -1.0, -0.85, -1.26, -0.2, -1.28, -0.2, -1.0]), closed: true, tension: 0.04, ...lin(0, m(-1.28), 0, m(-1.0), [0, "#bae6fd", 1, "#0c4a6e"]), stroke: "#0f172a", strokeWidth: lw * 0.9, lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: pts([-0.1, -1.0, -0.1, -1.28, 0.45, -1.26, 0.88, -1.02]), closed: true, tension: 0.04, ...lin(0, m(-1.28), 0, m(-1.0), [0, "#bae6fd", 1, "#0c4a6e"]), stroke: "#0f172a", strokeWidth: lw * 0.9, lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: pts([-1.2, -1.02, -0.95, -1.2, -0.7, -1.22]), stroke: "rgba(255,255,255,0.65)", strokeWidth: lw, listening: false }));
  // Đường gân thân, tay nắm cửa, gương chiếu hậu, bậc thềm.
  group.add(new Konva.Line({ points: pts([-2.1, -0.66, -0.2, -0.7, 1.5, -0.7, 2.1, -0.62]), stroke: "rgba(0,0,0,0.3)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: pts([-2.1, -0.7, 2.1, -0.66]), stroke: "rgba(255,255,255,0.18)", strokeWidth: lw * 0.8, listening: false }));
  for (const x of [-0.65, 0.35]) group.add(new Konva.Rect({ x: m(x), y: m(-0.94), width: m(0.18), height: m(0.04), cornerRadius: m(0.02), fill: "#e2e8f0", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Line({ points: pts([0.78, -1.02, 0.9, -1.08, 0.98, -1.0, 0.86, -0.96]), closed: true, fill: fill, stroke: "#1c0505", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Line({ points: pts([-0.2, -1.28, -0.2, -0.38]), stroke: "rgba(0,0,0,0.45)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: pts([-1.28, -1.0, -1.35, -0.38]), stroke: "rgba(0,0,0,0.35)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: pts([-2.1, -0.36, 2.1, -0.34]), stroke: "#0a0a0a", strokeWidth: m(0.07), lineCap: "round", listening: false }));

  // Đèn pha trước (sáng), đèn hậu đỏ, lưới tản nhiệt, ăng-ten, biển số, cản va.
  group.add(new Konva.Line({ points: pts([1.98, -0.82, 2.18, -0.78, 2.2, -0.64, 2.0, -0.7]), closed: true, fill: "#fef9c3", stroke: "#78350f", strokeWidth: lw * 0.8, shadowColor: "#fde047", shadowBlur: m(0.08), shadowOpacity: 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(2.12), y: m(-0.62), width: m(0.08), height: m(0.1), fill: "#334155", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Line({ points: pts([-2.2, -0.82, -2.08, -0.84, -2.0, -0.7, -2.2, -0.68]), closed: true, fill: "#ef4444", stroke: "#450a0a", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Line({ points: pts([-1.45, -1.17, -1.55, -1.52]), stroke: "#cbd5e1", strokeWidth: lw * 0.6, lineCap: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(-2.22), y: m(-0.62), width: m(0.06), height: m(0.1), fill: "#f1f5f9", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Line({ points: pts([-1.7, -1.17, -0.7, -1.33]), stroke: "rgba(255,255,255,0.7)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));

  // Bánh xe: hốc bánh đen, lốp cao su, mâm thép 5 chấu quay được.
  const wheel = (x: number) => {
    group.add(new Konva.Circle({ x: m(x), y: m(AY), radius: m(WR + 0.1), fill: "#0a0a0a", listening: false }));
    const g = new Konva.Group({ x: m(x), y: m(AY) });
    g.add(new Konva.Circle({ radius: m(WR), fill: "#111827", stroke: "#000", strokeWidth: lw, listening: false }));
    g.add(new Konva.Circle({ radius: m(WR * 0.9), stroke: "#374151", strokeWidth: lw * 0.8, listening: false }));
    for (let i = 0; i < 28; i += 1) g.add(new Konva.Line({ points: [m(WR * 0.97 * Math.cos((i * Math.PI) / 14)), m(WR * 0.97 * Math.sin((i * Math.PI) / 14)), m(WR * Math.cos((i * Math.PI) / 14)), m(WR * Math.sin((i * Math.PI) / 14))], stroke: "#1f2937", strokeWidth: lw * 0.5, listening: false }));
    g.add(new Konva.Circle({ radius: m(WR * 0.64), ...lin(m(-WR), m(-WR), m(WR), m(WR), [0, "#f8fafc", 0.5, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
    for (let i = 0; i < 5; i += 1) {
      const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      g.add(new Konva.Line({ points: [m(WR * 0.14 * Math.cos(a)), m(WR * 0.14 * Math.sin(a)), m(WR * 0.58 * Math.cos(a - 0.12)), m(WR * 0.58 * Math.sin(a - 0.12)), m(WR * 0.58 * Math.cos(a + 0.12)), m(WR * 0.58 * Math.sin(a + 0.12))], closed: true, fill: "#e2e8f0", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
      g.add(new Konva.Circle({ x: m(WR * 0.4 * Math.cos(a + Math.PI / 5)), y: m(WR * 0.4 * Math.sin(a + Math.PI / 5)), radius: m(0.018), fill: "#1e293b", listening: false }));
    }
    g.add(new Konva.Circle({ radius: m(0.05), fill: "#cbd5e1", stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));
    g.add(new Konva.Circle({ radius: m(0.02), fill: "#dc2626", listening: false }));
    group.add(g);
    return g;
  };
  const wheelRear = wheel(-AX);
  const wheelFront = wheel(AX);

  if (label) {
    group.add(new Konva.Text({ x: m(-1.2), y: m(0.08), width: m(2.4), align: "center", text: label, fontSize: m(0.18), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { wheelFront: { node: wheelFront, motion: "rotate" as const, min: 0, max: 360 }, wheelRear: { node: wheelRear, motion: "rotate" as const, min: 0, max: 360 } },
    points: { ground: { x: 0, y: 0 }, frontAxle: { x: m(AX), y: m(AY) }, rearAxle: { x: m(-AX), y: m(AY) }, roof: { x: m(0.1), y: m(-1.35) }, bumperFront: { x: m(2.2), y: m(-0.6) } },
  };
};
