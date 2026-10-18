/* OBJECT-META
{
  "catalog": "Acquy / nguồn một chiều biến đổi",
  "title": "Nguồn điện một chiều để bàn 0–12 V: hộp kim loại có núm chỉnh điện áp, đồng hồ kim, công tắc và hai chốt ra đỏ – đen",
  "fill": "#334155",
  "anchor": "Giữa đáy hộp, chạm mặt bàn.",
  "useWhen": ["Cần nguồn một chiều để bàn 0–12 V có núm chỉnh áp, đồng hồ kim, công tắc, chốt ra đỏ – đen.","Cần cấp điện áp chỉnh được cho mạch điện học sinh."],
  "avoidWhen": ["Cần pin đơn có điện áp cố định: dùng pin.","Cần nguồn xoay chiều: dùng nguon-xoay-chieu.","Cần máy phát tín hiệu sin, vuông: dùng may-phat-tan-so."],
  "size": { "width": 0.188, "height": 0.108 },
  "parts": [
    { "name": "knob", "label": "Núm chỉnh điện áp", "motion": "rotate", "min": -135, "max": 135, "description": "Góc quay của núm chỉnh điện áp, độ theo chiều kim đồng hồ; 0° là chỉ thẳng lên, −135° ứng 0 V và +135° ứng 12 V." }
  ],
  "points": [
    { "name": "center", "description": "Giữa đáy hộp." },
    { "name": "plus", "description": "Chốt ra cực + (đỏ)." },
    { "name": "minus", "description": "Chốt ra cực − (đen)." },
    { "name": "knob", "description": "Tâm núm chỉnh điện áp." }
  ],
  "notes": "Hộp 0,17 m × 0,09 m, đầu ra một chiều 0–12 V, dòng tối đa 3 A. Núm quay một vòng 270°; đồng hồ kim bên trái chỉ điện áp thực tế. Dùng đặt điện áp cho mạch, không dùng thay pin cho vật nhạy. fill là màu vỏ hộp."
}
*/
const makeDcSupply = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const W = 0.17;
  const H = 0.09;
  const x0 = -W / 2;
  const y0 = -H - 0.006;

  // Bốn chân cao su và thân hộp sơn tĩnh điện có gờ viền.
  for (const x of [-0.07, 0.07]) group.add(new Konva.Rect({ x: m(x - 0.011), y: m(-0.006), width: m(0.022), height: m(0.006), cornerRadius: m(0.0015), fill: "#020617", listening: false }));
  group.add(new Konva.Rect({ x: m(x0), y: m(y0), width: m(W), height: m(H), cornerRadius: m(0.005), ...lin(0, m(y0), 0, m(y0 + H), [0, "#94a3b8", 0.2, fill, 1, "#0b1220"]), stroke: "#020617", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.5, shadowOffset: { x: m(0.002), y: m(0.005) }, listening: false }));
  group.add(ln([x0 + 0.006, y0 + 0.0025, x0 + W - 0.006, y0 + 0.0025], "rgba(255,255,255,0.35)", lw * 1.4));
  group.add(new Konva.Rect({ x: m(x0 + 0.006), y: m(y0 + 0.006), width: m(W - 0.012), height: m(H - 0.012), cornerRadius: m(0.003), stroke: "rgba(2,6,23,0.55)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Text({ x: m(x0 + 0.01), y: m(y0 + 0.009), text: "DC POWER SUPPLY", fontSize: m(0.0052), fontStyle: "bold", fill: "rgba(226,232,240,0.85)", listening: false }));

  // Đồng hồ vôn kim (bên trái): mặt trắng, vạch chia 0–12 và kim đỏ.
  const mx = -0.045;
  const my = y0 + 0.045;
  group.add(new Konva.Rect({ x: m(mx - 0.027), y: m(my - 0.022), width: m(0.054), height: m(0.044), cornerRadius: m(0.003), fill: "#020617", stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(mx - 0.0245), y: m(my - 0.0195), width: m(0.049), height: m(0.039), cornerRadius: m(0.002), ...lin(0, m(my - 0.0195), 0, m(my + 0.0195), [0, "#fefce8", 1, "#fef08a"]), stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  for (let i = 0; i <= 12; i += 1) {
    const a = (((-50 + i * (100 / 12)) - 90) * Math.PI) / 180;
    const r1 = 0.0285;
    const r2 = r1 - (i % 3 === 0 ? 0.0055 : 0.003);
    group.add(ln([mx + r1 * Math.cos(a), my + 0.0145 + r1 * Math.sin(a), mx + r2 * Math.cos(a), my + 0.0145 + r2 * Math.sin(a)], "#1f2937", i % 3 === 0 ? lw * 0.9 : lw * 0.5));
  }
  const na = ((-50 + 6 * (100 / 12) - 90) * Math.PI) / 180;
  group.add(ln([mx, my + 0.0145, mx + 0.025 * Math.cos(na), my + 0.0145 + 0.025 * Math.sin(na)], "#dc2626", lw * 1.1));
  group.add(new Konva.Circle({ x: m(mx), y: m(my + 0.0145), radius: m(0.0022), fill: "#1f2937", listening: false }));
  group.add(new Konva.Text({ x: m(mx - 0.0245), y: m(my - 0.0145), width: m(0.049), align: "center", text: "V", fontSize: m(0.0075), fontStyle: "bold", fill: "#1f2937", listening: false }));
  group.add(new Konva.Line({ points: [m(mx - 0.0245), m(my - 0.0195), m(mx + 0.002), m(my - 0.0195), m(mx - 0.0245), m(my - 0.002)], closed: true, fill: "rgba(255,255,255,0.22)", listening: false }));

  // Núm chỉnh điện áp (bên phải đồng hồ): thang chia độ cố định và núm quay có khía, chỉ báo trắng.
  const kx = 0.008;
  const ky = y0 + 0.037;
  for (let i = 0; i <= 12; i += 1) {
    const a = (((-135 + i * (270 / 12)) - 90) * Math.PI) / 180;
    const r1 = 0.0245;
    const r2 = r1 - (i % 3 === 0 ? 0.005 : 0.0028);
    group.add(ln([kx + r1 * Math.cos(a), ky + r1 * Math.sin(a), kx + r2 * Math.cos(a), ky + r2 * Math.sin(a)], "#e2e8f0", i % 3 === 0 ? lw * 1 : lw * 0.6));
  }
  group.add(new Konva.Text({ x: m(kx - 0.0185), y: m(ky + 0.0195), width: m(0.012), text: "0", fontSize: m(0.0048), fill: "#cbd5e1", listening: false }));
  group.add(new Konva.Text({ x: m(kx + 0.0075), y: m(ky + 0.0195), width: m(0.012), align: "right", text: "12", fontSize: m(0.0048), fill: "#cbd5e1", listening: false }));
  const knob = new Konva.Group({ x: m(kx), y: m(ky) });
  knob.add(new Konva.Circle({ radius: m(0.0165), fill: "#020617", shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.6, shadowOffset: { x: m(0.0015), y: m(0.0025) }, listening: false }));
  knob.add(new Konva.Circle({ radius: m(0.0155), ...lin(m(-0.0155), m(-0.0155), m(0.0155), m(0.0155), [0, "#f8fafc", 0.4, "#94a3b8", 1, "#1f2937"]), stroke: "#030712", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 24; i += 1) {
    const a = (i * Math.PI) / 12;
    knob.add(ln([0.0126 * Math.cos(a), 0.0126 * Math.sin(a), 0.0152 * Math.cos(a), 0.0152 * Math.sin(a)], "rgba(15,23,42,0.55)", lw * 0.9));
  }
  knob.add(new Konva.Circle({ radius: m(0.0105), ...lin(m(-0.01), m(-0.01), m(0.01), m(0.01), [0, "#e2e8f0", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw * 0.7, listening: false }));
  knob.add(new Konva.Line({ points: [0, m(-0.0095), 0, m(-0.0155)], stroke: "#ffffff", strokeWidth: lw * 2.2, lineCap: "round", listening: false }));
  group.add(knob);

  // Công tắc bập bênh và đèn báo bên phải, hai chốt cắm đỏ – đen ở hàng dưới.
  group.add(new Konva.Rect({ x: m(0.045), y: m(y0 + 0.028), width: m(0.017), height: m(0.012), cornerRadius: m(0.002), fill: "#020617", stroke: "#475569", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Line({ points: [m(0.0475), m(y0 + 0.0395), m(0.0595), m(y0 + 0.0395), m(0.0575), m(y0 + 0.0295), m(0.0495), m(y0 + 0.0295)], closed: true, ...lin(0, m(y0 + 0.0295), 0, m(y0 + 0.0395), [0, "#f1f5f9", 1, "#94a3b8"]), stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Circle({ x: m(0.0715), y: m(y0 + 0.034), radius: m(0.0028), fill: "#22c55e", shadowColor: "#4ade80", shadowBlur: m(0.008), shadowOpacity: 0.9, stroke: "#14532d", strokeWidth: lw * 0.6, listening: false }));
  for (const [dx, c, cc, sign] of [[0.038, "#ef4444", "#7f1d1d", "+"], [0.066, "#1f2937", "#030712", "−"]] as [number, string, string, string][]) {
    const px = dx;
    const py = y0 + H - 0.0165;
    group.add(new Konva.Circle({ x: m(px), y: m(py), radius: m(0.0065), ...lin(m(px - 0.0065), m(py - 0.0065), m(px + 0.0065), m(py + 0.0065), [0, "#f8fafc", 1, "#334155"]), stroke: "#020617", strokeWidth: lw, listening: false }));
    group.add(new Konva.Circle({ x: m(px), y: m(py), radius: m(0.0048), fillRadialGradientStartPoint: { x: m(-0.0015), y: m(-0.0015) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0048), fillRadialGradientColorStops: [0, "#fff", 0.35, c, 1, cc], stroke: cc, strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Circle({ x: m(px), y: m(py), radius: m(0.0016), fill: "#020617", listening: false }));
    group.add(new Konva.Text({ x: m(px - 0.0035), y: m(py - 0.0145), width: m(0.007), align: "center", text: sign, fontSize: m(0.0072), fontStyle: "bold", fill: c === "#ef4444" ? "#fca5a5" : "#cbd5e1", listening: false }));
  }
  group.add(new Konva.Text({ x: m(x0 + 0.012), y: m(y0 + H - 0.0215), text: "0–12 V  3 A", fontSize: m(0.0058), fill: "rgba(226,232,240,0.8)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.09), y: m(0.008), width: m(0.18), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { knob: { node: knob, motion: "rotate" as const, min: -135, max: 135 } },
    points: { center: { x: 0, y: 0 }, plus: { x: m(0.038), y: m(y0 + H - 0.0165) }, minus: { x: m(0.066), y: m(y0 + H - 0.0165) }, knob: { x: m(kx), y: m(ky) } },
  };
};
