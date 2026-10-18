/* OBJECT-META
{
  "catalog": "Electron (chấm xanh, dấu −)",
  "title": "Electron vẽ phóng to: quả cầu xanh dương bóng có dấu − ở giữa, vầng sáng và nhãn e⁻",
  "fill": "#38bdf8",
  "anchor": "Tâm electron.",
  "useWhen": ["Cần hạt electron mang điện −e, quả cầu xanh có dấu −, chuyển động trong điện từ trường.", "Cảnh về tia catot, hạt tích điện âm hoặc dòng điện, vẽ phóng to 10¹³ lần."],
  "avoidWhen": ["Cần hạt mang điện dương: dùng proton, hoặc dùng hat-beta khi cần pozitron.", "Không dùng khi cần so tỉ lệ kích thước với nguyên tử: electron này vẽ quá to."],
  "size": { "width": 0.04, "height": 0.044 },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Tâm electron."
    }
  ],
  "notes": "Electron có khối lượng 9,1·10⁻³¹ kg, điện tích −e; vẽ phóng to khoảng 10¹³ lần (bán kính 0,02 m) chỉ để nhìn thấy, không đúng tỉ lệ. Dấu − chỉ điện tích âm. fill là màu quả cầu."
}
*/
const makeElectron = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0006));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const ball = (x: number, y: number, r: number, c1: string, c2: string, c3: string) => group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fillRadialGradientStartPoint: { x: -m(r) * 0.35, y: -m(r) * 0.35 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#ffffff", 0.3, c1, 1, c2], stroke: c3, strokeWidth: lw, shadowColor: c1, shadowBlur: m(r) * 0.5, shadowOpacity: 0.45, listening: false }));
  const tx = (x: number, y: number, s: number, text: string, color: string) => group.add(new Konva.Text({ x: m(x - s * 2.5), y: m(y - s * 0.6), width: m(s * 5), align: "center", text, fontSize: m(s), fontStyle: "bold", fill: color, listening: false }));
  ball(0, 0, 0.02, fill, "#0c4a6e", "#082f49");
  group.add(new Konva.Line({ points: [m(-0.008), 0, m(0.008), 0], stroke: "#f0f9ff", strokeWidth: m(0.0045), lineCap: "round", listening: false }));
  group.add(new Konva.Arc({ innerRadius: m(0.0144), outerRadius: m(0.016399999999999998), angle: 60, rotation: 205, fill: "rgba(255,255,255,0.7)", listening: false }));
  tx(0, -0.0315, 0.0075, "e⁻", "#bae6fd");

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.036), width: m(0.14), align: "center", text: label, fontSize: m(0.0065), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 } } };
};
