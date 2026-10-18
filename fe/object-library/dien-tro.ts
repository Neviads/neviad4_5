/* OBJECT-META
{
  "catalog": "Điện trở (thực tế có vạch màu, ký hiệu)",
  "title": "Điện trở than 220 Ω có bốn vạch màu (đỏ, đỏ, nâu, nhũ vàng) và hai chân, bên dưới là ký hiệu hình chữ nhật R trong sơ đồ mạch",
  "fill": "#e8c98a",
  "anchor": "Tâm thân điện trở.",
  "useWhen": ["Cần điện trở cố định, có vạch màu đỏ–đỏ–nâu–nhũ vàng (220 Ω ±5 %) và ký hiệu kèm theo.", "Cảnh vẽ mạch cần cả điện trở thực lẫn ký hiệu hình chữ nhật 0,036 × 0,013 m bên dưới."],
  "avoidWhen": ["Cần điện trở thay đổi được có con chạy: dùng bien-tro.", "Vạch màu luôn là 220 Ω; muốn giá trị khác thì dùng nhãn riêng, không dựa vào vạch màu."],
  "size": { "width": 0.09, "height": 0.032 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm thân điện trở." },
    { "name": "left", "description": "Đầu chân trái." },
    { "name": "right", "description": "Đầu chân phải." },
    { "name": "symbol", "description": "Tâm ký hiệu điện trở vẽ phía dưới." }
  ],
  "notes": "Thân dài 0,03 m, đường kính 0,0105 m (đã phóng to khoảng 2 lần so với điện trở 1/4 W), mỗi chân dài 0,03 m. Vạch màu: đỏ – đỏ – nâu – nhũ vàng tương ứng 22 × 10¹ Ω ± 5 % = 220 Ω. Ký hiệu hình chữ nhật 0,036 m × 0,013 m nằm dưới thân. fill là màu thân gốm."
}
*/
const makeResistor = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const BL = 0.015;
  const BH = 0.0053;
  const LEG = 0.03;

  // Hai chân thiếc: dây tròn có vệt sáng, đầu chân có mép vát.
  for (const s of [-1, 1]) {
    group.add(ln([s * BL, 0, s * (BL + LEG), 0], "#0f172a", m(0.0022)));
    group.add(ln([s * BL, 0, s * (BL + LEG), 0], "#cbd5e1", m(0.0015)));
    group.add(ln([s * BL, -0.0004, s * (BL + LEG), -0.0004], "rgba(255,255,255,0.9)", lw * 0.7));
  }
  // Thân hình xương chó: hai đầu phình, giữa thon; bóng đổ nhẹ và gradient trụ.
  group.add(new Konva.Line({ points: [m(-BL), m(-BH * 0.75), m(-BL + 0.003), m(-BH), m(-0.009), m(-BH * 0.8), m(0.009), m(-BH * 0.8), m(BL - 0.003), m(-BH), m(BL), m(-BH * 0.75), m(BL), m(BH * 0.75), m(BL - 0.003), m(BH), m(0.009), m(BH * 0.8), m(-0.009), m(BH * 0.8), m(-BL + 0.003), m(BH), m(-BL), m(BH * 0.75)], closed: true, tension: 0.2, ...lin(0, m(-BH), 0, m(BH), [0, "#fffbeb", 0.3, fill, 0.75, "#a16207", 1, "#451a03"]), stroke: "#451a03", strokeWidth: lw * 0.9, lineJoin: "round", shadowColor: "#000", shadowBlur: m(0.005), shadowOpacity: 0.4, shadowOffset: { x: m(0.0008), y: m(0.0018) }, listening: false }));
  // Bốn vạch màu: đỏ, đỏ, nâu, nhũ vàng (hơi cách xa ba vạch đầu).
  for (const [x, c] of [[-0.0105, "#dc2626"], [-0.006, "#dc2626"], [-0.0015, "#7c2d12"], [0.0075, "#d4a017"]] as [number, string][]) {
    group.add(new Konva.Rect({ x: m(x), y: m(-BH * 0.8), width: m(0.0026), height: m(BH * 1.6), fill: c, listening: false }));
    group.add(new Konva.Rect({ x: m(x), y: m(-BH * 0.8), width: m(0.0008), height: m(BH * 1.6), fill: "rgba(255,255,255,0.35)", listening: false }));
  }
  group.add(ln([-0.012, -BH * 0.55, 0.012, -BH * 0.55], "rgba(255,255,255,0.55)", lw * 1.1));

  // Ký hiệu trong sơ đồ: chữ nhật R nối hai dây dẫn nét mảnh.
  const sy = 0.02;
  group.add(ln([-0.03, sy, -0.018, sy], "#e2e8f0", lw * 1.3));
  group.add(ln([0.018, sy, 0.03, sy], "#e2e8f0", lw * 1.3));
  group.add(new Konva.Rect({ x: m(-0.018), y: m(sy - 0.0065), width: m(0.036), height: m(0.013), fill: "rgba(15,23,42,0.6)", stroke: "#e2e8f0", strokeWidth: lw * 1.3, listening: false }));
  group.add(new Konva.Text({ x: m(-0.018), y: m(sy - 0.0048), width: m(0.036), align: "center", text: "R = 220 Ω", fontSize: m(0.0066), fontStyle: "bold", fill: "#fef3c7", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.031), width: m(0.12), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, left: { x: m(-BL - LEG), y: 0 }, right: { x: m(BL + LEG), y: 0 }, symbol: { x: 0, y: m(sy) } } };
};
