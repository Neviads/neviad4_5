/* OBJECT-META
{
  "catalog": "Tấm chắn sáng (gắn trên xe hay vật)",
  "title": "Tấm chắn sáng bằng nhựa đen rộng 2 cm gắn lên giá kẹp trên xe",
  "fill": "#111827",
  "anchor": "Giữa đáy giá kẹp, chạm lên mặt xe.",
  "useWhen": ["Cần tấm chắn sáng nhựa đen rộng d = 2 cm gắn giá kẹp trên xe, đo vận tốc tức thời v = d/Δt với cổng quang.","Cần điểm gắn foot sát mặt xe."],
  "avoidWhen": ["Cần chính cổng quang điện bấm giờ: dùng cong-quang-dien.","Cần xe lăn mang tấm chắn: dùng xe-lan; vật này chỉ là tấm, không có xe."],
  "size": {
    "width": 0.062,
    "height": 0.088
  },
  "parts": [],
  "points": [
    {
      "name": "foot",
      "description": "Giữa đáy giá kẹp."
    },
    {
      "name": "leftEdge",
      "description": "Mép trái của tấm chắn, ngang tầm tia của cổng quang điện."
    },
    {
      "name": "rightEdge",
      "description": "Mép phải của tấm chắn, cùng độ cao với leftEdge; khoảng giữa hai mép là bề rộng d."
    }
  ],
  "notes": "Bề rộng d = 2,0 cm đo từ mép trái tới mép phải (đã ghi trên hình). Cổng quang điện bấm giờ từ lúc mép trước vào tia tới lúc mép sau ra khỏi tia, nên vận tốc tức thời = d / Δt. fill là màu nhựa tấm chắn."
}
*/
const makeLightFlag = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const D = 0.02;
  const H = 0.052;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0012));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Giá kẹp kim loại chữ U ôm lên cạnh xe, có vít siết bên phải.
  group.add(new Konva.Rect({ x: m(-0.022), y: m(-0.014), width: m(0.044), height: m(0.014), cornerRadius: m(0.003), ...lin(0, m(-0.014), 0, 0, [0, "#e2e8f0", 0.5, "#94a3b8", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.005), shadowOpacity: 0.35, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.019), y: m(-0.009), width: m(0.038), height: m(0.007), fill: "#1e293b", opacity: 0.5, listening: false }));
  group.add(new Konva.Rect({ x: m(0.022), y: m(-0.0105), width: m(0.012), height: m(0.0044), fill: "#cbd5e1", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(0.0335), y: m(-0.014), width: m(0.0068), height: m(0.011), cornerRadius: m(0.0022), ...lin(0, m(-0.014), 0, m(-0.003), [0, "#7f1d1d", 0.5, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.6, listening: false }));
  // Cọc đỡ tấm chắn.
  group.add(new Konva.Rect({ x: m(-0.0035), y: m(-0.024), width: m(0.007), height: m(0.012), ...lin(m(-0.0035), 0, m(0.0035), 0, [0, "#64748b", 0.4, "#f8fafc", 1, "#475569"]), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));

  // Tấm chắn: nhựa đen mờ, mép vát, có khe bắt vít và vạch chuẩn mép.
  const bottom = -0.024;
  group.add(new Konva.Rect({ x: m(-D / 2), y: m(bottom - H), width: m(D), height: m(H), cornerRadius: m(0.0015), ...lin(m(-D / 2), 0, m(D / 2), 0, [0, "#374151", 0.25, fill, 1, "#000000"]), stroke: "#6b7280", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.5, listening: false }));
  group.add(ln([-D / 2 + 0.0015, bottom - H + 0.002, -D / 2 + 0.0015, bottom - 0.002], "rgba(255,255,255,0.22)", lw));
  group.add(new Konva.Rect({ x: m(-0.0016), y: m(bottom - 0.022), width: m(0.0032), height: m(0.016), cornerRadius: m(0.0016), fill: "#030712", stroke: "#4b5563", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(bottom - 0.01), radius: m(0.0024), fill: "#cbd5e1", stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
  // Hai vạch chuẩn bằng sơn trắng ở hai mép, và kích thước d có mũi tên.
  const dimY = bottom - H - 0.009;
  group.add(ln([-D / 2, bottom - H, -D / 2, dimY - 0.003], "#94a3b8", lw * 0.6));
  group.add(ln([D / 2, bottom - H, D / 2, dimY - 0.003], "#94a3b8", lw * 0.6));
  group.add(new Konva.Arrow({ points: [m(-D / 2 + 0.0005), m(dimY), m(D / 2 - 0.0005), m(dimY)], stroke: "#fbbf24", fill: "#fbbf24", strokeWidth: lw, pointerLength: m(0.003), pointerWidth: m(0.0026), pointerAtBeginning: true, listening: false }));
  group.add(new Konva.Text({ x: m(-0.024), y: m(dimY - 0.0105), width: m(0.048), align: "center", text: "d = 2,0 cm", fontSize: m(0.0066), fontStyle: "bold", fill: "#fbbf24", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.03), y: m(0.004), width: m(0.06), align: "center", text: label, fontSize: m(0.0075), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: { foot: { x: 0, y: 0 }, leftEdge: { x: m(-D / 2), y: m(bottom - H / 2) }, rightEdge: { x: m(D / 2), y: m(bottom - H / 2) } },
  };
};
