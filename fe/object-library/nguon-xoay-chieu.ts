/* OBJECT-META
{
  "catalog": "Nguồn xoay chiều / máy biến thế nguồn",
  "title": "Biến thế nguồn học sinh 3–12 V xoay chiều: hộp nhựa xám có núm chọn mức điện áp, dây cắm điện lưới, đèn báo và hai chốt ra ký hiệu ~",
  "fill": "#475569",
  "anchor": "Giữa đáy hộp, chạm mặt bàn.",
  "useWhen": ["Cần biến thế nguồn học sinh vào 220 V, ra xoay chiều 3, 6, 9 hoặc 12 V có núm chọn.", "Cần hai chốt ra ký hiệu ~ (đỏ, đen) và đèn báo nguồn cho mạch điện xoay chiều lớp học."],
  "avoidWhen": ["Cần nguồn một chiều có cực + và −: dùng nguon-mot-chieu.", "Cần máy phát điện hay khung dây quay tạo dòng xoay chiều thì không dùng vật này; đây chỉ là hộp biến thế."],
  "size": { "width": 0.234, "height": 0.1 },
  "parts": [
    { "name": "knob", "label": "Núm chọn điện áp", "motion": "rotate", "min": -60, "max": 60, "description": "Góc quay của núm chọn mức điện áp ra, độ theo chiều kim đồng hồ; −60° ứng 3 V, −20° ứng 6 V, +20° ứng 9 V, +60° ứng 12 V." }
  ],
  "points": [
    { "name": "center", "description": "Giữa đáy hộp." },
    { "name": "outA", "description": "Chốt ra xoay chiều thứ nhất (đỏ)." },
    { "name": "outB", "description": "Chốt ra xoay chiều thứ hai (đen)." },
    { "name": "plug", "description": "Đầu phích cắm điện lưới." }
  ],
  "notes": "Hộp 0,15 m × 0,085 m, vào 220 V qua dây dài 0,06 m, ra xoay chiều 3 – 6 – 9 – 12 V. Núm chọn mức điện áp quay trong khoảng ±60°. Đèn báo xanh bật khi cắm điện. fill là màu vỏ hộp."
}
*/
const makeAcSupply = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const W = 0.15;
  const H = 0.085;
  const x0 = -W / 2 + 0.02;
  const y0 = -H - 0.005;

  // Dây điện lưới ra từ cạnh trái, lượn xuống bàn rồi tới phích cắm hai chấu.
  group.add(ln([x0, -0.03, x0 - 0.02, -0.012, x0 - 0.04, -0.02, x0 - 0.06, -0.008], "#030712", m(0.0064)));
  group.add(ln([x0, -0.03, x0 - 0.02, -0.012, x0 - 0.04, -0.02, x0 - 0.06, -0.008], "#475569", m(0.0044)));
  group.add(new Konva.Rect({ x: m(x0 - 0.1), y: m(-0.0148), width: m(0.04), height: m(0.0148), cornerRadius: m(0.003), ...lin(0, m(-0.0148), 0, 0, [0, "#e5e7eb", 0.5, "#9ca3af", 1, "#374151"]), stroke: "#0f172a", strokeWidth: lw * 0.9, listening: false }));
  for (const dy of [-0.0105, -0.0042]) group.add(new Konva.Rect({ x: m(x0 - 0.11), y: m(dy), width: m(0.011), height: m(0.0022), ...lin(0, m(dy), 0, m(dy + 0.0022), steel), listening: false }));
  group.add(ln([x0 - 0.095, -0.0125, x0 - 0.065, -0.0125], "rgba(255,255,255,0.5)", lw));

  // Hộp biến thế nhựa ABS: thân, nắp trên vát, khe thông gió và bốn chân.
  for (const x of [x0 + 0.015, x0 + W - 0.015]) group.add(new Konva.Rect({ x: m(x - 0.011), y: m(-0.005), width: m(0.022), height: m(0.005), cornerRadius: m(0.0015), fill: "#020617", listening: false }));
  group.add(new Konva.Rect({ x: m(x0), y: m(y0), width: m(W), height: m(H), cornerRadius: m(0.005), ...lin(0, m(y0), 0, m(y0 + H), [0, "#cbd5e1", 0.2, fill, 1, "#0f172a"]), stroke: "#020617", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.5, shadowOffset: { x: m(0.002), y: m(0.005) }, listening: false }));
  group.add(ln([x0 + 0.006, y0 + 0.0025, x0 + W - 0.006, y0 + 0.0025], "rgba(255,255,255,0.4)", lw * 1.4));
  for (let i = 0; i < 6; i += 1) group.add(ln([x0 + 0.013 + i * 0.0045, y0 + 0.0085, x0 + 0.013 + i * 0.0045, y0 + 0.021], "rgba(2,6,23,0.65)", lw * 1.4));
  group.add(new Konva.Text({ x: m(x0 + 0.04), y: m(y0 + 0.0105), text: "AC ADAPTER  220V → 3–12V", fontSize: m(0.0052), fontStyle: "bold", fill: "rgba(226,232,240,0.85)", listening: false }));

  // Núm chọn mức: thang mức 3-6-9-12 và núm quay lớn có chỉ báo.
  const kx = x0 + 0.054;
  const ky = y0 + 0.049;
  for (const [i, text] of [[-60, "3"], [-20, "6"], [20, "9"], [60, "12"]] as [number, string][]) {
    const a = ((i - 90) * Math.PI) / 180;
    group.add(ln([kx + 0.022 * Math.cos(a), ky + 0.022 * Math.sin(a), kx + 0.0265 * Math.cos(a), ky + 0.0265 * Math.sin(a)], "#f8fafc", lw * 1.1));
    group.add(new Konva.Text({ x: m(kx + 0.0325 * Math.cos(a) - 0.005), y: m(ky + 0.0325 * Math.sin(a) - 0.0035), width: m(0.01), align: "center", text, fontSize: m(0.0062), fontStyle: "bold", fill: "#f1f5f9", listening: false }));
  }
  const knob = new Konva.Group({ x: m(kx), y: m(ky) });
  knob.add(new Konva.Circle({ radius: m(0.0205), fill: "#020617", shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.55, shadowOffset: { x: m(0.002), y: m(0.003) }, listening: false }));
  knob.add(new Konva.Circle({ radius: m(0.0195), ...lin(m(-0.0195), m(-0.0195), m(0.0195), m(0.0195), [0, "#d1d5db", 0.35, "#4b5563", 1, "#030712"]), stroke: "#000", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 28; i += 1) {
    const a = (i * Math.PI) / 14;
    knob.add(ln([0.0165 * Math.cos(a), 0.0165 * Math.sin(a), 0.019 * Math.cos(a), 0.019 * Math.sin(a)], "rgba(255,255,255,0.28)", lw * 0.9));
  }
  knob.add(new Konva.Circle({ radius: m(0.0125), ...lin(m(-0.0125), m(-0.0125), m(0.0125), m(0.0125), [0, "#f8fafc", 0.45, "#94a3b8", 1, "#1f2937"]), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  knob.add(new Konva.Line({ points: [0, m(-0.0075), 0, m(-0.0185)], stroke: "#fbbf24", strokeWidth: lw * 2.6, lineCap: "round", listening: false }));
  knob.add(new Konva.Circle({ radius: m(0.0032), fill: "#1f2937", listening: false }));
  group.add(knob);

  // Đèn báo nguồn, công tắc và hai chốt ra "~" ở hàng bên phải.
  group.add(new Konva.Circle({ x: m(x0 + 0.1), y: m(y0 + 0.0375), radius: m(0.0033), fill: "#22c55e", shadowColor: "#4ade80", shadowBlur: m(0.01), shadowOpacity: 0.95, stroke: "#14532d", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Text({ x: m(x0 + 0.0925), y: m(y0 + 0.043), width: m(0.015), align: "center", text: "ON", fontSize: m(0.0048), fill: "#d1fae5", listening: false }));
  for (const [dy, c, cc] of [[0.0185, "#ef4444", "#7f1d1d"], [0.0495, "#1f2937", "#030712"]] as [number, string, string][]) {
    const px = x0 + W - 0.027;
    const py = y0 + dy + 0.0175;
    group.add(new Konva.Circle({ x: m(px), y: m(py), radius: m(0.0068), ...lin(m(px - 0.0068), m(py - 0.0068), m(px + 0.0068), m(py + 0.0068), [0, "#f8fafc", 1, "#334155"]), stroke: "#020617", strokeWidth: lw, listening: false }));
    group.add(new Konva.Circle({ x: m(px), y: m(py), radius: m(0.005), fillRadialGradientStartPoint: { x: m(-0.0015), y: m(-0.0015) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.005), fillRadialGradientColorStops: [0, "#fff", 0.35, c, 1, cc], stroke: cc, strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Circle({ x: m(px), y: m(py), radius: m(0.0017), fill: "#020617", listening: false }));
    group.add(new Konva.Text({ x: m(px - 0.015), y: m(py - 0.0035), width: m(0.007), align: "center", text: "~", fontSize: m(0.0085), fontStyle: "bold", fill: "#f1f5f9", listening: false }));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(0.008), width: m(0.2), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { knob: { node: knob, motion: "rotate" as const, min: -60, max: 60 } },
    points: { center: { x: m(x0 + W / 2), y: 0 }, outA: { x: m(x0 + W - 0.027), y: m(y0 + 0.036) }, outB: { x: m(x0 + W - 0.027), y: m(y0 + 0.067) }, plug: { x: m(x0 - 0.11), y: m(-0.0075) } },
  };
};
