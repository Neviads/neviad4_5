/* OBJECT-META
{
  "catalog": "Máy ảnh (mặt cắt)",
  "title": "Máy ảnh mặt cắt dọc: thân máy có cảm biến phim ở phía sau, ống kính chứa hai thấu kính và lá chắn khẩu độ trượt được để lấy nét",
  "fill": "#1f2937",
  "anchor": "Giữa đáy thân máy, chạm mặt bàn.",
  "useWhen": ["Cần máy ảnh mặt cắt dọc có ống kính hai thấu kính, cảm biến sau, lấy nét bằng cách trượt.","Cần giải thích tạo ảnh thật ngược chiều trên cảm biến qua thấu kính."],
  "avoidWhen": ["Cần mắt người có võng mạc: dùng mat.","Cần một thấu kính đơn rời: dùng thau-kinh-hoi-tu.","Cần kính hiển vi hoặc kính thiên văn: dùng kinh-hien-vi hoặc kinh-thien-van."],
  "size": { "width": 0.185, "height": 0.1 },
  "parts": [
    { "name": "lens", "label": "Vật kính", "motion": "slide", "axis": "right", "min": 0, "max": 0.012, "description": "Độ đẩy ống kính ra phía trước (sang phải) so với thân, mét; thay đổi khoảng cách vật kính – phim để lấy nét." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy thân máy." },
    { "name": "sensor", "description": "Giữa mặt phim/cảm biến ở thành sau." },
    { "name": "lensCenter", "description": "Quang tâm thấu kính trước của ống kính ở vị trí thu hết, trên trục chính." },
    { "name": "front", "description": "Mặt trước của ống kính ở vị trí thu hết." }
  ],
  "notes": "Thân máy dài 0,12 m, cao 0,08 m, cắt đôi để lộ bên trong: phim/cảm biến sát thành sau bên trái, ống kính ở bên phải. Ống kính đẩy ra 0–0,012 m để thay đổi khoảng cách thấu kính – phim (ảnh thật, ngược chiều hiện trên phim). fill là màu vỏ thân."
}
*/
const makeCamera = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const enamel = [0, "#9ca3af", 0.25, fill, 1, "#030712"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const top = -0.095;
  const bot = -0.012;
  const cy = (top + bot) / 2;

  // Phần nhô trên: lồi ngắm, nút chụp và núm xoay chế độ.
  group.add(new Konva.Line({ points: [m(-0.052), m(top), m(-0.044), m(top - 0.014), m(-0.01), m(top - 0.014), m(-0.002), m(top)], closed: true, ...lin(0, m(top - 0.014), 0, m(top), enamel), stroke: "#030712", strokeWidth: lw, lineJoin: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0415), y: m(top - 0.0115), width: m(0.014), height: m(0.007), cornerRadius: m(0.001), fill: "rgba(56,189,248,0.45)", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(0.012), y: m(top - 0.007), width: m(0.014), height: m(0.007), cornerRadius: m(0.0015), ...lin(m(0.012), 0, m(0.026), 0, steel), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Ellipse({ x: m(0.019), y: m(top - 0.0095), radiusX: m(0.0055), radiusY: m(0.0025), fill: "#dc2626", stroke: "#7f1d1d", strokeWidth: lw * 0.7, listening: false }));

  // Thân máy: vỏ ngoài sơn đen bo góc và lớp bọc giả da có chấm nhám.
  group.add(new Konva.Rect({ x: m(-0.085), y: m(top), width: m(0.13), height: m(bot - top), cornerRadius: m(0.008), ...lin(0, m(top), 0, m(bot), enamel), stroke: "#030712", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(ln([-0.075, top + 0.0025, 0.035, top + 0.0025], "rgba(255,255,255,0.3)", lw * 1.4));
  // Cửa sổ cắt để lộ phía trong: nền tối, rãnh sáng ở biên.
  group.add(new Konva.Rect({ x: m(-0.074), y: m(top + 0.01), width: m(0.108), height: m(bot - top - 0.02), cornerRadius: m(0.004), fill: "#020617", stroke: "#475569", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.074), y: m(top + 0.01), width: m(0.108), height: m(bot - top - 0.02), cornerRadius: m(0.004), ...lin(m(-0.074), 0, m(0.034), 0, [0, "rgba(30,41,59,0.9)", 1, "rgba(2,6,23,0.1)"]), listening: false }));
  // Phim/cảm biến: bản mạch xanh, vùng nhạy cảm sáng và màn chập kín khe phía trước.
  group.add(new Konva.Rect({ x: m(-0.0725), y: m(top + 0.0135), width: m(0.0085), height: m(bot - top - 0.027), ...lin(m(-0.0725), 0, m(-0.064), 0, [0, "#065f46", 1, "#10b981"]), stroke: "#022c22", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0645), y: m(cy - 0.02), width: m(0.0035), height: m(0.04), fill: "#c9a227", stroke: "#78350f", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0645), y: m(cy - 0.02), width: m(0.0012), height: m(0.04), fill: "rgba(255,255,255,0.6)", listening: false }));
  group.add(new Konva.Text({ x: m(-0.0735), y: m(bot - 0.0185), width: m(0.014), align: "center", text: "phim", fontSize: m(0.0046), fill: "#fde68a", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0575), y: m(top + 0.0135), width: m(0.0012), height: m(bot - top - 0.027), fill: "#374151", listening: false }));
  // Ngàm gắn ống kính ở mặt trước thân.
  group.add(new Konva.Rect({ x: m(0.034), y: m(cy - 0.034), width: m(0.012), height: m(0.068), cornerRadius: m(0.0025), ...lin(0, m(cy - 0.034), 0, m(cy + 0.034), [0, "#f1f5f9", 0.5, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  // Dây đeo: một mấu kim loại bên trái.
  group.add(new Konva.Circle({ x: m(-0.0855), y: m(top + 0.012), radius: m(0.0035), stroke: "#cbd5e1", strokeWidth: lw * 1.3, listening: false }));

  // BỘ PHẬN TRƯỢT: ống kính xuyên ngàm, cắt dọc để lộ hai thấu kính và khẩu độ.
  const lens = new Konva.Group();
  const tY = cy - 0.027;
  const bY = cy + 0.027;
  lens.add(new Konva.Rect({ x: m(0.003), y: m(tY), width: m(0.088), height: m(0.0055), cornerRadius: m(0.0015), ...lin(0, m(tY), 0, m(tY + 0.0055), steel), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  lens.add(new Konva.Rect({ x: m(0.003), y: m(bY - 0.0055), width: m(0.088), height: m(0.0055), cornerRadius: m(0.0015), ...lin(0, m(bY - 0.0055), 0, m(bY), [0, "#475569", 0.5, "#f1f5f9", 1, "#64748b"]), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  lens.add(new Konva.Rect({ x: m(0.003), y: m(tY + 0.0055), width: m(0.088), height: m(bY - tY - 0.011), fill: "rgba(14,165,233,0.06)", listening: false }));
  // Hai thấu kính hội tụ lồi hai mặt trong giá kim loại.
  for (const x of [0.026, 0.07]) {
    lens.add(new Konva.Rect({ x: m(x - 0.0013), y: m(tY + 0.0055), width: m(0.0026), height: m(0.002), fill: "#e2e8f0", listening: false }));
    lens.add(new Konva.Rect({ x: m(x - 0.0013), y: m(bY - 0.0075), width: m(0.0026), height: m(0.002), fill: "#e2e8f0", listening: false }));
    lens.add(new Konva.Ellipse({ x: m(x), y: m(cy), radiusX: m(0.0052), radiusY: m(0.0195), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.006) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.02), fillRadialGradientColorStops: [0, "rgba(255,255,255,0.85)", 0.6, "rgba(186,230,253,0.55)", 1, "rgba(56,189,248,0.55)"], stroke: "rgba(15,23,42,0.6)", strokeWidth: lw * 0.9, listening: false }));
    lens.add(new Konva.Ellipse({ x: m(x - 0.0014), y: m(cy - 0.006), radiusX: m(0.0011), radiusY: m(0.0095), fill: "rgba(255,255,255,0.7)", listening: false }));
  }
  // Lá chắn khẩu độ: hai lá đen chừa lỗ tròn ở giữa.
  for (const s of [-1, 1]) {
    lens.add(new Konva.Line({ points: [m(0.0475), m(cy + s * 0.0215), m(0.0505), m(cy + s * 0.0215), m(0.0495), m(cy + s * 0.0065), m(0.0485), m(cy + s * 0.0065)], closed: true, fill: "#030712", stroke: "#475569", strokeWidth: lw * 0.5, listening: false }));
  }
  lens.add(new Konva.Rect({ x: m(0.088), y: m(tY - 0.001), width: m(0.0055), height: m(bY - tY + 0.002), cornerRadius: m(0.0015), fill: "rgba(125,211,252,0.35)", stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  lens.add(new Konva.Text({ x: m(0.052), y: m(tY - 0.0095), text: "f/2.8", fontSize: m(0.0058), fontStyle: "bold", fill: "#e2e8f0", listening: false }));
  group.add(lens);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.008), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { lens: { node: lens, motion: "slide" as const, axis: "right" as const, min: 0, max: 0.012 } },
    points: { base: { x: 0, y: 0 }, sensor: { x: m(-0.063), y: m(cy) }, lensCenter: { x: m(0.026), y: m(cy) }, front: { x: m(0.0935), y: m(cy) } },
  };
};
