/* OBJECT-META
{
  "catalog": "Lăng kính",
  "title": "Lăng kính thuỷ tinh tam giác đều (góc chiết quang 60°) đặt trên bàn xoay có thước độ, nền đen và mặt bên mờ",
  "fill": "#7dd3fc",
  "anchor": "Trọng tâm tiết diện lăng kính, trên trục quay của bàn xoay.",
  "useWhen": ["Cần lăng kính tam giác đều 60°, n ≈ 1,5, trên bàn xoay có thước độ để đo độ lệch và tán sắc.", "Cảnh quay lăng kính -40° đến 40° để tìm góc lệch cực tiểu."],
  "avoidWhen": ["Cần khối bán trụ để đo khúc xạ ở mặt phẳng và mặt cong: dùng khoi-ban-tru.", "Cần máy quang phổ hoàn chỉnh có khe, ống chuẩn trực: dùng quang-pho-ke; lăng kính này chỉ một khối thuỷ tinh."],
  "size": { "width": 0.164, "height": 0.183 },
  "parts": [
    { "name": "prism", "label": "Lăng kính", "motion": "rotate", "min": -40, "max": 40, "description": "Góc quay của lăng kính quanh trục qua trọng tâm, độ; dương là quay cùng chiều kim đồng hồ. Bàn xoay đứng yên với thước độ." }
  ],
  "points": [
    { "name": "center", "description": "Trọng tâm tiết diện." },
    { "name": "apex", "description": "Đỉnh của lăng kính (cạnh khúc xạ) khi chưa quay." },
    { "name": "baseLeft", "description": "Góc dưới trái của tiết diện khi chưa quay." },
    { "name": "baseRight", "description": "Góc dưới phải của tiết diện khi chưa quay." }
  ],
  "notes": "Tiết diện tam giác đều cạnh 0,1 m, trọng tâm cách đỉnh 0,0577 m và cách đáy 0,0289 m; chiết suất n ≈ 1,5. Hai mặt bên (trái và phải) là mặt khúc xạ, mặt đáy ở dưới là mặt mờ. Tia sáng và quang phổ (tán sắc) là hiện tượng do cảnh vẽ. fill là màu thuỷ tinh."
}
*/
const makePrism = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const S = 0.1;
  const H = (S * Math.sqrt(3)) / 2;
  const TOP = -(2 * H) / 3;
  const BOT = H / 3;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Bàn xoay: đĩa nhôm tròn có thước độ chia 5° và kim chỉ cố định.
  group.add(new Konva.Circle({ radius: m(0.082), ...lin(m(-0.082), m(-0.082), m(0.082), m(0.082), [0, "#e2e8f0", 0.4, "#64748b", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.003), y: m(0.006) }, listening: false }));
  group.add(new Konva.Circle({ radius: m(0.0765), fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0765), fillRadialGradientColorStops: [0, "#1f2937", 0.8, "#111827", 1, "#030712"], stroke: "#475569", strokeWidth: lw, listening: false }));
  for (let d = 0; d < 360; d += 5) {
    const a = (d * Math.PI) / 180;
    const major = d % 30 === 0;
    const r1 = 0.0765;
    const r2 = r1 - (major ? 0.0095 : 0.0048);
    group.add(ln([r1 * Math.sin(a), -r1 * Math.cos(a), r2 * Math.sin(a), -r2 * Math.cos(a)], "#e2e8f0", major ? lw * 1.2 : lw * 0.6));
    if (major) group.add(new Konva.Text({ x: m(0.0675 * Math.sin(a)), y: m(-0.0675 * Math.cos(a)), width: m(0.016), offsetX: m(0.008), offsetY: m(0.0033), rotation: d, align: "center", text: String(d), fontSize: m(0.0055), fontStyle: "bold", fill: "#cbd5e1", listening: false }));
  }
  // Kim chỉ ở mép trên bàn xoay.
  group.add(new Konva.Line({ points: [m(-0.005), m(-0.1005), m(0.005), m(-0.1005), 0, m(-0.083)], closed: true, fill: "#dc2626", stroke: "#7f1d1d", strokeWidth: lw * 0.7, lineJoin: "round", listening: false }));

  // BỘ PHẬN QUAY: lăng kính thuỷ tinh, gốc nhóm là trọng tâm. Hai mặt bên bóng, mặt đáy mờ.
  const prism = new Konva.Group({ x: 0, y: 0 });
  prism.add(new Konva.Line({ points: [0, m(TOP), m(S / 2), m(BOT), m(-S / 2), m(BOT)], closed: true, lineJoin: "round", ...lin(m(-S / 2), m(TOP), m(S / 2), m(BOT), [0, "rgba(224,242,254,0.7)", 0.4, "rgba(125,211,252,0.42)", 1, "rgba(14,116,144,0.55)"]), stroke: "rgba(241,245,249,0.95)", strokeWidth: lw * 1.8, shadowColor: "#38bdf8", shadowBlur: m(0.014), shadowOpacity: 0.55, listening: false }));
  prism.add(new Konva.Line({ points: [m(-0.0085), m(TOP + 0.017), m(-S / 2 + 0.0135), m(BOT - 0.0045)], stroke: "rgba(255,255,255,0.8)", strokeWidth: lw * 1.8, lineCap: "round", listening: false }));
  prism.add(new Konva.Line({ points: [m(0.0105), m(TOP + 0.02), m(S / 2 - 0.009), m(BOT - 0.0045)], stroke: "rgba(255,255,255,0.3)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  prism.add(new Konva.Line({ points: [m(-S / 2 + 0.006), m(BOT - 0.0035), m(S / 2 - 0.006), m(BOT - 0.0035)], stroke: "rgba(15,23,42,0.35)", strokeWidth: lw * 1.6, lineCap: "round", listening: false }));
  prism.add(new Konva.Line({ points: [m(-0.0125), m(TOP + 0.022), m(0), m(TOP + 0.011), m(0.0125), m(TOP + 0.022)], closed: false, stroke: "rgba(255,255,255,0.5)", strokeWidth: lw, lineJoin: "round", listening: false }));
  prism.add(new Konva.Text({ x: m(-0.012), y: m(BOT - 0.0235), width: m(0.024), align: "center", text: "60°", fontSize: m(0.0075), fontStyle: "bold", fill: "rgba(224,242,254,0.85)", listening: false }));
  group.add(prism);
  group.add(new Konva.Circle({ radius: m(0.0042), fill: "#f8fafc", stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.09), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { prism: { node: prism, motion: "rotate" as const, min: -40, max: 40 } },
    points: { center: { x: 0, y: 0 }, apex: { x: 0, y: m(TOP) }, baseLeft: { x: m(-S / 2), y: m(BOT) }, baseRight: { x: m(S / 2), y: m(BOT) } },
  };
};
