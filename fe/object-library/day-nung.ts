/* OBJECT-META
{
  "catalog": "Dây điện trở / dây nung",
  "title": "Dây nung niken-crôm quấn xoắn trên giá sứ: hai trụ đồng có ốc nối dây, sợi dây xoắn lò xo ở giữa và bóng nóng đỏ mờ ở hai đầu",
  "fill": "#ea580c",
  "anchor": "Giữa dây nung, ở trên mặt đế.",
  "useWhen": ["Cần dây niken-crôm quấn xoắn giữa hai trụ đồng để minh hoạ toả nhiệt Jun–Len-xơ.","Cần dây nung khoảng 10 Ω có thể đốt giấy hay đun nước nhỏ."],
  "avoidWhen": ["Cần điện trở thường có vạch màu trong mạch: dùng dien-tro.","Cần bếp điện lớn đun nồi: dùng bep-dien; dây nung này không có nồi hay bình đi kèm."],
  "size": { "width": 0.14, "height": 0.047 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Giữa dây nung." },
    { "name": "endLeft", "description": "Đầu trái dây nung (nối với trụ trái)." },
    { "name": "endRight", "description": "Đầu phải dây nung (nối với trụ phải)." },
    { "name": "base", "description": "Giữa đáy đế." }
  ],
  "notes": "Dây niken-crôm đường kính 0,4 mm quấn thành lò xo dài 0,09 m, đường kính 0,012 m, điện trở khoảng 10 Ω; hai đầu hàn vào hai trụ đồng cách nhau 0,1 m trên đế sứ trắng. Dòng điện qua dây toả nhiệt theo định luật Jun–Len-xơ (đốt giấy, đun nước nhỏ). Sắc cam là màu dây khi nóng; khi nguội dây xám bạc. fill là màu dây khi nóng."
}
*/
const makeHeatingWire = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cy = -0.03;
  const HX = 0.05;
  const COIL = 0.045;

  // Đế sứ trắng có gờ, hai ốc bắt vít.
  group.add(new Konva.Rect({ x: m(-0.068), y: m(-0.012), width: m(0.136), height: m(0.012), cornerRadius: m(0.003), ...lin(0, m(-0.012), 0, 0, [0, "#ffffff", 0.4, "#e2e8f0", 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(ln([-0.063, -0.0093, 0.063, -0.0093], "rgba(255,255,255,0.9)", lw * 1.2));
  for (const x of [-0.06, 0.06]) group.add(new Konva.Circle({ x: m(x), y: m(-0.006), radius: m(0.0018), fill: "#475569", stroke: "#1e293b", strokeWidth: lw * 0.6, listening: false }));

  // Hai trụ đồng thanh bắt vào đế, có vòng cách điện và ốc nối dây phía trên.
  for (const s of [-1, 1]) {
    const x = s * HX;
    group.add(new Konva.Rect({ x: m(x - 0.0055), y: m(cy - 0.004), width: m(0.011), height: m(-0.012 - cy + 0.004), cornerRadius: m(0.0015), ...lin(m(x - 0.0055), 0, m(x + 0.0055), 0, [0, "#fff7ed", 0.4, "#d6a15a", 1, "#7c2d12"]), stroke: "#431407", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.0075), y: m(-0.0145), width: m(0.015), height: m(0.0035), cornerRadius: m(0.001), fill: "#e5e7eb", stroke: "#64748b", strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.0065), y: m(cy - 0.0095), width: m(0.013), height: m(0.007), cornerRadius: m(0.0015), ...lin(m(x - 0.0065), 0, m(x + 0.0065), 0, [0, "#fef3c7", 0.5, "#b45309", 1, "#451a03"]), stroke: "#431407", strokeWidth: lw * 0.7, listening: false }));
    group.add(ln([x, cy - 0.0085, x, cy - 0.0035], "#1f2937", lw * 1.1));
    group.add(new Konva.Circle({ x: m(x), y: m(cy), radius: m(0.0014), fill: "#1e293b", listening: false }));
  }

  // Dây dẫn hai đầu nối trụ vào dây xoắn và một đầu bị nóng đỏ (vầng sáng mờ).
  group.add(new Konva.Ellipse({ x: 0, y: m(cy), radiusX: m(COIL + 0.012), radiusY: m(0.016), fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(COIL + 0.012), fillRadialGradientColorStops: [0, "rgba(251,146,60,0.34)", 1, "rgba(251,146,60,0)"], listening: false }));
  group.add(ln([-HX, cy, -COIL, cy], "#475569", lw * 1.6));
  group.add(ln([COIL, cy, HX, cy], "#475569", lw * 1.6));
  // Dây xoắn: nhiều vòng, mỗi vòng là hai đoạn cong (phần sau tối, phần trước sáng và màu nóng).
  const turns = 22;
  const pitch = (COIL * 2) / turns;
  const r = 0.0065;
  for (let i = 0; i < turns; i += 1) {
    const x = -COIL + i * pitch;
    group.add(new Konva.Line({ points: [m(x), m(cy - r * 0.2), m(x + pitch * 0.5), m(cy - r), m(x + pitch), m(cy - r * 0.2)], stroke: "#334155", strokeWidth: m(0.0016), tension: 0.5, lineCap: "round", listening: false }));
    group.add(new Konva.Line({ points: [m(x + pitch * 0.5), m(cy + r * 0.2), m(x + pitch * 1.1), m(cy + r), m(x + pitch * 1.5), m(cy + r * 0.2)], stroke: "#0f172a", strokeWidth: m(0.0023), tension: 0.5, lineCap: "round", listening: false }));
    group.add(new Konva.Line({ points: [m(x + pitch * 0.5), m(cy + r * 0.2), m(x + pitch * 1.1), m(cy + r), m(x + pitch * 1.5), m(cy + r * 0.2)], stroke: i % 2 === 0 ? "#fb923c" : fill, strokeWidth: m(0.0015), tension: 0.5, lineCap: "round", opacity: 0.9, listening: false }));
    group.add(new Konva.Line({ points: [m(x + pitch * 0.6), m(cy + r * 0.4), m(x + pitch * 1.1), m(cy + r * 0.85)], stroke: "rgba(255,255,255,0.55)", strokeWidth: lw * 0.6, lineCap: "round", listening: false }));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.006), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: m(cy) }, endLeft: { x: m(-HX), y: m(cy) }, endRight: { x: m(HX), y: m(cy) }, base: { x: 0, y: 0 } } };
};
