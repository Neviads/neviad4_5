/* OBJECT-META
{
  "catalog": "Neutron (xám)",
  "title": "Neutron vẽ phóng to: quả cầu xám bạc bóng với vòng đứt nét trung hoà và nhãn n",
  "fill": "#94a3b8",
  "anchor": "Tâm neutron.",
  "useWhen": ["Cần neutron phóng to: quả cầu xám bạc có nhãn n và vòng đứt nét biểu thị trung hoà.","Cần hạt không mang điện trong mô hình nguyên tử hoặc phản ứng hạt nhân."],
  "avoidWhen": ["Cần proton mang điện dương: dùng proton.","Cần electron hoặc hạt alpha: dùng electron hoặc hat-alpha.","Cần hạt nhân gồm nhiều nucleon: dùng hat-nhan-nhe hoặc hat-nhan-nang."],
  "size": { "width": 0.04, "height": 0.044 },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Tâm neutron."
    }
  ],
  "notes": "Neutron không mang điện, khối lượng 1,675·10⁻²⁷ kg; vẽ phóng to khoảng 10¹³ lần (bán kính 0,02 m). Vòng đứt nét ở giữa chỉ hạt trung hoà. fill là màu quả cầu."
}
*/
const makeNeutron = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0006));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const ball = (x: number, y: number, r: number, c1: string, c2: string, c3: string) => group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fillRadialGradientStartPoint: { x: -m(r) * 0.35, y: -m(r) * 0.35 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#ffffff", 0.3, c1, 1, c2], stroke: c3, strokeWidth: lw, shadowColor: c1, shadowBlur: m(r) * 0.5, shadowOpacity: 0.45, listening: false }));
  const tx = (x: number, y: number, s: number, text: string, color: string) => group.add(new Konva.Text({ x: m(x - s * 2.5), y: m(y - s * 0.6), width: m(s * 5), align: "center", text, fontSize: m(s), fontStyle: "bold", fill: color, listening: false }));
  ball(0, 0, 0.02, fill, "#334155", "#0f172a");
  group.add(new Konva.Circle({ radius: m(0.0095), stroke: "rgba(241,245,249,0.85)", strokeWidth: m(0.0018), dash: [m(0.003), m(0.002)], listening: false }));
  group.add(new Konva.Arc({ innerRadius: m(0.0144), outerRadius: m(0.016399999999999998), angle: 60, rotation: 205, fill: "rgba(255,255,255,0.7)", listening: false }));
  tx(0, -0.0315, 0.0075, "n", "#e2e8f0");

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.036), width: m(0.14), align: "center", text: label, fontSize: m(0.0065), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 } } };
};
