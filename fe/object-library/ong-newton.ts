/* OBJECT-META
{
  "catalog": "Ống Newton (ống chân không)",
  "title": "Ống Newton: ống acrylic trong suốt kín hai đầu, van hút khí ở nắp dưới, chứa một lông chim và một đồng xu",
  "fill": "#bae6fd",
  "anchor": "Giữa đáy ống (mặt dưới nắp đế), chạm mặt bàn.",
  "useWhen": ["Cần ống Newton acrylic kín cao 1 m, có van hút khí, chứa lông chim và đồng xu để so sánh rơi tự do.", "Cảnh rơi khi có và không có không khí; điểm coin, feather để cảnh di chuyển hai vật."],
  "avoidWhen": ["Cần vật rơi tự do trong không khí thông thường: dùng vật nhỏ riêng, không cần ống này.", "Vật không có bơm; lông chim và đồng xu nằm sẵn ở đáy, cảnh phải tự di chuyển chúng."],
  "size": { "width": 0.166, "height": 1.113 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy nắp dưới." },
    { "name": "coin", "description": "Tâm đồng xu nằm ở đáy ống." },
    { "name": "feather", "description": "Tâm lông chim nằm ở đáy ống." },
    { "name": "valve", "description": "Núm van hút khí." }
  ],
  "notes": "Ống cao 1,0 m, đường kính trong 0,06 m. Khi hút hết không khí, đồng xu và lông chim rơi cùng lúc: cảnh đặt chúng ở các điểm coin, feather rồi di chuyển. Ống vẽ cả hai vật ở đáy. fill là màu trong của acrylic."
}
*/
const makeNewtonTube = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.03;
  const TUBE_H = 1.0;
  const CAP = 0.04;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0016));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Đế gang tròn và nắp dưới có van; ống hút khí đi ra phía bên phải.
  group.add(new Konva.Rect({ x: m(-0.058), y: m(-0.018), width: m(0.116), height: m(0.018), cornerRadius: m(0.004), ...lin(0, m(-0.018), 0, 0, [0, "#94a3b8", 0.2, "#334155", 1, "#0f172a"]), stroke: "#0b1220", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.044), y: m(-CAP - 0.018), width: m(0.088), height: m(CAP), cornerRadius: m(0.004), ...lin(m(-0.044), 0, m(0.044), 0, [0, "#475569", 0.3, "#e2e8f0", 0.65, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 4; i += 1) group.add(new Konva.Line({ points: [m(-0.044), m(-0.0305 - i * 0.0075), m(0.044), m(-0.0305 - i * 0.0075)], stroke: "rgba(15,23,42,0.28)", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(0.044), y: m(-0.039), width: m(0.036), height: m(0.014), ...lin(0, m(-0.039), 0, m(-0.025), steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(0.078), y: m(-0.0455), width: m(0.016), height: m(0.027), cornerRadius: m(0.003), ...lin(m(0.078), 0, m(0.094), 0, [0, "#7f1d1d", 0.5, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.8, listening: false }));
  for (let i = 0; i < 4; i += 1) group.add(new Konva.Line({ points: [m(0.0795 + i * 0.0038), m(-0.0445), m(0.0795 + i * 0.0038), m(-0.0195)], stroke: "rgba(0,0,0,0.3)", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(0.094), y: m(-0.0345), width: m(0.014), height: m(0.007), fill: "#cbd5e1", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Text({ x: m(0.044), y: m(-0.058), width: m(0.06), align: "center", text: "VACUUM", fontSize: m(0.0072), fontStyle: "bold", fill: "#e2e8f0", listening: false }));

  // Thân ống acrylic: hai thành trong suốt, đáy lòng ống và vệt phản chiếu dài.
  const tubeBottom = -(CAP + 0.018);
  const tubeTop = tubeBottom - TUBE_H;
  group.add(new Konva.Rect({ x: m(-R), y: m(tubeTop), width: m(2 * R), height: m(TUBE_H), ...lin(m(-R), 0, m(R), 0, [0, "rgba(125,211,252,0.5)", 0.18, "rgba(240,249,255,0.14)", 0.7, "rgba(224,242,254,0.12)", 1, "rgba(56,189,248,0.5)"]), stroke: "rgba(226,240,252,0.95)", strokeWidth: lw * 1.4, shadowColor: "#38bdf8", shadowBlur: m(0.02), shadowOpacity: 0.25, listening: false }));
  group.add(new Konva.Line({ points: [m(-R + 0.0065), m(tubeTop + 0.03), m(-R + 0.0065), m(tubeBottom - 0.02)], stroke: "rgba(255,255,255,0.7)", strokeWidth: lw * 2.4, lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(R - 0.007), m(tubeTop + 0.08), m(R - 0.007), m(tubeBottom - 0.2)], stroke: "rgba(255,255,255,0.28)", strokeWidth: lw * 1.6, lineCap: "round", listening: false }));
  group.add(new Konva.Ellipse({ x: 0, y: m(tubeBottom), radiusX: m(R), radiusY: m(0.005), fill: "rgba(14,116,144,0.4)", stroke: "rgba(226,240,252,0.85)", strokeWidth: lw, listening: false }));

  // Nắp trên có núm treo.
  group.add(new Konva.Rect({ x: m(-R - 0.008), y: m(tubeTop - CAP), width: m(2 * R + 0.016), height: m(CAP), cornerRadius: m(0.006), ...lin(m(-R), 0, m(R), 0, [0, "#475569", 0.3, "#e2e8f0", 0.65, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(tubeTop - CAP - 0.0075), radius: m(0.0075), stroke: "#cbd5e1", strokeWidth: m(0.003), listening: false }));
  // Vạch chia độ cao 10 cm trên thành ống.
  for (let h = 0; h <= 100; h += 10) {
    const y = tubeBottom - h / 100;
    group.add(new Konva.Line({ points: [m(R - 0.013), m(y), m(R - 0.0015), m(y)], stroke: "rgba(15,23,42,0.6)", strokeWidth: lw * 0.8, listening: false }));
    if (h % 20 === 0) group.add(new Konva.Text({ x: m(R + 0.003), y: m(y - 0.004), text: String(h), fontSize: m(0.0075), fill: "#94a3b8", listening: false }));
  }

  // Hai vật trong ống: đồng xu (dựng nghiêng) và lông chim nằm trên đáy.
  const coinX = -0.012;
  group.add(new Konva.Ellipse({ x: m(coinX), y: m(tubeBottom - 0.0055), radiusX: m(0.0145), radiusY: m(0.004), ...lin(m(coinX - 0.0145), 0, m(coinX + 0.0145), 0, [0, "#7c5a1a", 0.4, "#fde68a", 1, "#a47a1c"]), stroke: "#5e4210", strokeWidth: lw * 0.8, shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Ellipse({ x: m(coinX), y: m(tubeBottom - 0.0068), radiusX: m(0.0105), radiusY: m(0.0026), stroke: "rgba(94,66,16,0.6)", strokeWidth: lw * 0.6, listening: false }));
  const fx = 0.012;
  group.add(new Konva.Line({ points: [m(fx - 0.024), m(tubeBottom - 0.0045), m(fx + 0.026), m(tubeBottom - 0.0075)], stroke: "#e5e7eb", strokeWidth: lw * 1.1, lineCap: "round", listening: false }));
  for (let i = 0; i < 12; i += 1) {
    const t = i / 11;
    const bx = fx - 0.02 + t * 0.043;
    const by = tubeBottom - 0.0048 - t * 0.0028;
    group.add(new Konva.Line({ points: [m(bx), m(by), m(bx + 0.006), m(by - 0.0115 + t * 0.003)], stroke: "rgba(248,250,252,0.95)", strokeWidth: lw * 0.9, lineCap: "round", listening: false }));
    group.add(new Konva.Line({ points: [m(bx), m(by), m(bx + 0.0055), m(by + 0.0042 - t * 0.001)], stroke: "rgba(203,213,225,0.9)", strokeWidth: lw * 0.8, lineCap: "round", listening: false }));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.008), width: m(0.16), align: "center", text: label, fontSize: m(0.02), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, coin: { x: m(coinX), y: m(tubeBottom - 0.0055) }, feather: { x: m(fx), y: m(tubeBottom - 0.006) }, valve: { x: m(0.086), y: m(-0.032) } } };
};
