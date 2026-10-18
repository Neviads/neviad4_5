/* OBJECT-META
{
  "catalog": "Viên bi / quả cầu thép",
  "title": "Viên bi thép mạ crôm bóng như gương, phản chiếu nền trời và mặt đất",
  "fill": "#cbd5e1",
  "anchor": "Tâm viên bi.",
  "useWhen": ["Cần viên bi thép mạ crôm đường kính 0,03 m, nặng 110 g, làm vật lăn, rơi hay va chạm.","Cần quả cầu kim loại bóng như gương có dải sáng phản chiếu."],
  "avoidWhen": ["Cần quả cầu tích điện hay treo bằng dây: dùng qua-cau-tich-dien hoặc qua-cau-bac.","Cần quả bóng đàn hồi hay quả nặng có móc: dùng qua-bong hoặc qua-nang-moc.","Là hình cầu kim loại, không có lỗ hay móc treo."],
  "size": {
    "width": 0.03,
    "height": 0.037
  },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Tâm viên bi."
    },
    {
      "name": "bottom",
      "description": "Điểm thấp nhất, nơi chạm máng hay mặt sàn."
    },
    {
      "name": "top",
      "description": "Điểm cao nhất."
    }
  ],
  "notes": "Đường kính 0,03 m, khối lượng 110 g. Bề mặt phản chiếu giả: dải sáng ở nửa trên, đường chân trời và nửa dưới tối, một điểm sáng chói. fill là tông bạc của kim loại."
}
*/
const makeSteelBall = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.015;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0008));
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Bóng đổ ngay dưới viên bi.
  group.add(new Konva.Ellipse({ x: m(0.002), y: m(R + 0.001), radiusX: m(R * 0.85), radiusY: m(0.0026), fill: "rgba(0,0,0,0.45)", listening: false }));
  // Thân cầu: chuyển màu từ trời (xanh nhạt) xuống đất (tối) theo trục đứng.
  group.add(new Konva.Circle({
    radius: m(R), fillLinearGradientStartPoint: { x: 0, y: m(-R) }, fillLinearGradientEndPoint: { x: 0, y: m(R) },
    fillLinearGradientColorStops: [0, "#e0f2fe", 0.34, "#94a3b8", 0.48, "#f8fafc", 0.52, "#475569", 0.75, "#1e293b", 1, "#64748b"],
    stroke: "#334155", strokeWidth: lw * 1.4, listening: false,
  }));
  // Ánh sáng khuếch tán từ phía trên trái.
  group.add(new Konva.Circle({ radius: m(R - 0.0005), fillRadialGradientStartPoint: { x: m(-0.0055), y: m(-0.0065) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: m(-0.0055), y: m(-0.0065) }, fillRadialGradientEndRadius: m(0.0125), fillRadialGradientColorStops: [0, "rgba(255,255,255,0.8)", 0.5, "rgba(255,255,255,0.1)", 1, "rgba(255,255,255,0)"], listening: false }));
  // Đường chân trời phản chiếu và điểm sáng chói.
  group.add(new Konva.Line({ points: [m(-R + 0.0012), m(0.0006), m(-0.005), m(-0.0008), m(0.005), m(-0.0008), m(R - 0.0012), m(0.0006)], stroke: "rgba(15,23,42,0.45)", strokeWidth: lw * 1.6, tension: 0.4, lineCap: "round", listening: false }));
  group.add(new Konva.Ellipse({ x: m(-0.0062), y: m(-0.0068), radiusX: m(0.0024), radiusY: m(0.0016), rotation: -35, fill: "#ffffff", listening: false }));
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(R - 0.0018), outerRadius: m(R - 0.0008), angle: 55, rotation: 20, fill: "rgba(186,230,253,0.55)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(R + 0.003), y: m(-0.004), text: label, fontSize: m(0.0075), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, bottom: { x: 0, y: m(R) }, top: { x: 0, y: m(-R) } } };
};
