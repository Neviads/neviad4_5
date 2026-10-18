/* OBJECT-META
{
  "catalog": "Nhiệt lượng kế (bình hai lớp, nắp, que khuấy)",
  "title": "Nhiệt lượng kế mặt cắt: bình hai lớp bằng nhôm có khoảng không cách nhiệt, nắp nhựa có lỗ cắm nhiệt kế, que khuấy vòng và nước bên trong",
  "fill": "#7dd3fc",
  "anchor": "Giữa đáy bình, chạm mặt bàn.",
  "useWhen": ["Cần nhiệt lượng kế bình hai lớp có lỗ nắp cắm nhiệt kế và que khuấy để đo nhiệt dung riêng, nhiệt nóng chảy.", "Cảnh trộn nước nóng với vật nung rồi khuấy đều, đọc nhiệt độ cân bằng."],
  "avoidWhen": ["Cần dây đốt điện bên trong và hai chốt nối nguồn: dùng nhiet-luong-ke-day-dot.", "Vật không tự gia nhiệt; nhiệt kế phải thêm riêng qua lỗ nắp (nhiet-ke hoặc nhiet-ke-dien-tu)."],
  "size": { "width": 0.092, "height": 0.152 },
  "parts": [
    { "name": "stirrer", "label": "Que khuấy", "motion": "slide", "axis": "up", "min": 0, "max": 0.04, "description": "Độ nâng que khuấy khỏi vị trí thấp nhất, mét; kéo lên xuống để khuấy đều nước." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy bình." },
    { "name": "waterSurface", "description": "Giữa mặt nước trong cốc trong." },
    { "name": "lidHole", "description": "Lỗ trên nắp để cắm nhiệt kế." }
  ],
  "notes": "Bình ngoài bằng nhựa cao 0,095 m, cốc nhôm trong đường kính 0,065 m đựng nước cao 0,06 m; giữa hai lớp là lớp không khí cách nhiệt. Nắp nhựa có lỗ giữa cho nhiệt kế và lỗ bên cho que khuấy đồng có vòng khuấy. fill là màu nước."
}
*/
const makeCalorimeter = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const OW = 0.085;
  const OH = 0.1;
  const IW = 0.065;
  const IT = -OH + 0.006;
  const WATER = 0.06;

  group.add(new Konva.Ellipse({ x: m(0.003), y: m(-0.001), radiusX: m(OW / 2 + 0.004), radiusY: m(0.003), fill: "rgba(0,0,0,0.4)", listening: false }));
  // Vỏ nhựa ngoài sơn trắng xám cắt dọc, thành dày và đáy có chân.
  group.add(new Konva.Rect({ x: m(-OW / 2), y: m(-OH), width: m(OW), height: m(OH), cornerRadius: m(0.004), ...lin(0, 0, m(OW), 0, [0, "#e5e7eb", 0.3, "#ffffff", 1, "#9ca3af"]), stroke: "#475569", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-IW / 2 - 0.0085), y: m(IT - 0.002), width: m(IW + 0.017), height: m(OH - 0.01), fill: "#0b1220", stroke: "#475569", strokeWidth: lw * 0.8, listening: false }));
  // Khoảng không khí cách nhiệt: các chấm nhỏ giữa hai lớp.
  for (let i = 0; i < 7; i += 1) for (const s of [-1, 1]) group.add(new Konva.Circle({ x: m(s * (IW / 2 + 0.004)), y: m(IT + 0.008 + i * 0.012), radius: m(0.0009), fill: "rgba(148,163,184,0.5)", listening: false }));
  // Cốc nhôm trong.
  group.add(new Konva.Rect({ x: m(-IW / 2), y: m(IT), width: m(IW), height: m(OH - 0.012), cornerRadius: m(0.002), ...lin(0, 0, m(IW), 0, [0, "#475569", 0.2, "#f1f5f9", 0.5, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-IW / 2 + 0.003), y: m(IT + 0.002), width: m(IW - 0.006), height: m(OH - 0.017), fill: "#0f172a", listening: false }));
  const wy = -0.011 - WATER;
  group.add(new Konva.Rect({ x: m(-IW / 2 + 0.003), y: m(wy), width: m(IW - 0.006), height: m(WATER), ...lin(0, 0, 0, m(WATER), [0, "rgba(186,230,253,0.72)", 1, "rgba(3,105,161,0.88)"]), listening: false }));
  group.add(new Konva.Rect({ x: m(-IW / 2 + 0.003), y: m(wy - 0.0008), width: m(IW - 0.006), height: m(0.002), fill: "rgba(224,242,254,0.95)", listening: false }));
  group.add(ln([-IW / 2 + 0.005, wy + 0.004, -IW / 2 + 0.005, -0.014], "rgba(255,255,255,0.4)", lw * 1.4));
  group.add(new Konva.Rect({ x: m(-IW / 2 + 0.003), y: m(wy), width: m(IW - 0.006), height: m(WATER), fill, opacity: 0.22, listening: false }));

  // Nắp nhựa: tấm tròn dày có hai lỗ, gờ nhô lên.
  group.add(new Konva.Rect({ x: m(-OW / 2 - 0.002), y: m(-OH - 0.0075), width: m(OW + 0.004), height: m(0.0105), cornerRadius: m(0.003), ...lin(0, 0, 0, m(0.0105), [0, "#ffffff", 0.5, "#e5e7eb", 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw, listening: false }));
  group.add(ln([-OW / 2, -OH - 0.0058, OW / 2, -OH - 0.0058], "rgba(255,255,255,0.9)", lw * 1.2));
  group.add(new Konva.Rect({ x: m(-0.006), y: m(-OH - 0.0105), width: m(0.012), height: m(0.0045), cornerRadius: m(0.0012), fill: "#475569", stroke: "#1e293b", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(-OH - 0.0085), radius: m(0.0024), fill: "#0b1220", listening: false }));

  // BỘ PHẬN TRƯỢT: que khuấy đồng qua lỗ bên phải, vòng khuấy ở đáy, núm gỗ ở trên.
  const sx = 0.023;
  const stirrer = new Konva.Group({ x: m(sx), y: 0 });
  stirrer.add(new Konva.Rect({ x: m(-0.0013), y: m(-OH - 0.04), width: m(0.0026), height: m(OH + 0.04 - 0.016), ...lin(0, 0, m(0.0026), 0, [0, "#7c2d12", 0.4, "#fdba74", 1, "#7c2d12"]), stroke: "#431407", strokeWidth: lw * 0.5, listening: false }));
  stirrer.add(new Konva.Ellipse({ x: 0, y: m(-0.016), radiusX: m(0.0145), radiusY: m(0.0035), stroke: "#fdba74", strokeWidth: m(0.0017), listening: false }));
  stirrer.add(new Konva.Ellipse({ x: 0, y: m(-0.016), radiusX: m(0.0145), radiusY: m(0.0035), stroke: "#7c2d12", strokeWidth: lw * 0.5, listening: false }));
  stirrer.add(new Konva.Rect({ x: m(-0.0042), y: m(-OH - 0.0485), width: m(0.0084), height: m(0.0095), cornerRadius: m(0.003), ...lin(0, 0, m(0.0084), 0, [0, "#d6a15a", 0.4, "#a16207", 1, "#451a03"]), stroke: "#451a03", strokeWidth: lw * 0.8, listening: false }));
  group.add(stirrer);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.006), width: m(0.12), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { stirrer: { node: stirrer, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.04 } },
    points: { base: { x: 0, y: 0 }, waterSurface: { x: 0, y: m(wy) }, lidHole: { x: 0, y: m(-OH - 0.0085) } },
  };
};
