/* OBJECT-META
{
  "catalog": "Bộ nhiều con lắc trên một xà (con lắc Barton)",
  "title": "Con lắc Barton: xà ngang treo năm con lắc dài ngắn khác nhau, quả nặng bằng nón giấy màu, một con lắc điều khiển (nặng nhất) ở giữa",
  "fill": "#334155",
  "anchor": "Giữa xà ngang, ở mặt dưới xà.",
  "useWhen": ["Cần bộ năm con lắc dài khác nhau trên một xà để minh hoạ cộng hưởng với con lắc điều khiển.","Cần con lắc 3 cùng chiều dài 0,36 m với con lắc điều khiển dao động mạnh nhất."],
  "avoidWhen": ["Cần một con lắc đơn có dây, quả nặng và thước chia độ: dùng con-lac-don.","Cần dao động của lò xo hay con lắc kép: dùng con-lac-lo-xo hoặc con-lac-kep."],
  "size": { "width": 0.9, "height": 0.56 },
  "parts": [
    { "name": "p1", "label": "Con lắc ngắn nhất", "motion": "rotate", "min": -30, "max": 30, "description": "Góc lệch của con lắc 1 (dài 0,2 m), độ; dương là quay cùng chiều kim đồng hồ (quả nặng lệch sang trái)." },
    { "name": "p2", "label": "Con lắc 2", "motion": "rotate", "min": -30, "max": 30, "description": "Góc lệch của con lắc 2 (dài 0,28 m), độ." },
    { "name": "driver", "label": "Con lắc điều khiển", "motion": "rotate", "min": -30, "max": 30, "description": "Góc lệch của con lắc điều khiển nặng ở giữa (dài 0,36 m), độ; đầu xà dao động theo con lắc này." },
    { "name": "p3", "label": "Con lắc 3", "motion": "rotate", "min": -30, "max": 30, "description": "Góc lệch của con lắc 3 (dài 0,36 m, cùng chiều dài với con lắc điều khiển nên cộng hưởng mạnh), độ." },
    { "name": "p4", "label": "Con lắc dài nhất", "motion": "rotate", "min": -30, "max": 30, "description": "Góc lệch của con lắc 4 (dài 0,46 m), độ." }
  ],
  "points": [
    { "name": "beamCenter", "description": "Giữa xà ngang." },
    { "name": "driverBob", "description": "Tâm quả nặng của con lắc điều khiển ở vị trí cân bằng." },
    { "name": "resonantBob", "description": "Tâm quả nặng của con lắc 3 (cùng chiều dài với con lắc điều khiển) ở vị trí cân bằng." }
  ],
  "notes": "Năm con lắc cách đều 0,16 m, độ dài 0,2; 0,28; 0,36 (điều khiển, nặng); 0,36; 0,46 m, nên chỉ con lắc 3 cộng hưởng mạnh với con lắc điều khiển. Hai trụ ở hai đầu xà bắt vào đế gang. Vòng nét đứt bao vùng quét tối đa, không thuộc vật. fill là màu khung."
}
*/
const makeBartonPendulums = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const SPAN = 0.4;
  const POLE_X = 0.43;
  const BASE_Y = 0.54;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Khung bao vùng quét của các con lắc dài (trong suốt).
  group.add(new Konva.Rect({ x: m(-POLE_X - 0.02), y: m(-0.03), width: m(2 * POLE_X + 0.04), height: m(BASE_Y + 0.07), fill: "rgba(0,0,0,0)", listening: false }));

  // Đế gang và hai trụ đỡ xà.
  group.add(new Konva.Rect({ x: m(-POLE_X - 0.05), y: m(BASE_Y), width: m(2 * POLE_X + 0.1), height: m(0.026), cornerRadius: m(0.005), ...lin(0, m(BASE_Y), 0, m(BASE_Y + 0.026), [0, "#94a3b8", 0.15, fill, 1, "#0f172a"]), stroke: "#0b1220", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  for (const s of [-1, 1]) {
    group.add(new Konva.Rect({ x: m(s * POLE_X - 0.007), y: m(-0.02), width: m(0.014), height: m(BASE_Y + 0.02), cornerRadius: m(0.004), ...lin(m(s * POLE_X - 0.007), 0, m(s * POLE_X + 0.007), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Rect({ x: m(s * POLE_X - 0.013), y: m(BASE_Y - 0.01), width: m(0.026), height: m(0.01), cornerRadius: m(0.002), fill: "#1e293b", listening: false }));
  }
  group.add(new Konva.Rect({ x: m(-POLE_X - 0.02), y: m(-0.022), width: m(2 * POLE_X + 0.04), height: m(0.024), cornerRadius: m(0.005), ...lin(0, m(-0.022), 0, m(0.002), [0, "#f8fafc", 0.2, "#cbd5e1", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.35, listening: false }));
  group.add(new Konva.Line({ points: [m(-POLE_X), m(-0.0195), m(POLE_X), m(-0.0195)], stroke: "rgba(255,255,255,0.75)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));

  // Năm con lắc: mỗi con là một nhóm quay quanh điểm treo; quả nặng là nón giấy màu có dây và nắp kẹp.
  const specs: [string, number, number, string, number][] = [
    ["p1", -2 * SPAN / 2.5, 0.2, "#facc15", 0.02],
    ["p2", -SPAN / 2.5, 0.28, "#fb923c", 0.022],
    ["driver", 0, 0.36, "#475569", 0.032],
    ["p3", SPAN / 2.5, 0.36, "#ef4444", 0.022],
    ["p4", 2 * SPAN / 2.5, 0.46, "#3b82f6", 0.024],
  ];
  const parts: Record<string, { node: Konva.Group; motion: "rotate"; min: number; max: number }> = {};
  const bobs: Record<string, { x: number; y: number }> = {};
  for (const [name, x, len, color, r] of specs) {
    const pend = new Konva.Group({ x: m(x), y: m(0) });
    pend.add(new Konva.Line({ points: [0, 0, 0, m(len - r)], stroke: "#e5e7eb", strokeWidth: Math.max(1, m(0.0011)), lineCap: "round", listening: false }));
    pend.add(new Konva.Line({ points: [m(0.0006), 0, m(0.0006), m(len - r)], stroke: "rgba(15,23,42,0.35)", strokeWidth: Math.max(1, m(0.0005)), listening: false }));
    const driver = name === "driver";
    if (driver) {
      pend.add(new Konva.Circle({ x: 0, y: m(len), radius: m(r), fillRadialGradientStartPoint: { x: m(-0.01), y: m(len - 0.012) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: m(len) }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#f8fafc", 0.35, "#94a3b8", 1, "#1e293b"], stroke: "#0f172a", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.003) }, listening: false }));
      pend.add(new Konva.Ellipse({ x: m(-0.0105), y: m(len - 0.011), radiusX: m(0.0065), radiusY: m(0.0042), rotation: -35, fill: "rgba(255,255,255,0.85)", listening: false }));
      pend.add(new Konva.Text({ x: m(-0.016), y: m(len - 0.008), width: m(0.032), align: "center", text: "M", fontSize: m(0.013), fontStyle: "bold", fill: "#0f172a", listening: false }));
    } else {
      pend.add(new Konva.Line({ points: [m(-r), m(len - r), m(r), m(len - r), 0, m(len + r * 1.2)], closed: true, lineJoin: "round", ...lin(m(-r), 0, m(r), 0, [0, color, 0.4, "#ffffff", 0.45, color, 1, "#0b0f19"]), fill: color, stroke: "#0f172a", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.35, listening: false }));
      pend.add(new Konva.Ellipse({ x: 0, y: m(len - r), radiusX: m(r), radiusY: m(r * 0.2), fill: "rgba(255,255,255,0.4)", stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
    }
    pend.add(new Konva.Rect({ x: m(-0.003), y: m(-0.0025), width: m(0.006), height: m(0.01), fill: "#cbd5e1", stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
    group.add(pend);
    parts[name] = { node: pend, motion: "rotate", min: -30, max: 30 };
    bobs[name] = { x: m(x), y: m(len) };
  }
  // Móc treo trên xà: kẹp đỏ ở mỗi chỗ buộc dây.
  for (const [, x] of specs) group.add(new Konva.Rect({ x: m(x - 0.008), y: m(-0.0105), width: m(0.016), height: m(0.016), cornerRadius: m(0.003), ...lin(m(x - 0.008), 0, m(x + 0.008), 0, [0, "#7f1d1d", 0.5, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.8, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.2), y: m(BASE_Y + 0.034), width: m(0.4), align: "center", text: label, fontSize: m(0.02), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts,
    points: { beamCenter: { x: 0, y: 0 }, driverBob: bobs.driver, resonantBob: bobs.p3 },
  };
};
