/* OBJECT-META
{
  "catalog": "Đèn LED / điốt",
  "title": "Đèn LED đỏ 5 mm vẽ phóng to: vỏ epoxy bán cầu trong, chip trong chén phản xạ, chân dài (anot) và chân ngắn (catot), mặt cắt phẳng ở vành",
  "fill": "#ef4444",
  "anchor": "Giữa vỏ nhựa (chỗ giáp chân).",
  "useWhen": ["Cần LED đơn có phân biệt chân dài anot (+) và chân ngắn catot (−) để nối mạch.", "Cảnh nói về điốt phát sáng dẫn một chiều, điện áp thuận khoảng 2 V, phát màu đỏ."],
  "avoidWhen": ["Cần bóng đèn sợi đốt để thắp sáng thông thường: dùng bong-den.", "Vật chỉ phát màu đỏ và không có bộ phận chỉnh độ sáng; vẽ phóng to 3 lần."],
  "size": { "width": 0.023, "height": 0.07 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Giữa vỏ nhựa." },
    { "name": "anode", "description": "Đầu chân dài (anot, cực +)." },
    { "name": "cathode", "description": "Đầu chân ngắn (catot, cực −, phía mặt cắt phẳng)." }
  ],
  "notes": "Vẽ phóng to 3 lần: vỏ đường kính 0,02 m (LED thật 5 mm), chân dài 0,03 m và 0,025 m. Chân dài là anot (cực +, phải nối về phía dương nguồn), chân ngắn bên mặt cắt phẳng là catot (cực −). Khi sáng phát màu đỏ, điện áp thuận khoảng 2 V; chỉ dẫn điện một chiều. fill là màu vỏ epoxy và ánh sáng."
}
*/
const makeLed = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0012));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const R = 0.01;
  const yMid = -0.0015;

  // Hai chân thép mạ thiếc: chân dài bên phải (anot), chân ngắn bên trái (catot) có đoạn dẹp hình tấm.
  group.add(new Konva.Rect({ x: m(0.0034), y: m(yMid), width: m(0.0024), height: m(0.03 + 0.0015), ...lin(m(0.0034), 0, m(0.0058), 0, [0, "#64748b", 0.4, "#f8fafc", 1, "#475569"]), stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0058), y: m(yMid), width: m(0.0024), height: m(0.025 + 0.0015), ...lin(m(-0.0058), 0, m(-0.0034), 0, [0, "#64748b", 0.4, "#f8fafc", 1, "#475569"]), stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0065), y: m(0.006), width: m(0.0038), height: m(0.0015), fill: "#e2e8f0", stroke: "#475569", strokeWidth: lw * 0.5, listening: false }));
  group.add(new Konva.Rect({ x: m(0.0029), y: m(0.006), width: m(0.0038), height: m(0.0015), fill: "#e2e8f0", stroke: "#475569", strokeWidth: lw * 0.5, listening: false }));

  // Chén phản xạ, chip bán dẫn và dây vàng mảnh bên trong vỏ.
  group.add(new Konva.Line({ points: [m(-0.0065), m(-0.012), m(-0.0015), m(-0.009), m(0.0015), m(-0.009), m(0.0065), m(-0.012)], closed: true, fill: "#cbd5e1", stroke: "#475569", strokeWidth: lw * 0.7, lineJoin: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(0.0034), y: m(-0.0145), width: m(0.0024), height: m(0.0126), ...lin(m(0.0034), 0, m(0.0058), 0, [0, "#64748b", 0.4, "#f8fafc", 1, "#475569"]), listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0058), y: m(-0.0145), width: m(0.0024), height: m(0.0126), ...lin(m(-0.0058), 0, m(-0.0034), 0, [0, "#64748b", 0.4, "#f8fafc", 1, "#475569"]), listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0016), y: m(-0.0108), width: m(0.0032), height: m(0.0018), fill: fill, stroke: "#7f1d1d", strokeWidth: lw * 0.5, shadowColor: fill, shadowBlur: m(0.004), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Line({ points: [m(0), m(-0.0108), m(0.0025), m(-0.0148), m(0.0045), m(-0.0125)], stroke: "#f59e0b", strokeWidth: lw * 0.6, tension: 0.5, listening: false }));

  // Vỏ epoxy: thân trụ ngắn ở dưới, phần trên bán cầu, hai cạnh đổi màu và vành đáy có một mặt cắt phẳng bên trái.
  const shell: number[] = [-R, yMid, -R, -0.03];
  for (let i = 1; i < 16; i += 1) {
    const t = Math.PI - (i * Math.PI) / 16;
    shell.push(R * Math.cos(t), -0.03 - R * Math.sin(t));
  }
  shell.push(R, -0.03, R, yMid);
  group.add(new Konva.Line({ points: shell.map(m), closed: true, ...lin(m(-R), 0, m(R), 0, [0, "rgba(255,255,255,0.55)", 0.25, "rgba(254,202,202,0.4)", 0.65, fill, 1, "rgba(127,29,29,0.8)"]), stroke: "rgba(127,29,29,0.9)", strokeWidth: lw * 1.2, lineJoin: "round", shadowColor: fill, shadowBlur: m(0.006), shadowOpacity: 0.55, listening: false }));
  group.add(new Konva.Rect({ x: m(-R - 0.0016), y: m(yMid - 0.0013), width: m(R * 2 + 0.0032), height: m(0.0028), cornerRadius: m(0.0008), ...lin(m(-R), 0, m(R), 0, [0, "#fecaca", 0.5, fill, 1, "#7f1d1d"]), stroke: "#7f1d1d", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Line({ points: [m(-R - 0.0016), m(yMid - 0.0013), m(-R + 0.0015), m(yMid - 0.0013), m(-R + 0.0015), m(yMid + 0.0015), m(-R - 0.0016), m(yMid + 0.0015)], closed: true, fill: "#1f2937", listening: false }));
  // Vệt phản chiếu mảnh và điểm sáng trên mái vòm.
  group.add(new Konva.Arc({ x: 0, y: m(-0.03), innerRadius: m(0.0072), outerRadius: m(0.0092), angle: 58, rotation: 205, fill: "rgba(255,255,255,0.7)", listening: false }));
  group.add(new Konva.Ellipse({ x: m(-0.0058), y: m(-0.022), radiusX: m(0.0009), radiusY: m(0.006), fill: "rgba(255,255,255,0.6)", rotation: 10, listening: false }));
  // Dấu cực: chữ + trên chân dài và − trên chân ngắn.
  group.add(new Konva.Text({ x: m(0.0075), y: m(0.012), text: "+", fontSize: m(0.0068), fontStyle: "bold", fill: "#fca5a5", listening: false }));
  group.add(new Konva.Text({ x: m(-0.0135), y: m(0.012), text: "−", fontSize: m(0.0072), fontStyle: "bold", fill: "#93c5fd", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.04), y: m(0.034), width: m(0.08), align: "center", text: label, fontSize: m(0.0095), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: m(-0.0105) }, anode: { x: m(0.0046), y: m(0.0285) }, cathode: { x: m(-0.0046), y: m(0.0235) } } };
};
