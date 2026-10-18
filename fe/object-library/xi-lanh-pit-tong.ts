/* OBJECT-META
{
  "catalog": "Xi lanh + pít tông (kín khí)",
  "title": "Xi lanh thuỷ tinh có vạch chia thể tích đựng khí kín và pít tông thép có vòng làm kín, cần đẩy và tay cầm, các phân tử khí chuyển động trong thể tích",
  "fill": "#38bdf8",
  "anchor": "Giữa đáy xi lanh, chạm mặt bàn.",
  "useWhen": ["Cần xi lanh thuỷ tinh có vạch chia chứa khí kín và pít tông nâng 0–0,05 m để đổi thể tích.","Cần các phân tử khí chuyển động để minh hoạ định luật Boyle hay áp suất khí."],
  "avoidWhen": ["Cần động cơ nhiệt có xi lanh làm việc: dùng dong-co-nhiet.","Cần bình khí cố định thể tích: dùng binh-khi-kin.","Pít tông chỉ nâng từ cột khí 0,03 m lên tối đa 0,08 m."],
  "size": { "width": 0.067, "height": 0.167 },
  "parts": [
    { "name": "piston", "label": "Pít tông", "motion": "slide", "axis": "up", "min": 0, "max": 0.05, "description": "Độ nâng pít tông khỏi vị trí thấp nhất (thể tích khí nhỏ nhất, 0,03 m cột khí), mét; càng lớn thì thể tích khí càng lớn." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy xi lanh." },
    { "name": "gasBottom", "description": "Giữa đáy trong, nơi cột khí bắt đầu." },
    { "name": "handle", "description": "Tay cầm pít tông ở vị trí thấp nhất." }
  ],
  "notes": "Xi lanh thuỷ tinh đường kính trong 0,05 m, cao 0,1 m; ở vị trí thấp nhất của pít tông cột khí dài 0,03 m, kéo lên tối đa thêm 0,05 m. Khí nén kín, vẽ bằng các chấm phân tử; pít tông có hai vòng cao su làm kín. fill là màu pít tông cao su làm kín và ánh khí."
}
*/
const makeGasSyringe = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.05;
  const H = 0.1;
  const FLOOR = 0.007;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const left = -W / 2;
  const REST = 0.037;

  group.add(new Konva.Ellipse({ x: m(0.003), y: m(-0.001), radiusX: m(W / 2 + 0.008), radiusY: m(0.003), fill: "rgba(0,0,0,0.4)", listening: false }));
  const piston = new Konva.Group({ x: 0, y: 0 });
  const lift = () => Math.max(0, -(piston.y() || 0) / ppm);

  // Đế xi lanh dày và lòng thuỷ tinh trong suốt.
  group.add(new Konva.Rect({ x: m(left - 0.004), y: m(-FLOOR), width: m(W + 0.008), height: m(FLOOR), cornerRadius: m(0.002), ...lin(0, 0, 0, m(FLOOR), [0, "#94a3b8", 1, "#1f2937"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(left), y: m(-FLOOR - H), width: m(W), height: m(H), fill: "rgba(186,230,253,0.12)", listening: false }));
  // Cột khí: tô từ đáy tới mặt dưới pít tông, đậm hơn khi nén, kèm các phân tử chuyển động (chấm cố định).
  group.add(new Konva.Shape({
    fill, opacity: 0.22, listening: false,
    sceneFunc: (ctx, shape) => {
      const h = REST + lift();
      ctx.beginPath();
      ctx.rect(m(left), m(-FLOOR - h), m(W), m(h));
      ctx.fillStrokeShape(shape);
    },
  }));
  const dots: [number, number][] = [[-0.018, 0.008], [-0.008, 0.021], [0.006, 0.01], [0.017, 0.023], [-0.016, 0.034], [0.002, 0.03], [0.014, 0.043], [-0.01, 0.05], [0.018, 0.058], [-0.019, 0.062], [0.005, 0.054], [-0.003, 0.07], [0.015, 0.076], [-0.015, 0.082], [0.007, 0.085]];
  for (const [x, y] of dots) {
    group.add(new Konva.Shape({
      fill: "#e0f2fe", stroke: fill, strokeWidth: lw * 0.6, listening: false,
      sceneFunc: (ctx, shape) => {
        const h = REST + lift();
        const yy = y * (h / (REST + 0.05)) * ((REST + 0.05) / 0.09);
        if (yy > h - 0.0035) return;
        ctx.beginPath();
        ctx.arc(m(x), m(-FLOOR - 0.003 - yy), m(0.0021), 0, Math.PI * 2, false);
        ctx.fillStrokeShape(shape);
      },
    }));
  }
  group.add(piston);

  // Thành xi lanh: ống dày, vệt sáng dọc, thang thể tích bên trái, vành miệng và vòng cổ.
  group.add(new Konva.Rect({ x: m(left), y: m(-FLOOR - H), width: m(W), height: m(H), stroke: "rgba(226,240,252,0.95)", strokeWidth: m(0.0026), listening: false }));
  group.add(ln([left + 0.0055, -FLOOR - H + 0.004, left + 0.0055, -FLOOR - 0.004], "rgba(255,255,255,0.75)", lw * 2.2));
  group.add(ln([left + W - 0.0055, -FLOOR - H + 0.01, left + W - 0.0055, -FLOOR - 0.03], "rgba(255,255,255,0.3)", lw * 1.4));
  for (let i = 1; i <= 9; i += 1) {
    const y = -FLOOR - i * 0.0108;
    group.add(ln([left + 0.0095, y, left + (i % 5 === 0 ? 0.0235 : 0.0165), y], "rgba(15,23,42,0.6)", i % 5 === 0 ? lw * 0.9 : lw * 0.6));
  }
  group.add(new Konva.Text({ x: m(left + 0.0245), y: m(-FLOOR - 5 * 0.0108 - 0.003), text: "50 mL", fontSize: m(0.0044), fill: "rgba(15,23,42,0.75)", listening: false }));
  group.add(new Konva.Rect({ x: m(left - 0.006), y: m(-FLOOR - H - 0.0035), width: m(W + 0.012), height: m(0.005), cornerRadius: m(0.0015), ...lin(0, 0, 0, m(0.005), [0, "#ffffff", 0.4, "#94a3b8", 1, "#475569"]), stroke: "#334155", strokeWidth: lw, listening: false }));

  // BỘ PHẬN TRƯỢT: pít tông (đĩa thép có hai vòng cao su), cần đẩy và tay cầm. Gốc nhóm ở vị trí thấp nhất.
  const pb = -FLOOR - REST;
  piston.add(new Konva.Rect({ x: m(-0.0035), y: m(pb - 0.115), width: m(0.007), height: m(0.115), ...lin(0, 0, m(0.007), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  piston.add(new Konva.Rect({ x: m(-0.0245), y: m(pb - 0.0165), width: m(0.049), height: m(0.0165), cornerRadius: m(0.002), ...lin(0, 0, m(0.049), 0, steel), stroke: "#334155", strokeWidth: lw, listening: false }));
  for (const y of [pb - 0.0145, pb - 0.0035]) piston.add(new Konva.Rect({ x: m(-0.0258), y: m(y - 0.0017), width: m(0.0516), height: m(0.0034), cornerRadius: m(0.0015), fill: "#111827", stroke: "#030712", strokeWidth: lw * 0.6, listening: false }));
  piston.add(new Konva.Rect({ x: m(-0.0245), y: m(pb - 0.0165), width: m(0.049), height: m(0.0018), fill: "rgba(255,255,255,0.65)", listening: false }));
  piston.add(new Konva.Rect({ x: m(-0.0185), y: m(pb - 0.121), width: m(0.037), height: m(0.007), cornerRadius: m(0.003), ...lin(0, 0, 0, m(0.007), [0, "#6b7280", 0.4, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.8, listening: false }));
  piston.add(ln([-0.0155, pb - 0.1195, 0.0155, pb - 0.1195], "rgba(255,255,255,0.3)", lw));
  group.add(new Konva.Rect({ x: m(-0.0045), y: m(-FLOOR - H - 0.0035), width: m(0.009), height: m(0.005), fill: "#0b1220", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0035), y: m(-FLOOR - H - 0.0034), width: m(0.007), height: m(0.0018), fill: "rgba(255,255,255,0.12)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.006), width: m(0.12), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { piston: { node: piston, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.05 } },
    points: { base: { x: 0, y: 0 }, gasBottom: { x: 0, y: m(-FLOOR) }, handle: { x: 0, y: m(pb - 0.1175) } },
  };
};
