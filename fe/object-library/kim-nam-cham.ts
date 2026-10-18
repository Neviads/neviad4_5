/* OBJECT-META
{
  "catalog": "Kim nam châm / la bàn",
  "title": "La bàn: hộp tròn có vành đồng và mặt kính, mặt chia độ N–E–S–W, kim nam châm hình thoi (đầu Bắc đỏ, đầu Nam trắng) quay trên trục",
  "fill": "#b45309",
  "anchor": "Trục quay của kim, tâm la bàn.",
  "useWhen": ["Cần la bàn hoặc kim nam châm quay tự do trên trục, nhìn từ trên xuống, đầu Bắc đỏ.", "Cảnh cần kim xoay 0–360° theo từ trường để thử hướng đường sức."],
  "avoidWhen": ["Cần thanh nam châm thẳng hai cực: dùng nam-cham-thang.", "Cần nam châm chữ U: dùng nam-cham-chu-u; vật này không tự tạo từ trường vẽ ra."],
  "size": { "width": 0.11, "height": 0.11 },
  "parts": [
    { "name": "needle", "label": "Kim nam châm", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của kim quanh trục, độ theo chiều kim đồng hồ khi nhìn từ trên xuống; 0° là đầu Bắc (đỏ) hướng lên theo chữ N trên mặt." }
  ],
  "points": [
    { "name": "pivot", "description": "Trục quay của kim, tâm la bàn." },
    { "name": "northTip", "description": "Đầu Bắc (đỏ) của kim ở 0°." },
    { "name": "southTip", "description": "Đầu Nam (trắng) của kim ở 0°." }
  ],
  "notes": "Hộp đường kính 0,11 m, kim dài 0,08 m đặt trên mũi nhọn nên quay tự do; kim luôn chỉ theo từ trường tại chỗ, đầu đỏ (cực Bắc của kim) hướng về cực Bắc từ. Mặt chia độ cố định, 0° ở chữ N phía trên. fill là màu vành đồng."
}
*/
const makeCompass = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const R = 0.05;

  // Vành đồng dày có bóng và bậc trong.
  group.add(new Konva.Circle({ radius: m(R + 0.005), ...lin(m(-R), m(-R), m(R), m(R), [0, "#fff7ed", 0.35, fill, 1, "#431407"]), stroke: "#2a0a02", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.5, shadowOffset: { x: m(0.003), y: m(0.005) }, listening: false }));
  group.add(new Konva.Circle({ radius: m(R + 0.0012), ...lin(m(R), m(R), m(-R), m(-R), [0, "#92400e", 0.5, "#fde68a", 1, "#78350f"]), stroke: "#431407", strokeWidth: lw * 0.8, listening: false }));
  // Mặt chia độ trắng ngà, vòng độ từng 5°, bốn hướng và các hướng phụ.
  group.add(new Konva.Circle({ radius: m(R - 0.002), fillRadialGradientStartPoint: { x: m(-0.01), y: m(-0.012) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "#ffffff", 0.7, "#f1f5f9", 1, "#cbd5e1"], stroke: "#475569", strokeWidth: lw * 0.8, listening: false }));
  for (let d = 0; d < 360; d += 5) {
    const a = (d * Math.PI) / 180;
    const major = d % 30 === 0;
    const r1 = R - 0.0035;
    const r2 = r1 - (major ? 0.0065 : 0.003);
    group.add(new Konva.Line({ points: [m(r1 * Math.sin(a)), m(-r1 * Math.cos(a)), m(r2 * Math.sin(a)), m(-r2 * Math.cos(a))], stroke: "#1e293b", strokeWidth: major ? lw : lw * 0.55, lineCap: "round", listening: false }));
  }
  for (const [d, t, c] of [[0, "N", "#dc2626"], [90, "E", "#1e293b"], [180, "S", "#1e293b"], [270, "W", "#1e293b"]] as [number, string, string][]) {
    const a = (d * Math.PI) / 180;
    group.add(new Konva.Text({ x: m(0.0305 * Math.sin(a) - 0.005), y: m(-0.0305 * Math.cos(a) - 0.0055), width: m(0.01), align: "center", text: t, fontSize: m(0.0105), fontStyle: "bold", fill: c, listening: false }));
  }
  for (const d of [45, 135, 225, 315]) {
    const a = (d * Math.PI) / 180;
    group.add(new Konva.Line({ points: [0, 0, m(0.027 * Math.sin(a)), m(-0.027 * Math.cos(a))], stroke: "rgba(100,116,139,0.45)", strokeWidth: lw * 0.7, listening: false }));
  }
  group.add(new Konva.Circle({ radius: m(0.0185), stroke: "rgba(100,116,139,0.45)", strokeWidth: lw * 0.7, listening: false }));

  // BỘ PHẬN QUAY: kim thoi hai nửa, mũi đỏ phía Bắc; quay quanh mũi trục ở tâm.
  const needle = new Konva.Group();
  needle.add(new Konva.Line({ points: [m(0.0008), m(0.0012), m(-0.0045), m(-0.0005), m(0.0008), m(-0.04), m(0.0055), m(-0.0005)], closed: true, fill: "rgba(0,0,0,0.3)", listening: false }));
  needle.add(new Konva.Line({ points: [m(-0.0055), 0, 0, m(-0.04), m(0.0055), 0], closed: true, ...lin(m(-0.0055), 0, m(0.0055), 0, [0, "#fecaca", 0.5, "#dc2626", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.8, lineJoin: "round", listening: false }));
  needle.add(new Konva.Line({ points: [m(-0.0055), 0, 0, m(0.04), m(0.0055), 0], closed: true, ...lin(m(-0.0055), 0, m(0.0055), 0, [0, "#ffffff", 0.5, "#e2e8f0", 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw * 0.8, lineJoin: "round", listening: false }));
  needle.add(new Konva.Line({ points: [m(-0.0016), m(-0.0035), 0, m(-0.034)], stroke: "rgba(255,255,255,0.6)", strokeWidth: lw * 0.9, lineCap: "round", listening: false }));
  needle.add(new Konva.Circle({ radius: m(0.0034), ...lin(m(-0.003), m(-0.003), m(0.003), m(0.003), [0, "#f8fafc", 1, "#475569"]), stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));
  needle.add(new Konva.Circle({ radius: m(0.0011), fill: "#0f172a", listening: false }));
  group.add(needle);
  // Kính phủ mặt: vệt sáng.
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(R - 0.0095), outerRadius: m(R - 0.0055), angle: 60, rotation: 205, fill: "rgba(255,255,255,0.55)", listening: false }));
  group.add(new Konva.Circle({ x: m(-0.0305), y: m(-0.0285), radius: m(0.0022), fill: "rgba(255,255,255,0.8)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(R + 0.01), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { needle: { node: needle, motion: "rotate" as const, min: 0, max: 360 } },
    points: { pivot: { x: 0, y: 0 }, northTip: { x: 0, y: m(-0.04) }, southTip: { x: 0, y: m(0.04) } },
  };
};
