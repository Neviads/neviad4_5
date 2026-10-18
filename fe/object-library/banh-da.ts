/* OBJECT-META
{
  "catalog": "Bánh xe / vô lăng / đĩa quay",
  "title": "Vô lăng gang có vành nặng, sáu nan thon, moay-ơ có then và vạch đỏ đánh dấu, đặt trên trụ đỡ ổ trục",
  "fill": "#475569",
  "anchor": "Tâm trục quay của vô lăng.",
  "useWhen": ["Cần vô lăng gang có vành nặng, sáu nan, vạch đỏ đánh dấu để minh hoạ quay và quán tính.","Cần bánh xe nhìn thẳng mặt, quay quanh trục nằm ngang trên trụ ổ trục."],
  "avoidWhen": ["Cần bánh răng có răng ăn khớp thanh răng: dùng banh-rang.","Cần đĩa mỏng có lỗ treo và vành chia độ: dùng dia-moment.","Vật này không có dây hay vật treo nối vào."],
  "size": { "width": 0.34, "height": 0.5 },
  "parts": [
    { "name": "wheel", "label": "Vô lăng", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của vô lăng quanh trục, độ theo chiều kim đồng hồ; vạch đỏ ở vành cho thấy chuyển động quay." }
  ],
  "points": [
    { "name": "center", "description": "Tâm trục quay." },
    { "name": "rimTop", "description": "Điểm cao nhất của vành vô lăng." },
    { "name": "mark", "description": "Vị trí vạch đỏ khi vô lăng ở góc 0° (đỉnh vành)." },
    { "name": "base", "description": "Giữa đế." }
  ],
  "notes": "Vành ngoài bán kính 0,15 m, vành dày 0,03 m; vô lăng quay quanh trục nằm ngang, nhìn thẳng vào mặt vô lăng. fill là màu gang của vành và nan."
}
*/
const makeFlywheel = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.15;
  const RIM = 0.03;
  const HUB = 0.03;
  const BASE_Y = 0.3;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0015));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Đế và trụ đỡ: đế gang, trụ nhiều tầng, ổ trục chữ U ôm lấy trục phía sau vô lăng.
  group.add(new Konva.Rect({ x: m(-0.15), y: m(BASE_Y), width: m(0.3), height: m(0.03), cornerRadius: m(0.006), ...lin(0, m(BASE_Y), 0, m(BASE_Y + 0.03), [0, "#94a3b8", 0.15, "#334155", 1, "#0f172a"]), stroke: "#0b1220", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.45, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.034), m(BASE_Y), m(-0.016), m(0.03), m(0.016), m(0.03), m(0.034), m(BASE_Y)], closed: true, ...lin(m(-0.034), 0, m(0.034), 0, [0, "#475569", 0.3, "#cbd5e1", 0.7, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, lineJoin: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.05), y: m(-0.016), width: m(0.1), height: m(0.05), cornerRadius: m(0.008), ...lin(m(-0.05), 0, m(0.05), 0, [0, "#475569", 0.3, "#e2e8f0", 0.7, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 1.2, listening: false }));
  for (const x of [-0.04, 0.04]) group.add(new Konva.Circle({ x: m(x), y: m(0.018), radius: m(0.0042), fill: "#cbd5e1", stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));
  for (const x of [-0.1, 0.1]) group.add(new Konva.Circle({ x: m(x), y: m(BASE_Y + 0.015), radius: m(0.0058), fill: "#0b0f19", stroke: "#475569", strokeWidth: lw * 0.7, listening: false }));

  // BỘ PHẬN QUAY: vành, nan, moay-ơ; gốc nhóm là tâm trục.
  const wheel = new Konva.Group({ x: 0, y: 0 });
  wheel.add(new Konva.Circle({ radius: m(R), ...lin(m(-R), m(-R), m(R), m(R), [0, "#cbd5e1", 0.25, fill, 0.7, "#1e293b", 1, "#0b1220"]), stroke: "#0b1220", strokeWidth: lw * 1.4, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.45, shadowOffset: { x: m(0.003), y: m(0.006) }, listening: false }));
  wheel.add(new Konva.Circle({ radius: m(R - 0.0045), stroke: "rgba(255,255,255,0.35)", strokeWidth: lw, listening: false }));
  wheel.add(new Konva.Circle({ radius: m(R - RIM), ...lin(m(R), m(R), m(-R), m(-R), [0, "#334155", 0.5, "#64748b", 1, "#0f172a"]), stroke: "#0b1220", strokeWidth: lw * 1.2, listening: false }));
  // Sáu nan thon: rộng ở moay-ơ, hẹp ở vành, có gân giữa.
  for (let i = 0; i < 6; i += 1) {
    const spoke = new Konva.Group({ rotation: i * 60 });
    spoke.add(new Konva.Line({ points: [m(-0.0145), m(-HUB * 0.7), m(-0.0075), m(-(R - RIM + 0.004)), m(0.0075), m(-(R - RIM + 0.004)), m(0.0145), m(-HUB * 0.7)], closed: true, ...lin(m(-0.0145), 0, m(0.0145), 0, [0, "#475569", 0.35, "#e2e8f0", 0.7, "#94a3b8", 1, "#334155"]), stroke: "#0b1220", strokeWidth: lw * 1.1, lineJoin: "round", shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.3, listening: false }));
    spoke.add(new Konva.Line({ points: [0, m(-HUB * 0.85), 0, m(-(R - RIM))], stroke: "rgba(15,23,42,0.35)", strokeWidth: lw * 1.4, lineCap: "round", listening: false }));
    wheel.add(spoke);
  }
  // Moay-ơ: vòng ngoài có các bu lông, lỗ trục và rãnh then.
  wheel.add(new Konva.Circle({ radius: m(HUB), ...lin(m(-HUB), m(-HUB), m(HUB), m(HUB), [0, "#f8fafc", 0.4, "#94a3b8", 1, "#334155"]), stroke: "#0b1220", strokeWidth: lw * 1.2, listening: false }));
  for (let i = 0; i < 6; i += 1) {
    const a = (i * Math.PI) / 3 + Math.PI / 6;
    wheel.add(new Konva.Circle({ x: m(0.0215 * Math.cos(a)), y: m(0.0215 * Math.sin(a)), radius: m(0.0034), fill: "#e2e8f0", stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  }
  wheel.add(new Konva.Circle({ radius: m(0.0125), ...lin(m(-0.0125), m(-0.0125), m(0.0125), m(0.0125), steel), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  wheel.add(new Konva.Circle({ radius: m(0.0058), fill: "#0b0f19", listening: false }));
  wheel.add(new Konva.Rect({ x: m(-0.0016), y: m(-0.0105), width: m(0.0032), height: m(0.005), fill: "#0b0f19", listening: false }));
  // Vạch đỏ đánh dấu trên vành và ký hiệu tâm.
  wheel.add(new Konva.Rect({ x: m(-0.0055), y: m(-R + 0.0025), width: m(0.011), height: m(0.016), cornerRadius: m(0.002), fill: "#dc2626", stroke: "#7f1d1d", strokeWidth: lw * 0.7, listening: false }));
  group.add(wheel);
  // Nắp che đầu trục ở phía trước.
  group.add(new Konva.Circle({ radius: m(0.0075), ...lin(m(-0.0075), m(-0.0075), m(0.0075), m(0.0075), [0, "#f8fafc", 1, "#475569"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0045), 0, m(0.0045), 0], stroke: "#0f172a", strokeWidth: lw, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.12), y: m(BASE_Y + 0.036), width: m(0.24), align: "center", text: label, fontSize: m(0.018), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { wheel: { node: wheel, motion: "rotate" as const, min: 0, max: 360 } },
    points: { center: { x: 0, y: 0 }, rimTop: { x: 0, y: m(-R) }, mark: { x: 0, y: m(-R + 0.0105) }, base: { x: 0, y: m(BASE_Y + 0.03) } },
  };
};
