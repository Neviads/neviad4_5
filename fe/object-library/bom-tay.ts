/* OBJECT-META
{
  "catalog": "Bơm tay / bơm xe đạp",
  "title": "Bơm tay xe đạp: ống bơm thép sơn xanh có đế đạp chân, cán bơm thép kéo ra vào ống với tay cầm chữ T, vòi nối dây mềm ở dưới",
  "fill": "#2563eb",
  "anchor": "Giữa đáy đế, chạm mặt bàn.",
  "useWhen": ["Cần bơm xe đạp tay có ống thép, cán và tay cầm chữ T, hành trình 0,1 m nén khí.","Cần đế có bàn đạp và vòi cao su dẫn khí ra bên dưới."],
  "avoidWhen": ["Cần bình chứa khí kín có van đồng hồ: dùng binh-khi-kin.","Ống thép che kín bên trong, không thấy pít tông hay khí bị nén.","Không kèm săm xe hay đồng hồ đo áp."],
  "size": { "width": 0.14, "height": 0.321 },
  "parts": [
    { "name": "rod", "label": "Cán bơm", "motion": "slide", "axis": "up", "min": 0, "max": 0.1, "description": "Độ kéo cán bơm lên khỏi vị trí thấp nhất (ấn hết), mét; kéo lên thì thể tích buồng bơm tăng, ấn xuống thì khí bị nén." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy đế." },
    { "name": "handle", "description": "Giữa tay cầm chữ T ở vị trí ấn hết." },
    { "name": "nozzle", "description": "Đầu vòi nối dây mềm." }
  ],
  "notes": "Ống bơm cao 0,17 m, đường kính 0,035 m, hành trình cán bơm 0,1 m; cán dài 0,19 m kèm tay cầm chữ T nhựa đen. Đế sắt có hai bàn đạp để giẫm chân, vòi cao su ra ở bên dưới cạnh ống. Ấn xuống nén khí trong buồng, đẩy qua van một chiều vào săm xe. fill là màu sơn ống bơm."
}
*/
const makeHandPump = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const W = 0.035;
  const BOT = -0.02;
  const TOP = -0.19;

  // Đế sắt có hai bàn đạp ngang chìa ra hai phía, gân tăng cứng.
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.001), radiusX: m(0.066), radiusY: m(0.003), fill: "rgba(0,0,0,0.4)", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.065), y: m(-0.012), width: m(0.13), height: m(0.012), cornerRadius: m(0.003), ...lin(0, 0, 0, m(0.012), [0, "#6b7280", 0.35, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw, listening: false }));
  for (const s of [-1, 1]) group.add(new Konva.Rect({ x: m(s > 0 ? 0.03 : -0.07), y: m(-0.0165), width: m(0.04), height: m(0.0055), cornerRadius: m(0.0018), ...lin(0, 0, 0, m(0.0055), [0, "#e5e7eb", 1, "#475569"]), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(ln([-0.06, -0.0095, 0.06, -0.0095], "rgba(255,255,255,0.3)", lw * 1.2));
  group.add(new Konva.Rect({ x: m(-0.0235), y: m(BOT - 0.002), width: m(0.047), height: m(0.012), cornerRadius: m(0.002), ...lin(0, 0, m(0.047), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));

  // Vòi bên cạnh đáy ống nối dây cao su cong ra xa.
  group.add(ln([W / 2 - 0.001, BOT - 0.012, 0.045, BOT - 0.012], "#111827", m(0.0095)));
  group.add(ln([W / 2 - 0.001, BOT - 0.012, 0.045, BOT - 0.012], "#cbd5e1", m(0.006)));
  group.add(new Konva.Line({ points: [m(0.045), m(BOT - 0.012), m(0.062), m(BOT - 0.011), m(0.066), m(-0.012), m(0.052), m(-0.0105), m(0.046), m(-0.0085)], stroke: "#111827", strokeWidth: m(0.0058), lineCap: "round", tension: 0.5, listening: false }));
  group.add(new Konva.Line({ points: [m(0.045), m(BOT - 0.012), m(0.062), m(BOT - 0.011), m(0.066), m(-0.012), m(0.052), m(-0.0105), m(0.046), m(-0.0085)], stroke: "#4b5563", strokeWidth: m(0.0033), lineCap: "round", tension: 0.5, listening: false }));
  group.add(new Konva.Rect({ x: m(0.0405), y: m(-0.0125), width: m(0.012), height: m(0.0085), cornerRadius: m(0.002), ...lin(0, 0, m(0.012), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));

  // Ống bơm: thân thép sơn xanh, gờ sáng, nắp trên có lỗ cho cán, nhãn PUMP.
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(TOP), width: m(W), height: m(BOT - TOP), ...lin(0, 0, m(W), 0, [0, "#1e3a8a", 0.28, fill, 0.5, "#93c5fd", 1, "#172554"]), stroke: "#0f172a", strokeWidth: lw * 1.1, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.003) }, listening: false }));
  group.add(ln([-W / 2 + 0.0055, TOP + 0.003, -W / 2 + 0.0055, BOT - 0.004], "rgba(255,255,255,0.45)", lw * 1.8));
  group.add(ln([W / 2 - 0.004, TOP + 0.003, W / 2 - 0.004, BOT - 0.004], "rgba(0,0,0,0.35)", lw * 1.4));
  for (const y of [TOP + 0.024, BOT - 0.012]) group.add(new Konva.Rect({ x: m(-W / 2 - 0.0012), y: m(y), width: m(W + 0.0024), height: m(0.0042), ...lin(0, 0, m(W + 0.0024), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Text({ x: m(-W / 2), y: m(TOP + 0.06), width: m(W), align: "center", rotation: 0, text: "P\nU\nM\nP", fontSize: m(0.0075), fontStyle: "bold", fill: "#dbeafe", lineHeight: 1.1, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0225), y: m(TOP - 0.0085), width: m(0.045), height: m(0.0095), cornerRadius: m(0.003), ...lin(0, 0, m(0.045), 0, [0, "#6b7280", 0.35, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw, listening: false }));
  group.add(ln([-0.0175, TOP - 0.0055, 0.0175, TOP - 0.0055], "rgba(255,255,255,0.3)", lw));

  // BỘ PHẬN TRƯỢT: cán thép bóng xuyên qua nắp, tay cầm chữ T nhựa đen; gốc ở vị trí ấn hết.
  const rod = new Konva.Group({ x: 0, y: 0 });
  rod.add(new Konva.Rect({ x: m(-0.0035), y: m(TOP - 0.1), width: m(0.007), height: m(0.25), ...lin(0, 0, m(0.007), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  rod.add(new Konva.Rect({ x: m(-0.0125), y: m(TOP - 0.1085), width: m(0.025), height: m(0.0085), cornerRadius: m(0.002), ...lin(0, 0, m(0.025), 0, [0, "#475569", 0.4, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 0.8, listening: false }));
  rod.add(new Konva.Rect({ x: m(-0.0385), y: m(TOP - 0.1285), width: m(0.077), height: m(0.0125), cornerRadius: m(0.006), ...lin(0, 0, 0, m(0.0125), [0, "#6b7280", 0.35, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw, listening: false }));
  rod.add(ln([-0.032, TOP - 0.1262, 0.032, TOP - 0.1262], "rgba(255,255,255,0.3)", lw * 1.2));
  group.add(rod);
  rod.moveToBottom();

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.006), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { rod: { node: rod, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.1 } },
    points: { base: { x: 0, y: 0 }, handle: { x: 0, y: m(TOP - 0.1223) }, nozzle: { x: m(0.046), y: m(-0.0085) } },
  };
};
