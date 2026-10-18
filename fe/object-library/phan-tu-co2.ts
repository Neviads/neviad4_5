/* OBJECT-META
{
  "catalog": "Phân tử CO₂",
  "title": "Phân tử CO₂ thẳng hàng: nguyên tử cacbon xám ở giữa và hai nguyên tử oxi đỏ ở hai bên nối bằng liên kết đôi",
  "fill": "#94a3b8",
  "anchor": "Tâm nguyên tử cacbon.",
  "useWhen": ["Cần phân tử CO₂ thẳng O=C=O: cacbon xám ở giữa, hai oxi đỏ hai bên, nối bằng liên kết đôi.", "Cảnh hiệu ứng nhà kính, hấp thụ hồng ngoại; mô hình phóng to khoảng 4·10⁸ lần."],
  "avoidWhen": ["Cần phân tử hai nguyên tử hay phân tử cong như nước: dùng phan-tu-hai-nguyen-tu.", "Vật tĩnh, không có dao động hay chuyển động quay."],
  "size": { "width": 0.15, "height": 0.05 },
  "parts": [],
  "points": [
    {
      "name": "carbon",
      "description": "Tâm nguyên tử cacbon."
    },
    {
      "name": "oxygenLeft",
      "description": "Tâm nguyên tử oxi trái."
    },
    {
      "name": "oxygenRight",
      "description": "Tâm nguyên tử oxi phải."
    }
  ],
  "notes": "CO₂ là phân tử thẳng O=C=O, độ dài liên kết 1,16·10⁻¹⁰ m; vẽ phóng to khoảng 4·10⁸ lần (hai tâm cách nhau 0,05 m, bán kính C 0,022 m, O 0,025 m). Phân tử hấp thụ bức xạ hồng ngoại — nguyên nhân hiệu ứng nhà kính. fill là màu nguyên tử cacbon."
}
*/
const makeCo2Molecule = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0006));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const ball = (x: number, y: number, r: number, c1: string, c2: string, c3: string) => group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fillRadialGradientStartPoint: { x: -m(r) * 0.35, y: -m(r) * 0.35 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#ffffff", 0.3, c1, 1, c2], stroke: c3, strokeWidth: lw, shadowColor: c1, shadowBlur: m(r) * 0.5, shadowOpacity: 0.45, listening: false }));
  const tx = (x: number, y: number, s: number, text: string, color: string) => group.add(new Konva.Text({ x: m(x - s * 2.5), y: m(y - s * 0.6), width: m(s * 5), align: "center", text, fontSize: m(s), fontStyle: "bold", fill: color, listening: false }));
  for (const s of [-1, 1]) for (const dy of [-0.0045, 0.0045]) {
    group.add(new Konva.Line({ points: [0, m(dy), m(s * 0.05), m(dy)], stroke: "#0f172a", strokeWidth: m(0.0045), lineCap: "round", listening: false }));
    group.add(new Konva.Line({ points: [0, m(dy), m(s * 0.05), m(dy)], stroke: "#e2e8f0", strokeWidth: m(0.0022), lineCap: "round", listening: false }));
  }
  ball(0, 0, 0.022, fill, "#334155", "#0f172a");
  ball(-0.05, 0, 0.025, "#ef4444", "#7f1d1d", "#450a0a");
  ball(0.05, 0, 0.025, "#ef4444", "#7f1d1d", "#450a0a");
  tx(0, 0.004, 0.0095, "C", "#f1f5f9");
  tx(-0.05, 0.004, 0.0095, "O", "#fff1f2");
  tx(0.05, 0.004, 0.0095, "O", "#fff1f2");
  tx(0, 0.043, 0.0085, "O=C=O", "#e2e8f0");

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.058), width: m(0.14), align: "center", text: label, fontSize: m(0.0065), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { carbon: { x: 0, y: 0 }, oxygenLeft: { x: m(-0.05), y: 0 }, oxygenRight: { x: m(0.05), y: 0 } } };
};
