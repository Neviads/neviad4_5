/* OBJECT-META
{
  "catalog": "Máng / ray (thẳng, nghiêng)",
  "title": "Máng nhôm hình chữ U dài 1 m có thước mm bên cạnh, hai chân đỡ chỉnh được và hai đầu chặn cao su",
  "fill": "#d4d8de",
  "anchor": "Đầu trái của máng, ở mép trên của thành trước.",
  "useWhen": ["Cần máng nhôm chữ U dài 1 m có thước mm, đầu chặn cao su, để vật chạy thẳng.","Cần mặt phẳng ngang chỉnh được chân đỡ cho bài đo vận tốc, gia tốc, va chạm."],
  "avoidWhen": ["Cần đệm khí hoặc ray quang học có băng đo: dùng ray-quang-hoc.","Cần mặt phẳng nghiêng chỉnh góc có thang độ: dùng mat-nghieng.","Cần ray cong: dùng mang-cong. Máng này chỉ thẳng, ma sát không bằng không."],
  "size": { "width": 1.016, "height": 0.164 },
  "parts": [],
  "points": [
    { "name": "start", "description": "Đầu trái của máng (vạch 0 cm)." },
    { "name": "end", "description": "Đầu phải của máng (vạch 100 cm)." },
    { "name": "groove", "description": "Giữa lòng máng ở đầu trái, nơi vật bắt đầu lăn." }
  ],
  "notes": "Máng dài 1,00 m, rộng 0,04 m, thành cao 0,03 m. Vẽ nằm ngang; muốn máng nghiêng thì cảnh đặt cả vật vào một nhóm đã quay một góc quanh đầu dưới. fill là màu nhôm."
}
*/
const makeTrough = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const LEN = 1.0;
  const WALL_H = 0.03;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Hai chân đỡ ống lồng với núm vặn chỉnh độ cao và đế cao su.
  for (const x of [0.12, LEN - 0.12]) {
    group.add(new Konva.Rect({ x: m(x - 0.011), y: m(WALL_H + 0.002), width: m(0.022), height: m(0.052), ...lin(m(x - 0.011), 0, m(x + 0.011), 0, steel), stroke: "#334155", strokeWidth: lw, listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.0075), y: m(WALL_H + 0.054), width: m(0.015), height: m(0.058), ...lin(m(x - 0.0075), 0, m(x + 0.0075), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Rect({ x: m(x + 0.011), y: m(WALL_H + 0.0295), width: m(0.012), height: m(0.0055), fill: "#cbd5e1", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Rect({ x: m(x + 0.021), y: m(WALL_H + 0.0235), width: m(0.011), height: m(0.0175), cornerRadius: m(0.003), ...lin(0, 0, m(0.011), 0, [0, "#7f1d1d", 0.5, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.7, listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.04), y: m(WALL_H + 0.112), width: m(0.08), height: m(0.01), cornerRadius: m(0.003), fill: "#111827", stroke: "#374151", strokeWidth: lw * 0.7, listening: false }));
  }

  // Thành sau của máng thấy được qua miệng máng, rồi lòng máng tối và thành trước.
  group.add(new Konva.Rect({ x: 0, y: m(-0.008), width: m(LEN), height: m(0.012), ...lin(0, m(-0.008), 0, m(0.004), [0, "#ffffff", 0.3, fill, 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(0.003), y: m(0.004), width: m(LEN - 0.006), height: m(0.009), ...lin(0, m(0.004), 0, m(0.013), [0, "#020617", 1, "#1e293b"]), listening: false }));
  group.add(new Konva.Line({ points: [m(0.003), m(0.0125), m(LEN - 0.003), m(0.0125)], stroke: "rgba(148,163,184,0.5)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: 0, y: m(0.0125), width: m(LEN), height: m(WALL_H - 0.0125), cornerRadius: [0, 0, m(0.004), m(0.004)], ...lin(0, m(0.0125), 0, m(WALL_H), [0, "#f8fafc", 0.12, fill, 0.8, "#94a3b8", 1, "#475569"]), stroke: "#334155", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.35, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  group.add(new Konva.Line({ points: [m(0.006), m(0.0145), m(LEN - 0.006), m(0.0145)], stroke: "rgba(255,255,255,0.8)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  // Thước dán trên thành trước: mm, 5 mm, cm; số mỗi 10 cm.
  group.add(new Konva.Rect({ x: m(0.006), y: m(0.0165), width: m(LEN - 0.012), height: m(0.0115), fill: "#fefce8", stroke: "#a16207", strokeWidth: lw * 0.6, listening: false }));
  for (let mm = 0; mm <= 988; mm += 2) {
    const x = 0.006 + mm / 1000;
    const cm = mm % 10 === 0;
    const ten = mm % 100 === 0;
    group.add(new Konva.Line({ points: [m(x), m(0.0165), m(x), m(0.0165 + (ten ? 0.0065 : cm ? 0.0042 : 0.0026))], stroke: "#0f172a", strokeWidth: ten ? lw : lw * 0.55, listening: false }));
    if (ten) group.add(new Konva.Text({ x: m(x - 0.01), y: m(0.0225), width: m(0.02), align: "center", text: String(mm / 10), fontSize: m(0.0042), fontStyle: "bold", fill: "#0f172a", listening: false }));
  }
  // Hai đầu chặn cao su.
  for (const x of [-0.008, LEN]) group.add(new Konva.Rect({ x: m(x), y: m(-0.012), width: m(0.008), height: m(0.044), cornerRadius: m(0.003), ...lin(m(x), 0, m(x + 0.008), 0, [0, "#4b5563", 0.5, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(0.2), y: m(WALL_H + 0.026), width: m(0.6), align: "center", text: label, fontSize: m(0.018), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { start: { x: 0, y: 0 }, end: { x: m(LEN), y: 0 }, groove: { x: m(0.008), y: m(0.006) } } };
};
