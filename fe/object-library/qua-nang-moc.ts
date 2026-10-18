/* OBJECT-META
{
  "catalog": "Quả nặng có móc (đơn, chồng)",
  "title": "Giá treo quả nặng: móc treo, thanh giữ và bốn quả nặng có rãnh 50 g xếp chồng",
  "fill": "#374151",
  "anchor": "Tâm khuyên móc ở đỉnh giá treo.",
  "useWhen": ["Cần giá treo cùng bốn quả nặng có rãnh 50 g xếp chồng, tổng 250 g, nhãn khối lượng trên mỗi quả.","Cần treo vào lò xo hay lực kế để xét lực hoặc dao động."],
  "avoidWhen": ["Cần một khối nặng đơn không móc: dùng khoi-go hoặc khoi-ban-tru.","Số quả cố định là bốn; cần số quả khác thì dựng từng quả riêng."],
  "size": { "width": 0.07, "height": 0.2 },
  "parts": [],
  "points": [
    { "name": "hook", "description": "Tâm khuyên móc ở đỉnh, nơi lực kế hay dây treo vào." },
    { "name": "stackTop", "description": "Mặt trên của quả nặng trên cùng." },
    { "name": "center", "description": "Tâm khối của giá treo cùng các quả nặng, cách điểm neo 0,125 m." }
  ],
  "notes": "Giá nặng 50 g và mỗi quả nặng 50 g, tổng 250 g khi đủ bốn quả; nhãn trên mỗi quả ghi khối lượng. Muốn ít quả hơn thì cảnh vẽ chồng các quả nặng riêng. fill là màu thép nhuộm đen của các quả nặng."
}
*/
const makeSlottedWeights = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Khuyên móc và thanh giữ ở giữa.
  group.add(new Konva.Circle({ x: 0, y: m(0.0075), radius: m(0.0075), stroke: "#e2e8f0", strokeWidth: m(0.0032), shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.3, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0028), y: m(0.014), width: m(0.0056), height: m(0.168), ...lin(m(-0.0028), 0, m(0.0028), 0, steel), stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
  // Mũ đỡ ở trên cùng của chồng.
  group.add(new Konva.Rect({ x: m(-0.011), y: m(0.0245), width: m(0.022), height: m(0.007), cornerRadius: m(0.002), ...lin(m(-0.011), 0, m(0.011), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));

  // Bốn quả nặng có rãnh: rãnh chạy từ mép vào giữa để lồng vào thanh; nhãn 50 g.
  const top = 0.034;
  for (let i = 0; i < 4; i += 1) {
    const y = top + i * 0.0245;
    group.add(new Konva.Rect({ x: m(-0.027), y: m(y), width: m(0.054), height: m(0.0225), cornerRadius: m(0.0025), ...lin(0, m(y), 0, m(y + 0.0225), [0, "#6b7280", 0.12, fill, 0.8, "#111827", 1, "#030712"]), stroke: "#030712", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.4, listening: false }));
    group.add(new Konva.Line({ points: [m(-0.0245), m(y + 0.0018), m(0.0245), m(y + 0.0018)], stroke: "rgba(255,255,255,0.4)", strokeWidth: lw, lineCap: "round", listening: false }));
    // Rãnh mở ra phía phải, sâu tới thanh giữa.
    group.add(new Konva.Rect({ x: m(0.0028), y: m(y + 0.0072), width: m(0.0245), height: m(0.0082), fill: "#020617", listening: false }));
    group.add(new Konva.Line({ points: [m(0.0028), m(y + 0.0072), m(0.027), m(y + 0.0072)], stroke: "rgba(255,255,255,0.15)", strokeWidth: lw * 0.7, listening: false }));
    group.add(new Konva.Text({ x: m(-0.027), y: m(y + 0.0072), width: m(0.0245), align: "center", text: "50 g", fontSize: m(0.0072), fontStyle: "bold", fill: "#e5e7eb", listening: false }));
  }
  // Đĩa đỡ phía dưới với đầu thanh vặn ren.
  const bottom = top + 4 * 0.0245;
  group.add(new Konva.Rect({ x: m(-0.0315), y: m(bottom), width: m(0.063), height: m(0.007), cornerRadius: m(0.0025), ...lin(m(-0.0315), 0, m(0.0315), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.3, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0042), y: m(bottom + 0.007), width: m(0.0084), height: m(0.007), cornerRadius: m(0.0015), fill: "#94a3b8", stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(0.04), y: m(0.09), text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { hook: { x: 0, y: m(0.0075) }, stackTop: { x: 0, y: m(top) }, center: { x: 0, y: m(0.125) } } };
};
