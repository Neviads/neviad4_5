/* OBJECT-META
{
  "catalog": "Mẩu giấy vụn / quả cầu bấc treo trên dây",
  "title": "Quả cầu bấc bọc giấy nhôm treo bằng sợi chỉ tơ từ một giá nhỏ và mấy mẩu giấy vụn nằm trên mặt bàn để thử nhiễm điện",
  "fill": "#e2e8f0",
  "anchor": "Điểm treo của sợi chỉ.",
  "useWhen": ["Cần quả cầu bấc bọc giấy bạc treo chỉ tơ trên giá chữ L, kèm mẩu giấy vụn, để thử nhiễm điện.","Cần quan sát quả cầu bị hút hoặc đẩy làm dây lệch."],
  "avoidWhen": ["Cần quả cầu kim loại đặc trên trụ cách điện: dùng qua-cau-tich-dien.","Cần điện nghiệm có lá kim loại: dùng dien-nghiem."],
  "size": { "width": 0.151, "height": 0.202 },
  "parts": [
    { "name": "ball", "label": "Quả cầu bấc", "motion": "rotate", "min": -60, "max": 60, "description": "Góc lệch của sợi chỉ cùng quả cầu quanh điểm treo, độ theo chiều kim đồng hồ; 0° là thẳng đứng, dương là quả cầu lệch sang trái." }
  ],
  "points": [
    { "name": "suspension", "description": "Điểm treo của sợi chỉ, đầu trên giá." },
    { "name": "ballRest", "description": "Tâm quả cầu khi treo thẳng đứng." },
    { "name": "scraps", "description": "Giữa nhóm mẩu giấy vụn trên mặt bàn." },
    { "name": "base", "description": "Chân giá đỡ ở mặt bàn." }
  ],
  "notes": "Quả cầu bấc đường kính 0,02 m bọc giấy bạc, treo bằng sợi tơ dài 0,12 m; giá hình chữ L cao 0,17 m. Khi bị nhiễm điện hoặc gần vật mang điện, quả cầu bị hút hoặc đẩy làm dây lệch khỏi phương thẳng đứng. Dưới giá có mấy mẩu giấy vụn 3–5 mm. fill là màu bạc của quả cầu."
}
*/
const makePithBall = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const L = 0.12;
  const R = 0.01;
  const floor = 0.18;

  group.add(new Konva.Ellipse({ x: m(-0.045), y: m(floor - 0.005), radiusX: m(0.036), radiusY: m(0.0055), ...lin(0, 0, m(0.072), 0, [0, "#475569", 0.3, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0485), y: m(-0.02), width: m(0.007), height: m(floor - 0.005 + 0.02), ...lin(0, 0, m(0.007), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0485), y: m(-0.02), width: m(0.0605), height: m(0.007), cornerRadius: m(0.0015), ...lin(0, 0, 0, m(0.007), steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(-0.0085), radius: m(0.0042), fill: "#e2e8f0", stroke: "#475569", strokeWidth: lw * 0.9, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(-0.0085), radius: m(0.0014), fill: "#0b1220", listening: false }));

  const ball = new Konva.Group();
  ball.add(new Konva.Line({ points: [0, m(0.0004), 0, m(L)], stroke: "rgba(226,232,240,0.9)", strokeWidth: lw * 0.8, listening: false }));
  ball.add(new Konva.Circle({ x: 0, y: m(L + R), radius: m(R), fillRadialGradientStartPoint: { x: m(-0.0035), y: m(-0.0035) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "#ffffff", 0.35, fill, 0.8, "#64748b", 1, "#1e293b"], stroke: "#334155", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.007), shadowOpacity: 0.4, shadowOffset: { x: m(0.0012), y: m(0.0025) }, listening: false }));
  ball.add(new Konva.Arc({ x: 0, y: m(L + R), innerRadius: m(R - 0.0032), outerRadius: m(R - 0.0016), angle: 58, rotation: 205, fill: "rgba(255,255,255,0.8)", listening: false }));
  ball.add(new Konva.Circle({ x: m(-0.0035), y: m(L + R - 0.0035), radius: m(0.0017), fill: "#fff", listening: false }));
  ball.add(new Konva.Line({ points: [m(-0.0018), m(L + 0.0004), m(0), m(L - 0.0018), m(0.0018), m(L + 0.0004)], closed: true, fill: "#94a3b8", stroke: "#475569", strokeWidth: lw * 0.5, listening: false }));
  group.add(ball);

  const scraps: [number, number, number, number, string][] = [[0.032, 0.172, 0.006, 20, "#fef3c7"], [0.043, 0.176, 0.005, -15, "#ffffff"], [0.052, 0.172, 0.0055, 35, "#e0f2fe"], [0.04, 0.168, 0.004, 5, "#fde68a"], [0.06, 0.177, 0.004, -40, "#fef3c7"]];
  group.add(ln([0.02, floor - 0.0005, 0.07, floor - 0.0005], "rgba(100,116,139,0.8)", lw));
  for (const [x, y, s, rot, c] of scraps) {
    const g = new Konva.Group({ x: m(x), y: m(y), rotation: rot });
    const pts = [-s, -s * 0.6, s * 0.2, -s, s, -s * 0.2, s * 0.7, s * 0.8, -s * 0.8, s * 0.9].map(m);
    g.add(new Konva.Line({ points: pts, closed: true, fill: "rgba(0,0,0,0.35)", x: m(0.0008), y: m(0.0012), listening: false }));
    g.add(new Konva.Line({ points: pts, closed: true, fill: c, stroke: "#94a3b8", strokeWidth: lw * 0.5, lineJoin: "round", listening: false }));
    g.add(ln([-s * 0.5, -s * 0.2, s * 0.5, 0], "rgba(100,116,139,0.35)", lw * 0.4));
    group.add(g);
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(floor + 0.008), width: m(0.12), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { ball: { node: ball, motion: "rotate" as const, min: -60, max: 60 } },
    points: { suspension: { x: 0, y: 0 }, ballRest: { x: 0, y: m(L + R) }, scraps: { x: m(0.045), y: m(0.174) }, base: { x: m(-0.045), y: m(floor) } },
  };
};
