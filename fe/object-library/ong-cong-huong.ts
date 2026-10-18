/* OBJECT-META
{
  "catalog": "Ống cộng hưởng (ống thuỷ tinh + pít tông hay mực nước)",
  "title": "Ống cộng hưởng ngang: ống thuỷ tinh dài 0,9 m, pít tông xốp trượt trong ống, loa nhỏ ở đầu hở và thước mm dọc ống",
  "fill": "#7dd3fc",
  "anchor": "Giữa miệng ống ở đầu hở bên trái (chỗ loa).",
  "useWhen": ["Cần ống cộng hưởng ngang có loa ở đầu hở và pít tông trượt để đo bước sóng âm, tìm chỗ cộng hưởng.", "Cảnh cột khí một đầu kín, một đầu hở, L = (2k+1)·λ/4, có thước mm dọc ống."],
  "avoidWhen": ["Cần ống có mực nước dâng hạ thay pít tông: vật này dùng pít tông xốp, không có nước.", "Cần dao động dây đàn: dùng nhac-cu; vật này chỉ cho cột khí một đầu kín, không cho ống hở hai đầu."],
  "size": { "width": 1.14, "height": 0.12 },
  "parts": [
    { "name": "piston", "label": "Pít tông", "motion": "slide", "axis": "left", "min": 0, "max": 0.78, "description": "Độ dịch của pít tông về phía miệng ống so với vị trí xa nhất (mét); chiều dài cột khí L = 0,82 − piston. Thanh đẩy xuyên qua nắp phải đi theo và thụt vào. Chỉnh để tìm các chỗ cộng hưởng (L = (2k+1)·λ/4)." }
  ],
  "points": [
    { "name": "mouth", "description": "Giữa miệng ống, đầu hở." },
    { "name": "speaker", "description": "Tâm loa nhỏ đặt ở miệng ống." },
    { "name": "pistonFace", "description": "Mặt trái của pít tông ở vị trí xa miệng ống nhất (L = 0,82 m)." }
  ],
  "notes": "Ống dài 0,9 m, đường kính trong 0,04 m, chia mm; pít tông bằng xốp bọc nỉ nên sóng âm phản xạ ở mặt pít tông, nút sóng nằm ở đó. Loa phát âm đơn ở miệng ống. fill là màu thuỷ tinh."
}
*/
const makeResonanceTube = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const LEN = 0.9;
  const R = 0.022;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Hai chân đỡ ống bằng gỗ có rãnh tròn.
  for (const x of [0.12, LEN - 0.1]) {
    group.add(new Konva.Rect({ x: m(x - 0.025), y: m(R + 0.0), width: m(0.05), height: m(0.06), cornerRadius: m(0.004), ...lin(m(x - 0.025), 0, m(x + 0.025), 0, [0, "#d6b080", 0.5, "#c8873f", 1, "#6b4219"]), stroke: "#3b220c", strokeWidth: lw, listening: false }));
    group.add(new Konva.Ellipse({ x: m(x), y: m(R + 0.0), radiusX: m(0.0245), radiusY: m(0.006), fill: "rgba(59,34,12,0.4)", listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.04), y: m(R + 0.06), width: m(0.08), height: m(0.012), cornerRadius: m(0.003), fill: "#111827", stroke: "#374151", strokeWidth: lw * 0.7, listening: false }));
  }

  // Loa nhỏ ở đầu hở bên trái: hộp tròn với màng loa nhìn ngang.
  group.add(new Konva.Rect({ x: m(-0.086), y: m(-R - 0.004), width: m(0.08), height: m(2 * R + 0.008), cornerRadius: m(0.006), ...lin(0, m(-R), 0, m(R), [0, "#374151", 0.2, "#111827", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.004), m(-R + 0.004), m(0.004), m(-R + 0.012), m(0.004), m(R - 0.012), m(-0.004), m(R - 0.004)], closed: true, ...lin(m(-0.004), 0, m(0.004), 0, [0, "#9ca3af", 1, "#374151"]), stroke: "#0b0f19", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Text({ x: m(-0.086), y: m(-0.006), width: m(0.08), align: "center", text: "SPEAKER", fontSize: m(0.0072), fontStyle: "bold", fill: "#d1d5db", listening: false }));
  group.add(new Konva.Line({ points: [m(-0.086), m(0.012), m(-0.108), m(0.04), m(-0.128), m(0.052)], stroke: "#0b0f19", strokeWidth: m(0.0038), lineCap: "round", tension: 0.5, listening: false }));

  // Ống thuỷ tinh: hai thành trong suốt, vành miệng loe, vệt sáng; lòng ống tối nhẹ.
  group.add(new Konva.Rect({ x: 0, y: m(-R), width: m(LEN), height: m(2 * R), ...lin(0, m(-R), 0, m(R), [0, "rgba(186,230,253,0.5)", 0.2, "rgba(240,249,255,0.1)", 0.75, "rgba(224,242,254,0.08)", 1, "rgba(100,170,210,0.55)"]), stroke: "rgba(226,240,252,0.95)", strokeWidth: lw * 1.5, shadowColor: "#38bdf8", shadowBlur: m(0.014), shadowOpacity: 0.25, listening: false }));
  group.add(ln([0.006, -R + 0.005, LEN - 0.006, -R + 0.005], "rgba(255,255,255,0.7)", lw * 2.2));
  group.add(ln([0.02, R - 0.006, LEN * 0.6, R - 0.006], "rgba(255,255,255,0.25)", lw * 1.4));
  group.add(new Konva.Line({ points: [m(-0.004), m(-R - 0.003), m(0), m(-R), m(0), m(R), m(-0.004), m(R + 0.003)], stroke: "rgba(241,245,249,0.95)", strokeWidth: lw * 1.8, lineCap: "round", lineJoin: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(LEN - 0.0055), y: m(-R - 0.003), width: m(0.0055), height: m(2 * R + 0.006), cornerRadius: m(0.002), ...lin(m(LEN - 0.0055), 0, m(LEN), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  // Thước mm dán phía dưới ống: 0 ở miệng ống.
  group.add(new Konva.Rect({ x: 0, y: m(R + 0.001), width: m(LEN), height: m(0.012), fill: "#fefce8", stroke: "#a16207", strokeWidth: lw * 0.6, listening: false }));
  for (let cm = 0; cm <= 90; cm += 1) {
    const x = cm / 100;
    const ten = cm % 10 === 0;
    group.add(ln([x, R + 0.001, x, R + 0.001 + (ten ? 0.0065 : cm % 5 === 0 ? 0.0045 : 0.0028)], "#0f172a", ten ? lw : lw * 0.55));
    if (ten) group.add(new Konva.Text({ x: m(x - 0.01), y: m(R + 0.0065), width: m(0.02), align: "center", text: String(cm), fontSize: m(0.0042), fontStyle: "bold", fill: "#0f172a", listening: false }));
  }

  // BỘ PHẬN TRƯỢT: pít tông xốp nỉ nằm trong ống kèm thanh đẩy nhô ra bên phải. Gốc nhóm ở mặt pít tông.
  const piston = new Konva.Group({ x: m(0.82), y: 0 });
  piston.add(new Konva.Rect({ x: m(0), y: m(-R + 0.0025), width: m(0.04), height: m(2 * R - 0.005), cornerRadius: m(0.003), ...lin(0, m(-R), 0, m(R), [0, "#e8dcc4", 0.5, "#c9b896", 1, "#8a7a58"]), stroke: "#6b5b3a", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 12; i += 1) piston.add(new Konva.Circle({ x: m(0.006 + (i % 4) * 0.0085), y: m(-0.014 + Math.floor(i / 4) * 0.014), radius: m(0.0009), fill: "rgba(107,91,58,0.5)", listening: false }));
  piston.add(new Konva.Rect({ x: m(0.04), y: m(-0.0035), width: m(0.14), height: m(0.007), ...lin(0, m(-0.0035), 0, m(0.0035), steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  piston.add(new Konva.Rect({ x: m(0.18), y: m(-0.012), width: m(0.012), height: m(0.024), cornerRadius: m(0.004), ...lin(0, m(-0.012), 0, m(0.012), [0, "#fca5a5", 0.4, "#dc2626", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.8, listening: false }));
  group.add(piston);

  if (label) {
    group.add(new Konva.Text({ x: m(0.2), y: m(R + 0.074), width: m(0.5), align: "center", text: label, fontSize: m(0.016), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { piston: { node: piston, motion: "slide" as const, axis: "left" as const, min: 0, max: 0.78 } },
    points: { mouth: { x: 0, y: 0 }, speaker: { x: m(-0.046), y: 0 }, pistonFace: { x: m(0.82), y: 0 } },
  };
};
