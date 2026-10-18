/* OBJECT-META
{
  "catalog": "Micro",
  "title": "Micro động cuộn dây trên chân đế để bàn: đầu lưới thép hình cầu, thân thon bạc, cổ ngỗng và cáp ra phía sau",
  "fill": "#cbd5e1",
  "anchor": "Tâm đầu lưới thu âm (hình cầu).",
  "useWhen": ["Cần micro động cuộn dây để bàn có đầu lưới cầu, thân bạc, cổ ngỗng, chân đế, cáp phía sau.","Cần thiết bị thu âm đưa tín hiệu từ sóng âm sang tín hiệu điện."],
  "avoidWhen": ["Cần loa phát âm: dùng loa.","Cần âm thoa hoặc dao động kí kèm: dùng am-thoa hoặc dao-dong-ki.","Cần micro cầm tay không chân đế: vật này gắn trên chân đế."],
  "size": { "width": 0.19, "height": 0.331 },
  "parts": [],
  "points": [
    { "name": "capsule", "description": "Tâm đầu lưới thu âm: âm đến từ mọi phía hướng vào đây." },
    { "name": "base", "description": "Giữa đáy đế." },
    { "name": "cable", "description": "Chỗ cáp ra khỏi đế." }
  ],
  "notes": "Đầu cầu rộng 0,05 m, thân micro dài 0,11 m, đế gang 0,1 m. Đặt trước loa hay âm thoa để thu âm vào dao động kí: nối cáp XLR sang cổng vào. fill là màu bạc của thân micro."
}
*/
const makeMicrophone = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const HEAD_R = 0.025;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, fill, 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const baseY = HEAD_R + 0.275;

  // Cáp mềm từ đáy đế đi sang phải rồi cong xuống bàn.
  group.add(new Konva.Line({ points: [m(0.04), m(baseY - 0.006), m(0.08), m(baseY - 0.004), m(0.11), m(baseY + 0.006), m(0.14), m(baseY + 0.004)], stroke: "#0b0f19", strokeWidth: m(0.0046), lineCap: "round", tension: 0.5, listening: false }));
  group.add(new Konva.Line({ points: [m(0.04), m(baseY - 0.006), m(0.08), m(baseY - 0.004), m(0.11), m(baseY + 0.006), m(0.14), m(baseY + 0.004)], stroke: "rgba(255,255,255,0.16)", strokeWidth: m(0.0012), lineCap: "round", tension: 0.5, listening: false }));
  // Đế gang dày và cổ nối.
  group.add(new Konva.Rect({ x: m(-0.05), y: m(baseY - 0.016), width: m(0.1), height: m(0.016), cornerRadius: m(0.005), ...lin(0, m(baseY - 0.016), 0, m(baseY), [0, "#6b7280", 0.2, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.45, shadowOffset: { x: 0, y: m(0.004) }, listening: false }));
  group.add(ln([-0.04, baseY - 0.0135, 0.04, baseY - 0.0135], "rgba(255,255,255,0.3)", lw));
  group.add(new Konva.Rect({ x: m(-0.008), y: m(baseY - 0.05), width: m(0.016), height: m(0.036), cornerRadius: m(0.003), ...lin(m(-0.008), 0, m(0.008), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  // Cổ ngỗng: hai đốt thép nối với khớp xoay ở giữa.
  group.add(new Konva.Rect({ x: m(-0.005), y: m(baseY - 0.116), width: m(0.01), height: m(0.068), ...lin(m(-0.005), 0, m(0.005), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(baseY - 0.048), radius: m(0.0085), ...lin(m(-0.0085), m(baseY - 0.056), m(0.0085), m(baseY - 0.04), [0, "#f8fafc", 0.5, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0035), y: m(baseY - 0.2), width: m(0.007), height: m(0.092), ...lin(m(-0.0035), 0, m(0.0035), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));

  // Thân micro thon: nhôm bạc có vòng trang trí và nhãn.
  const bodyTop = HEAD_R + 0.012;
  const bodyBottom = baseY - 0.14;
  group.add(new Konva.Line({ points: [m(-0.0145), m(bodyTop), m(-0.0105), m(bodyBottom), m(0.0105), m(bodyBottom), m(0.0145), m(bodyTop)], closed: true, ...lin(m(-0.0145), 0, m(0.0145), 0, [0, "#475569", 0.25, "#f8fafc", 0.6, fill, 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 1.1, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.35, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0152), y: m(bodyTop + 0.012), width: m(0.0304), height: m(0.011), ...lin(m(-0.0152), 0, m(0.0152), 0, [0, "#030712", 0.4, "#4b5563", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0125), y: m(bodyBottom - 0.016), width: m(0.025), height: m(0.016), ...lin(m(-0.0125), 0, m(0.0125), 0, [0, "#030712", 0.4, "#4b5563", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0095), m(bodyTop + 0.006), m(-0.0075), m(bodyBottom - 0.02)], stroke: "rgba(255,255,255,0.7)", strokeWidth: lw * 1.8, lineCap: "round", listening: false }));
  group.add(new Konva.Text({ x: m(-0.012), y: m(bodyTop + 0.03), width: m(0.024), align: "center", rotation: 0, text: "DYN", fontSize: m(0.0058), fontStyle: "bold", fill: "#111827", listening: false }));
  // Công tắc nhỏ ở thân (bật/tắt).
  group.add(new Konva.Rect({ x: m(-0.0035), y: m(bodyTop + 0.05), width: m(0.007), height: m(0.012), cornerRadius: m(0.002), fill: "#22c55e", stroke: "#14532d", strokeWidth: lw * 0.7, listening: false }));

  // Đầu lưới hình cầu: vòng đai dưới, lưới thép đan ô và vệt sáng.
  group.add(new Konva.Circle({ x: 0, y: 0, radius: m(HEAD_R), fillRadialGradientStartPoint: { x: m(-0.008), y: m(-0.01) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(HEAD_R), fillRadialGradientColorStops: [0, "#f8fafc", 0.4, "#94a3b8", 1, "#1f2937"], stroke: "#0f172a", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  for (let i = -3; i <= 3; i += 1) {
    const x = (i * HEAD_R) / 3.4;
    const half = Math.sqrt(Math.max(0, HEAD_R ** 2 - x ** 2));
    group.add(ln([x, -half + 0.0008, x, half - 0.0008], "rgba(15,23,42,0.55)", lw * 0.9));
    group.add(ln([-half + 0.0008, x, half - 0.0008, x], "rgba(15,23,42,0.55)", lw * 0.9));
  }
  group.add(new Konva.Circle({ x: 0, y: 0, radius: m(HEAD_R * 0.62), stroke: "rgba(15,23,42,0.4)", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Ellipse({ x: m(-0.0105), y: m(-0.0125), radiusX: m(0.0058), radiusY: m(0.0036), rotation: -40, fill: "rgba(255,255,255,0.85)", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0188), y: m(HEAD_R - 0.0065), width: m(0.0376), height: m(0.0075), cornerRadius: m(0.002), ...lin(m(-0.0188), 0, m(0.0188), 0, [0, "#030712", 0.4, "#6b7280", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.7, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(0.03), y: m(-0.008), text: label, fontSize: m(0.01), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { capsule: { x: 0, y: 0 }, base: { x: 0, y: m(baseY) }, cable: { x: m(0.04), y: m(baseY - 0.006) } } };
};
