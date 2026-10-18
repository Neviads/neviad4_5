/* OBJECT-META
{
  "catalog": "Ống đếm Geiger–Müller",
  "title": "Ống đếm Geiger–Müller: ống kim loại trụ có cửa sổ mica mỏng ở đầu, dây anot trục giữa, giắc cắm BNC ở đuôi và cáp dẫn ra bộ đếm",
  "fill": "#cbd5e1",
  "anchor": "Đầu ống (cửa sổ mica).",
  "useWhen": ["Cần ống đếm Geiger–Müller có cửa sổ mica ở đầu để đếm hạt alpha, beta.", "Cảnh cần điểm micaEnd hướng về nguồn phóng xạ, cáp dẫn ra bộ đếm."],
  "avoidWhen": ["Cần hộp chì chứa nguồn phóng xạ: dùng nguon-phong-xa; ống này chỉ là đầu dò.", "Vật không kèm bộ đếm hay màn số; số đếm phải do cảnh hiển thị riêng."],
  "size": { "width": 0.256, "height": 0.028 },
  "parts": [],
  "points": [
    { "name": "micaEnd", "description": "Cửa sổ mica ở đầu ống, nơi hạt đi vào." },
    { "name": "tail", "description": "Giắc cắm ở đuôi ống." }
  ],
  "notes": "Ống dài 0,1 m, đường kính 0,024 m, chứa khí loãng (argon + hơi cồn) ở áp suất thấp; thành ống là catot, dây vonfram dọc trục là anot, điện áp làm việc 400–500 V. Cửa sổ mica 2 mg/cm² cho hạt alpha, beta xuyên qua. Cáp dài 0,15 m nối với bộ đếm. fill là màu thành ống."
}
*/
const makeGeigerTube = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const L = 0.1;
  const R = 0.012;
  const vg = (x: number, y: number, w: number, h: number, stops: (number | string)[], r = 0.001) => new Konva.Rect({ x: m(x), y: m(y), width: m(w), height: m(h), cornerRadius: m(r), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(h) }, fillLinearGradientColorStops: stops, stroke: "#1e293b", strokeWidth: lw * 0.8, listening: false });

  // Cáp mềm lượn từ đuôi sang phải.
  const cable = [L + 0.032, 0, L + 0.06, 0.01, L + 0.1, -0.006, L + 0.15, 0.004];
  group.add(new Konva.Line({ points: cable.map(m), stroke: "#020617", strokeWidth: m(0.0045), lineCap: "round", tension: 0.5, listening: false }));
  group.add(new Konva.Line({ points: cable.map((v, i) => m(i % 2 ? v - 0.0009 : v)), stroke: "rgba(255,255,255,0.28)", strokeWidth: lw, lineCap: "round", tension: 0.5, listening: false }));

  // Thân ống: trụ thép có khía và nhãn.
  group.add(vg(0.0025, -R, L - 0.0025, R * 2, [0, "#475569", 0.25, "#f8fafc", 0.55, fill, 1, "#334155"], 0.002));
  group.add(new Konva.Line({ points: [m(0.006), m(-R + 0.0028), m(L - 0.004), m(-R + 0.0028)], stroke: "rgba(255,255,255,0.7)", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));
  for (const x of [0.02, 0.092]) group.add(new Konva.Line({ points: [m(x), m(-R), m(x), m(R)], stroke: "rgba(15,23,42,0.5)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Text({ x: m(0.026), y: m(-0.0036), width: m(0.06), align: "center", text: "G–M  500V", fontSize: m(0.0066), fontStyle: "bold", fill: "#1e293b", listening: false }));
  // Vòng bảo vệ đầu ống và cửa sổ mica nhìn nghiêng (lõm vào).
  group.add(vg(-0.0005, -R - 0.0015, 0.004, R * 2 + 0.003, [0, "#e2e8f0", 0.5, "#94a3b8", 1, "#334155"], 0.001));
  group.add(new Konva.Rect({ x: m(-0.0008), y: m(-R + 0.0025), width: m(0.0016), height: m(R * 2 - 0.005), fill: "rgba(224,242,254,0.9)", stroke: "#0ea5e9", strokeWidth: lw * 0.6, listening: false }));
  // Đuôi: cổ thuỷ tinh đen, giắc BNC bạc có chốt.
  group.add(vg(L, -0.0095, 0.012, 0.019, [0, "#6b7280", 0.35, "#1f2937", 1, "#030712"], 0.002));
  group.add(vg(L + 0.012, -0.0072, 0.016, 0.0144, [0, "#fff", 0.4, "#cbd5e1", 1, "#475569"], 0.001));
  for (let i = 0; i < 3; i += 1) group.add(new Konva.Line({ points: [m(L + 0.0145 + i * 0.0045), m(-0.0072), m(L + 0.0145 + i * 0.0045), m(0.0072)], stroke: "rgba(15,23,42,0.5)", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Circle({ x: m(L + 0.0285), y: 0, radius: m(0.0022), fill: "#e2e8f0", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  // Dây anot nhìn xuyên qua một cửa sổ cắt giữa thân (ống cắt dọc nhỏ).
  group.add(new Konva.Rect({ x: m(0.04), y: m(-0.0042), width: m(0.012), height: m(0.0084), fill: "#020617", stroke: "#475569", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Line({ points: [m(0.0405), 0, m(0.0515), 0], stroke: "#fde68a", strokeWidth: lw * 0.8, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.02), y: m(0.018), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { micaEnd: { x: 0, y: 0 }, tail: { x: m(L + 0.0285), y: 0 } } };
};
