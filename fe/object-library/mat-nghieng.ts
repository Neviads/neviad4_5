/* OBJECT-META
{
  "catalog": "Mặt phẳng nghiêng (chỉnh được góc)",
  "title": "Mặt phẳng nghiêng bằng gỗ chỉnh được góc: tấm ván có lót nhám, bản lề, thang chia độ 0–60° và đế gỗ",
  "fill": "#c8a06c",
  "anchor": "Trục bản lề ở đầu phải của tấm ván.",
  "useWhen": ["Cần mặt phẳng nghiêng bằng gỗ chỉnh góc 0–60° có thang chia độ, ván lót nhám.","Cần bài đo ma sát, phân tích lực trên dốc hoặc gia tốc vật trượt xuống."],
  "avoidWhen": ["Cần dốc cố định hoặc ray cong: dùng mang-cong hoặc mang-ray.","Cần dốc rất ngắn kèm máng có thước mm: dùng mang-ray gác nghiêng.","Vật dài 1,22 m, đừng dùng cho bài nhỏ cỡ bàn thí nghiệm."],
  "size": { "width": 1.22, "height": 0.6 },
  "parts": [
    { "name": "board", "label": "Tấm ván nghiêng", "motion": "rotate", "min": 0, "max": 60, "description": "Góc nghiêng của tấm ván so với phương ngang, độ; đầu trái nâng lên quanh bản lề ở bên phải." }
  ],
  "points": [
    { "name": "hinge", "description": "Trục bản lề." },
    { "name": "boardTop", "description": "Đầu trái (đầu cao) của tấm ván ở góc 0°; khi nghiêng, vị trí thật quay quanh hinge." },
    { "name": "baseLeft", "description": "Đầu trái của đế." }
  ],
  "notes": "Tấm ván dài 0,85 m, dày 0,02 m, mặt trên có lót vải nhám (đường vân dày). Cung chia độ bán kính 0,3 m gắn vào đế quanh bản lề; mép tấm ván chỉ vào vạch góc. fill là màu gỗ của tấm ván."
}
*/
const makeInclinePlane = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const BOARD = 0.85;
  const AXIS_Y = -0.018;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0015));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Đế gỗ dày có bốn chân cao su.
  group.add(new Konva.Rect({ x: m(-0.92), y: m(0.0), width: m(0.98), height: m(0.026), cornerRadius: m(0.004), ...lin(0, 0, 0, m(0.026), [0, "#8a5a2b", 0.2, "#6b4219", 1, "#3b2209"]), stroke: "#2a1606", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  for (const x of [-0.88, -0.1]) group.add(new Konva.Rect({ x: m(x - 0.018), y: m(0.026), width: m(0.036), height: m(0.007), cornerRadius: m(0.002), fill: "#111827", listening: false }));
  group.add(ln([-0.915, 0.003, 0.055, 0.003], "rgba(255,255,255,0.3)", lw));
  // Cung chia độ gắn vào đế quanh bản lề, bán kính 0,3 m.
  const R = 0.3;
  group.add(new Konva.Arc({ x: 0, y: m(AXIS_Y), innerRadius: m(R - 0.012), outerRadius: m(R), angle: 62, rotation: 180, fill: "#fefce8", stroke: "#a16207", strokeWidth: lw * 0.7, listening: false }));
  for (let d = 0; d <= 60; d += 1) {
    const a = (d * Math.PI) / 180;
    const len = d % 10 === 0 ? 0.01 : d % 5 === 0 ? 0.0075 : 0.0045;
    group.add(ln([-R * Math.cos(a), AXIS_Y - R * Math.sin(a), -(R - len) * Math.cos(a), AXIS_Y - (R - len) * Math.sin(a)], "#0f172a", d % 10 === 0 ? lw * 1.2 : lw * 0.6));
    if (d % 10 === 0) group.add(new Konva.Text({ x: m(-(R - 0.0205) * Math.cos(a)), y: m(AXIS_Y - (R - 0.0205) * Math.sin(a)), width: m(0.016), offsetX: m(0.008), offsetY: m(0.0035), rotation: d - 90, align: "center", text: String(d), fontSize: m(0.0075), fontStyle: "bold", fill: "#0f172a", listening: false }));
  }
  // Hai trụ đỡ bản lề trên đế.
  group.add(new Konva.Rect({ x: m(-0.025), y: m(AXIS_Y - 0.0075), width: m(0.05), height: m(-AXIS_Y + 0.0075), ...lin(m(-0.025), 0, m(0.025), 0, [0, "#475569", 0.4, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));

  // BỘ PHẬN QUAY: tấm ván gỗ dài từ bản lề sang trái; gốc nhóm đúng trục bản lề.
  const board = new Konva.Group({ x: 0, y: m(AXIS_Y) });
  board.add(new Konva.Rect({ x: m(-BOARD), y: m(-0.0105), width: m(BOARD), height: m(0.021), cornerRadius: m(0.002), ...lin(0, m(-0.0105), 0, m(0.0105), [0, "#e7c898", 0.18, fill, 1, "#8a5a2b"]), stroke: "#4a2f12", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  board.add(new Konva.Rect({ x: m(-BOARD + 0.01), y: m(-0.0125), width: m(BOARD - 0.04), height: m(0.0042), cornerRadius: m(0.001), fill: "#1f2937", listening: false }));
  for (let i = 0; i < 70; i += 1) board.add(new Konva.Line({ points: [m(-BOARD + 0.013 + i * 0.0114), m(-0.0125), m(-BOARD + 0.0155 + i * 0.0114), m(-0.0083)], stroke: "rgba(255,255,255,0.18)", strokeWidth: lw * 0.6, listening: false }));
  for (let i = 0; i < 6; i += 1) board.add(new Konva.Line({ points: [m(-BOARD + 0.003), m(-0.0035 + i * 0.0035), m(-BOARD / 2), m(-0.0033 + i * 0.0035), m(-0.003), m(-0.0035 + i * 0.0035)], stroke: i % 2 ? "rgba(74,47,18,0.35)" : "rgba(255,235,200,0.35)", strokeWidth: lw * 0.6, tension: 0.4, listening: false }));
  // Ròng rọc nhỏ ở đầu cao của tấm ván để vắt dây.
  board.add(new Konva.Rect({ x: m(-BOARD - 0.012), y: m(-0.018), width: m(0.022), height: m(0.032), cornerRadius: m(0.003), ...lin(m(-BOARD - 0.012), 0, m(-BOARD + 0.01), 0, [0, "#475569", 0.4, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  board.add(new Konva.Circle({ x: m(-BOARD - 0.001), y: m(-0.0035), radius: m(0.009), ...lin(m(-BOARD - 0.01), 0, m(-BOARD + 0.008), 0, [0, "#334155", 0.4, "#f8fafc", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  board.add(new Konva.Circle({ x: m(-BOARD - 0.001), y: m(-0.0035), radius: m(0.0028), fill: "#cbd5e1", stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));
  // Bản lề: lá bản lề kim loại và chốt trục.
  board.add(new Konva.Rect({ x: m(-0.05), y: m(-0.0125), width: m(0.05), height: m(0.025), cornerRadius: m(0.002), ...lin(0, m(-0.0125), 0, m(0.0125), [0, "#e2e8f0", 1, "#64748b"]), stroke: "#334155", strokeWidth: lw, listening: false }));
  group.add(board);
  group.add(new Konva.Circle({ x: 0, y: m(AXIS_Y), radius: m(0.0085), ...lin(m(-0.0085), m(-0.0085), m(0.0085), m(0.0085), [0, "#f8fafc", 0.5, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(AXIS_Y), radius: m(0.0028), fill: "#0f172a", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.6), y: m(0.036), width: m(0.5), align: "center", text: label, fontSize: m(0.018), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { board: { node: board, motion: "rotate" as const, min: 0, max: 60 } },
    points: { hinge: { x: 0, y: m(AXIS_Y) }, boardTop: { x: m(-BOARD), y: m(AXIS_Y) }, baseLeft: { x: m(-0.92), y: 0 } },
  };
};
