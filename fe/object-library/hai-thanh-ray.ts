/* OBJECT-META
{
  "catalog": "Hai thanh ray + thanh dẫn trượt",
  "title": "Hai thanh ray đồng song song nhìn từ trên xuống nối với nhau ở đầu trái qua vôn kế nhỏ, thanh dẫn trượt bắc ngang hai ray, nền gỗ có chân đỡ",
  "fill": "#d97706",
  "anchor": "Giữa đầu ray bên trái, nằm giữa hai ray.",
  "useWhen": ["Cần hai ray cách nhau 0,07 m có thanh dẫn trượt, nối điện kế, để đo suất điện động cảm ứng.", "Cảnh e = B·l·v nhìn từ trên xuống với thanh dẫn trượt 0–0,14 m."],
  "avoidWhen": ["Cần khung dây hoặc cuộn dây di chuyển trong từ trường: dùng khung-day hoặc cuon-cam.", "Từ trường đều không có sẵn; phải thêm vào cảnh vì vật chỉ gồm ray và thanh."],
  "size": { "width": 0.267, "height": 0.1 },
  "parts": [
    { "name": "bar", "label": "Thanh dẫn trượt", "motion": "slide", "axis": "right", "min": 0, "max": 0.14, "description": "Vị trí thanh dẫn tính từ vị trí gần đầu trái nhất, mét, trượt sang phải dọc theo hai ray; cả thanh luôn vuông góc với ray." }
  ],
  "points": [
    { "name": "railStart", "description": "Giữa đầu ray bên trái, tại thanh nối." },
    { "name": "barRest", "description": "Giữa thanh dẫn ở vị trí nghỉ." },
    { "name": "railEnd", "description": "Giữa đầu ray bên phải." },
    { "name": "meter", "description": "Giữa đồng hồ đo nối hai ray." }
  ],
  "notes": "Hình nhìn từ trên xuống: hai ray cách nhau 0,07 m dài 0,22 m, đầu trái nối với nhau qua điện kế nhỏ; thanh dẫn dài 0,09 m đặt vuông góc với ray và chuyển động trượt sang phải 0–0,14 m. Từ trường đều hướng vào mặt giấy là hiện tượng do cảnh vẽ. Dùng đo suất điện động cảm ứng e = B·l·v. fill là màu đồng của ray và thanh."
}
*/
const makeRailsAndBar = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const GAP = 0.07;
  const RL = 0.22;
  const ry = GAP / 2;

  // Nền gỗ có vân và chân đệm.
  group.add(new Konva.Rect({ x: m(-0.03), y: m(-ry - 0.0165), width: m(RL + 0.045), height: m(GAP + 0.033), cornerRadius: m(0.004), ...lin(0, 0, 0, m(GAP + 0.033), [0, "#d6a15a", 0.5, "#a16207", 1, "#5a2d0c"]), stroke: "#3b1d08", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.45, shadowOffset: { x: m(0.003), y: m(0.005) }, listening: false }));
  for (let i = 0; i < 7; i += 1) group.add(new Konva.Line({ points: [m(-0.026), m(-ry - 0.0125 + i * 0.0105), m(RL / 2), m(-ry - 0.0115 + i * 0.0105), m(RL + 0.012), m(-ry - 0.0128 + i * 0.0105)], stroke: "rgba(60,30,10,0.22)", strokeWidth: lw * 0.7, tension: 0.4, listening: false }));
  // Dấu ⊗ nhỏ chỉ từ trường đều hướng vào mặt giấy (mờ, phía sau ray).
  for (let i = 0; i < 4; i += 1) for (const dy of [-0.0045, 0.0045]) {
    const x = 0.045 + i * 0.045;
    group.add(new Konva.Line({ points: [m(x - 0.002), m(dy - 0.002), m(x + 0.002), m(dy + 0.002)], stroke: "rgba(59,130,246,0.55)", strokeWidth: lw * 1.1, listening: false }));
    group.add(new Konva.Line({ points: [m(x + 0.002), m(dy - 0.002), m(x - 0.002), m(dy + 0.002)], stroke: "rgba(59,130,246,0.55)", strokeWidth: lw * 1.1, listening: false }));
  }

  // Hai ray: thanh đồng dẹt có mép sáng, vít bắt vào nền.
  for (const y of [-ry, ry]) {
    group.add(new Konva.Rect({ x: 0, y: m(y - 0.0045), width: m(RL), height: m(0.009), cornerRadius: m(0.0012), ...lin(0, 0, 0, m(0.009), [0, "#fff7ed", 0.3, fill, 0.75, "#92400e", 1, "#431407"]), stroke: "#431407", strokeWidth: lw, listening: false }));
    group.add(new Konva.Line({ points: [m(0.003), m(y - 0.0028), m(RL - 0.003), m(y - 0.0028)], stroke: "rgba(255,255,255,0.7)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
    for (const x of [0.02, 0.11, 0.2]) group.add(new Konva.Circle({ x: m(x), y: m(y + 0.0006), radius: m(0.0014), fill: "#475569", stroke: "#1e293b", strokeWidth: lw * 0.5, listening: false }));
  }
  // Thanh nối đầu trái: khối đồng ngang và điện kế tròn nhỏ ở giữa.
  group.add(new Konva.Rect({ x: m(-0.0105), y: m(-ry - 0.0045), width: m(0.0105), height: m(GAP + 0.009), ...lin(0, 0, m(0.0105), 0, [0, "#fff7ed", 0.4, fill, 1, "#431407"]), stroke: "#431407", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: m(-0.0225), y: 0, radius: m(0.0175), ...lin(m(-0.0175), m(-0.0175), m(0.0175), m(0.0175), [0, "#e2e8f0", 0.5, "#64748b", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw * 1.2, listening: false }));
  group.add(new Konva.Circle({ x: m(-0.0225), y: 0, radius: m(0.0138), fill: "#fefce8", stroke: "#475569", strokeWidth: lw * 0.8, listening: false }));
  for (let i = -4; i <= 4; i += 1) {
    const a = ((i * 18 - 90) * Math.PI) / 180;
    group.add(new Konva.Line({ points: [m(-0.0225 + 0.0112 * Math.cos(a)), m(0.0112 * Math.sin(a)), m(-0.0225 + 0.0132 * Math.cos(a)), m(0.0132 * Math.sin(a))], stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
  }
  group.add(new Konva.Line({ points: [m(-0.0225), m(0.005), m(-0.0225 + 0.0105 * Math.cos(-1.35)), m(0.005 + 0.0105 * Math.sin(-1.35))], stroke: "#dc2626", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  group.add(new Konva.Circle({ x: m(-0.0225), y: m(0.005), radius: m(0.0016), fill: "#0f172a", listening: false }));
  group.add(new Konva.Text({ x: m(-0.0225 - 0.0138), y: m(-0.0105), width: m(0.0276), align: "center", text: "V", fontSize: m(0.006), fontStyle: "bold", fill: "#475569", listening: false }));

  // BỘ PHẬN TRƯỢT: thanh dẫn thép bắc ngang hai ray, hai đầu có con lăn và tay nắm nhựa. Gốc nhóm ở vị trí nghỉ.
  const bar = new Konva.Group();
  const bx = 0.04;
  bar.add(new Konva.Rect({ x: m(bx - 0.0035), y: m(-0.045), width: m(0.007), height: m(0.09), cornerRadius: m(0.0025), fill: "rgba(0,0,0,0.3)", listening: false }));
  bar.add(new Konva.Rect({ x: m(bx - 0.0045), y: m(-0.045), width: m(0.009), height: m(0.09), cornerRadius: m(0.003), ...lin(0, 0, m(0.009), 0, [0, "#475569", 0.3, "#f8fafc", 0.6, "#cbd5e1", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw * 1.1, listening: false }));
  bar.add(new Konva.Line({ points: [m(bx - 0.0018), m(-0.042), m(bx - 0.0018), m(0.042)], stroke: "rgba(255,255,255,0.75)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  for (const s of [-1, 1]) {
    bar.add(new Konva.Circle({ x: m(bx), y: m(s * ry), radius: m(0.0055), ...lin(m(-0.005), m(-0.005), m(0.005), m(0.005), [0, "#e2e8f0", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
    bar.add(new Konva.Rect({ x: m(bx - 0.0052), y: m(s > 0 ? 0.0375 : -0.0535), width: m(0.0104), height: m(0.016), cornerRadius: m(0.003), ...lin(0, 0, m(0.0104), 0, [0, "#6b7280", 0.4, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.8, listening: false }));
  }
  group.add(bar);

  if (label) {
    group.add(new Konva.Text({ x: m(0.04), y: m(ry + 0.02), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { bar: { node: bar, motion: "slide" as const, axis: "right" as const, min: 0, max: 0.14 } },
    points: { railStart: { x: 0, y: 0 }, barRest: { x: m(0.04), y: 0 }, railEnd: { x: m(RL), y: 0 }, meter: { x: m(-0.0225), y: 0 } },
  };
};
