/* OBJECT-META
{
  "catalog": "Máy phát tần số / máy phát âm tần",
  "title": "Máy phát hàm 0,1 Hz – 2 MHz: màn LED hiện tần số, núm lớn chỉnh tần số, nút chọn dạng sóng sin/vuông/tam giác, cổng ra BNC",
  "fill": "#cbd5e1",
  "anchor": "Giữa đáy máy, chạm mặt bàn.",
  "useWhen": ["Cần máy phát hàm 0,1 Hz – 2 MHz có màn LED tần số, núm chỉnh, chọn sóng sin, vuông, tam giác.","Cần tín hiệu điện tần số chỉnh được đưa ra cổng BNC cho loa hoặc dao động kí."],
  "avoidWhen": ["Cần nguồn một chiều chỉnh điện áp: dùng nguon-mot-chieu.","Cần màn hiển thị dạng sóng: dùng dao-dong-ki.","Cần nguồn xoay chiều 50 Hz cố định: dùng nguon-xoay-chieu."],
  "size": { "width": 0.3, "height": 0.115 },
  "parts": [
    { "name": "knob", "label": "Núm chỉnh tần số", "motion": "rotate", "min": -150, "max": 150, "description": "Góc xoay của núm lớn, độ; 0 ở giữa. Cảnh đổi tần số theo góc này và ghi lên màn hình." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy máy." },
    { "name": "display", "description": "Tâm màn hình tần số." },
    { "name": "output", "description": "Cổng ra BNC (OUTPUT) để nối loa hay cần rung." }
  ],
  "notes": "Màn hình hiện 1000.0 Hz mặc định; cảnh đặt chữ khác cho đúng tần số. Ba nút dạng sóng vẽ biểu tượng sin, vuông, tam giác. fill là màu mặt máy."
}
*/
const makeFunctionGenerator = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.29;
  const H = 0.105;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Chân cao su và thân máy: mặt trước sơn xám sáng, cạnh dưới vát.
  for (const x of [-0.115, 0.115]) group.add(new Konva.Rect({ x: m(x - 0.016), y: m(-0.006), width: m(0.032), height: m(0.006), cornerRadius: m(0.002), fill: "#0b0f19", listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(-H - 0.006), width: m(W), height: m(H), cornerRadius: m(0.008), ...lin(0, m(-H - 0.006), 0, m(-0.006), [0, "#f8fafc", 0.12, fill, 0.85, "#6b7280", 1, "#374151"]), stroke: "#1f2937", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.016), shadowOpacity: 0.5, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  group.add(ln([-W / 2 + 0.008, -H - 0.0035, W / 2 - 0.008, -H - 0.0035], "rgba(255,255,255,0.75)", lw * 1.4));
  group.add(new Konva.Text({ x: m(-W / 2 + 0.012), y: m(-H + 0.0), text: "FUNCTION GENERATOR", fontSize: m(0.0072), fontStyle: "bold", fill: "#1f2937", listening: false }));
  group.add(new Konva.Text({ x: m(W / 2 - 0.072), y: m(-H + 0.0), width: m(0.06), align: "right", text: "0,1 Hz – 2 MHz", fontSize: m(0.0058), fill: "#4b5563", listening: false }));

  // Màn hình LED hiện tần số và đơn vị.
  const dx = -0.126;
  const dy = -H + 0.0125;
  group.add(new Konva.Rect({ x: m(dx), y: m(dy), width: m(0.098), height: m(0.032), cornerRadius: m(0.004), fill: "#030712", stroke: "#111827", strokeWidth: lw * 1.2, listening: false }));
  group.add(new Konva.Rect({ x: m(dx + 0.003), y: m(dy + 0.003), width: m(0.092), height: m(0.026), cornerRadius: m(0.002), ...lin(0, m(dy + 0.003), 0, m(dy + 0.029), [0, "#1a0e03", 1, "#0a0601"]), listening: false }));
  group.add(new Konva.Text({ x: m(dx + 0.005), y: m(dy + 0.0045), width: m(0.07), align: "right", text: "1000.0", fontSize: m(0.0225), fontStyle: "bold", fontFamily: "Courier New", fill: "#fb923c", shadowColor: "#fb923c", shadowBlur: m(0.006), shadowOpacity: 0.7, listening: false }));
  group.add(new Konva.Text({ x: m(dx + 0.0765), y: m(dy + 0.0185), text: "Hz", fontSize: m(0.0092), fontStyle: "bold", fill: "#fb923c", listening: false }));
  group.add(new Konva.Text({ x: m(dx + 0.005), y: m(dy + 0.0045), text: "FREQ", fontSize: m(0.0038), fill: "#c2410c", listening: false }));

  // Ba nút chọn dạng sóng: biểu tượng sin, vuông, tam giác; sin đang sáng.
  const shapes = ["sin", "sq", "tri"] as const;
  shapes.forEach((kind, i) => {
    const x = dx + 0.002 + i * 0.0335;
    const y = dy + 0.0415;
    const on = kind === "sin";
    group.add(new Konva.Rect({ x: m(x), y: m(y), width: m(0.03), height: m(0.0175), cornerRadius: m(0.003), ...lin(0, m(y), 0, m(y + 0.0175), [0, "#e5e7eb", 0.2, on ? "#16a34a" : "#6b7280", 1, "#111827"]), stroke: "#030712", strokeWidth: lw * 0.8, listening: false }));
    const cx = x + 0.015;
    const cy = y + 0.00875;
    const pts: number[] = [];
    if (kind === "sin") for (let t = 0; t <= 20; t += 1) pts.push(cx - 0.0105 + (t * 0.021) / 20, cy - 0.0045 * Math.sin((t / 20) * Math.PI * 2));
    else if (kind === "sq") pts.push(cx - 0.0105, cy + 0.0045, cx - 0.0105, cy - 0.0045, cx, cy - 0.0045, cx, cy + 0.0045, cx + 0.0105, cy + 0.0045, cx + 0.0105, cy - 0.0045);
    else pts.push(cx - 0.0105, cy + 0.0045, cx - 0.0052, cy - 0.0045, cx + 0.0052, cy + 0.0045, cx + 0.0105, cy - 0.0045);
    group.add(new Konva.Line({ points: pts.map(m), stroke: on ? "#f0fdf4" : "#f3f4f6", strokeWidth: lw * 1.5, lineJoin: "round", listening: false }));
  });
  group.add(new Konva.Circle({ x: m(dx + 0.1085), y: m(dy + 0.05), radius: m(0.0021), fill: "#22c55e", shadowColor: "#22c55e", shadowBlur: m(0.005), shadowOpacity: 0.9, listening: false }));

  // Núm tần số lớn ở giữa-phải: viền khía, mặt kim loại và chỉ báo.
  const kx = 0.03;
  const ky = -H / 2 - 0.0035;
  for (let deg = -150; deg <= 150; deg += 30) {
    const a = (deg * Math.PI) / 180;
    group.add(ln([kx + 0.0345 * Math.sin(a), ky - 0.0345 * Math.cos(a), kx + 0.0385 * Math.sin(a), ky - 0.0385 * Math.cos(a)], "#1f2937", lw * (deg % 90 === 0 ? 1.6 : 1)));
  }
  const knob = new Konva.Group({ x: m(kx), y: m(ky) });
  knob.add(new Konva.Circle({ radius: m(0.0315), ...lin(m(-0.0315), m(-0.0315), m(0.0315), m(0.0315), [0, "#4b5563", 0.4, "#111827", 1, "#030712"]), stroke: "#000", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.55, shadowOffset: { x: 0, y: m(0.003) }, listening: false }));
  for (let i = 0; i < 36; i += 1) {
    const a = (i * Math.PI * 2) / 36;
    knob.add(ln([0.0285 * Math.sin(a), -0.0285 * Math.cos(a), 0.0315 * Math.sin(a), -0.0315 * Math.cos(a)], "rgba(255,255,255,0.22)", lw));
  }
  knob.add(new Konva.Circle({ radius: m(0.0245), ...lin(m(-0.0245), m(-0.0245), m(0.0245), m(0.0245), [0, "#e5e7eb", 0.4, "#6b7280", 1, "#1f2937"]), stroke: "#111827", strokeWidth: lw * 0.8, listening: false }));
  knob.add(new Konva.Circle({ radius: m(0.0215), fillRadialGradientStartPoint: { x: m(-0.007), y: m(-0.008) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0215), fillRadialGradientColorStops: [0, "#f3f4f6", 0.6, "#9ca3af", 1, "#4b5563"], listening: false }));
  knob.add(new Konva.Line({ points: [0, m(-0.0075), 0, m(-0.0215)], stroke: "#dc2626", strokeWidth: m(0.0034), lineCap: "round", listening: false }));
  knob.add(new Konva.Circle({ radius: m(0.0042), fill: "#374151", listening: false }));
  group.add(knob);
  group.add(new Konva.Text({ x: m(kx - 0.03), y: m(ky + 0.0405), width: m(0.06), align: "center", text: "FREQUENCY", fontSize: m(0.0052), fontStyle: "bold", fill: "#1f2937", listening: false }));

  // Hai núm nhỏ AMPL và OFFSET, cổng ra BNC và nút nguồn.
  const smalls: [number, string][] = [[0.092, "AMPL"], [0.123, "OFFSET"]];
  for (const [x, text] of smalls) {
    group.add(new Konva.Circle({ x: m(x), y: m(-H + 0.027), radius: m(0.0115), ...lin(m(x - 0.0115), 0, m(x + 0.0115), 0, [0, "#6b7280", 0.4, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.8, shadowColor: "#000", shadowBlur: m(0.003), shadowOpacity: 0.4, listening: false }));
    group.add(ln([x, -H + 0.027 - 0.0025, x + 0.0045, -H + 0.027 - 0.0102], "#f8fafc", lw * 1.5));
    group.add(new Konva.Text({ x: m(x - 0.02), y: m(-H + 0.0415), width: m(0.04), align: "center", text, fontSize: m(0.0045), fontStyle: "bold", fill: "#1f2937", listening: false }));
  }
  group.add(new Konva.Circle({ x: m(0.108), y: m(-0.0245), radius: m(0.0095), ...lin(m(0.0985), 0, m(0.1175), 0, [0, "#64748b", 0.4, "#f8fafc", 1, "#475569"]), stroke: "#1f2937", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: m(0.108), y: m(-0.0245), radius: m(0.006), fill: "#0b0f19", stroke: "#9ca3af", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Circle({ x: m(0.108), y: m(-0.0245), radius: m(0.0021), fill: "#fbbf24", listening: false }));
  group.add(new Konva.Text({ x: m(0.092), y: m(-0.0135), width: m(0.032), align: "center", text: "OUTPUT 50 Ω", fontSize: m(0.0042), fontStyle: "bold", fill: "#1f2937", listening: false }));
  group.add(new Konva.Rect({ x: m(0.1285), y: m(-0.0295), width: m(0.011), height: m(0.011), cornerRadius: m(0.002), ...lin(0, m(-0.0295), 0, m(-0.0185), [0, "#fecaca", 0.3, "#dc2626", 1, "#450a0a"]), stroke: "#450a0a", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Text({ x: m(0.1215), y: m(-0.0165), width: m(0.025), align: "center", text: "POWER", fontSize: m(0.0036), fill: "#1f2937", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.14), y: m(0.006), width: m(0.28), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { knob: { node: knob, motion: "rotate" as const, min: -150, max: 150 } },
    points: { base: { x: 0, y: 0 }, display: { x: m(dx + 0.049), y: m(dy + 0.016) }, output: { x: m(0.108), y: m(-0.0245) } },
  };
};
