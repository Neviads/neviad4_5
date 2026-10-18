/* OBJECT-META
{
  "catalog": "Hạt beta (e⁻ / e⁺)",
  "title": "Hạt beta: electron xanh (β⁻) bay sang phải và pozitron cam (β⁺) bay sang trái, có vệt chuyển động và mũi tên",
  "fill": "#38bdf8",
  "anchor": "Giữa hai hạt, nằm giữa β⁻ và β⁺.",
  "useWhen": ["Cần cặp hạt beta: β⁻ (electron) sang phải và β⁺ (pozitron) sang trái, có vệt mờ chỉ chiều bay.", "Cảnh phóng xạ β, so sánh lệch của hạt âm và dương trong từ trường."],
  "avoidWhen": ["Cần một electron đơn trong tia catot: dùng electron.", "Cần hạt α hoặc tia γ: dùng hat-alpha hoặc photon; vật này luôn có hai hạt."],
  "size": { "width": 0.201, "height": 0.045 },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Giữa hai hạt."
    },
    {
      "name": "electron",
      "description": "Tâm hạt β⁻ (electron)."
    },
    {
      "name": "positron",
      "description": "Tâm hạt β⁺ (pozitron)."
    }
  ],
  "notes": "Hạt β⁻ là electron, β⁺ là pozitron (cùng khối lượng, điện tích +e); vẽ phóng to khoảng 10¹³ lần (bán kính 0,015 m). Vệt mờ sau mỗi hạt chỉ chiều bay (β⁻ sang phải, β⁺ sang trái). fill là màu của β⁻."
}
*/
const makeBetaParticles = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0006));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const ball = (x: number, y: number, r: number, c1: string, c2: string, c3: string) => group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fillRadialGradientStartPoint: { x: -m(r) * 0.35, y: -m(r) * 0.35 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#ffffff", 0.3, c1, 1, c2], stroke: c3, strokeWidth: lw, shadowColor: c1, shadowBlur: m(r) * 0.5, shadowOpacity: 0.45, listening: false }));
  const tx = (x: number, y: number, s: number, text: string, color: string) => group.add(new Konva.Text({ x: m(x - s * 2.5), y: m(y - s * 0.6), width: m(s * 5), align: "center", text, fontSize: m(s), fontStyle: "bold", fill: color, listening: false }));
  for (const [s, c1, c2, c3, sign, tc] of [[-1, fill, "#0c4a6e", "#082f49", "e⁻", "#bae6fd"], [1, "#fb923c", "#9a3412", "#431407", "e⁺", "#fed7aa"]] as [number, string, string, string, string, string][]) {
    const x = s * 0.04;
    for (let i = 1; i <= 5; i += 1) group.add(new Konva.Circle({ x: m(x + s * i * 0.011), y: 0, radius: m(0.0145 - i * 0.0018), fill: c1, opacity: 0.42 - i * 0.07, listening: false }));
    ball(x, 0, 0.0145, c1, c2, c3);
    group.add(new Konva.Line({ points: [m(x - 0.0055), 0, m(x + 0.0055), 0], stroke: "#f8fafc", strokeWidth: m(0.0032), lineCap: "round", listening: false }));
    if (s > 0) group.add(new Konva.Line({ points: [m(x), m(-0.0055), m(x), m(0.0055)], stroke: "#f8fafc", strokeWidth: m(0.0032), lineCap: "round", listening: false }));
    tx(x, 0.034, 0.012, sign, tc);
  }
  group.add(new Konva.Arrow({ points: [m(-0.052), m(-0.03), m(-0.022), m(-0.03)], stroke: "#7dd3fc", fill: "#7dd3fc", strokeWidth: lw * 1.6, pointerLength: m(0.005), pointerWidth: m(0.004), listening: false }));
  group.add(new Konva.Arrow({ points: [m(0.052), m(-0.03), m(0.022), m(-0.03)], stroke: "#fdba74", fill: "#fdba74", strokeWidth: lw * 1.6, pointerLength: m(0.005), pointerWidth: m(0.004), listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.05), width: m(0.14), align: "center", text: label, fontSize: m(0.0065), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, electron: { x: m(-0.04), y: 0 }, positron: { x: m(0.04), y: 0 } } };
};
