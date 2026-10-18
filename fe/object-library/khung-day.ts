/* OBJECT-META
{
  "catalog": "Khung dây / vòng dây dẫn",
  "title": "Khung dây dẫn hình chữ nhật nhìn dọc trục quay: khung nhiều vòng quay trên trục nằm ngang giữa vòng chia độ, giá đỡ và hai chốt",
  "fill": "#d97706",
  "anchor": "Tâm khung, trên trục quay.",
  "useWhen": ["Cần khung dây chữ nhật 50 vòng quay quanh trục nằm ngang trong từ trường, nhìn dọc trục quay.", "Cảnh về cảm ứng điện từ, lực từ lên khung, có hai chốt nối và vòng chia độ."],
  "avoidWhen": ["Cần máy phát điện hoàn chỉnh có cổ góp, nam châm: dùng may-phat-dien.", "Cần cuộn dây nhiều vòng nhìn ngang hay lõi sắt: dùng cuon-cam; khung này chỉ thấy như thanh khi nhìn dọc trục."],
  "size": { "width": 0.12, "height": 0.128 },
  "parts": [
    { "name": "frame", "label": "Khung dây", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của khung quanh trục, độ theo chiều kim đồng hồ khi nhìn từ phía trước; 0° là mặt phẳng khung thẳng đứng." }
  ],
  "points": [
    { "name": "axis", "description": "Trục quay của khung, tâm vòng chia độ." },
    { "name": "base", "description": "Giữa đáy đế." },
    { "name": "terminalA", "description": "Chốt nối đầu dây thứ nhất." },
    { "name": "terminalB", "description": "Chốt nối đầu dây thứ hai." }
  ],
  "notes": "Khung chữ nhật 0,07 m × 0,05 m gồm 50 vòng dây đồng, nhìn thẳng dọc trục nên chỉ thấy như một thanh có hai cạnh dẫn ở hai đầu (chấm: dòng ra, ×: dòng vào); vòng chia độ cố định bán kính 0,045 m. Dùng cho cảm ứng điện từ và lực từ lên khung dây. fill là màu dây đồng."
}
*/
const makeWireFrame = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cy = -0.065;
  const R = 0.045;

  // Đế gỗ, trụ thép từ đế lên tâm vòng chia độ, hai chốt cắm ở đế.
  group.add(new Konva.Rect({ x: m(-0.06), y: m(-0.014), width: m(0.12), height: m(0.014), cornerRadius: m(0.003), ...lin(0, 0, 0, m(0.014), [0, "#d6a15a", 0.5, "#a16207", 1, "#5a2d0c"]), stroke: "#3b1d08", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0065), y: m(cy + R - 0.004), width: m(0.013), height: m(-0.014 - cy - R + 0.004), ...lin(0, 0, m(0.013), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  for (const [x, c, cc] of [[-0.045, "#ef4444", "#7f1d1d"], [0.045, "#1f2937", "#030712"]] as [number, string, string][]) {
    group.add(new Konva.Circle({ x: m(x), y: m(-0.0075), radius: m(0.0046), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0046), fillRadialGradientColorStops: [0, "#fff", 0.35, c, 1, cc], stroke: cc, strokeWidth: lw * 0.6, listening: false }));
  }

  // Vòng chia độ cố định: nền tối, vạch từng 10°, số từng 90°.
  group.add(new Konva.Circle({ x: 0, y: m(cy), radius: m(R + 0.0035), ...lin(m(-0.05), m(-0.05), m(0.05), m(0.05), [0, "#f8fafc", 0.4, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw * 1.2, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(cy), radius: m(R), fill: "#0b1220", stroke: "#475569", strokeWidth: lw * 0.7, listening: false }));
  for (let d = 0; d < 360; d += 10) {
    const a = (d * Math.PI) / 180;
    const major = d % 90 === 0;
    const r1 = R - 0.001;
    const r2 = r1 - (major ? 0.006 : 0.0035);
    group.add(new Konva.Line({ points: [m(r1 * Math.sin(a)), m(cy - r1 * Math.cos(a)), m(r2 * Math.sin(a)), m(cy - r2 * Math.cos(a))], stroke: "#e2e8f0", strokeWidth: major ? lw * 1.1 : lw * 0.6, lineCap: "round", listening: false }));
  }
  for (const [d, t] of [[0, "0°"], [90, "90°"], [180, "180°"], [270, "270°"]] as [number, string][]) {
    const a = (d * Math.PI) / 180;
    group.add(new Konva.Text({ x: m(0.0335 * Math.sin(a) - 0.007), y: m(cy - 0.0335 * Math.cos(a) - 0.0027), width: m(0.014), align: "center", text: t, fontSize: m(0.0048), fill: "#cbd5e1", listening: false }));
  }

  // BỘ PHẬN QUAY: khung nhìn từ đầu: thanh nhiều lớp dây, hai cạnh dẫn ở hai đầu và trục ở giữa.
  const frame = new Konva.Group({ x: 0, y: m(cy) });
  frame.add(new Konva.Line({ points: [0, m(-0.025), 0, m(0.025)], stroke: "#431407", strokeWidth: m(0.0105), lineCap: "round", listening: false }));
  frame.add(new Konva.Line({ points: [0, m(-0.025), 0, m(0.025)], stroke: fill, strokeWidth: m(0.0078), lineCap: "round", listening: false }));
  frame.add(new Konva.Line({ points: [m(-0.0013), m(-0.0235), m(-0.0013), m(0.0235)], stroke: "rgba(255,255,255,0.65)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  for (let i = -5; i <= 5; i += 1) frame.add(new Konva.Line({ points: [m(-0.0039), m(i * 0.0042), m(0.0039), m(i * 0.0042 + 0.0012)], stroke: "rgba(67,20,7,0.55)", strokeWidth: lw * 0.6, listening: false }));
  frame.add(new Konva.Circle({ y: m(-0.025), radius: m(0.0058), fill: "#b45309", stroke: "#431407", strokeWidth: lw, listening: false }));
  frame.add(new Konva.Circle({ y: m(-0.025), radius: m(0.0016), fill: "#fef3c7", listening: false }));
  frame.add(new Konva.Circle({ y: m(0.025), radius: m(0.0058), fill: "#b45309", stroke: "#431407", strokeWidth: lw, listening: false }));
  frame.add(new Konva.Line({ points: [m(-0.0025), m(0.0225), m(0.0025), m(0.0275)], stroke: "#fef3c7", strokeWidth: lw * 1.1, listening: false }));
  frame.add(new Konva.Line({ points: [m(0.0025), m(0.0225), m(-0.0025), m(0.0275)], stroke: "#fef3c7", strokeWidth: lw * 1.1, listening: false }));
  frame.add(new Konva.Circle({ radius: m(0.0075), ...lin(m(-0.0075), m(-0.0075), m(0.0075), m(0.0075), steel), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  frame.add(new Konva.Circle({ radius: m(0.0028), fill: "#1e293b", listening: false }));
  group.add(frame);
  group.add(new Konva.Arc({ x: 0, y: m(cy), innerRadius: m(R - 0.0095), outerRadius: m(R - 0.0055), angle: 55, rotation: 210, fill: "rgba(255,255,255,0.35)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.006), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { frame: { node: frame, motion: "rotate" as const, min: 0, max: 360 } },
    points: { axis: { x: 0, y: m(cy) }, base: { x: 0, y: 0 }, terminalA: { x: m(-0.045), y: m(-0.0075) }, terminalB: { x: m(0.045), y: m(-0.0075) } },
  };
};
