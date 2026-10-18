/* OBJECT-META
{
  "catalog": "Gương phẳng",
  "title": "Gương phẳng treo trên trục quay: tấm gương bạc dày 6 mm trong khung kim loại, mặt sau phủ sơn nâu, trụ đỡ và đế có thước độ",
  "fill": "#cbd5e1",
  "anchor": "Tâm mặt gương (nơi tia sáng phản xạ), trên trục quay.",
  "useWhen": ["Cần gương phẳng quay quanh trục thẳng đứng ±45°, đế có thước độ 0–360°.", "Bài phản xạ ánh sáng, đổi góc tới và đọc góc quay gương, vẽ nhìn từ trên xuống."],
  "avoidWhen": ["Cần gương cầu có tiêu điểm: dùng guong-cau.", "Cần lăng kính hoặc tấm thuỷ tinh cho khúc xạ: dùng lang-kinh; gương này chỉ phản xạ."],
  "size": { "width": 0.19, "height": 0.237 },
  "parts": [
    { "name": "mirror", "label": "Gương", "motion": "rotate", "min": -45, "max": 45, "description": "Góc quay của gương quanh trục thẳng đứng qua tâm, độ; dương là quay cùng chiều kim đồng hồ khi nhìn từ trên xuống (mặt gương, ở bên phải khi nằm thẳng đứng, nghiêng lên trên)." }
  ],
  "points": [
    { "name": "center", "description": "Tâm mặt gương, điểm tới của tia sáng." },
    { "name": "top", "description": "Mép trên gương ở góc 0°." },
    { "name": "bottom", "description": "Mép dưới gương ở góc 0°." },
    { "name": "stand", "description": "Chân đế ở mặt bàn." }
  ],
  "notes": "Vẽ nhìn ngang theo mặt cắt nằm: gương là một đoạn thẳng dài 0,12 m, phía phản xạ ở bên phải. Gương quay quanh tâm (trục thẳng đứng, đi qua trụ đỡ). Mặt trái của gương hiện lớp sơn nâu và sọc ký hiệu mặt sau. Đế có thước độ 0–360° và mũi chỉ. fill là màu mặt gương bạc."
}
*/
const makePlaneMirror = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const LEN = 0.12;
  const THICK = 0.006;
  const CY = -0.17;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Đế tròn có thước độ, mũi chỉ và ốc hãm.
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.01), radiusX: m(0.095), radiusY: m(0.011), ...lin(m(-0.095), 0, m(0.095), 0, [0, "#475569", 0.3, "#e2e8f0", 0.7, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.0115), radiusX: m(0.085), radiusY: m(0.0085), fill: "rgba(248,250,252,0.85)", stroke: "#94a3b8", strokeWidth: lw * 0.7, listening: false }));
  for (let d = 0; d < 360; d += 5) {
    const a = (d * Math.PI) / 180;
    const major = d % 30 === 0;
    group.add(ln([0.085 * Math.sin(a), -0.0115 - 0.0085 * Math.cos(a), (0.085 - (major ? 0.01 : 0.005)) * Math.sin(a), -0.0115 - ((0.085 - (major ? 0.01 : 0.005)) * 0.1) * Math.cos(a)], "#0f172a", major ? lw : lw * 0.55));
  }
  group.add(new Konva.Line({ points: [m(0.0), m(-0.0215), m(-0.004), m(-0.0275), m(0.004), m(-0.0275)], closed: true, fill: "#dc2626", stroke: "#7f1d1d", strokeWidth: lw * 0.7, listening: false }));
  // Trụ thép và đầu quay.
  group.add(new Konva.Rect({ x: m(-0.0055), y: m(CY + 0.07), width: m(0.011), height: m(-CY - 0.08 - 0.0), ...lin(m(-0.0055), 0, m(0.0055), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.012), y: m(CY + 0.0705), width: m(0.024), height: m(0.012), cornerRadius: m(0.003), ...lin(m(-0.012), 0, m(0.012), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));

  // BỘ PHẬN QUAY: gương dài LEN; gốc nhóm ở tâm gương. Mặt phản xạ ở phía bên phải khi nằm thẳng đứng.
  const mirror = new Konva.Group({ x: 0, y: m(CY) });
  // Lớp sơn nâu sau gương (bên trái) và gờ khung bên mép.
  mirror.add(new Konva.Rect({ x: m(-THICK - 0.0035), y: m(-LEN / 2 - 0.004), width: m(THICK + 0.0035), height: m(LEN + 0.008), cornerRadius: m(0.002), ...lin(m(-THICK - 0.0035), 0, 0, 0, [0, "#7c4a14", 0.5, "#b8741a", 1, "#5a3512"]), stroke: "#2a1606", strokeWidth: lw * 0.9, listening: false }));
  for (let i = 0; i < 14; i += 1) mirror.add(ln([-THICK - 0.0035, -LEN / 2 + 0.004 + i * 0.0085, -0.0003, -LEN / 2 + 0.0085 + i * 0.0085], "rgba(42,22,6,0.55)", lw * 0.8));
  // Tấm kính tráng bạc: thân kính xanh nhạt và mặt bạc sáng.
  mirror.add(new Konva.Rect({ x: m(-0.0004), y: m(-LEN / 2), width: m(THICK + 0.0004), height: m(LEN), ...lin(m(-0.0004), 0, m(THICK), 0, [0, "#475569", 0.35, "#f8fafc", 0.7, fill, 1, "#e2e8f0"]), stroke: "#475569", strokeWidth: lw * 0.9, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.3, listening: false }));
  mirror.add(new Konva.Rect({ x: m(THICK * 0.55), y: m(-LEN / 2 + 0.001), width: m(THICK * 0.45), height: m(LEN - 0.002), fill: "rgba(255,255,255,0.9)", listening: false }));
  mirror.add(ln([THICK * 0.8, -LEN / 2 + 0.006, THICK * 0.8, -0.012], "rgba(255,255,255,0.95)", lw * 1.4));
  // Kẹp trên và kẹp dưới giữ gương.
  for (const s of [-1, 1]) {
    mirror.add(new Konva.Rect({ x: m(-THICK - 0.0045), y: m(s * (LEN / 2) - (s > 0 ? 0.0055 : -0.0005) + (s > 0 ? 0 : -0.006)), width: m(THICK + 0.009), height: m(0.0065), cornerRadius: m(0.002), ...lin(m(-THICK - 0.0045), 0, m(0.0045), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  }
  group.add(mirror);
  group.add(new Konva.Circle({ x: 0, y: m(CY), radius: m(0.0075), ...lin(m(-0.0075), m(CY - 0.0075), m(0.0075), m(CY + 0.0075), [0, "#f8fafc", 0.5, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(CY), radius: m(0.0025), fill: "#0f172a", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.09), y: m(0.01), width: m(0.18), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { mirror: { node: mirror, motion: "rotate" as const, min: -45, max: 45 } },
    points: { center: { x: m(THICK), y: m(CY) }, top: { x: m(THICK), y: m(CY - LEN / 2) }, bottom: { x: m(THICK), y: m(CY + LEN / 2) }, stand: { x: 0, y: 0 } },
  };
};
