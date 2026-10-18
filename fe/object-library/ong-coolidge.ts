/* OBJECT-META
{
  "catalog": "Ống phóng tia X (ống Coolidge)",
  "title": "Ống Coolidge phát tia X: bóng thuỷ tinh chân không có catot dây tóc xoắn bên trái, anot vonfram nghiêng nối khối đồng có cánh tản nhiệt bên phải, chùm tia X thoát qua cửa sổ",
  "fill": "#bae6fd",
  "anchor": "Giữa đáy giá, chạm mặt bàn.",
  "useWhen": ["Cần ống Coolidge phát tia X: catot dây tóc, anot vonfram nghiêng 45°, khối đồng có cánh tản nhiệt, cửa sổ ra ở dưới.", "Cảnh nói về sự hình thành tia X khi electron được gia tốc vài chục kV đập vào đích."],
  "avoidWhen": ["Cần ống tia catot có màn huỳnh quang và bóng chữ thập: dùng ong-crookes.", "Vật không có bộ phận chuyển động; chùm electron và tia X phải do cảnh vẽ."],
  "size": { "width": 0.2, "height": 0.095 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy giá." },
    { "name": "filament", "description": "Dây tóc catot bên trái." },
    { "name": "target", "description": "Mặt vonfram nghiêng của anot, nơi chùm electron đập vào." },
    { "name": "exitPort", "description": "Cửa sổ thoát tia X ở phía dưới ống." }
  ],
  "notes": "Bóng thuỷ tinh dài 0,13 m, đường kính 0,06 m, chân không cao. Dây tóc catot nung nóng phát electron, hiệu điện thế vài chục kV gia tốc electron tới đập vào đích vonfram nghiêng 45°, phát tia X ra phía dưới; khối đồng và cánh tản nhiệt bên phải chịu nhiệt. fill là màu thuỷ tinh."
}
*/
const makeXrayTube = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cy = -0.065;
  const XL = -0.065;
  const XR = 0.065;
  const R = 0.03;
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const vr = (x: number, y: number, w: number, h: number, stops: (number | string)[], r = 0.001) => new Konva.Rect({ x: m(x), y: m(y), width: m(w), height: m(h), cornerRadius: m(r), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(h) }, fillLinearGradientColorStops: stops, stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false });

  // Giá đỡ gỗ với hai chân kẹp ống.
  group.add(vr(-0.1, -0.011, 0.2, 0.011, [0, "#d6a15a", 0.5, "#a16207", 1, "#5a2d0c"], 0.003));
  for (const x of [-0.03, 0.04]) group.add(new Konva.Line({ points: [m(x - 0.012), m(-0.011), m(x - 0.006), m(cy + R + 0.001), m(x + 0.006), m(cy + R + 0.001), m(x + 0.012), m(-0.011)], closed: true, fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(0.024), y: 0 }, fillLinearGradientColorStops: [0, "#92400e", 0.5, "#d97706", 1, "#451a03"], stroke: "#3b1d08", strokeWidth: lw, listening: false }));

  // Khối đồng anot phía phải với bảy cánh tản nhiệt, đi xuyên qua đáy ống.
  group.add(vr(XR - 0.005, cy - 0.012, 0.036, 0.024, [0, "#fdba74", 0.4, "#c2410c", 1, "#431407"], 0.002));
  for (let i = 0; i < 7; i += 1) group.add(vr(XR + 0.0265 + i * 0.0045 - 0.027, cy - 0.027 - (i % 2 ? 0.002 : 0), 0.0028, 0.054 + (i % 2 ? 0.004 : 0), [0, "#fed7aa", 0.4, "#ea580c", 1, "#7c2d12"], 0.0008));
  for (let i = 0; i < 7; i += 1) group.add(new Konva.Line({ points: [m(XR + 0.0265 + i * 0.0045 - 0.027), m(cy - 0.0245), m(XR + 0.0265 + i * 0.0045 - 0.0242), m(cy - 0.0245)], stroke: "rgba(255,255,255,0.5)", strokeWidth: lw, listening: false }));

  // Bóng thuỷ tinh: elip dài, lòng tối, bóng đổ.
  group.add(new Konva.Ellipse({ x: 0, y: m(cy), radiusX: m(0.075), radiusY: m(R), fill: "#071019", stroke: "rgba(226,240,252,0.95)", strokeWidth: m(0.0028), shadowColor: "#7dd3fc", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Ellipse({ x: 0, y: m(cy), radiusX: m(0.075), radiusY: m(R), fillLinearGradientStartPoint: { x: 0, y: m(-R) }, fillLinearGradientEndPoint: { x: 0, y: m(R) }, fillLinearGradientColorStops: [0, "rgba(255,255,255,0.16)", 0.45, "rgba(186,230,253,0.02)", 1, "rgba(56,189,248,0.12)"], listening: false }));

  // Catot: chén hội tụ chắn quanh dây tóc xoắn, đầu cắm hai dây bên trái.
  group.add(new Konva.Rect({ x: m(XL - 0.01), y: m(cy - 0.011), width: m(0.012), height: m(0.022), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(0.012), y: 0 }, fillLinearGradientColorStops: steel, stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Line({ points: [m(XL + 0.002), m(cy - 0.011), m(XL + 0.006), m(cy - 0.006), m(XL + 0.006), m(cy + 0.006), m(XL + 0.002), m(cy + 0.011)], stroke: "#cbd5e1", strokeWidth: lw * 1.4, lineJoin: "round", listening: false }));
  const fil: number[] = [];
  for (let i = 0; i <= 8; i += 1) fil.push(XL + 0.0005 + (i * 0.005) / 8, cy + (i % 2 ? 0.0025 : -0.0025));
  group.add(new Konva.Line({ points: fil.map(m), stroke: "#fde047", strokeWidth: lw * 1.3, listening: false, shadowColor: "#fb923c", shadowBlur: m(0.006), shadowOpacity: 0.9 }));
  group.add(new Konva.Line({ points: [m(XL - 0.016), m(cy - 0.004), m(XL - 0.0095), m(cy - 0.004)], stroke: "#e2e8f0", strokeWidth: lw * 1.3, listening: false }));
  group.add(new Konva.Line({ points: [m(XL - 0.016), m(cy + 0.004), m(XL - 0.0095), m(cy + 0.004)], stroke: "#e2e8f0", strokeWidth: lw * 1.3, listening: false }));
  for (const dy of [-0.004, 0.004]) group.add(new Konva.Circle({ x: m(XL - 0.019), y: m(cy + dy), radius: m(0.0032), fill: "#1f2937", stroke: "#000", strokeWidth: lw * 0.6, listening: false }));
  // Đích vonfram nghiêng ở đầu anot.
  group.add(new Konva.Line({ points: [m(0.036), m(cy - 0.011), m(0.047), m(cy - 0.011), m(0.047), m(cy + 0.011)], closed: true, fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(0.011), y: m(0.022) }, fillLinearGradientColorStops: [0, "#e2e8f0", 1, "#64748b"], stroke: "#334155", strokeWidth: lw, lineJoin: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(0.047), y: m(cy - 0.007), width: m(XR - 0.047 + 0.005), height: m(0.014), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(0.014) }, fillLinearGradientColorStops: [0, "#fed7aa", 0.4, "#c2410c", 1, "#431407"], stroke: "#431407", strokeWidth: lw * 0.8, listening: false }));
  // Chùm electron (xanh), chùm tia X (tím) đi xuống và cửa sổ ở đáy bóng.
  group.add(new Konva.Line({ points: [m(XL + 0.008), m(cy), m(0.0385), m(cy - 0.0005)], stroke: "rgba(125,211,252,0.9)", strokeWidth: m(0.0035), lineCap: "round", shadowColor: "#7dd3fc", shadowBlur: m(0.008), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Line({ points: [m(0.0415), m(cy + 0.0005), m(0.031), m(cy + R * 0.98), m(0.049), m(cy + R * 0.98)], closed: true, fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(R) }, fillLinearGradientColorStops: [0, "rgba(192,132,252,0.75)", 1, "rgba(192,132,252,0.12)"], listening: false }));
  group.add(new Konva.Ellipse({ x: m(0.04), y: m(cy + R - 0.002), radiusX: m(0.0105), radiusY: m(0.0026), fill: "rgba(233,213,255,0.8)", stroke: "#a855f7", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Circle({ x: m(0.0415), y: m(cy), radius: m(0.0022), fill: "#fff", shadowColor: "#c4b5fd", shadowBlur: m(0.008), shadowOpacity: 1, listening: false }));
  // Vệt phản chiếu thuỷ tinh.
  group.add(new Konva.Line({ points: [m(-0.05), m(cy - R + 0.004), m(0.02), m(cy - R + 0.004)], stroke: "rgba(255,255,255,0.55)", strokeWidth: lw * 1.8, lineCap: "round", listening: false }));
  group.add(new Konva.Text({ x: m(XL - 0.018), y: m(cy - R - 0.0045), text: "K", fontSize: m(0.0085), fontStyle: "bold", fill: "#fcd34d", listening: false }));
  group.add(new Konva.Text({ x: m(0.03), y: m(cy - R - 0.0045), text: "A", fontSize: m(0.0085), fontStyle: "bold", fill: "#e2e8f0", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.006), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, filament: { x: m(XL + 0.0025), y: m(cy) }, target: { x: m(0.0415), y: m(cy) }, exitPort: { x: m(0.04), y: m(cy + R) } } };
};
