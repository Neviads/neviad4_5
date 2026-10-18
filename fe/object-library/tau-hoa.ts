/* OBJECT-META
{
  "catalog": "Tàu hoả (đầu máy + toa)",
  "title": "Tàu hoả nhìn ngang: đầu máy diesel sơn xanh – vàng có buồng lái và đèn pha, nối khớp với một toa hàng kín; bánh xe thép trên đường ray",
  "fill": "#1d4ed8",
  "anchor": "Giữa đoạn tàu (giữa khớp nối), chạm ray.",
  "useWhen": ["Cần tàu hoả nhìn ngang gồm đầu máy diesel và một toa hàng nối khớp, trên đường ray, dài khoảng 15 m.","Cần bài chuyển động tương đối hoặc va chạm khi nối toa."],
  "avoidWhen": ["Cần xe con hay xe tải thường: dùng o-to; xe lăn trong phòng thí nghiệm: dùng xe-lan.","Chỉ có một đầu máy và một toa; cần đoàn nhiều toa phải ghép thêm."],
  "size": { "width": 15.0, "height": 3.7 },
  "parts": [
    { "name": "wheelLoco1", "label": "Bánh đầu máy sau", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của bánh đầu máy ở phía sau, độ theo chiều kim đồng hồ." },
    { "name": "wheelLoco2", "label": "Bánh đầu máy trước", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của bánh đầu máy ở phía trước (đầu tàu), độ theo chiều kim đồng hồ." },
    { "name": "wheelWagon1", "label": "Bánh toa sau", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của bánh toa phía sau, độ theo chiều kim đồng hồ." },
    { "name": "wheelWagon2", "label": "Bánh toa trước", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của bánh toa phía trước, độ theo chiều kim đồng hồ." }
  ],
  "points": [
    { "name": "ground", "description": "Giữa khớp nối hai đoạn tàu, chạm ray." },
    { "name": "locoFront", "description": "Mũi đầu máy ở độ cao đèn pha." },
    { "name": "coupler", "description": "Khớp nối giữa đầu máy và toa." },
    { "name": "wagonRear", "description": "Đuôi toa hàng." }
  ],
  "notes": "Đầu máy dài 7,2 m cao 3,6 m ở bên phải, toa hàng dài 7,0 m cao 3,4 m ở bên trái nối bằng khớp ở giữa; bánh bán kính 0,45 m trên đường ray rộng 1,435 m, hai thanh ray vẽ dưới tàu. Dùng cho chuyển động tương đối và va chạm đàn hồi/mềm khi tàu nối toa. fill là màu sơn đầu máy."
}
*/
const makeTrain = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.03));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const WR = 0.45;
  const AY = -WR - 0.12;
  const pts = (a: number[]) => a.map(m);

  // Đường ray: thanh ray thép và tà vẹt gỗ, kéo dài hết chiều dài đoàn tàu.
  group.add(new Konva.Rect({ x: m(-7.4), y: m(-0.14), width: m(14.8), height: m(0.14), ...lin(0, 0, 0, m(0.14), [0, "#a8a29e", 1, "#44403c"]), stroke: "#1c1917", strokeWidth: lw * 0.5, listening: false }));
  for (let i = 0; i <= 49; i += 1) group.add(new Konva.Rect({ x: m(-7.35 + i * 0.3), y: m(-0.12), width: m(0.12), height: m(0.12), fill: "#57534e", listening: false }));
  group.add(new Konva.Rect({ x: m(-7.4), y: m(-0.15), width: m(14.8), height: m(0.04), fill: "#e2e8f0", stroke: "#334155", strokeWidth: lw * 0.4, listening: false }));

  // TOA HÀNG: thân hộp kín sơn nâu đỏ, cửa trượt, sườn tôn, mái cong, chân khung gầm.
  group.add(new Konva.Rect({ x: m(-7.2), y: m(-3.5), width: m(6.8), height: m(3.15), cornerRadius: m(0.04), ...lin(0, 0, 0, m(3.15), [0, "#b45309", 0.6, "#78350f", 1, "#2a0a02"]), stroke: "#1c0a02", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: pts([-7.2, -3.5, -7.1, -3.65, -0.5, -3.65, -0.4, -3.5]), closed: true, fill: "#1f2937", stroke: "#030712", strokeWidth: lw * 0.8, lineJoin: "round", listening: false }));
  for (let i = 0; i < 17; i += 1) group.add(new Konva.Line({ points: pts([-7.1 + i * 0.4, -3.45, -7.1 + i * 0.4, -0.4]), stroke: "rgba(0,0,0,0.3)", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(-5.1), y: m(-3.1), width: m(2.2), height: m(2.4), fill: "rgba(0,0,0,0.22)", stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: pts([-4.0, -3.1, -4.0, -0.7]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: pts([-4.1, -1.9, -4.1, -1.7, -3.9, -1.7, -3.9, -1.9]), closed: true, fill: "#e5e7eb", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(-7.3), y: m(-0.72), width: m(7.0), height: m(0.4), fill: "#111827", stroke: "#000", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Text({ x: m(-7.0), y: m(-2.35), width: m(1.6), align: "center", text: "HÀNG", fontSize: m(0.4), fontStyle: "bold", fill: "#fde68a", listening: false }));
  group.add(new Konva.Line({ points: pts([-7.1, -3.46, -0.5, -3.46]), stroke: "rgba(255,255,255,0.35)", strokeWidth: lw, listening: false }));

  // ĐẦU MÁY: thân sơn xanh có đai vàng, buồng lái kính, mũi hơi vát, đèn pha, quạt tản nhiệt trên nóc.
  group.add(new Konva.Line({ points: pts([-0.2, -0.36, -0.2, -3.3, 0.05, -3.55, 3.4, -3.55, 3.7, -3.2, 4.4, -2.9, 5.0, -2.7, 5.3, -2.2, 5.3, -0.36]), closed: true, tension: 0.04, ...lin(0, m(-3.55), 0, m(-0.36), [0, "#93c5fd", 0.3, fill, 0.8, "#1e3a8a", 1, "#0b1a4a"]), stroke: "#0a1033", strokeWidth: lw, lineJoin: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.2), y: m(-1.9), width: m(5.5), height: m(0.28), ...lin(0, 0, 0, m(0.28), [0, "#fde68a", 1, "#d97706"]), listening: false }));
  group.add(new Konva.Line({ points: pts([3.4, -3.15, 4.3, -2.82, 4.7, -2.55, 3.4, -2.55]), closed: true, ...lin(0, m(-3.15), 0, m(-2.55), [0, "#bae6fd", 1, "#0c4a6e"]), stroke: "#0f172a", strokeWidth: lw * 0.8, lineJoin: "round", listening: false }));
  for (let i = 0; i < 4; i += 1) group.add(new Konva.Rect({ x: m(0.3 + i * 0.6), y: m(-3.1), width: m(0.4), height: m(0.9), fill: "#0b1220", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  for (const x of [0.0, 1.2]) group.add(new Konva.Ellipse({ x: m(x + 0.6), y: m(-3.62), radiusX: m(0.45), radiusY: m(0.08), fill: "#475569", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Circle({ x: m(5.15), y: m(-2.35), radius: m(0.14), fill: "#fef9c3", stroke: "#78350f", strokeWidth: lw * 0.8, shadowColor: "#fde047", shadowBlur: m(0.35), shadowOpacity: 0.85, listening: false }));
  group.add(new Konva.Text({ x: m(0.4), y: m(-1.62), width: m(3), align: "center", text: "ĐH-01", fontSize: m(0.34), fontStyle: "bold", fill: "#e2e8f0", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.1), y: m(-0.72), width: m(5.3), height: m(0.4), fill: "#111827", stroke: "#000", strokeWidth: lw * 0.7, listening: false }));
  // Khớp nối và ống hơi giữa đầu máy và toa.
  group.add(new Konva.Rect({ x: m(-0.45), y: m(-0.62), width: m(0.5), height: m(0.14), fill: "#475569", stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Line({ points: pts([-0.3, -0.7, -0.3, -0.9, -0.15, -0.9, -0.15, -0.7]), stroke: "#111827", strokeWidth: lw * 0.9, listening: false }));

  // Bánh xe thép có vành, nan và tay biên; mỗi bánh một bộ phận quay.
  const wheel = (x: number) => {
    const g = new Konva.Group({ x: m(x), y: m(AY) });
    g.add(new Konva.Circle({ radius: m(WR), ...lin(m(-WR), m(-WR), m(WR), m(WR), [0, "#e5e7eb", 0.5, "#6b7280", 1, "#1f2937"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
    g.add(new Konva.Circle({ radius: m(WR * 0.8), stroke: "#374151", strokeWidth: lw * 0.7, listening: false }));
    for (let i = 0; i < 10; i += 1) g.add(new Konva.Line({ points: [0, 0, m(WR * 0.8 * Math.cos((i * Math.PI) / 5)), m(WR * 0.8 * Math.sin((i * Math.PI) / 5))], stroke: "#111827", strokeWidth: lw * 0.9, listening: false }));
    g.add(new Konva.Circle({ radius: m(0.12), fill: "#cbd5e1", stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
    g.add(new Konva.Circle({ x: m(0.27), y: 0, radius: m(0.06), fill: "#f87171", listening: false }));
    group.add(g);
    return g;
  };
  group.add(new Konva.Rect({ x: m(-7.1), y: m(-0.36), width: m(1.1), height: m(0.2), fill: "#0f172a", listening: false }));
  const w1 = wheel(-6.1);
  const w2 = wheel(-2.2);
  const l1 = wheel(0.8);
  const l2 = wheel(4.2);

  if (label) {
    group.add(new Konva.Text({ x: m(-3), y: m(0.3), width: m(6), align: "center", text: label, fontSize: m(0.4), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      wheelLoco1: { node: l1, motion: "rotate" as const, min: 0, max: 360 },
      wheelLoco2: { node: l2, motion: "rotate" as const, min: 0, max: 360 },
      wheelWagon1: { node: w1, motion: "rotate" as const, min: 0, max: 360 },
      wheelWagon2: { node: w2, motion: "rotate" as const, min: 0, max: 360 },
    },
    points: { ground: { x: 0, y: 0 }, locoFront: { x: m(5.3), y: m(-2.35) }, coupler: { x: m(-0.2), y: m(-0.55) }, wagonRear: { x: m(-7.2), y: m(-0.55) } },
  };
};
