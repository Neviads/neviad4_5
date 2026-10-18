/* OBJECT-META
{
  "catalog": "Phân tử khí hai nguyên tử (O₂, N₂, H₂)",
  "title": "Phân tử khí hai nguyên tử O₂: hai nguyên tử oxi đỏ chồng sát nhau nối bằng liên kết đôi, kèm nhãn và quả cầu nền sáng",
  "fill": "#ef4444",
  "anchor": "Giữa hai nguyên tử.",
  "useWhen": ["Cần phân tử khí hai nguyên tử O₂, N₂ hoặc H₂ với liên kết đôi và nhãn, kiểu cấu tạo phân tử.","Cần đổi màu fill để phân biệt loại khí hai nguyên tử."],
  "avoidWhen": ["Chỉ cần chất điểm khí chuyển động có mũi tên vận tốc: dùng phan-tu-khi.","Cần phân tử ba nguyên tử CO₂: dùng phan-tu-co2; phân tử nước: dùng phan-tu-nuoc."],
  "size": { "width": 0.078, "height": 0.044 },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Giữa hai nguyên tử."
    },
    {
      "name": "atomLeft",
      "description": "Tâm nguyên tử trái."
    },
    {
      "name": "atomRight",
      "description": "Tâm nguyên tử phải."
    }
  ],
  "notes": "Phân tử O₂: độ dài liên kết 1,21·10⁻¹⁰ m, bán kính nguyên tử ≈ 0,6·10⁻¹⁰ m; vẽ phóng to khoảng 2·10⁸ lần (bán kính nguyên tử 0,022 m, hai tâm cách nhau 0,034 m) và liên kết đôi dạng hai vạch song song. Đổi fill thành màu xanh lam để vẽ N₂, trắng để vẽ H₂. fill là màu nguyên tử."
}
*/
const makeDiatomicMolecule = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0006));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const ball = (x: number, y: number, r: number, c1: string, c2: string, c3: string) => group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fillRadialGradientStartPoint: { x: -m(r) * 0.35, y: -m(r) * 0.35 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#ffffff", 0.3, c1, 1, c2], stroke: c3, strokeWidth: lw, shadowColor: c1, shadowBlur: m(r) * 0.5, shadowOpacity: 0.45, listening: false }));
  const tx = (x: number, y: number, s: number, text: string, color: string) => group.add(new Konva.Text({ x: m(x - s * 2.5), y: m(y - s * 0.6), width: m(s * 5), align: "center", text, fontSize: m(s), fontStyle: "bold", fill: color, listening: false }));
  ball(-0.017, 0, 0.022, fill, "#7f1d1d", "#450a0a");
  ball(0.017, 0, 0.022, fill, "#7f1d1d", "#450a0a");
  for (const dy of [-0.0045, 0.0045]) {
    group.add(new Konva.Line({ points: [m(-0.017), m(dy), m(0.017), m(dy)], stroke: "#0f172a", strokeWidth: m(0.0045), lineCap: "round", listening: false }));
    group.add(new Konva.Line({ points: [m(-0.017), m(dy), m(0.017), m(dy)], stroke: "#e2e8f0", strokeWidth: m(0.0022), lineCap: "round", listening: false }));
  }
  tx(-0.017, -0.036, 0.0085, "O", "#fecaca");
  tx(0.017, -0.036, 0.0085, "O", "#fecaca");
  tx(0, 0.0395, 0.0085, "O=O", "#e2e8f0");

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.05), width: m(0.14), align: "center", text: label, fontSize: m(0.0065), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, atomLeft: { x: m(-0.017), y: 0 }, atomRight: { x: m(0.017), y: 0 } } };
};
