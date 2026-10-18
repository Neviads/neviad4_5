/* OBJECT-META
{
  "catalog": "Thước thẳng có vạch chia",
  "title": "Thước thép 30 cm, chia mm, số ghi mỗi cm, có lỗ treo",
  "fill": "#cbd5e1",
  "anchor": "Vạch 0 cm ở mép trên thước (đo độ dài từ đây sang phải).",
  "useWhen": ["Cần thước thép 30 cm chia mm, số ghi mỗi cm, đo độ dài từ vạch 0 trùng điểm neo sang phải.","Cần thước đặt nằm ngang sát mép vật để đọc kích thước, quãng đường hay độ giãn."],
  "avoidWhen": ["Cần đo đường kính nhỏ chính xác 0,1 mm: dùng thuoc-kep; panme cho 0,01 mm.","Cần đo góc: dùng thuoc-do-goc.","Thước dài đúng 30 cm, quãng dài hơn phải ghép hay dùng vật khác."],
  "size": { "width": 0.316, "height": 0.036 },
  "parts": [],
  "points": [
    { "name": "zero", "description": "Vạch 0 cm." },
    { "name": "end", "description": "Vạch 30 cm." },
    { "name": "mid", "description": "Vạch 15 cm." }
  ],
  "notes": "Vạch 0 trùng điểm neo nên đặt thước ở một vật chỉ cần đặt điểm neo tại mép vật. Đặt nằm ngang; cảnh muốn thước thẳng đứng thì bọc vật vào một nhóm riêng. fill là màu thép của thân thước."
}
*/
const makeRuler = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const LEN = 0.3;
  const W = 0.036;
  const PAD = 0.008;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0012));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });

  const group = new Konva.Group({ x: p.x, y: p.y });

  // Thân thước thép, mép dưới vát.
  group.add(new Konva.Rect({
    x: m(-PAD), y: 0, width: m(LEN + 2 * PAD), height: m(W), cornerRadius: m(0.0025),
    ...lin(0, 0, 0, m(W), [0, "#f8fafc", 0.12, fill, 0.6, "#94a3b8", 1, "#64748b"]),
    stroke: "#334155", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.003) }, listening: false,
  }));
  group.add(new Konva.Line({ points: [m(-PAD + 0.003), m(0.0016), m(LEN + PAD - 0.003), m(0.0016)], stroke: "rgba(255,255,255,0.85)", strokeWidth: lw, lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(-PAD + 0.003), m(W - 0.0016), m(LEN + PAD - 0.003), m(W - 0.0016)], stroke: "rgba(15,23,42,0.35)", strokeWidth: lw, lineCap: "round", listening: false }));
  // Vết xước dọc của thép chải.
  for (let i = 0; i < 6; i += 1) {
    group.add(new Konva.Line({ points: [m(-0.004 + i * 0.011), m(0.026 + (i % 3) * 0.003), m(0.07 + i * 0.012), m(0.0265 + (i % 3) * 0.003)], stroke: "rgba(255,255,255,0.18)", strokeWidth: lw * 0.6, listening: false }));
  }

  // Vạch chia: mm, nửa cm và cm; số ghi mỗi cm.
  for (let mm = 0; mm <= 300; mm += 1) {
    const x = mm / 1000;
    const cm = mm % 10 === 0;
    const half = mm % 5 === 0;
    const h = cm ? 0.0135 : half ? 0.0095 : 0.0058;
    group.add(new Konva.Line({ points: [m(x), m(0.0016), m(x), m(0.0016 + h)], stroke: "#0f172a", strokeWidth: cm ? lw * 1.1 : lw * 0.7, listening: false }));
  }
  for (let c = 1; c <= 29; c += 1) {
    group.add(new Konva.Text({ x: m(c / 100 - 0.01), y: m(0.0165), width: m(0.02), align: "center", text: String(c), fontSize: m(0.0078), fontStyle: "bold", fill: "#0f172a", listening: false }));
  }
  group.add(new Konva.Text({ x: m(-0.0035), y: m(0.0165), text: "0", fontSize: m(0.0078), fontStyle: "bold", fill: "#0f172a", listening: false }));
  group.add(new Konva.Text({ x: m(LEN - 0.0095), y: m(0.0165), text: "30", fontSize: m(0.0078), fontStyle: "bold", fill: "#0f172a", listening: false }));
  group.add(new Konva.Text({ x: m(0.272), y: m(0.0255), text: "cm", fontSize: m(0.0075), fontStyle: "italic", fill: "#0f172a", listening: false }));
  // Lỗ treo ở đầu phải.
  group.add(new Konva.Circle({ x: m(LEN + 0.0035), y: m(W / 2 + 0.002), radius: m(0.0035), fill: "#0f172a", stroke: "#e2e8f0", strokeWidth: lw, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(0.02), y: m(W + 0.006), text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { zero: { x: 0, y: 0 }, end: { x: m(LEN), y: 0 }, mid: { x: m(LEN / 2), y: 0 } } };
};
