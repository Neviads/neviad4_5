/* OBJECT-META
{
  "catalog": "Máy phát tĩnh điện (Van de Graaff, Wimshurst)",
  "title": "Máy Van de Graaff: đế hộp có động cơ và tay công tắc, trụ cách điện rỗng, mái vòm kim loại tròn ở trên và băng tải cao su chạy qua hai con lăn",
  "fill": "#cbd5e1",
  "anchor": "Giữa đáy đế, chạm mặt bàn.",
  "useWhen": ["Cần máy Van de Graaff có đế động cơ, trụ cách điện, mái vòm kim loại và băng tải cao su.","Cần tích điện lên mái vòm, bài phóng điện hoặc tóc dựng lên."],
  "avoidWhen": ["Cần quả cầu hoặc điện nghiệm nhỏ tích điện: dùng qua-cau-tich-dien hoặc dien-nghiem.","Cần tụ điện, pin hoặc nguồn dòng ổn định: dùng tu-dien hoặc pin.","Chỉ gồm bộ máy, không kèm quả cầu xả điện thứ hai."],
  "size": { "width": 0.124, "height": 0.318 },
  "parts": [
    { "name": "belt", "label": "Băng tải", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của con lăn dưới (cùng các vạch trên băng tải), độ theo chiều kim đồng hồ khi nhìn từ phía trước; vòng quay làm băng tải chạy mang điện tích lên mái vòm." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy đế." },
    { "name": "dome", "description": "Tâm mái vòm kim loại." },
    { "name": "rollerLow", "description": "Trục con lăn dưới trong đế." },
    { "name": "rollerHigh", "description": "Trục con lăn trên trong mái vòm." }
  ],
  "notes": "Mái vòm nhôm đường kính 0,12 m trên trụ nhựa rỗng cao 0,14 m; đế hộp sơn 0,1 m × 0,05 m chứa động cơ quay con lăn dưới. Băng tải cao su chạy giữa hai con lăn, cọ vào bàn chải kim loại ở hai đầu, chở điện tích lên tích tụ ở mặt ngoài mái vòm (điện thế hàng chục kV). Hình vẽ cắt dọc phần trụ để thấy băng tải. fill là màu mái vòm."
}
*/
const makeVanDeGraaff = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const DR = 0.06;
  const baseTop = -0.05;
  const colTop = -0.19;
  const domeCy = colTop - DR + 0.004;
  const cx = 0;
  const rollerLowY = baseTop - 0.002;
  const rollerHighY = colTop + 0.016;

  // Đế hộp sơn xanh đậm: thân, tấm nắp, công tắc bập bênh và đèn báo.
  group.add(new Konva.Rect({ x: m(-0.062), y: m(baseTop), width: m(0.124), height: m(-baseTop), cornerRadius: m(0.005), ...lin(0, 0, 0, m(-baseTop), [0, "#475569", 0.2, "#1e3a8a", 1, "#0b1220"]), stroke: "#020617", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.5, shadowOffset: { x: m(0.002), y: m(0.005) }, listening: false }));
  group.add(ln([-0.056, baseTop + 0.0025, 0.056, baseTop + 0.0025], "rgba(255,255,255,0.35)", lw * 1.3));
  group.add(new Konva.Rect({ x: m(-0.028), y: m(-0.036), width: m(0.056), height: m(0.02), cornerRadius: m(0.002), fill: "#020617", stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  for (let i = 0; i < 6; i += 1) group.add(ln([-0.022 + i * 0.0088, -0.032, -0.022 + i * 0.0088, -0.02], "rgba(148,163,184,0.5)", lw * 1.1));
  group.add(new Konva.Rect({ x: m(0.036), y: m(-0.034), width: m(0.017), height: m(0.012), cornerRadius: m(0.002), fill: "#020617", stroke: "#475569", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Line({ points: [m(0.0385), m(-0.0225), m(0.0505), m(-0.0225), m(0.0485), m(-0.0325), m(0.0405), m(-0.0325)], closed: true, ...lin(0, 0, 0, m(0.01), [0, "#f1f5f9", 1, "#94a3b8"]), stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Circle({ x: m(-0.045), y: m(-0.026), radius: m(0.0032), fill: "#22c55e", shadowColor: "#4ade80", shadowBlur: m(0.008), shadowOpacity: 0.9, stroke: "#14532d", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Text({ x: m(-0.058), y: m(-0.0135), width: m(0.116), align: "center", text: "VAN DE GRAAFF", fontSize: m(0.0058), fontStyle: "bold", fill: "rgba(226,232,240,0.85)", listening: false }));

  // Trụ nhựa trong rỗng: cắt dọc thấy hai nửa vỏ trong suốt và nền tối ở giữa.
  const colW = 0.036;
  group.add(new Konva.Rect({ x: m(cx - colW / 2), y: m(colTop), width: m(colW), height: m(baseTop - colTop), fill: "rgba(15,23,42,0.45)", listening: false }));
  group.add(new Konva.Rect({ x: m(cx - colW / 2 - 0.0055), y: m(colTop), width: m(0.0055), height: m(baseTop - colTop), ...lin(0, 0, m(0.0055), 0, [0, "rgba(255,255,255,0.8)", 1, "rgba(148,163,184,0.45)"]), stroke: "rgba(226,240,252,0.9)", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(cx + colW / 2), y: m(colTop), width: m(0.0055), height: m(baseTop - colTop), ...lin(0, 0, m(0.0055), 0, [0, "rgba(148,163,184,0.45)", 1, "rgba(30,64,175,0.4)"]), stroke: "rgba(226,240,252,0.9)", strokeWidth: lw * 0.8, listening: false }));
  group.add(ln([cx - colW / 2 - 0.0035, colTop + 0.004, cx - colW / 2 - 0.0035, baseTop - 0.004], "rgba(255,255,255,0.85)", lw * 1.4));
  // Hai bàn chải kim loại (kim phóng/hút điện) ở gần hai con lăn.
  for (const [y, side] of [[rollerLowY - 0.012, -1], [rollerHighY + 0.01, 1]] as [number, number][]) {
    group.add(ln([cx + side * 0.012, y, cx + side * 0.02, y], "#cbd5e1", lw * 1.5));
    for (let i = 0; i < 4; i += 1) group.add(ln([cx + side * 0.012, y - 0.003 + i * 0.002, cx + side * 0.0085, y - 0.003 + i * 0.002], "#e2e8f0", lw * 0.7));
  }

  // BỘ PHẬN QUAY: con lăn dưới (giữ nhóm quay) cùng các vạch trên băng tải mô phỏng chuyển động; gốc nhóm tại trục con lăn dưới.
  const belt = new Konva.Group({ x: m(cx), y: m(rollerLowY) });
  belt.add(new Konva.Circle({ radius: m(0.0095), ...lin(m(-0.0095), m(-0.0095), m(0.0095), m(0.0095), steel), stroke: "#0f172a", strokeWidth: lw * 0.9, listening: false }));
  for (let i = 0; i < 6; i += 1) {
    const a = (i * Math.PI) / 3;
    belt.add(ln([0.0035 * Math.cos(a), 0.0035 * Math.sin(a), 0.0085 * Math.cos(a), 0.0085 * Math.sin(a)], "#334155", lw * 1.2));
  }
  belt.add(new Konva.Circle({ radius: m(0.0025), fill: "#0f172a", listening: false }));
  // Băng tải mảnh bao quanh hai con lăn (hai nhánh dọc), vạch đánh dấu có thể bị quay lệch mắt.
  group.add(new Konva.Rect({ x: m(cx - 0.0098), y: m(rollerHighY), width: m(0.0017), height: m(rollerLowY - rollerHighY), fill: "#0b1220", listening: false }));
  group.add(new Konva.Rect({ x: m(cx + 0.0081), y: m(rollerHighY), width: m(0.0017), height: m(rollerLowY - rollerHighY), fill: "#0b1220", listening: false }));
  for (let i = 0; i < 9; i += 1) {
    group.add(new Konva.Rect({ x: m(cx - 0.0098), y: m(rollerHighY + 0.006 + i * 0.011), width: m(0.0017), height: m(0.003), fill: "#fbbf24", listening: false }));
    group.add(new Konva.Rect({ x: m(cx + 0.0081), y: m(rollerHighY + 0.0115 + i * 0.011), width: m(0.0017), height: m(0.003), fill: "#fbbf24", listening: false }));
  }
  group.add(belt);

  // Mái vòm: quả cầu nhôm bóng, vành tiếp xúc với trụ, phản chiếu trần và bóng đen dưới đáy.
  group.add(new Konva.Circle({ x: m(cx), y: m(domeCy), radius: m(DR), fillRadialGradientStartPoint: { x: m(-0.02), y: m(-0.025) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: m(0.005), y: m(0.005) }, fillRadialGradientEndRadius: m(DR), fillRadialGradientColorStops: [0, "#ffffff", 0.2, "#f1f5f9", 0.55, fill, 0.85, "#64748b", 1, "#1e293b"], stroke: "#334155", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.016), shadowOpacity: 0.5, shadowOffset: { x: m(0.003), y: m(0.006) }, listening: false }));
  group.add(new Konva.Arc({ x: m(cx), y: m(domeCy), innerRadius: m(DR - 0.0105), outerRadius: m(DR - 0.0055), angle: 58, rotation: 205, fill: "rgba(255,255,255,0.8)", listening: false }));
  group.add(new Konva.Ellipse({ x: m(cx + 0.004), y: m(domeCy + 0.032), radiusX: m(0.03), radiusY: m(0.011), fill: "rgba(30,41,59,0.25)", listening: false }));
  group.add(ln([cx - 0.057, domeCy + 0.005, cx + 0.057, domeCy + 0.005], "rgba(15,23,42,0.2)", lw * 1.2));
  group.add(new Konva.Circle({ x: m(cx - 0.02), y: m(domeCy - 0.026), radius: m(0.005), fill: "#fff", listening: false }));
  group.add(new Konva.Rect({ x: m(cx - 0.022), y: m(domeCy + DR - 0.0075), width: m(0.044), height: m(0.0075), cornerRadius: m(0.0015), ...lin(0, 0, m(0.044), 0, [0, "#475569", 0.4, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 0.8, listening: false }));
  // Vài dấu + trên mặt ngoài mái vòm thể hiện điện tích.
  for (const [a, rr] of [[200, 0.049], [250, 0.049], [300, 0.049], [340, 0.049], [160, 0.049]] as [number, number][]) {
    const x = cx + rr * Math.cos((a * Math.PI) / 180);
    const y = domeCy + rr * Math.sin((a * Math.PI) / 180);
    group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(0.0033), fill: "rgba(220,38,38,0.88)", stroke: "#7f1d1d", strokeWidth: lw * 0.5, listening: false }));
    group.add(ln([x - 0.0019, y, x + 0.0019, y], "#fff", lw * 0.7));
    group.add(ln([x, y - 0.0019, x, y + 0.0019], "#fff", lw * 0.7));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.006), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { belt: { node: belt, motion: "rotate" as const, min: 0, max: 360 } },
    points: { base: { x: 0, y: 0 }, dome: { x: m(cx), y: m(domeCy) }, rollerLow: { x: m(cx), y: m(rollerLowY) }, rollerHigh: { x: m(cx), y: m(rollerHighY) } },
  };
};
