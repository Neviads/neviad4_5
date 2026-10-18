/* OBJECT-META
{
  "catalog": "Kính hiển vi",
  "title": "Kính hiển vi quang học nhìn ngang: đế móng ngựa, thân cong, bàn đặt mẫu có kẹp, ống kính có thị kính và đĩa vật kính, núm lấy nét",
  "fill": "#1f2937",
  "anchor": "Giữa đáy đế, chạm mặt bàn.",
  "useWhen": ["Cần kính hiển vi quang học nhìn ngang, ống nâng 0,02 m để lấy nét, thị kính ×10, vật kính ×40.", "Cảnh quan sát mẫu trên bàn đặt mẫu, có kẹp giữ tiêu bản."],
  "avoidWhen": ["Cần quan sát chuyển động Brown với vòng trường nhìn: dùng kinh-hien-vi-brown.", "Cần kính lúp cầm tay: dùng kinh-lup; cần kính thiên văn: dùng kinh-thien-van."],
  "size": { "width": 0.16, "height": 0.33 },
  "parts": [
    { "name": "tube", "label": "Ống kính", "motion": "slide", "axis": "up", "min": 0, "max": 0.02, "description": "Độ nâng ống kính (thị kính, đĩa vật kính, vật kính) so với vị trí thấp nhất, mét; nâng lên thì vật kính xa mẫu hơn, dùng để lấy nét." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy đế." },
    { "name": "stage", "description": "Giữa bàn đặt mẫu, nơi để tiêu bản." },
    { "name": "eyepiece", "description": "Mặt trên thị kính, nơi mắt đặt vào." },
    { "name": "objective", "description": "Đầu dưới vật kính ở vị trí thấp nhất của ống." }
  ],
  "notes": "Kính cao 0,33 m, đế rộng 0,156 m. Ống nâng hạ được 0,02 m để lấy nét; ở vị trí thấp nhất đầu vật kính cách tiêu bản 0,018 m. Thị kính ×10, vật kính ×40 (tổng 400 lần). Dùng cho quan sát tế bào, chuyển động Brown khi kèm mẫu nhỏ. fill là màu sơn thân và đế."
}
*/
const makeMicroscope = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const enamel = [0, "#9ca3af", 0.28, fill, 1, "#030712"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const col = (x: number, y: number, w: number, h: number, stops: (number | string)[], r = 0.0015) => new Konva.Rect({ x: m(x), y: m(y), width: m(w), height: m(h), cornerRadius: m(r), ...lin(m(x), 0, m(x + w), 0, stops), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cx = -0.03;

  // Đế móng ngựa sơn tĩnh điện với bốn chân cao su.
  group.add(new Konva.Rect({ x: m(-0.078), y: m(-0.026), width: m(0.156), height: m(0.026), cornerRadius: m(0.009), ...lin(0, m(-0.026), 0, 0, enamel), stroke: "#030712", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(ln([-0.068, -0.0235, 0.066, -0.0235], "rgba(255,255,255,0.28)", lw * 1.4));
  for (const x of [-0.062, 0.062]) group.add(new Konva.Rect({ x: m(x - 0.009), y: m(-0.003), width: m(0.018), height: m(0.003), fill: "#020617", listening: false }));

  // Thân cong: nét đen bên dưới, lớp sơn, vệt sáng bên trái và bóng bên phải.
  const arm = [0.05, -0.02, 0.06, -0.09, 0.052, -0.18, 0.015, -0.238, -0.03, -0.25];
  group.add(new Konva.Line({ points: arm.map(m), stroke: "#030712", strokeWidth: m(0.035), lineCap: "round", lineJoin: "round", tension: 0.45, listening: false }));
  group.add(new Konva.Line({ points: arm.map(m), stroke: fill, strokeWidth: m(0.03), lineCap: "round", lineJoin: "round", tension: 0.45, listening: false }));
  group.add(new Konva.Line({ points: arm.map((v, i) => m(i % 2 === 0 ? v - 0.0085 : v - 0.003)), stroke: "rgba(255,255,255,0.26)", strokeWidth: m(0.005), lineCap: "round", lineJoin: "round", tension: 0.45, listening: false }));
  group.add(new Konva.Line({ points: arm.map((v, i) => m(i % 2 === 0 ? v + 0.0085 : v + 0.003)), stroke: "rgba(0,0,0,0.35)", strokeWidth: m(0.005), lineCap: "round", lineJoin: "round", tension: 0.45, listening: false }));

  // Bàn đặt mẫu: mặt thép, tiêu bản kính có mẫu, hai kẹp lò xo và khe cho ánh sáng.
  group.add(new Konva.Rect({ x: m(0.012), y: m(-0.104), width: m(0.038), height: m(0.022), cornerRadius: m(0.002), ...lin(0, m(-0.104), 0, m(-0.082), enamel), stroke: "#030712", strokeWidth: lw * 0.8, listening: false }));
  group.add(col(-0.074, -0.1, 0.092, 0.008, steel, 0.0015));
  group.add(new Konva.Rect({ x: m(-0.056), y: m(-0.1055), width: m(0.05), height: m(0.0055), fill: "rgba(186,230,253,0.8)", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Circle({ x: m(cx), y: m(-0.1085), radius: m(0.0022), fill: "#be185d", stroke: "#500724", strokeWidth: lw * 0.5, listening: false }));
  for (const dx of [-0.052, -0.012]) group.add(ln([dx, -0.1055, dx + 0.004, -0.111, dx + 0.008, -0.1055], "#cbd5e1", lw * 0.9));

  // Tụ quang và đèn chiếu sáng bên dưới bàn.
  group.add(col(-0.0425, -0.088, 0.025, 0.01, steel, 0.0015));
  group.add(col(-0.052, -0.052, 0.044, 0.028, [0, "#374151", 0.3, "#9ca3af", 1, "#111827"], 0.003));
  group.add(new Konva.Ellipse({ x: m(cx), y: m(-0.052), radiusX: m(0.022), radiusY: m(0.0045), fill: "#fde68a", stroke: "#78350f", strokeWidth: lw * 0.6, shadowColor: "#fbbf24", shadowBlur: m(0.012), shadowOpacity: 0.9, listening: false }));
  group.add(col(-0.0345, -0.078, 0.009, 0.026, [0, "#475569", 0.5, "#e2e8f0", 1, "#334155"], 0.001));

  // Hai núm lấy nét đồng trục: thô (ngoài) và tinh (trong) có khía.
  for (const [r, stops] of [[0.0165, [0, "#6b7280", 0.4, "#e5e7eb", 1, "#374151"]], [0.0105, [0, "#475569", 0.4, "#cbd5e1", 1, "#1f2937"]]] as [number, (number | string)[]][]) {
    group.add(new Konva.Circle({ x: m(0.058), y: m(-0.125), radius: m(r), ...lin(m(0.058 - r), m(-0.125 - r), m(0.058 + r), m(-0.125 + r), stops), stroke: "#0f172a", strokeWidth: lw, listening: false }));
    for (let i = 0; i < 20; i += 1) {
      const a = (i * Math.PI) / 10;
      group.add(ln([0.058 + (r - 0.0022) * Math.cos(a), -0.125 + (r - 0.0022) * Math.sin(a), 0.058 + (r - 0.0006) * Math.cos(a), -0.125 + (r - 0.0006) * Math.sin(a)], "rgba(15,23,42,0.6)", lw * 0.8));
    }
  }
  group.add(new Konva.Circle({ x: m(0.058), y: m(-0.125), radius: m(0.0035), fill: "#0f172a", listening: false }));

  // Đầu thân giữ ống kính.
  group.add(new Konva.Rect({ x: m(-0.056), y: m(-0.268), width: m(0.07), height: m(0.032), cornerRadius: m(0.006), ...lin(0, m(-0.268), 0, m(-0.236), enamel), stroke: "#030712", strokeWidth: lw, listening: false }));
  group.add(ln([-0.05, -0.264, 0.006, -0.264], "rgba(255,255,255,0.3)", lw * 1.2));

  // BỘ PHẬN TRƯỢT: ống kính gồm thị kính, ống thân, đĩa vật kính và vật kính, gốc nhóm ở vị trí thấp nhất.
  const tube = new Konva.Group();
  tube.add(col(-0.046, -0.29, 0.032, 0.125, [0, "#111827", 0.28, "#4b5563", 0.55, "#1f2937", 1, "#030712"], 0.002));
  tube.add(col(-0.047, -0.222, 0.034, 0.005, steel, 0.001));
  tube.add(col(-0.047, -0.2, 0.034, 0.003, steel, 0.001));
  tube.add(col(-0.04, -0.316, 0.02, 0.03, steel, 0.0015));
  tube.add(col(-0.043, -0.322, 0.026, 0.01, [0, "#0b1220", 0.4, "#374151", 1, "#020617"], 0.003));
  tube.add(new Konva.Ellipse({ x: m(cx), y: m(-0.3225), radiusX: m(0.0085), radiusY: m(0.0016), fill: "rgba(56,189,248,0.7)", listening: false }));
  tube.add(new Konva.Text({ x: m(-0.0415), y: m(-0.2815), width: m(0.023), align: "center", text: "10×", fontSize: m(0.0066), fontStyle: "bold", fill: "#e2e8f0", listening: false }));
  // Đĩa vật kính hình thang với hai vật kính, một chiếc nghiêng.
  tube.add(new Konva.Line({ points: [m(-0.052), m(-0.17), m(-0.008), m(-0.17), m(-0.015), m(-0.151), m(-0.045), m(-0.151)], closed: true, ...lin(m(-0.052), 0, m(-0.008), 0, [0, "#6b7280", 0.35, "#e5e7eb", 1, "#374151"]), stroke: "#0f172a", strokeWidth: lw, lineJoin: "round", listening: false }));
  tube.add(ln([-0.047, -0.153, -0.06, -0.128], "#0f172a", m(0.0105)));
  tube.add(ln([-0.047, -0.153, -0.06, -0.128], "#9ca3af", m(0.0075)));
  tube.add(col(-0.0375, -0.153, 0.015, 0.032, [0, "#334155", 0.3, "#f8fafc", 0.6, "#94a3b8", 1, "#1e293b"], 0.0015));
  tube.add(col(-0.0375, -0.146, 0.015, 0.003, [0, "#0f172a", 0.5, "#fbbf24", 1, "#0f172a"], 0));
  tube.add(col(-0.0345, -0.121, 0.009, 0.003, [0, "#334155", 0.4, "#e2e8f0", 1, "#334155"], 0.001));
  tube.add(new Konva.Text({ x: m(-0.0375), y: m(-0.1415), width: m(0.015), align: "center", text: "40×", fontSize: m(0.0042), fontStyle: "bold", fill: "#f8fafc", listening: false }));
  group.add(tube);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(0.008), width: m(0.2), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { tube: { node: tube, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.02 } },
    points: { base: { x: 0, y: 0 }, stage: { x: m(cx), y: m(-0.1) }, eyepiece: { x: m(cx), y: m(-0.322) }, objective: { x: m(cx), y: m(-0.118) } },
  };
};
