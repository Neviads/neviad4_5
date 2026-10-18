/* OBJECT-META
{
  "catalog": "Xe máy / xe đạp",
  "title": "Xe đạp nhìn ngang: khung thép tam giác kép, hai bánh nan hoa, ghi-đông, yên, bàn đạp và xích truyền động với đĩa và líp",
  "fill": "#2563eb",
  "anchor": "Điểm giữa hai bánh xe, chạm mặt đường.",
  "useWhen": ["Cần xe đạp nhìn ngang với bánh nan hoa, xích truyền động, đĩa 44 răng, líp 16 răng, tỉ số 2,75.","Cần quay riêng bánh trước, bánh sau và bàn đạp để mô tả chuyển động tròn hay truyền động xích."],
  "avoidWhen": ["Cần ô tô hay máy bay: dùng o-to hoặc may-bay.","Cần bánh răng đơn giản để minh hoạ truyền động: dùng banh-rang.","Xe quay đầu sang phải, đổi hướng chạy sang trái phải lật cảnh; không có người lái."],
  "size": { "width": 1.72, "height": 1.08 },
  "parts": [
    { "name": "wheelFront", "label": "Bánh trước", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của bánh trước, độ theo chiều kim đồng hồ; xe chạy sang phải thì bánh quay thuận chiều kim đồng hồ." },
    { "name": "wheelRear", "label": "Bánh sau", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của bánh sau cùng líp, độ theo chiều kim đồng hồ." },
    { "name": "pedals", "label": "Bàn đạp", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của tay quay cùng hai bàn đạp và đĩa, độ theo chiều kim đồng hồ; 0° là bàn đạp phải ở phía trước, ngang trục giữa." }
  ],
  "points": [
    { "name": "ground", "description": "Điểm giữa hai bánh, chạm mặt đường." },
    { "name": "frontAxle", "description": "Tâm bánh trước." },
    { "name": "rearAxle", "description": "Tâm bánh sau." },
    { "name": "saddle", "description": "Mặt trên yên xe." },
    { "name": "bottomBracket", "description": "Trục giữa của tay quay." }
  ],
  "notes": "Bánh xe bán kính 0,34 m, cơ sở 1,0 m, cao tới ghi-đông 1,05 m; đĩa 44 răng, líp 16 răng nên tỉ số truyền 2,75. Xe quay đầu sang phải. Khi đạp bàn đạp một vòng bánh sau quay 2,75 vòng. fill là màu sơn khung."
}
*/
const makeBicycle = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const R = 0.34;
  const AX = 0.5;
  const AY = -R;
  const BBX = 0.0;
  const BBY = -0.3;
  const pts = (a: number[]) => a.map(m);
  const tube = (a: number[], w: number) => {
    group.add(new Konva.Line({ points: pts(a), stroke: "#0b1220", strokeWidth: m(w + 0.006), lineCap: "round", lineJoin: "round", listening: false }));
    group.add(new Konva.Line({ points: pts(a), stroke: fill, strokeWidth: m(w), lineCap: "round", lineJoin: "round", listening: false }));
    group.add(new Konva.Line({ points: pts(a.map((v, i) => (i % 2 === 1 ? v - w * 0.22 : v))), stroke: "rgba(255,255,255,0.5)", strokeWidth: m(w * 0.25), lineCap: "round", lineJoin: "round", listening: false }));
  };

  group.add(new Konva.Ellipse({ x: 0, y: m(-0.004), radiusX: m(0.95), radiusY: m(0.03), fill: "rgba(0,0,0,0.4)", listening: false }));

  // BÁNH XE: lốp cao su, vành thép, 24 nan hoa mảnh đan chéo, moay-ơ và một vạch đỏ dùng để thấy quay.
  const wheel = (x: number) => {
    const g = new Konva.Group({ x: m(x), y: m(AY) });
    g.add(new Konva.Circle({ radius: m(R), stroke: "#111827", strokeWidth: m(0.035), listening: false }));
    g.add(new Konva.Circle({ radius: m(R), stroke: "rgba(255,255,255,0.12)", strokeWidth: m(0.008), listening: false }));
    g.add(new Konva.Circle({ radius: m(R - 0.025), stroke: "#cbd5e1", strokeWidth: m(0.012), listening: false }));
    for (let i = 0; i < 24; i += 1) {
      const a = (i * Math.PI) / 12;
      const off = i % 2 === 0 ? 0.2 : -0.2;
      g.add(new Konva.Line({ points: [m(0.025 * Math.cos(a + off)), m(0.025 * Math.sin(a + off)), m((R - 0.03) * Math.cos(a)), m((R - 0.03) * Math.sin(a))], stroke: "rgba(226,232,240,0.7)", strokeWidth: m(0.0035), listening: false }));
    }
    g.add(new Konva.Circle({ radius: m(0.03), fill: "#e2e8f0", stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));
    g.add(new Konva.Rect({ x: m(R - 0.045), y: m(-0.008), width: m(0.03), height: m(0.016), fill: "#ef4444", listening: false }));
    return g;
  };
  const wheelRear = wheel(-AX);
  const wheelFront = wheel(AX);
  group.add(wheelRear);
  group.add(wheelFront);

  // Líp sau (cùng bánh sau): một đĩa răng nhỏ ở cạnh bánh sau.
  const cog = new Konva.Group({ x: m(-AX), y: m(AY) });
  cog.add(new Konva.Circle({ radius: m(0.045), ...lin(m(-0.045), m(-0.045), m(0.045), m(0.045), [0, "#f8fafc", 1, "#475569"]), stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  for (let i = 0; i < 16; i += 1) cog.add(new Konva.Rect({ x: m(0.043), y: m(-0.004), width: m(0.009), height: m(0.008), rotation: (i * 360) / 16, offsetX: 0, listening: false, fill: "#cbd5e1" }));
  group.add(cog);

  // Khung: ống nằm, ống xiên, ống yên, càng sau và càng trước, cổ phuộc.
  const seatTop = [-0.05, -0.95];
  const head = [0.3, -0.78];
  tube([BBX, BBY, seatTop[0], seatTop[1]], 0.026);
  tube([BBX, BBY, head[0], head[1]], 0.032);
  tube([seatTop[0], seatTop[1], head[0] - 0.02, head[1] + 0.03], 0.024);
  tube([BBX, BBY, -AX, AY], 0.016);
  tube([seatTop[0] - 0.0, seatTop[1] + 0.12, -AX, AY], 0.016);
  tube([head[0], head[1], AX, AY], 0.018);
  group.add(new Konva.Line({ points: pts([head[0] - 0.015, head[1] + 0.03, head[0] + 0.02, head[1] - 0.04]), stroke: "#0b1220", strokeWidth: m(0.04), lineCap: "round", listening: false }));
  // Ghi-đông và tay cầm, yên và cột yên.
  group.add(new Konva.Line({ points: pts([head[0] + 0.02, head[1] - 0.04, head[0] + 0.0, head[1] - 0.1, head[0] - 0.12, head[1] - 0.14, head[0] - 0.2, head[1] - 0.1]), stroke: "#cbd5e1", strokeWidth: m(0.018), lineCap: "round", lineJoin: "round", tension: 0.25, listening: false }));
  group.add(new Konva.Line({ points: pts([head[0] - 0.2, head[1] - 0.1, head[0] - 0.26, head[1] - 0.06]), stroke: "#111827", strokeWidth: m(0.03), lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: pts([seatTop[0], seatTop[1], seatTop[0], seatTop[1] - 0.1]), stroke: "#cbd5e1", strokeWidth: m(0.022), listening: false }));
  group.add(new Konva.Line({ points: pts([seatTop[0] - 0.1, seatTop[1] - 0.115, seatTop[0] + 0.0, seatTop[1] - 0.095, seatTop[0] + 0.14, seatTop[1] - 0.1, seatTop[0] + 0.1, seatTop[1] - 0.14, seatTop[0] - 0.07, seatTop[1] - 0.14]), closed: true, tension: 0.4, fill: "#111827", stroke: "#030712", strokeWidth: lw * 0.8, listening: false }));
  // Ổ trục giữa, xích và các đĩa.
  group.add(new Konva.Line({ points: pts([BBX, BBY - 0.098, -AX, AY - 0.045, -AX, AY + 0.045, BBX, BBY + 0.098]), closed: true, stroke: "#64748b", strokeWidth: m(0.005), dash: [m(0.01), m(0.004)], lineJoin: "round", listening: false }));

  // BỘ PHẬN QUAY: đĩa 44 răng + hai tay quay và hai bàn đạp.
  const pedals = new Konva.Group({ x: m(BBX), y: m(BBY) });
  pedals.add(new Konva.Circle({ radius: m(0.1), ...lin(m(-0.1), m(-0.1), m(0.1), m(0.1), [0, "#e2e8f0", 1, "#475569"]), stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));
  for (let i = 0; i < 44; i += 1) pedals.add(new Konva.Rect({ x: m(0.099), y: m(-0.004), width: m(0.009), height: m(0.008), rotation: (i * 360) / 44, fill: "#cbd5e1", listening: false }));
  for (const [s, c] of [[1, "#475569"], [-1, "#94a3b8"]] as [number, string][]) {
    pedals.add(new Konva.Line({ points: [0, 0, m(s * 0.17), 0], stroke: "#0b1220", strokeWidth: m(0.03), lineCap: "round", listening: false }));
    pedals.add(new Konva.Line({ points: [0, 0, m(s * 0.17), 0], stroke: c, strokeWidth: m(0.022), lineCap: "round", listening: false }));
    pedals.add(new Konva.Rect({ x: m(s * 0.17 - 0.045), y: m(-0.014), width: m(0.09), height: m(0.028), cornerRadius: m(0.004), ...lin(0, 0, 0, m(0.028), [0, "#6b7280", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.6, listening: false }));
  }
  pedals.add(new Konva.Circle({ radius: m(0.02), fill: "#e2e8f0", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(pedals);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.6), y: m(0.04), width: m(1.2), align: "center", text: label, fontSize: m(0.09), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { wheelFront: { node: wheelFront, motion: "rotate" as const, min: 0, max: 360 }, wheelRear: { node: wheelRear, motion: "rotate" as const, min: 0, max: 360 }, pedals: { node: pedals, motion: "rotate" as const, min: 0, max: 360 } },
    points: { ground: { x: 0, y: 0 }, frontAxle: { x: m(AX), y: m(AY) }, rearAxle: { x: m(-AX), y: m(AY) }, saddle: { x: m(seatTop[0]), y: m(seatTop[1] - 0.14) }, bottomBracket: { x: m(BBX), y: m(BBY) } },
  };
};
