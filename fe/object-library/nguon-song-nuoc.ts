/* OBJECT-META
{
  "catalog": "Nguồn sóng nước (mũi nhọn gắn cần rung)",
  "title": "Nguồn sóng nước: động cơ rung điện từ treo trên giá, thanh rung thẳng đứng mang hai mũi nhọn chạm mặt nước",
  "fill": "#374151",
  "anchor": "Giữa đáy thân động cơ rung, ở độ cao mặt nước = 0 (mũi nhọn chạm nước ở y dương).",
  "useWhen": ["Cần cần rung có hai mũi nhọn chạm mặt nước tạo hai nguồn kết hợp cùng pha cho giao thoa sóng nước.", "Cần mũi nhọn dao động thẳng đứng (bộ phận tip) quanh mặt nước ở vị trí cân bằng."],
  "avoidWhen": ["Cần cả khay nước để thấy vân sóng: dùng thêm khay-song-nuoc, vật này không có khay.", "Mặt nước chỉ là đường minh hoạ; nhìn ngang chỉ thấy một mũi nhọn dù thật có hai mũi."],
  "size": { "width": 0.141, "height": 0.361 },
  "parts": [
    { "name": "tip", "label": "Mũi nhọn", "motion": "slide", "axis": "down", "min": -0.004, "max": 0.004, "description": "Li độ của hai mũi nhọn (mét): dương là xuống sâu vào nước, âm là nhấc lên khỏi mặt nước; mũi nhọn dao động quanh vị trí chạm mặt nước." }
  ],
  "points": [
    { "name": "motor", "description": "Giữa đáy thân động cơ rung." },
    { "name": "tipLeft", "description": "Mũi nhọn thứ nhất khi chạm mặt nước ở vị trí cân bằng." },
    { "name": "tipRight", "description": "Mũi nhọn thứ hai (cách mũi thứ nhất 0,06 m, hướng vuông góc màn hình nên chỉ thấy một mũi)." },
    { "name": "waterline", "description": "Mặt nước tĩnh, cao 0,075 m dưới thân động cơ." }
  ],
  "notes": "Thân động cơ treo ở độ cao 0,2 m so với mặt bàn trên một giá chữ L; thanh rung dài 0,075 m kết thúc ở hai mũi nhọn chạm mặt nước. Hai mũi cùng pha, hai nguồn kết hợp. Mặt nước vẽ dưới mũi chỉ để dễ hình dung: cảnh thật vẽ khay sóng nước. fill là màu thân động cơ."
}
*/
const makeWaveDipper = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const ROD_L = 0.075;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const water = ROD_L + 0.001;

  // Mặt nước tĩnh ở dưới, vẽ trước để mũi nhọn nhúng vào. Có vài vòng gợn tĩnh quanh điểm chạm.
  group.add(new Konva.Rect({ x: m(-0.07), y: m(water), width: m(0.14), height: m(0.052), cornerRadius: [0, 0, m(0.004), m(0.004)], ...lin(0, m(water), 0, m(water + 0.052), [0, "rgba(125,211,252,0.7)", 1, "rgba(14,116,144,0.85)"]), listening: false }));
  group.add(new Konva.Line({ points: [m(-0.07), m(water), m(0.07), m(water)], stroke: "rgba(224,242,254,0.95)", strokeWidth: lw * 1.4, lineCap: "round", listening: false }));
  for (const r of [0.012, 0.022, 0.032]) group.add(new Konva.Ellipse({ x: 0, y: m(water), radiusX: m(r), radiusY: m(r * 0.14), stroke: "rgba(255,255,255,0.45)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.07), y: m(water + 0.052), width: m(0.14), height: m(0.006), cornerRadius: m(0.002), fill: "#94a3b8", stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));

  // Giá chữ L: đế gang, trụ đứng bên trái, thanh ngang nâng động cơ.
  group.add(new Konva.Rect({ x: m(-0.07), y: m(water + 0.058), width: m(0.14), height: m(0.012), cornerRadius: m(0.003), fill: "#111827", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0635), y: m(-0.19), width: m(0.011), height: m(water + 0.19 + 0.058), ...lin(m(-0.0635), 0, m(-0.0525), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0635), y: m(-0.1685), width: m(0.058), height: m(0.01), cornerRadius: m(0.003), ...lin(0, m(-0.1685), 0, m(-0.1585), [0, "#f8fafc", 0.3, "#cbd5e1", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0705), y: m(-0.1725), width: m(0.024), height: m(0.018), cornerRadius: m(0.003), ...lin(m(-0.0705), 0, m(-0.0465), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));

  // Thân động cơ rung: hộp thép tròn bo, lõi từ, đầu cắm dây điện.
  group.add(new Konva.Rect({ x: m(-0.036), y: m(-0.19), width: m(0.072), height: m(0.19), cornerRadius: m(0.01), ...lin(m(-0.036), 0, m(0.036), 0, [0, "#030712", 0.2, "#6b7280", 0.5, fill, 1, "#030712"]), stroke: "#000", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.006) }, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.028), m(-0.182), m(-0.028), m(-0.01)], stroke: "rgba(255,255,255,0.4)", strokeWidth: lw * 2.2, lineCap: "round", listening: false }));
  for (let i = 0; i < 6; i += 1) group.add(new Konva.Line({ points: [m(-0.026), m(-0.16 + i * 0.0075), m(0.026), m(-0.16 + i * 0.0075)], stroke: "rgba(255,255,255,0.12)", strokeWidth: lw * 1.2, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.028), y: m(-0.098), width: m(0.056), height: m(0.026), cornerRadius: m(0.003), fill: "#f8fafc", stroke: "#94a3b8", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Text({ x: m(-0.028), y: m(-0.0955), width: m(0.056), align: "center", text: "VIBRATOR", fontSize: m(0.0075), fontStyle: "bold", fill: "#0f172a", listening: false }));
  group.add(new Konva.Text({ x: m(-0.028), y: m(-0.0835), width: m(0.056), align: "center", text: "50 Hz · 12 V", fontSize: m(0.0058), fill: "#475569", listening: false }));
  group.add(new Konva.Line({ points: [m(0.0), m(-0.19), m(0.012), m(-0.205), m(0.03), m(-0.215), m(0.052), m(-0.205), m(0.068), m(-0.18)], stroke: "#0b0f19", strokeWidth: m(0.0046), lineCap: "round", tension: 0.5, listening: false }));
  group.add(new Konva.Circle({ x: m(0.03), y: m(-0.19), radius: m(0.0042), fill: "#dc2626", stroke: "#450a0a", strokeWidth: lw * 0.8, listening: false }));

  // BỘ PHẬN TRƯỢT: thanh rung và đầu mũi nhọn. Gốc nhóm là đáy thân động cơ, thanh đi xuống tới mặt nước.
  const tip = new Konva.Group({ x: 0, y: 0 });
  tip.add(new Konva.Rect({ x: m(-0.0036), y: m(0.0), width: m(0.0072), height: m(ROD_L - 0.016), ...lin(m(-0.0036), 0, m(0.0036), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  tip.add(new Konva.Rect({ x: m(-0.012), y: m(ROD_L - 0.026), width: m(0.024), height: m(0.01), cornerRadius: m(0.002), ...lin(m(-0.012), 0, m(0.012), 0, [0, "#7f1d1d", 0.5, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.8, listening: false }));
  tip.add(new Konva.Line({ points: [m(-0.0036), m(ROD_L - 0.016), m(0.0036), m(ROD_L - 0.016), m(0.0004), m(ROD_L + 0.0015), m(-0.0004), m(ROD_L + 0.0015)], closed: true, ...lin(m(-0.0036), 0, m(0.0036), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, lineJoin: "round", listening: false }));
  tip.add(new Konva.Circle({ x: 0, y: m(ROD_L + 0.0016), radius: m(0.0009), fill: "#f8fafc", listening: false }));
  group.add(tip);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(water + 0.072), width: m(0.14), align: "center", text: label, fontSize: m(0.01), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { tip: { node: tip, motion: "slide" as const, axis: "down" as const, min: -0.004, max: 0.004 } },
    points: { motor: { x: 0, y: 0 }, tipLeft: { x: m(-0.0004), y: m(ROD_L + 0.0015) }, tipRight: { x: m(0.0004), y: m(ROD_L + 0.0015) }, waterline: { x: 0, y: m(water) } },
  };
};
