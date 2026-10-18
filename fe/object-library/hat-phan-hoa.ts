/* OBJECT-META
{
  "catalog": "Hạt phấn hoa / hạt khói",
  "title": "Hạt phấn hoa dưới kính hiển vi: hạt cầu vàng có gai và vân lưới, kèm quỹ đạo gấp khúc đứt nét của chuyển động Brown",
  "fill": "#facc15",
  "anchor": "Tâm hạt phấn hoa.",
  "useWhen": ["Cần hạt phấn hoa hoặc hạt khói có đường gấp khúc đứt nét mô tả chuyển động Brown.", "Bài chuyển động nhiệt hỗn loạn của phân tử chất lỏng, tâm hạt kèm điểm đầu quỹ đạo."],
  "avoidWhen": ["Cần phân tử riêng lẻ của khí hoặc nước: dùng phan-tu-khi hoặc phan-tu-nuoc.", "Cần dụng cụ quan sát hạt: dùng kinh-hien-vi-brown; vật này chỉ là hạt và quỹ đạo."],
  "size": { "width": 0.124, "height": 0.074 },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Tâm hạt phấn hoa."
    },
    {
      "name": "trailStart",
      "description": "Điểm đầu của quỹ đạo gấp khúc."
    }
  ],
  "notes": "Hạt phấn hoa kích thước ≈ 20 µm (hạt khói ≈ 1 µm); vẽ phóng to khoảng 2500 lần (bán kính 0,025 m) để nhìn thấy gai; đường gấp khúc đứt nét là quỹ đạo chuyển động Brown do va chạm ngẫu nhiên với phân tử chất lỏng. fill là màu hạt phấn."
}
*/
const makePollenGrain = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0006));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const ball = (x: number, y: number, r: number, c1: string, c2: string, c3: string) => group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fillRadialGradientStartPoint: { x: -m(r) * 0.35, y: -m(r) * 0.35 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#ffffff", 0.3, c1, 1, c2], stroke: c3, strokeWidth: lw, shadowColor: c1, shadowBlur: m(r) * 0.5, shadowOpacity: 0.45, listening: false }));
  const tx = (x: number, y: number, s: number, text: string, color: string) => group.add(new Konva.Text({ x: m(x - s * 2.5), y: m(y - s * 0.6), width: m(s * 5), align: "center", text, fontSize: m(s), fontStyle: "bold", fill: color, listening: false }));
  const path = [-0.085, 0.03, -0.065, 0.012, -0.075, -0.012, -0.052, -0.02, -0.05, 0.002, -0.032, 0.0];
  group.add(new Konva.Line({ points: path.map(m), stroke: "rgba(148,163,184,0.85)", strokeWidth: lw * 1.3, dash: [m(0.004), m(0.003)], lineJoin: "round", listening: false }));
  group.add(new Konva.Circle({ x: m(-0.085), y: m(0.03), radius: m(0.0024), fill: "#94a3b8", listening: false }));
  for (let i = 0; i < 20; i += 1) {
    const a = (i * Math.PI) / 10;
    group.add(new Konva.Line({ points: [m(0.0235 * Math.cos(a)), m(0.0235 * Math.sin(a)), m(0.0335 * Math.cos(a)), m(0.0335 * Math.sin(a))], stroke: "#ca8a04", strokeWidth: m(0.0035), lineCap: "round", listening: false }));
    group.add(new Konva.Circle({ x: m(0.0345 * Math.cos(a)), y: m(0.0345 * Math.sin(a)), radius: m(0.0024), fill: "#fde047", stroke: "#a16207", strokeWidth: lw * 0.6, listening: false }));
  }
  ball(0, 0, 0.0255, fill, "#a16207", "#713f12");
  for (const [x, y, r] of [[-0.01, -0.008, 0.0045], [0.008, -0.012, 0.004], [0.012, 0.006, 0.0046], [-0.006, 0.01, 0.0042], [0.0, 0.0, 0.0035]] as [number, number, number][]) group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), stroke: "rgba(113,63,18,0.45)", strokeWidth: lw, listening: false }));
  tx(0.0, 0.0445, 0.0075, "phấn hoa", "#fde68a");

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.052), width: m(0.14), align: "center", text: label, fontSize: m(0.0065), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, trailStart: { x: m(-0.085), y: m(0.03) } } };
};
