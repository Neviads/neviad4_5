/* OBJECT-META
{
  "catalog": "Cần rung + dây (bộ sóng dừng)",
  "title": "Bộ sóng dừng trên dây: cần rung điện từ có thanh rung thẳng đứng, dây đàn căng ngang qua ròng rọc, đĩa treo quả cân và thước đo bước sóng",
  "fill": "#374151",
  "anchor": "Giữa đáy thân cần rung, chạm mặt bàn.",
  "useWhen": ["Cần bộ thí nghiệm sóng dừng trên dây với cần rung, ròng rọc, đĩa quả cân và thước 1 m.","Cần thanh rung thẳng đứng gắn đầu dây để tạo dao động cưỡng bức."],
  "avoidWhen": ["Cần thay đổi chiều dài dây bằng cầu di động và có hộp cộng hưởng: dùng day-dan.","Cần nguồn rung khác như loa hay âm thoa: dùng loa hoặc am-thoa."],
  "size": { "width": 1.216, "height": 0.214 },
  "parts": [
    { "name": "rod", "label": "Thanh rung", "motion": "slide", "axis": "up", "min": -0.006, "max": 0.006, "description": "Li độ của đầu thanh rung (mét), dương là lên trên. Dây buộc vào đầu thanh nên đầu trái của dây dao động theo; đầu phải cố định ở ròng rọc." }
  ],
  "points": [
    { "name": "vibrator", "description": "Giữa đáy thân cần rung." },
    { "name": "stringStart", "description": "Điểm buộc dây vào đầu thanh rung ở vị trí cân bằng." },
    { "name": "stringEnd", "description": "Điểm dây tiếp xúc ròng rọc, nút cố định bên phải." },
    { "name": "pan", "description": "Tâm đĩa treo quả cân." }
  ],
  "notes": "Dây dài 1,0 m căng ngang ở độ cao 0,2 m, đầu phải vắt qua ròng rọc treo đĩa quả cân (lực căng = m·g). Thước 1,0 m đặt dưới dây để đo bước sóng. Dây được vẽ thẳng nối đầu thanh rung với ròng rọc; đường dây dao động (sóng dừng) là hiện tượng do cảnh vẽ. fill là màu thân cần rung."
}
*/
const makeStandingWaveSetup = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const STR_Y = -0.2;
  const STR_X0 = 0.07;
  const STR_X1 = 1.07;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Bàn đế dài bằng nhôm với thước mm chạy suốt chiều dài dây.
  group.add(new Konva.Rect({ x: m(-0.08), y: m(-0.016), width: m(1.2), height: m(0.016), cornerRadius: m(0.004), ...lin(0, m(-0.016), 0, 0, [0, "#e2e8f0", 0.3, "#94a3b8", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  group.add(new Konva.Rect({ x: m(STR_X0), y: m(-0.0345), width: m(1.0), height: m(0.0185), fill: "#fefce8", stroke: "#a16207", strokeWidth: lw * 0.7, listening: false }));
  for (let cm = 0; cm <= 100; cm += 1) {
    const x = STR_X0 + cm / 100;
    const ten = cm % 10 === 0;
    group.add(ln([x, -0.0345, x, -0.0345 + (ten ? 0.0095 : cm % 5 === 0 ? 0.0065 : 0.004)], "#0f172a", ten ? lw * 1.1 : lw * 0.6));
    if (ten) group.add(new Konva.Text({ x: m(x - 0.012), y: m(-0.0235), width: m(0.024), align: "center", text: String(cm), fontSize: m(0.0072), fontStyle: "bold", fill: "#0f172a", listening: false }));
  }

  // Thân cần rung: hộp sắt có lỗ thông gió, đèn báo, núm biên độ và tần số; thanh rung nhô lên ở phía trên.
  group.add(new Konva.Rect({ x: m(-0.07), y: m(-0.114), width: m(0.14), height: m(0.098), cornerRadius: m(0.007), ...lin(0, m(-0.114), 0, m(-0.016), [0, "#6b7280", 0.12, fill, 1, "#030712"]), stroke: "#030712", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.45, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  group.add(ln([-0.06, -0.1115, 0.06, -0.1115], "rgba(255,255,255,0.4)", lw * 1.3));
  for (let i = 0; i < 6; i += 1) group.add(ln([-0.056, -0.094 + i * 0.0065, -0.012, -0.094 + i * 0.0065], "rgba(255,255,255,0.14)", lw * 1.2));
  group.add(new Konva.Circle({ x: m(0.036), y: m(-0.092), radius: m(0.0125), ...lin(m(0.0235), 0, m(0.0485), 0, [0, "#6b7280", 0.4, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw, listening: false }));
  group.add(ln([0.036, -0.0925, 0.0425, -0.1005], "#f8fafc", lw * 1.5));
  group.add(new Konva.Circle({ x: m(0.036), y: m(-0.057), radius: m(0.0095), ...lin(m(0.0265), 0, m(0.0455), 0, [0, "#6b7280", 0.4, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw, listening: false }));
  group.add(ln([0.036, -0.0575, 0.03, -0.0645], "#f8fafc", lw * 1.5));
  group.add(new Konva.Text({ x: m(0.02), y: m(-0.0765), width: m(0.032), align: "center", text: "AMPL", fontSize: m(0.0045), fill: "#9ca3af", listening: false }));
  group.add(new Konva.Text({ x: m(0.02), y: m(-0.0395), width: m(0.032), align: "center", text: "FREQ", fontSize: m(0.0045), fill: "#9ca3af", listening: false }));
  group.add(new Konva.Circle({ x: m(-0.052), y: m(-0.098), radius: m(0.0026), fill: "#22c55e", shadowColor: "#22c55e", shadowBlur: m(0.006), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Text({ x: m(-0.06), y: m(-0.0295), width: m(0.08), text: "VIBRATOR", fontSize: m(0.0062), fontStyle: "bold", fill: "#d1d5db", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0055), y: m(-0.158), width: m(0.011), height: m(0.044), ...lin(m(-0.0055), 0, m(0.0055), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));

  // BỘ PHẬN TRƯỢT: thanh rung đi lên xuống nhỏ, mang móc buộc dây. Gốc nhóm ở đầu thanh ở vị trí cân bằng (cao STR_Y).
  const rod = new Konva.Group({ x: m(0), y: m(STR_Y) });
  rod.add(new Konva.Rect({ x: m(-0.0042), y: m(0.0), width: m(0.0084), height: m(0.048), ...lin(m(-0.0042), 0, m(0.0042), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  rod.add(new Konva.Rect({ x: m(-0.0105), y: m(-0.006), width: m(0.021), height: m(0.012), cornerRadius: m(0.003), ...lin(m(-0.0105), 0, m(0.0105), 0, [0, "#7f1d1d", 0.5, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.8, listening: false }));
  rod.add(new Konva.Circle({ x: 0, y: m(0.0), radius: m(0.0024), fill: "#fbbf24", stroke: "#78350f", strokeWidth: lw * 0.6, listening: false }));
  group.add(rod);
  // Dây thép mảnh từ đầu thanh rung tới ròng rọc, đọc vị trí đầu thanh để dây bám theo.
  group.add(new Konva.Shape({
    stroke: "#e5e7eb", strokeWidth: Math.max(1, m(0.0012)), lineCap: "round", listening: false,
    sceneFunc: (ctx, shape) => {
      ctx.beginPath();
      ctx.moveTo(0, m(0) + (rod.y() || 0));
      ctx.lineTo(m(STR_X1), m(STR_Y));
      ctx.fillStrokeShape(shape);
    },
  }));

  // Giá đỡ ròng rọc ở đầu phải: trụ, ròng rọc và đĩa treo quả cân.
  group.add(new Konva.Rect({ x: m(STR_X1 - 0.006), y: m(STR_Y - 0.006), width: m(0.012), height: m(-STR_Y + 0.006 - 0.016), ...lin(m(STR_X1 - 0.006), 0, m(STR_X1 + 0.006), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(STR_X1 - 0.03), y: m(-0.016), width: m(0.06), height: m(0.016), cornerRadius: m(0.004), fill: "#334155", stroke: "#0f172a", strokeWidth: lw, listening: false }));
  const px = STR_X1 + 0.022;
  group.add(new Konva.Rect({ x: m(STR_X1 - 0.002), y: m(STR_Y - 0.014), width: m(0.03), height: m(0.012), cornerRadius: m(0.003), ...lin(0, m(STR_Y - 0.014), 0, m(STR_Y - 0.002), [0, "#e2e8f0", 1, "#64748b"]), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Circle({ x: m(px), y: m(STR_Y + 0.0), radius: m(0.0135), ...lin(m(px - 0.0135), m(STR_Y - 0.0135), m(px + 0.0135), m(STR_Y + 0.0135), [0, "#f8fafc", 0.4, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: m(px), y: m(STR_Y + 0.0), radius: m(0.0042), fill: "#334155", listening: false }));
  group.add(ln([STR_X1, STR_Y, px, STR_Y - 0.0135, px + 0.0135, STR_Y + 0.0], "#e5e7eb", lw * 1.1));
  group.add(ln([px + 0.0135, STR_Y, px + 0.0135, -0.075], "#e5e7eb", lw * 1.1));
  // Đĩa treo và hai quả cân hình trụ.
  group.add(new Konva.Rect({ x: m(px + 0.0105), y: m(-0.082), width: m(0.006), height: m(0.014), fill: "#cbd5e1", stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(px - 0.0165), y: m(-0.0765), width: m(0.06), height: m(0.007), cornerRadius: m(0.003), ...lin(m(px - 0.0165), 0, m(px + 0.0435), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  for (const [dx, dy, h] of [[0.0, -0.0555, 0.013], [0.012, -0.0555, 0.013]] as const) group.add(new Konva.Rect({ x: m(px + dx), y: m(dy), width: m(0.018), height: m(h), cornerRadius: m(0.002), ...lin(m(px + dx), 0, m(px + dx + 0.018), 0, [0, "#7c5a1a", 0.35, "#fde68a", 1, "#7c5a1a"]), stroke: "#4a3510", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Text({ x: m(px - 0.012), y: m(-0.0535), width: m(0.05), align: "center", text: "100 g", fontSize: m(0.0058), fontStyle: "bold", fill: "#4a3510", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(0.3), y: m(0.01), width: m(0.5), align: "center", text: label, fontSize: m(0.016), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { rod: { node: rod, motion: "slide" as const, axis: "up" as const, min: -0.006, max: 0.006 } },
    points: { vibrator: { x: 0, y: 0 }, stringStart: { x: 0, y: m(STR_Y) }, stringEnd: { x: m(STR_X1), y: m(STR_Y) }, pan: { x: m(px + 0.0135), y: m(-0.0555) } },
  };
};
