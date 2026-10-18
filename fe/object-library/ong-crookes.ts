/* OBJECT-META
{
  "catalog": "Ống tia catot (ống Crookes)",
  "title": "Ống Crookes thuỷ tinh hút chân không: catot lõm bên trái, anot hình chữ thập (chữ Thập Malta) giữa ống, màn huỳnh quang xanh bên phải với bóng chữ thập, đế gỗ",
  "fill": "#bae6fd",
  "anchor": "Giữa đáy giá đỡ.",
  "useWhen": ["Cần ống Crookes: catot lõm, anot chữ thập giữa ống và màn huỳnh quang xanh có bóng chữ thập.", "Cảnh chứng minh tia catot truyền thẳng, mang năng lượng và bị vật chắn tạo bóng."],
  "avoidWhen": ["Cần ống phát tia X có đích vonfram: dùng ong-coolidge.", "Cần chùm electron bị từ trường uốn vòng: dùng ong-phong-dien-tu; vật này vẽ tia catot đi thẳng."],
  "size": { "width": 0.196, "height": 0.1 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy giá đỡ." },
    { "name": "cathode", "description": "Giữa catot bên trái." },
    { "name": "anode", "description": "Giữa anot (chữ thập)." },
    { "name": "screen", "description": "Giữa màn huỳnh quang bên phải." }
  ],
  "notes": "Ống dài 0,18 m, đường kính 0,06 m, áp suất ~10⁻³ mmHg; hiệu điện thế vài kV giữa catot và anot. Tia catot (dòng electron) đi thẳng từ catot sang phải, bị chữ thập chắn để lại bóng trên màn huỳnh quang. Tia catot do cảnh vẽ. fill là màu thuỷ tinh."
}
*/
const makeCrookesTube = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cy = -0.058;
  const X0 = -0.09;
  const X1 = 0.09;
  const R = 0.03;
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];

  // Giá gỗ có hai gối đỡ và đế.
  group.add(new Konva.Rect({ x: m(-0.1), y: m(-0.012), width: m(0.2), height: m(0.012), cornerRadius: m(0.003), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(0.012) }, fillLinearGradientColorStops: [0, "#d6a15a", 0.5, "#a16207", 1, "#5a2d0c"], stroke: "#3b1d08", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, listening: false }));
  for (const x of [-0.055, 0.055]) {
    group.add(new Konva.Line({ points: [m(x - 0.012), m(-0.012), m(x - 0.007), m(cy + R + 0.001), m(x + 0.007), m(cy + R + 0.001), m(x + 0.012), m(-0.012)], closed: true, fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(0.024), y: 0 }, fillLinearGradientColorStops: [0, "#92400e", 0.5, "#d97706", 1, "#451a03"], stroke: "#3b1d08", strokeWidth: lw, listening: false }));
  }
  // Cổ ống bên trái và đuôi hút khí, hai chân điện cực.
  group.add(new Konva.Rect({ x: m(X0 - 0.014), y: m(cy - 0.008), width: m(0.018), height: m(0.016), fill: "rgba(186,230,253,0.35)", stroke: "rgba(226,240,252,0.95)", strokeWidth: lw * 1.3, listening: false }));
  group.add(new Konva.Line({ points: [m(X0 - 0.016), m(cy), m(X0 + 0.018), m(cy)], stroke: "#e2e8f0", strokeWidth: lw * 1.6, lineCap: "round", listening: false }));
  group.add(new Konva.Circle({ x: m(X0 - 0.018), y: m(cy), radius: m(0.0048), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0048), fillRadialGradientColorStops: [0, "#fff", 0.35, "#1f2937", 1, "#000"], stroke: "#000", strokeWidth: lw * 0.6, listening: false }));
  // Nhánh anot lên trên giữa ống: ống phụ nối đầu cắm đỏ.
  group.add(new Konva.Rect({ x: m(-0.006), y: m(cy - R - 0.016), width: m(0.012), height: m(0.019), fill: "rgba(186,230,253,0.35)", stroke: "rgba(226,240,252,0.95)", strokeWidth: lw * 1.3, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(cy - R - 0.019), radius: m(0.0048), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0048), fillRadialGradientColorStops: [0, "#fff", 0.35, "#ef4444", 1, "#7f1d1d"], stroke: "#7f1d1d", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Line({ points: [0, m(cy - R - 0.014), 0, m(cy - 0.012)], stroke: "#e2e8f0", strokeWidth: lw * 1.4, listening: false }));

  // Thân ống: trụ có hai đầu cầu, lòng tối, tia sáng xanh trên màn.
  group.add(new Konva.Rect({ x: m(X0), y: m(cy - R), width: m(X1 - X0), height: m(R * 2), cornerRadius: m(R), fill: "#071019", stroke: "rgba(226,240,252,0.95)", strokeWidth: m(0.0028), shadowColor: "#7dd3fc", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(X0), y: m(cy - R), width: m(X1 - X0), height: m(R * 2), cornerRadius: m(R), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(R * 2) }, fillLinearGradientColorStops: [0, "rgba(255,255,255,0.14)", 0.45, "rgba(186,230,253,0.02)", 1, "rgba(56,189,248,0.1)"], listening: false }));
  // Màn huỳnh quang xanh: nửa elip ở đầu phải có bóng chữ thập ở giữa.
  group.add(new Konva.Ellipse({ x: m(X1 - 0.015), y: m(cy), radiusX: m(0.01), radiusY: m(R - 0.004), fill: "rgba(74,222,128,0.5)", shadowColor: "#4ade80", shadowBlur: m(0.012), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Ellipse({ x: m(X1 - 0.015), y: m(cy), radiusX: m(0.01), radiusY: m(R - 0.004), fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.02), fillRadialGradientColorStops: [0, "rgba(187,247,208,0.9)", 1, "rgba(34,197,94,0.15)"], listening: false }));
  // Bóng chữ thập (tối) trên màn.
  group.add(new Konva.Rect({ x: m(X1 - 0.017), y: m(cy - 0.011), width: m(0.003), height: m(0.022), fill: "rgba(2,6,23,0.8)", listening: false }));
  group.add(new Konva.Rect({ x: m(X1 - 0.0215), y: m(cy - 0.0015), width: m(0.012), height: m(0.003), fill: "rgba(2,6,23,0.8)", listening: false }));
  // Chùm tia catot hình nón từ catot tới màn, nhạt dần.
  group.add(new Konva.Line({ points: [m(X0 + 0.022), m(cy - 0.004), m(X1 - 0.025), m(cy - 0.019), m(X1 - 0.025), m(cy + 0.019), m(X0 + 0.022), m(cy + 0.004)], closed: true, fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(0.16), y: 0 }, fillLinearGradientColorStops: [0, "rgba(125,211,252,0.5)", 1, "rgba(125,211,252,0.06)"], listening: false }));
  // Catot lõm bên trái: chỏm cầu nhìn nghiêng.
  group.add(new Konva.Arc({ x: m(X0 + 0.036), y: m(cy), innerRadius: m(0.0145), outerRadius: m(0.017), angle: 110, rotation: 145, fill: "#cbd5e1", stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Text({ x: m(X0 + 0.008), y: m(cy - 0.0055), width: m(0.014), align: "center", text: "K", fontSize: m(0.01), fontStyle: "bold", fill: "#fcd34d", listening: false }));
  // Anot: chữ thập kim loại đứng giữa ống trên cần thép.
  group.add(new Konva.Rect({ x: m(-0.0012), y: m(cy - 0.012), width: m(0.0024), height: m(0.024), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(0.0024), y: 0 }, fillLinearGradientColorStops: steel, stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0055), y: m(cy - 0.0012), width: m(0.011), height: m(0.0024), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(0.0024) }, fillLinearGradientColorStops: steel, listening: false }));
  group.add(new Konva.Text({ x: m(0.004), y: m(cy - R + 0.0015), text: "A", fontSize: m(0.0085), fontStyle: "bold", fill: "#e2e8f0", listening: false }));
  // Phản chiếu thuỷ tinh trên và dưới.
  group.add(new Konva.Line({ points: [m(X0 + 0.018), m(cy - R + 0.004), m(X1 - 0.03), m(cy - R + 0.004)], stroke: "rgba(255,255,255,0.55)", strokeWidth: lw * 1.8, lineCap: "round", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.006), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, cathode: { x: m(X0 + 0.021), y: m(cy) }, anode: { x: 0, y: m(cy) }, screen: { x: m(X1 - 0.015), y: m(cy) } } };
};
