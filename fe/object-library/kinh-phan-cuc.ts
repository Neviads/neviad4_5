/* OBJECT-META
{
  "catalog": "Kính phân cực (kính lọc phân cực)",
  "title": "Kính phân cực tròn: màng polaroid có các vạch trục truyền qua, vòng xoay có khía và thước độ, giá đỡ có kẹp",
  "fill": "#1f2937",
  "anchor": "Tâm kính phân cực, trên trục chính.",
  "useWhen": ["Cần kính phân cực tròn có vòng xoay chia độ 0–360° và mũi chỉ, để làm thí nghiệm định luật Malus.", "Cảnh dùng hai kính cùng trục: cùng góc cho sáng, chéo 90° thì tắt."],
  "avoidWhen": ["Cần kính lọc màu cho dải bước sóng: dùng kinh-loc-mau.", "Cần khối thuỷ tinh khúc xạ: dùng khoi-ban-tru; kính phân cực không bẻ tia sáng."],
  "size": { "width": 0.112, "height": 0.19 },
  "parts": [
    { "name": "ring", "label": "Vòng xoay", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của vòng xoay cùng màng polaroid quanh trục, độ theo chiều kim đồng hồ; hướng vạch trục truyền qua đổi theo, góc 0° là trục thẳng đứng." }
  ],
  "points": [
    { "name": "center", "description": "Tâm kính, trên trục chính." },
    { "name": "pointer", "description": "Mũi tên chỉ cố định ở đỉnh để đọc góc quay." },
    { "name": "holder", "description": "Chân giá đỡ ở mặt bàn." }
  ],
  "notes": "Kính đường kính 0,08 m, vòng khía bằng nhôm đen chia độ 0–360°. Các vạch mảnh trong màng chỉ hướng trục truyền qua của polaroid; hai kính cùng trục (0°) cho ánh sáng đi qua, chéo nhau 90° thì tắt (định luật Malus). fill là màu nhôm anod đen của vòng."
}
*/
const makePolarizer = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.04;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cy = -0.125;

  // Đế gang, trụ thép và hai tai kẹp ôm khung ngoài (đứng yên).
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.006), radiusX: m(0.055), radiusY: m(0.0065), ...lin(m(-0.055), 0, m(0.055), 0, [0, "#475569", 0.3, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0045), y: m(cy + R + 0.01), width: m(0.009), height: m(-cy - R - 0.016), ...lin(m(-0.0045), 0, m(0.0045), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0185), y: m(cy + R + 0.0), width: m(0.037), height: m(0.014), cornerRadius: m(0.003), ...lin(m(-0.0185), 0, m(0.0185), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));

  // Khung ngoài đứng yên và thước độ in trên đó với mũi tên chỉ ở đỉnh.
  group.add(new Konva.Circle({ x: 0, y: m(cy), radius: m(R + 0.016), ...lin(m(-R - 0.016), m(cy - R - 0.016), m(R + 0.016), m(cy + R + 0.016), [0, "#f8fafc", 0.4, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.005) }, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(cy), radius: m(R + 0.0125), fill: "#0b1220", stroke: "#475569", strokeWidth: lw * 0.8, listening: false }));
  for (let d = 0; d < 360; d += 5) {
    const a = (d * Math.PI) / 180;
    const major = d % 30 === 0;
    const r1 = R + 0.0115;
    const r2 = r1 - (major ? 0.0075 : 0.0035);
    group.add(ln([r1 * Math.sin(a), cy - r1 * Math.cos(a), r2 * Math.sin(a), cy - r2 * Math.cos(a)], "#e2e8f0", major ? lw * 1.1 : lw * 0.55));
  }
  group.add(new Konva.Line({ points: [m(-0.0045), m(cy - R - 0.0245), m(0.0045), m(cy - R - 0.0245), 0, m(cy - R - 0.0125)], closed: true, fill: "#dc2626", stroke: "#7f1d1d", strokeWidth: lw * 0.7, lineJoin: "round", listening: false }));

  // BỘ PHẬN QUAY: vòng xoay có khía với màng polaroid, tâm nhóm là tâm kính.
  const ring = new Konva.Group({ x: 0, y: m(cy) });
  ring.add(new Konva.Circle({ radius: m(R + 0.0055), ...lin(m(-R), m(-R), m(R), m(R), [0, "#6b7280", 0.35, fill, 1, "#030712"]), stroke: "#000", strokeWidth: lw * 1.2, listening: false }));
  for (let i = 0; i < 72; i += 1) {
    const a = (i * Math.PI) / 36;
    ring.add(ln([(R + 0.0045) * Math.sin(a), -(R + 0.0045) * Math.cos(a), (R + 0.0003) * Math.sin(a), -(R + 0.0003) * Math.cos(a)], "rgba(255,255,255,0.22)", lw * 0.9));
  }
  ring.add(new Konva.Circle({ radius: m(R), fillRadialGradientStartPoint: { x: m(-0.012), y: m(-0.014) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "rgba(203,213,225,0.85)", 0.7, "rgba(100,116,139,0.82)", 1, "rgba(51,65,85,0.88)"], stroke: "#0f172a", strokeWidth: lw, listening: false }));
  // Các vạch trục truyền qua: song song với phương thẳng đứng khi vòng ở 0°.
  for (let i = -9; i <= 9; i += 1) {
    const x = i * 0.0042;
    const half = Math.sqrt(Math.max(0, (R - 0.002) ** 2 - x ** 2));
    ring.add(ln([x, -half, x, half], "rgba(15,23,42,0.5)", lw * 0.8));
  }
  ring.add(new Konva.Arrow({ points: [m(0), m(0.026), m(0), m(-0.03)], stroke: "#fbbf24", fill: "#fbbf24", strokeWidth: lw * 1.4, pointerLength: m(0.0075), pointerWidth: m(0.0065), pointerAtBeginning: true, listening: false }));
  ring.add(new Konva.Circle({ radius: m(0.0034), fill: "#fbbf24", stroke: "#78350f", strokeWidth: lw * 0.6, listening: false }));
  // Vạch đỏ trên vành xoay để thấy quay (0°).
  ring.add(new Konva.Rect({ x: m(-0.0025), y: m(-R - 0.0045), width: m(0.005), height: m(0.007), fill: "#f87171", listening: false }));
  group.add(ring);
  // Vệt phản chiếu cố định trên bề mặt kính.
  group.add(new Konva.Arc({ x: 0, y: m(cy), innerRadius: m(R - 0.0065), outerRadius: m(R - 0.0035), angle: 55, rotation: 205, fill: "rgba(255,255,255,0.35)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.008), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { ring: { node: ring, motion: "rotate" as const, min: 0, max: 360 } },
    points: { center: { x: 0, y: m(cy) }, pointer: { x: 0, y: m(cy - R - 0.0245) }, holder: { x: 0, y: 0 } },
  };
};
