/* OBJECT-META
{
  "catalog": "Phân tử khí đơn giản (quả cầu nhỏ)",
  "title": "Phân tử khí đơn giản vẽ như quả cầu nhỏ xanh lục bóng, có vệt mờ phía sau và mũi tên vận tốc",
  "fill": "#34d399",
  "anchor": "Tâm phân tử.",
  "useWhen": ["Cần phân tử khí lí tưởng dạng quả cầu nhỏ chuyển động hỗn loạn, có mũi tên vận tốc và vệt mờ.","Cần lặp nhiều phân tử để minh hoạ khí trong bình."],
  "avoidWhen": ["Cần thấy cấu tạo hai nguyên tử, liên kết hoá học: dùng phan-tu-hai-nguyen-tu.","Mũi tên vận tốc cố định sang phải; cần hướng khác phải xoay vật."],
  "size": { "width": 0.084, "height": 0.024 },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Tâm phân tử."
    },
    {
      "name": "velocityTip",
      "description": "Đầu mũi tên vận tốc."
    }
  ],
  "notes": "Mô hình chất khí lí tưởng: phân tử là quả cầu nhỏ chuyển động hỗn loạn; vẽ phóng to (bán kính 0,012 m) để thấy rõ. Mũi tên chỉ vận tốc v (sang phải), vệt mờ phía sau chỉ quãng đường vừa đi. Khi dùng hàng loạt thì lặp vật này (hoặc dùng kind riêng trong metrics.items). fill là màu quả cầu."
}
*/
const makeGasMolecule = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0006));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const ball = (x: number, y: number, r: number, c1: string, c2: string, c3: string) => group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fillRadialGradientStartPoint: { x: -m(r) * 0.35, y: -m(r) * 0.35 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#ffffff", 0.3, c1, 1, c2], stroke: c3, strokeWidth: lw, shadowColor: c1, shadowBlur: m(r) * 0.5, shadowOpacity: 0.45, listening: false }));
  const tx = (x: number, y: number, s: number, text: string, color: string) => group.add(new Konva.Text({ x: m(x - s * 2.5), y: m(y - s * 0.6), width: m(s * 5), align: "center", text, fontSize: m(s), fontStyle: "bold", fill: color, listening: false }));
  for (let i = 1; i <= 4; i += 1) group.add(new Konva.Circle({ x: m(-i * 0.0095), radius: m(0.012 - i * 0.0014), fill, opacity: 0.34 - i * 0.07, listening: false }));
  ball(0, 0, 0.012, fill, "#065f46", "#022c22");
  group.add(new Konva.Arrow({ points: [m(0.014), 0, m(0.04), 0], stroke: "#fde68a", fill: "#fde68a", strokeWidth: lw * 1.8, pointerLength: m(0.007), pointerWidth: m(0.006), listening: false }));
  tx(0.036, -0.0125, 0.0085, "v", "#fef3c7");

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.028), width: m(0.14), align: "center", text: label, fontSize: m(0.0065), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, velocityTip: { x: m(0.04), y: 0 } } };
};
