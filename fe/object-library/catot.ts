/* OBJECT-META
{
  "catalog": "Tấm kim loại (catot) bị chiếu sáng",
  "title": "Tấm kẽm đánh bóng gắn trên trụ cách điện, có đầu nối dây và vết xước cho thấy bề mặt kim loại để chiếu ánh sáng lên",
  "fill": "#cbd5e1",
  "anchor": "Tâm mặt tấm kim loại.",
  "useWhen": ["Cần tấm kẽm bị chiếu sáng trong thí nghiệm hiệu ứng quang điện với điện nghiệm.","Cần tấm kim loại đặt trên trụ cách điện có đầu nối dây."],
  "avoidWhen": ["Cần tế bào quang điện kín có anot và catot trong bình chân không: dùng te-bao-quang-dien.","Cần hình điện nghiệm có lá kim loại xoè ra: dùng dien-nghiem; vật này chỉ là tấm kim loại."],
  "size": { "width": 0.094, "height": 0.165 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm mặt tấm kim loại, nơi ánh sáng rọi vào." },
    { "name": "terminal", "description": "Đầu nối dây để nối với điện nghiệm hoặc nguồn." },
    { "name": "foot", "description": "Giữa chân trụ cách điện ở mặt bàn." }
  ],
  "notes": "Tấm kẽm 0,07 m × 0,09 m, dày vài mm, mặt đánh bóng. Đặt trên trụ cách điện (ebonit) cao 0,09 m; ánh sáng (hồ quang, đèn thuỷ ngân) chiếu thẳng vào mặt tấm làm bật quang electron. Hồ quang và electron bật ra do cảnh vẽ. fill là màu kim loại của tấm."
}
*/
const makeIlluminatedMetalPlate = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.07;
  const H = 0.09;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const baseY = 0.12;

  // Đế gang tròn, trụ ebonit đen có khía và vòng thép kẹp.
  group.add(new Konva.Ellipse({ x: 0, y: m(baseY - 0.006), radiusX: m(0.038), radiusY: m(0.0065), ...lin(m(-0.038), 0, m(0.038), 0, [0, "#475569", 0.3, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.007), y: m(H / 2 - 0.002), width: m(0.014), height: m(baseY - 0.006 - H / 2), ...lin(m(-0.007), 0, m(0.007), 0, [0, "#030712", 0.3, "#6b7280", 0.55, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.8, listening: false }));
  for (let i = 0; i < 6; i += 1) group.add(ln([-0.0072, 0.055 + i * 0.0105, 0.0072, 0.055 + i * 0.0105], "rgba(255,255,255,0.14)", lw));
  group.add(new Konva.Rect({ x: m(-0.0085), y: m(baseY - 0.016), width: m(0.017), height: m(0.01), cornerRadius: m(0.002), ...lin(m(-0.0085), 0, m(0.0085), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));

  // Tấm kim loại: cạnh dày bên phải/dưới tối hơn, mặt chính có gradient kim loại đánh bóng.
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.0035), y: m(-H / 2 + 0.0035), width: m(W), height: m(H), cornerRadius: m(0.0022), fill: "#475569", stroke: "#0f172a", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.003), y: m(0.005) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(-H / 2), width: m(W), height: m(H), cornerRadius: m(0.0022), ...lin(m(-W / 2), m(-H / 2), m(W / 2), m(H / 2), [0, "#ffffff", 0.18, fill, 0.5, "#e2e8f0", 0.78, "#94a3b8", 1, "#64748b"]), stroke: "#334155", strokeWidth: lw, listening: false }));
  // Vết xước mảnh và các vệt sáng đa hướng của kim loại đánh bóng.
  for (const [x1, y1, x2, y2] of [[-0.028, -0.032, -0.006, -0.036], [0.004, 0.012, 0.027, 0.004], [-0.022, 0.028, -0.002, 0.021], [0.01, -0.024, 0.026, -0.028]]) group.add(ln([x1, y1, x2, y2], "rgba(71,85,105,0.5)", lw * 0.7));
  group.add(new Konva.Line({ points: [m(-W / 2 + 0.002), m(-H / 2 + 0.002), m(-0.002), m(-H / 2 + 0.002), m(-W / 2 + 0.002), m(0.012)], closed: true, fill: "rgba(255,255,255,0.45)", listening: false }));
  group.add(ln([-W / 2 + 0.0035, -H / 2 + 0.004, -W / 2 + 0.0035, H / 2 - 0.006], "rgba(255,255,255,0.6)", lw * 1.8));
  group.add(new Konva.Text({ x: m(0.012), y: m(H / 2 - 0.0125), text: "Zn", fontSize: m(0.0092), fontStyle: "bold italic", fill: "rgba(51,65,85,0.85)", listening: false }));
  // Hai lỗ bắt ốc và đầu nối dây (núm đồng đỏ) bên phải tấm.
  for (const dy of [-0.031, 0.031]) group.add(new Konva.Circle({ x: m(-0.0275), y: m(dy), radius: m(0.0022), fill: "#475569", stroke: "#1e293b", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(W / 2 + 0.0035), y: m(0.012), width: m(0.011), height: m(0.007), cornerRadius: m(0.0015), ...lin(0, m(0.012), 0, m(0.019), [0, "#fdba74", 0.5, "#b45309", 1, "#431407"]), stroke: "#431407", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Circle({ x: m(W / 2 + 0.0165), y: m(0.0155), radius: m(0.0042), fillRadialGradientStartPoint: { x: m(-0.0012), y: m(-0.0012) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0042), fillRadialGradientColorStops: [0, "#fdba74", 1, "#7c2d12"], stroke: "#431407", strokeWidth: lw * 0.7, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(baseY + 0.006), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, terminal: { x: m(W / 2 + 0.0165), y: m(0.0155) }, foot: { x: 0, y: m(baseY) } } };
};
