/* OBJECT-META
{
  "catalog": "Vật sáng (mũi tên, chữ F)",
  "title": "Vật sáng để tạo ảnh qua thấu kính: mũi tên phát sáng vàng trên màn mờ tròn có khung, gá lên trụ trên chân đế",
  "fill": "#fbbf24",
  "anchor": "Chân vật (đáy mũi tên, trên trục chính của hệ quang học).",
  "useWhen": ["Cần vật sáng hình mũi tên cao 0,07 m trên màn mờ tròn, đặt trên trục chính để tạo ảnh qua thấu kính.","Cần chữ F nhỏ ở góc để nhìn ảnh có ngược hay không."],
  "avoidWhen": ["Cần nguồn sáng thật như đèn hay laser: dùng den-chieu hoặc laser.","Cần thấu kính hay màn hứng ảnh: dùng thau-kinh-hoi-tu hoặc man-chan.","Vật đã gồm màn mờ sáng, không cần thêm đèn chiếu."],
  "size": { "width": 0.104, "height": 0.171 },
  "parts": [],
  "points": [
    { "name": "foot", "description": "Chân mũi tên, nằm trên trục chính." },
    { "name": "tip", "description": "Đỉnh mũi tên, cao 0,07 m so với chân (chiều cao vật h)." },
    { "name": "stem", "description": "Chân đế của giá, ở mặt bàn." }
  ],
  "notes": "Mũi tên cao 0,07 m, mặt màn mờ đường kính 0,09 m được chiếu từ phía sau nên sáng đều; vẽ theo dạng tiện cho đo chiều cao ảnh. Chữ F nhỏ ở góc để thấy ảnh ngược hay không. Trục chính đi qua chân mũi tên. fill là màu của mũi tên sáng."
}
*/
const makeLuminousObject = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const footY = -0.1;

  // Đế tròn, trụ đứng và khớp kẹp vòng khung.
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.006), radiusX: m(0.042), radiusY: m(0.0065), ...lin(m(-0.042), 0, m(0.042), 0, [0, "#475569", 0.3, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0035), y: m(-0.056), width: m(0.007), height: m(0.05), ...lin(m(-0.0035), 0, m(0.0035), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.01), y: m(-0.0605), width: m(0.02), height: m(0.011), cornerRadius: m(0.003), ...lin(m(-0.01), 0, m(0.01), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 0.8, listening: false }));

  // Khung vòng nhôm ôm tấm màn mờ.
  const cy = -0.115;
  group.add(new Konva.Circle({ x: 0, y: m(cy), radius: m(0.052), ...lin(m(-0.052), m(cy - 0.052), m(0.052), m(cy + 0.052), [0, "#f8fafc", 0.3, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(cy), radius: m(0.0465), fillRadialGradientStartPoint: { x: 0, y: m(cy) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: m(cy) }, fillRadialGradientEndRadius: m(0.0465), fillRadialGradientColorStops: [0, "#fffbe6", 0.7, "#fff1b3", 1, "#fcd34d"], stroke: "#a16207", strokeWidth: lw, shadowColor: "#fde047", shadowBlur: m(0.022), shadowOpacity: 0.8, listening: false }));
  // Mũi tên sáng: chân ở footY, đỉnh cao hơn 0,07 m; đậm hơn nền để dễ thấy ảnh.
  const tipY = footY - 0.07;
  group.add(new Konva.Line({ points: [m(-0.0035), m(footY), m(-0.0035), m(tipY + 0.02), m(-0.0125), m(tipY + 0.02), m(0), m(tipY), m(0.0125), m(tipY + 0.02), m(0.0035), m(tipY + 0.02), m(0.0035), m(footY)], closed: true, ...lin(0, m(tipY), 0, m(footY), [0, "#b45309", 0.5, fill, 1, "#92400e"]), stroke: "#78350f", strokeWidth: lw * 1.2, lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0016), m(tipY + 0.024), m(-0.0016), m(footY - 0.004)], stroke: "rgba(255,255,255,0.7)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  // Trục chính đi qua chân vật và chữ F nhỏ ở góc.
  group.add(new Konva.Line({ points: [m(-0.045), m(footY), m(0.045), m(footY)], stroke: "rgba(120,53,15,0.5)", strokeWidth: lw, dash: [m(0.004), m(0.003)], listening: false }));
  group.add(new Konva.Text({ x: m(-0.04), y: m(cy - 0.04), text: "F", fontSize: m(0.017), fontStyle: "bold", fill: "#78350f", listening: false }));
  group.add(new Konva.Ellipse({ x: m(-0.017), y: m(cy - 0.026), radiusX: m(0.011), radiusY: m(0.006), rotation: -30, fill: "rgba(255,255,255,0.45)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(0.03), y: m(cy - 0.01), text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { foot: { x: 0, y: m(footY) }, tip: { x: 0, y: m(tipY) }, stem: { x: 0, y: 0 } } };
};
