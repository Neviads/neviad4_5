/* OBJECT-META
{
  "catalog": "Đèn chiếu / nguồn sáng (đèn sợi đốt, đèn LED)",
  "title": "Đèn chiếu để bàn: hộp đèn kim loại có cửa sổ kính thấy bóng sợi đốt phát sáng, thấu kính hội tụ phía trước và đèn báo",
  "fill": "#334155",
  "anchor": "Giữa đáy chân đèn, chạm mặt bàn.",
  "useWhen": ["Cần nguồn sáng dạng hộp đèn sợi đốt 12 V 21 W kèm cửa ra chùm sáng ở phía phải.", "Cảnh thấu kính hoặc ghép vật sáng trên ray quang học cần một nguồn sáng điểm đặt trước thấu kính."],
  "avoidWhen": ["Cần ba khe tạo chùm tia song song tách riêng: dùng den-khe.", "Cần bóng đèn trần để thắp mạch điện hoặc đèn LED: dùng bong-den hoặc den-led."],
  "size": { "width": 0.194, "height": 0.155 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy chân đèn." },
    { "name": "filament", "description": "Tâm sợi đốt, nguồn sáng điểm." },
    { "name": "aperture", "description": "Tâm cửa ra ở mặt trước (bên phải): chùm sáng đi ra từ đây." }
  ],
  "notes": "Hộp đèn 0,16 m × 0,12 m, bóng sợi đốt 12 V 21 W đặt cách thấu kính hội tụ 0,05 m. Cửa sổ kính bên hông để quan sát sợi tóc phát sáng. Chùm sáng, tia là hiện tượng do cảnh vẽ. fill là màu sơn vỏ."
}
*/
const makeLampHouse = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.16;
  const H = 0.12;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const left = -0.1;
  const top = -0.026 - H;
  const cy = top + H / 2;

  // Chân đế kim loại tròn, trụ và khớp xoay đỡ hộp đèn.
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.006), radiusX: m(0.07), radiusY: m(0.0075), ...lin(m(-0.07), 0, m(0.07), 0, [0, "#475569", 0.3, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.012), y: m(-0.032), width: m(0.024), height: m(0.026), ...lin(m(-0.012), 0, m(0.012), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));

  // Hộp đèn: thân vuông hai lớp, nắp thông gió phía trên, cửa sổ kính bên hông.
  group.add(new Konva.Rect({ x: m(left), y: m(top), width: m(W), height: m(H), cornerRadius: m(0.006), ...lin(0, m(top), 0, m(top + H), [0, "#94a3b8", 0.12, fill, 1, "#0b1220"]), stroke: "#0b1220", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.45, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  group.add(new Konva.Line({ points: [m(left + 0.008), m(top + 0.0035), m(left + W - 0.008), m(top + 0.0035)], stroke: "rgba(255,255,255,0.5)", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));
  for (let i = 0; i < 7; i += 1) group.add(new Konva.Rect({ x: m(left + 0.014 + i * 0.0105), y: m(top - 0.007), width: m(0.006), height: m(0.007), fill: "#0b0f19", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(left + 0.012), y: m(top + 0.016), width: m(0.062), height: m(0.088), cornerRadius: m(0.004), fill: "#030712", stroke: "#94a3b8", strokeWidth: lw, listening: false }));
  // Bóng đèn sợi đốt bên trong: bóng thuỷ tinh tròn, trụ đỡ, sợi tóc cuộn sáng rực, quầng sáng.
  const bx = left + 0.043;
  group.add(new Konva.Circle({ x: m(bx), y: m(cy - 0.004), radius: m(0.029), fillRadialGradientStartPoint: { x: m(bx), y: m(cy - 0.004) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: m(bx), y: m(cy - 0.004) }, fillRadialGradientEndRadius: m(0.029), fillRadialGradientColorStops: [0, "rgba(255,247,200,0.95)", 0.35, "rgba(253,224,71,0.45)", 1, "rgba(180,120,20,0.18)"], stroke: "rgba(254,243,199,0.8)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(bx - 0.0045), y: m(cy + 0.02), width: m(0.009), height: m(0.025), fill: "#475569", stroke: "#1e293b", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Line({ points: [m(bx - 0.0015), m(cy + 0.02), m(bx - 0.007), m(cy + 0.005), m(bx - 0.007), m(cy - 0.004)], stroke: "#cbd5e1", strokeWidth: lw, lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(bx + 0.0015), m(cy + 0.02), m(bx + 0.007), m(cy + 0.005), m(bx + 0.007), m(cy - 0.004)], stroke: "#cbd5e1", strokeWidth: lw, lineCap: "round", listening: false }));
  const coil: number[] = [];
  for (let i = 0; i <= 10; i += 1) coil.push(m(bx - 0.007 + (i * 0.014) / 10), m(cy - 0.004 + (i % 2 ? -0.0042 : 0.0042)));
  group.add(new Konva.Line({ points: coil, stroke: "#fff7d6", strokeWidth: lw * 2.4, lineCap: "round", lineJoin: "round", shadowColor: "#fde047", shadowBlur: m(0.014), shadowOpacity: 1, listening: false }));
  group.add(new Konva.Line({ points: coil, stroke: "#fef3c7", strokeWidth: lw * 1.3, lineCap: "round", lineJoin: "round", listening: false }));
  group.add(new Konva.Ellipse({ x: m(bx - 0.0105), y: m(cy - 0.0145), radiusX: m(0.0055), radiusY: m(0.0033), rotation: -35, fill: "rgba(255,255,255,0.55)", listening: false }));

  // Ống thấu kính phía trước (bên phải): vành thép và thấu kính hội tụ trong suốt.
  const lx = left + W;
  group.add(new Konva.Rect({ x: m(lx - 0.002), y: m(cy - 0.034), width: m(0.036), height: m(0.068), cornerRadius: m(0.004), ...lin(0, m(cy - 0.034), 0, m(cy + 0.034), [0, "#f8fafc", 0.3, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.35, listening: false }));
  group.add(new Konva.Path({ data: `M ${m(lx + 0.0105)} ${m(cy - 0.027)} A ${m(0.07)} ${m(0.07)} 0 0 1 ${m(lx + 0.0105)} ${m(cy + 0.027)} L ${m(lx + 0.0055)} ${m(cy + 0.027)} A ${m(0.07)} ${m(0.07)} 0 0 1 ${m(lx + 0.0055)} ${m(cy - 0.027)} Z`, fill: "rgba(224,242,254,0.78)", stroke: "rgba(241,245,249,0.95)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: [m(lx + 0.0085), m(cy - 0.02), m(lx + 0.009), m(cy - 0.004)], stroke: "rgba(255,255,255,0.9)", strokeWidth: lw * 1.8, lineCap: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(lx + 0.026), y: m(cy - 0.03), width: m(0.006), height: m(0.06), cornerRadius: m(0.002), fill: "#cbd5e1", stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  // Đèn báo nguồn, núm điều chỉnh độ sáng và nhãn.
  group.add(new Konva.Circle({ x: m(left + 0.1), y: m(cy - 0.036), radius: m(0.0042), fill: "#f87171", shadowColor: "#ef4444", shadowBlur: m(0.01), shadowOpacity: 0.95, listening: false }));
  group.add(new Konva.Circle({ x: m(left + 0.1), y: m(cy + 0.026), radius: m(0.0125), ...lin(m(left + 0.0875), 0, m(left + 0.1125), 0, [0, "#6b7280", 0.4, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: [m(left + 0.1), m(cy + 0.0245), m(left + 0.1055), m(cy + 0.0155)], stroke: "#f8fafc", strokeWidth: lw * 1.5, lineCap: "round", listening: false }));
  group.add(new Konva.Text({ x: m(left + 0.08), y: m(cy - 0.0525), width: m(0.04), align: "center", text: "12 V · 21 W", fontSize: m(0.0058), fill: "#cbd5e1", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(0.004), width: m(0.2), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, filament: { x: m(bx), y: m(cy - 0.004) }, aperture: { x: m(lx + 0.032), y: m(cy) } } };
};
