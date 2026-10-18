/* OBJECT-META
{
  "catalog": "Ống phóng tia điện tử trong từ trường",
  "title": "Ống phóng electron hình cầu nằm giữa cặp cuộn dây Helmholtz: súng điện tử ở đáy, chùm electron phát sáng uốn thành vòng tròn do lực Lorentz",
  "fill": "#38bdf8",
  "anchor": "Giữa đáy chân đế, chạm mặt bàn.",
  "useWhen": ["Cần bóng cầu chứa heli có súng điện tử, hai cuộn dây Helmholtz, chùm electron uốn thành vòng tròn do lực Lorentz.", "Cảnh xác định tỉ số e/m hay r = m·v/(e·B) bằng bán kính quỹ đạo."],
  "avoidWhen": ["Cần chùm electron đi thẳng và tạo bóng chữ thập: dùng ong-crookes.", "Vật đã tích hợp sẵn cuộn dây và một vòng sáng cố định; đừng thêm cuộn dây hay nam châm riêng."],
  "size": { "width": 0.154, "height": 0.175 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy chân đế." },
    { "name": "gun", "description": "Miệng súng điện tử, nơi chùm electron bắt đầu." },
    { "name": "orbitCenter", "description": "Tâm quỹ đạo tròn của chùm electron." },
    { "name": "coilCenter", "description": "Tâm cặp cuộn dây Helmholtz, cũng là tâm bóng." }
  ],
  "notes": "Bóng cầu đường kính 0,11 m chứa khí heli ở áp suất thấp; súng điện tử gia tốc electron bằng hiệu điện thế khoảng 200 V. Từ trường đều hướng vuông góc vào mặt giấy do cặp cuộn dây (bán kính 0,075 m) tạo ra làm electron chuyển động tròn bán kính r = m·v/(e·B). Quỹ đạo xanh lục phát sáng khi electron va chạm nguyên tử khí. Chiều sáng của chùm là hiện tượng nhưng vẽ sẵn một vòng. fill là màu thuỷ tinh."
}
*/
const makeElectronBeamTube = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cy = -0.11;
  const R = 0.055;
  const RC = 0.075;
  const BR = 0.03;

  // Chân đế đen có hai chốt cắm điện cấp cho súng.
  group.add(new Konva.Rect({ x: m(-0.044), y: m(-0.014), width: m(0.088), height: m(0.014), cornerRadius: m(0.003), ...lin(0, 0, 0, m(0.014), [0, "#6b7280", 0.25, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  for (const [x, c, cc] of [[-0.028, "#ef4444", "#7f1d1d"], [0.028, "#1f2937", "#030712"]] as [number, string, string][]) {
    group.add(new Konva.Circle({ x: m(x), y: m(-0.007), radius: m(0.0042), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0042), fillRadialGradientColorStops: [0, "#fff", 0.35, c, 1, cc], stroke: cc, strokeWidth: lw * 0.6, listening: false }));
  }

  // Cuộn Helmholtz: vành đồng dày nằm sau bóng, các vòng dây nhìn nghiêng; vùng giữa hai cuộn có dấu × chỉ từ trường vào mặt giấy.
  group.add(new Konva.Circle({ x: 0, y: m(cy), radius: m(RC + 0.0045), ...lin(m(-RC), m(-RC), m(RC), m(RC), [0, "#fff7ed", 0.35, "#d97706", 1, "#431407"]), stroke: "#2a0a02", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(cy), radius: m(RC - 0.0045), fill: "#0b1220", stroke: "#431407", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 60; i += 1) {
    const a = (i * 2 * Math.PI) / 60;
    group.add(new Konva.Line({ points: [m((RC - 0.0043) * Math.cos(a)), m(cy + (RC - 0.0043) * Math.sin(a)), m((RC + 0.0043) * Math.cos(a)), m(cy + (RC + 0.0043) * Math.sin(a))], stroke: "rgba(67,20,7,0.55)", strokeWidth: lw * 0.6, listening: false }));
  }
  for (let gx = -2; gx <= 2; gx += 1) for (let gy = -2; gy <= 2; gy += 1) {
    const x = gx * 0.025;
    const y = cy + gy * 0.025;
    if (x * x + (y - cy) * (y - cy) < (R + 0.004) * (R + 0.004)) continue;
    group.add(new Konva.Line({ points: [m(x - 0.002), m(y - 0.002), m(x + 0.002), m(y + 0.002)], stroke: "rgba(250,204,21,0.45)", strokeWidth: lw * 1.1, listening: false }));
    group.add(new Konva.Line({ points: [m(x + 0.002), m(y - 0.002), m(x - 0.002), m(y + 0.002)], stroke: "rgba(250,204,21,0.45)", strokeWidth: lw * 1.1, listening: false }));
  }

  // Cổ bóng và trụ dẫn điện xuống đế.
  group.add(new Konva.Rect({ x: m(-0.0095), y: m(cy + R - 0.003), width: m(0.019), height: m(-0.014 - cy - R + 0.003), ...lin(0, 0, m(0.019), 0, [0, "rgba(148,163,184,0.6)", 0.4, "rgba(224,242,254,0.7)", 1, "rgba(100,116,139,0.6)"]), stroke: "rgba(226,240,252,0.9)", strokeWidth: lw * 1.1, listening: false }));
  // Bầu thuỷ tinh: nền trong mờ, viền sáng, vệt phản chiếu.
  group.add(new Konva.Circle({ x: 0, y: m(cy), radius: m(R), fillRadialGradientStartPoint: { x: m(-0.02), y: m(-0.022) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "rgba(255,255,255,0.18)", 0.6, "rgba(186,230,253,0.08)", 1, "rgba(56,189,248,0.3)"], stroke: "rgba(224,242,254,0.95)", strokeWidth: m(0.0022), shadowColor: fill, shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  // Súng điện tử: ống catot nằm ngang ở đáy bầu, miệng hướng sang phải.
  const gx0 = -0.012;
  const gy0 = cy + R - 0.0235;
  group.add(new Konva.Line({ points: [m(0), m(cy + R - 0.003), m(0), m(gy0)], stroke: "#cbd5e1", strokeWidth: lw * 1.3, listening: false }));
  group.add(new Konva.Rect({ x: m(gx0), y: m(gy0 - 0.0034), width: m(0.014), height: m(0.0068), cornerRadius: m(0.0012), ...lin(0, 0, 0, m(0.0068), steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(gx0 + 0.0125), y: m(gy0 - 0.0018), width: m(0.0035), height: m(0.0036), fill: "#f97316", shadowColor: "#fb923c", shadowBlur: m(0.006), shadowOpacity: 0.9, listening: false }));
  // Chùm electron tròn: sáng xanh lục, bán kính BR, tâm thấp hơn miệng súng một đoạn BR (tiếp tuyến ngang tại miệng súng).
  const bcx = gx0 + 0.016;
  const bcy = gy0 - BR;
  for (const [w, c, o] of [[0.0095, "rgba(52,211,153,0.16)", 1], [0.0055, "rgba(110,231,183,0.35)", 1], [0.0022, "#a7f3d0", 1], [0.0009, "#ecfdf5", 1]] as [number, string, number][]) {
    group.add(new Konva.Circle({ x: m(bcx), y: m(bcy), radius: m(BR), stroke: c, strokeWidth: m(w), opacity: o, shadowColor: "#34d399", shadowBlur: m(0.01), shadowOpacity: 0.7, listening: false }));
  }
  group.add(new Konva.Arrow({ points: [m(bcx + 0.0008), m(bcy + BR + 0.0), m(bcx + 0.014), m(bcy + BR + 0.0)], stroke: "#ecfdf5", fill: "#ecfdf5", strokeWidth: lw, pointerLength: m(0.004), pointerWidth: m(0.0035), listening: false }));
  // Phản chiếu cửa sổ trên bóng.
  group.add(new Konva.Arc({ x: 0, y: m(cy), innerRadius: m(R - 0.0085), outerRadius: m(R - 0.0042), angle: 52, rotation: 215, fill: "rgba(255,255,255,0.65)", listening: false }));
  group.add(new Konva.Circle({ x: m(-0.0375), y: m(cy - 0.0375), radius: m(0.0026), fill: "#fff", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.008), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: { base: { x: 0, y: 0 }, gun: { x: m(gx0 + 0.016), y: m(gy0) }, orbitCenter: { x: m(bcx), y: m(bcy) }, coilCenter: { x: 0, y: m(cy) } },
  };
};
