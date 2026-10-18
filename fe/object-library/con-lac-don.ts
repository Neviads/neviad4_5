/* OBJECT-META
{
  "catalog": "Con lắc đơn (giá + dây + quả nặng)",
  "title": "Con lắc đơn: khung giá hình cổng, xà ngang có kẹp giữ dây, dây mảnh dài 0,5 m, quả nặng thép và thước chia độ",
  "fill": "#334155",
  "anchor": "Điểm treo (tâm kẹp giữ dây ở xà ngang).",
  "useWhen": ["Cần con lắc đơn dây 0,5 m, quả nặng thép, giá cổng và thước chia độ 0 đến 50 độ.","Cần đo chu kì theo biên độ góc với điểm treo cố định ở xà ngang."],
  "avoidWhen": ["Cần nhiều con lắc trên một xà để khảo sát cộng hưởng: dùng con-lac-barton.","Cần hai thanh nối tiếp dao động hỗn loạn: dùng con-lac-kep; chiều dài dây cố định 0,5 m."],
  "size": { "width": 0.82, "height": 0.966 },
  "parts": [
    { "name": "swing", "label": "Dây và quả nặng", "motion": "rotate", "min": -50, "max": 50, "description": "Góc lệch của dây so với phương thẳng đứng, độ; dương là quay cùng chiều kim đồng hồ, tức quả nặng lệch sang TRÁI màn hình (engine đặt góc = −θ nếu θ đo sang phải). Dây và quả nặng quay quanh điểm treo." }
  ],
  "points": [
    { "name": "pivot", "description": "Điểm treo." },
    { "name": "bobRest", "description": "Tâm quả nặng ở vị trí cân bằng (0,5 m dưới điểm treo)." },
    { "name": "baseCenter", "description": "Giữa thanh đế dưới." }
  ],
  "notes": "Dây dài 0,50 m (từ điểm treo tới tâm quả nặng), quả nặng thép bán kính 0,02 m. Thước chia độ 0–50° hai phía gắn sau điểm treo để đọc biên độ. fill là màu sơn khung."
}
*/
const makeSimplePendulum = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const L = 0.5;
  const BOB = 0.02;
  const POLE_X = 0.37;
  const BASE_Y = 0.66;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Khung giá: thanh đế dưới, hai trụ đứng và xà ngang phía trên.
  group.add(new Konva.Rect({ x: m(-POLE_X - 0.04), y: m(BASE_Y), width: m(2 * POLE_X + 0.08), height: m(0.026), cornerRadius: m(0.005), ...lin(0, m(BASE_Y), 0, m(BASE_Y + 0.026), [0, "#94a3b8", 0.15, fill, 1, "#0f172a"]), stroke: "#0b1220", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  for (const s of [-1, 1]) {
    group.add(new Konva.Rect({ x: m(s * POLE_X - 0.007), y: m(-0.02), width: m(0.014), height: m(BASE_Y + 0.02), cornerRadius: m(0.004), ...lin(m(s * POLE_X - 0.007), 0, m(s * POLE_X + 0.007), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Rect({ x: m(s * POLE_X - 0.012), y: m(BASE_Y - 0.01), width: m(0.024), height: m(0.01), cornerRadius: m(0.002), fill: "#1e293b", listening: false }));
    group.add(new Konva.Circle({ x: m(s * (POLE_X + 0.04) - s * 0.02), y: m(BASE_Y + 0.013), radius: m(0.0055), fill: "#0b0f19", stroke: "#475569", strokeWidth: lw * 0.7, listening: false }));
  }
  group.add(new Konva.Rect({ x: m(-POLE_X - 0.02), y: m(-0.02), width: m(2 * POLE_X + 0.04), height: m(0.022), cornerRadius: m(0.004), ...lin(0, m(-0.02), 0, m(0.002), [0, "#f8fafc", 0.2, "#cbd5e1", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.35, listening: false }));
  group.add(ln([-POLE_X, -0.0175, POLE_X, -0.0175], "rgba(255,255,255,0.75)", lw * 1.2));

  // Thước chia độ gắn sau điểm treo: cung ±50°, vạch mỗi độ, số mỗi 10°.
  const SR = 0.2;
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(SR - 0.02), outerRadius: m(SR), angle: 106, rotation: 37, fill: "rgba(248,250,252,0.9)", stroke: "#94a3b8", strokeWidth: lw * 0.8, listening: false }));
  for (let d = -50; d <= 50; d += 1) {
    const a = (d * Math.PI) / 180;
    const len = d % 10 === 0 ? 0.011 : d % 5 === 0 ? 0.008 : 0.0045;
    group.add(ln([SR * Math.sin(a), SR * Math.cos(a), (SR - len) * Math.sin(a), (SR - len) * Math.cos(a)], d === 0 ? "#dc2626" : "#0f172a", d % 10 === 0 ? lw * 1.2 : lw * 0.6));
    if (d % 10 === 0 && d !== 0) group.add(new Konva.Text({ x: m((SR - 0.0185) * Math.sin(a)), y: m((SR - 0.0185) * Math.cos(a)), width: m(0.014), offsetX: m(0.007), offsetY: m(0.003), rotation: -d, align: "center", text: String(Math.abs(d)), fontSize: m(0.0065), fontStyle: "bold", fill: "#0f172a", listening: false }));
  }

  // BỘ PHẬN QUAY: dây mảnh, kẹp ở đầu trên và quả nặng thép có móc. Gốc nhóm đúng điểm treo.
  const swing = new Konva.Group({ x: 0, y: 0 });
  swing.add(new Konva.Line({ points: [0, 0, 0, m(L - BOB)], stroke: "#e2e8f0", strokeWidth: Math.max(1, m(0.0011)), lineCap: "round", listening: false }));
  swing.add(new Konva.Line({ points: [m(0.0007), 0, m(0.0007), m(L - BOB)], stroke: "rgba(15,23,42,0.35)", strokeWidth: Math.max(1, m(0.0005)), listening: false }));
  swing.add(new Konva.Rect({ x: m(-0.0028), y: m(L - BOB - 0.007), width: m(0.0056), height: m(0.008), fill: "#cbd5e1", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  swing.add(new Konva.Circle({ x: 0, y: m(L), radius: m(BOB), fillRadialGradientStartPoint: { x: m(-0.007), y: m(L - 0.008) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: m(L) }, fillRadialGradientEndRadius: m(BOB), fillRadialGradientColorStops: [0, "#f8fafc", 0.4, "#94a3b8", 1, "#1e293b"], stroke: "#0f172a", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.003) }, listening: false }));
  swing.add(new Konva.Ellipse({ x: m(-0.0075), y: m(L - 0.0085), radiusX: m(0.0045), radiusY: m(0.003), rotation: -35, fill: "rgba(255,255,255,0.85)", listening: false }));
  group.add(swing);
  // Kẹp giữ dây ở xà ngang, che đầu dây.
  group.add(new Konva.Rect({ x: m(-0.014), y: m(-0.002), width: m(0.028), height: m(0.016), cornerRadius: m(0.003), ...lin(m(-0.014), 0, m(0.014), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: 0, radius: m(0.0034), fill: "#dc2626", stroke: "#450a0a", strokeWidth: lw * 0.7, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.2), y: m(BASE_Y + 0.034), width: m(0.4), align: "center", text: label, fontSize: m(0.02), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { swing: { node: swing, motion: "rotate" as const, min: -50, max: 50 } },
    points: { pivot: { x: 0, y: 0 }, bobRest: { x: 0, y: m(L) }, baseCenter: { x: 0, y: m(BASE_Y + 0.013) } },
  };
};
