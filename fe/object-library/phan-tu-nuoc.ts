/* OBJECT-META
{
  "catalog": "Phân tử nước H₂O",
  "title": "Phân tử nước H₂O: nguyên tử oxi đỏ lớn ở giữa, hai nguyên tử hiđro trắng nhỏ hợp góc 104,5° nối bằng liên kết, ký hiệu δ− và δ+",
  "fill": "#ef4444",
  "anchor": "Tâm nguyên tử oxi.",
  "useWhen": ["Cần phân tử H₂O có góc liên kết 104,5° và cực δ−, δ+ để giải thích tính phân cực.","Cần oxi đỏ lớn ở giữa, hai hiđro trắng nhỏ."],
  "avoidWhen": ["Cần phân tử thẳng hàng như CO₂: dùng phan-tu-co2.","Cần phân tử khí hai nguyên tử O₂, N₂, H₂: dùng phan-tu-hai-nguyen-tu; nước dạng khối: dùng nuoc-da hoặc coc-thuy-tinh."],
  "size": { "width": 0.127, "height": 0.081 },
  "parts": [],
  "points": [
    {
      "name": "oxygen",
      "description": "Tâm nguyên tử oxi."
    },
    {
      "name": "hydrogen1",
      "description": "Tâm nguyên tử hiđro thứ nhất."
    },
    {
      "name": "hydrogen2",
      "description": "Tâm nguyên tử hiđro thứ hai."
    }
  ],
  "notes": "Phân tử nước có góc liên kết H–O–H = 104,5°, độ dài liên kết 0,96·10⁻¹⁰ m; vẽ phóng to khoảng 6·10⁸ lần (độ dài liên kết 0,96·10⁻¹⁰ m ứng 0,06 m trên hình để nhìn rõ; bán kính O 0,028 m, H 0,016 m). Cực O mang điện tích âm một phần (δ−), hai cực H mang δ+. fill là màu nguyên tử oxi."
}
*/
const makeWaterMolecule = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0006));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const ball = (x: number, y: number, r: number, c1: string, c2: string, c3: string) => group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fillRadialGradientStartPoint: { x: -m(r) * 0.35, y: -m(r) * 0.35 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#ffffff", 0.3, c1, 1, c2], stroke: c3, strokeWidth: lw, shadowColor: c1, shadowBlur: m(r) * 0.5, shadowOpacity: 0.45, listening: false }));
  const tx = (x: number, y: number, s: number, text: string, color: string) => group.add(new Konva.Text({ x: m(x - s * 2.5), y: m(y - s * 0.6), width: m(s * 5), align: "center", text, fontSize: m(s), fontStyle: "bold", fill: color, listening: false }));
  const a = (104.5 / 2 * Math.PI) / 180;
  const L = 0.06;
  const hs: [number, number][] = [[-L * Math.sin(a), -L * Math.cos(a)], [L * Math.sin(a), -L * Math.cos(a)]];
  for (const [hx, hy] of hs) {
    group.add(new Konva.Line({ points: [0, 0, m(hx), m(hy)], stroke: "#0f172a", strokeWidth: m(0.011), lineCap: "round", listening: false }));
    group.add(new Konva.Line({ points: [0, 0, m(hx), m(hy)], stroke: "#cbd5e1", strokeWidth: m(0.0075), lineCap: "round", listening: false }));
    group.add(new Konva.Line({ points: [0, 0, m(hx), m(hy)], stroke: "rgba(255,255,255,0.7)", strokeWidth: m(0.002), lineCap: "round", listening: false }));
  }
  ball(0, 0, 0.028, fill, "#7f1d1d", "#450a0a");
  for (const [hx, hy] of hs) ball(hx, hy, 0.016, "#f8fafc", "#94a3b8", "#475569");
  tx(0, 0.0095, 0.012, "O", "#fff1f2");
  tx(hs[0][0], hs[0][1] + 0.003, 0.0085, "H", "#1e293b");
  tx(hs[1][0], hs[1][1] + 0.003, 0.0085, "H", "#1e293b");
  tx(0, 0.045, 0.0085, "δ−", "#fca5a5");
  tx(hs[0][0] - 0.012, hs[0][1] - 0.026, 0.0085, "δ+", "#bae6fd");
  tx(hs[1][0] + 0.012, hs[1][1] - 0.026, 0.0085, "δ+", "#bae6fd");

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.075), width: m(0.14), align: "center", text: label, fontSize: m(0.0065), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { oxygen: { x: 0, y: 0 }, hydrogen1: { x: m(-0.0473), y: m(-0.0369) }, hydrogen2: { x: m(0.0473), y: m(-0.0369) } } };
};
