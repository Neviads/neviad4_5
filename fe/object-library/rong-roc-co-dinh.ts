/* OBJECT-META
{
  "catalog": "Ròng rọc cố định",
  "title": "Ròng rọc cố định bằng thép mạ: bánh có rãnh dây quay quanh trục, hai má đỡ, móc treo trên",
  "fill": "#cbd5e1",
  "anchor": "Tâm móc treo ở đỉnh ròng rọc (điểm treo trục).",
  "useWhen": ["Cần ròng rọc cố định một bánh có rãnh, hai má và móc treo trên, dây tiếp tuyến ropeLeft, ropeRight.","Cần đổi hướng lực kéo, không lợi về lực."],
  "avoidWhen": ["Cần lợi lực 2 lần với khối động: dùng rong-roc-dong.","Dây không thuộc vật; cảnh phải tự vẽ dây nối hai vật."],
  "size": { "width": 0.11, "height": 0.2 },
  "parts": [
    { "name": "wheel", "label": "Bánh ròng rọc", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của bánh ròng rọc, độ theo chiều kim đồng hồ; dây chạy không trượt nên φ = s / 0,04 (rad) với s là quãng dây đi qua." }
  ],
  "points": [
    { "name": "hook", "description": "Tâm móc treo ở đỉnh." },
    { "name": "center", "description": "Tâm trục bánh." },
    { "name": "ropeLeft", "description": "Điểm dây rời bánh ở phía trái (tiếp tuyến thẳng đứng)." },
    { "name": "ropeRight", "description": "Điểm dây rời bánh ở phía phải (tiếp tuyến thẳng đứng)." }
  ],
  "notes": "Bánh bán kính 0,04 m đáy rãnh 0,034 m, trục cách điểm treo 0,12 m. Dây không thuộc vật: cảnh vẽ dây đi tiếp tuyến từ ropeLeft, ropeRight xuống hai vật. fill là màu thép của bánh và má."
}
*/
const makeFixedPulley = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.04;
  const CY = 0.125;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, fill, 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Móc treo và cổ nối với má ròng rọc.
  group.add(new Konva.Line({ points: [m(0), m(0.032), m(0), m(0.012), m(0.0085), m(0.0045), m(0.0085), m(-0.006), m(0), m(-0.012), m(-0.0085), m(-0.006), m(-0.0085), m(0.0)], stroke: "#e2e8f0", strokeWidth: m(0.0042), lineCap: "round", lineJoin: "round", tension: 0.28, shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.3, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0042), y: m(0.025), width: m(0.0084), height: m(0.016), ...lin(m(-0.0042), 0, m(0.0042), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));

  // Má đỡ phía sau: tấm thép hình giọt nước ôm lấy bánh.
  group.add(new Konva.Line({ points: [m(-0.008), m(0.04), m(-R - 0.012), m(CY - 0.03), m(-R - 0.014), m(CY), m(-R - 0.01), m(CY + 0.032), m(0), m(CY + R + 0.012), m(R + 0.01), m(CY + 0.032), m(R + 0.014), m(CY), m(R + 0.012), m(CY - 0.03), m(0.008), m(0.04)], closed: true, tension: 0.32, ...lin(m(-R), 0, m(R), 0, [0, "#475569", 0.3, "#cbd5e1", 0.7, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.004) }, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0055), m(0.045), m(-R - 0.0085), m(CY - 0.03)], stroke: "rgba(255,255,255,0.45)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));

  // BỘ PHẬN QUAY: bánh có rãnh dây, vành ngoài, các nan và đai ốc ở giữa. Gốc nhóm là tâm trục.
  const wheel = new Konva.Group({ x: 0, y: m(CY) });
  wheel.add(new Konva.Circle({ radius: m(R), ...lin(m(-R), m(-R), m(R), m(R), [0, "#f8fafc", 0.3, fill, 0.8, "#475569", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.35, listening: false }));
  wheel.add(new Konva.Circle({ radius: m(R - 0.0045), ...lin(m(R), m(R), m(-R), m(-R), [0, "#334155", 0.5, "#94a3b8", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  wheel.add(new Konva.Circle({ radius: m(R - 0.0095), ...lin(m(-R), m(-R), m(R), m(R), [0, "#e2e8f0", 0.5, "#94a3b8", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw * 0.8, listening: false }));
  for (let i = 0; i < 6; i += 1) {
    const a = (i * Math.PI) / 3 + Math.PI / 6;
    wheel.add(new Konva.Ellipse({ x: m(0.0215 * Math.cos(a)), y: m(0.0215 * Math.sin(a)), radiusX: m(0.0085), radiusY: m(0.0063), rotation: (a * 180) / Math.PI, fill: "#0f172a", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  }
  for (let i = 0; i < 6; i += 1) {
    const a = (i * Math.PI) / 3;
    wheel.add(new Konva.Line({ points: [m(0.0075 * Math.cos(a)), m(0.0075 * Math.sin(a)), m((R - 0.0105) * Math.cos(a)), m((R - 0.0105) * Math.sin(a))], stroke: "#cbd5e1", strokeWidth: m(0.0045), lineCap: "round", listening: false }));
  }
  wheel.add(new Konva.Circle({ radius: m(0.0095), ...lin(m(-0.0095), m(-0.0095), m(0.0095), m(0.0095), steel), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  wheel.add(new Konva.Circle({ radius: m(0.0042), fill: "#334155", stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));
  wheel.add(new Konva.Line({ points: [m(-0.0034), 0, m(0.0034), 0], stroke: "#e2e8f0", strokeWidth: lw, listening: false }));
  // Dấu đỏ trên vành để thấy bánh quay.
  wheel.add(new Konva.Circle({ x: m(R - 0.0068), y: 0, radius: m(0.0016), fill: "#dc2626", listening: false }));
  group.add(wheel);
  // Bu lông trục ở mặt trước.
  group.add(new Konva.Circle({ x: 0, y: m(CY), radius: m(0.0042), ...lin(m(-0.0042), m(-0.0042), m(0.0042), m(0.0042), [0, "#f8fafc", 1, "#475569"]), stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(R + 0.02), y: m(CY - 0.006), text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { wheel: { node: wheel, motion: "rotate" as const, min: 0, max: 360 } },
    points: { hook: { x: 0, y: m(-0.006) }, center: { x: 0, y: m(CY) }, ropeLeft: { x: m(-R + 0.0045), y: m(CY) }, ropeRight: { x: m(R - 0.0045), y: m(CY) } },
  };
};
