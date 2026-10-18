/* OBJECT-META
{
  "catalog": "Loa",
  "title": "Loa thùng cắt dọc: thùng gỗ, nam châm vòng, cuộn dây đồng ở khe từ, màng loa hình nón có nếp gấp và nắp bụi",
  "fill": "#7c4a1e",
  "anchor": "Giữa đáy thùng loa, chạm mặt bàn.",
  "useWhen": ["Cần loa thùng cắt dọc có màng nón dao động ±0,012 m, cuộn dây, nam châm vòng, âm ra bên phải.", "Cảnh về nguồn âm là dao động cơ của màng loa hay tác dụng lực từ lên cuộn dây."],
  "avoidWhen": ["Cần micro thu âm: dùng micro.", "Cần nguồn âm khác như âm thoa, nhạc cụ: dùng am-thoa, nhac-cu; loa này chỉ vẽ mặt cắt, không nhìn mặt trước."],
  "size": { "width": 0.24, "height": 0.34 },
  "parts": [
    { "name": "cone", "label": "Màng loa", "motion": "slide", "axis": "right", "min": -0.012, "max": 0.012, "description": "Li độ của màng loa (mét): dương là đẩy ra phía trước (bên phải), âm là kéo vào. Cuộn dây và nắp bụi đi theo màng." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy thùng." },
    { "name": "coneCenter", "description": "Tâm nắp bụi của màng loa ở vị trí cân bằng; chùm âm đi ra từ đây sang bên phải." },
    { "name": "terminal", "description": "Đầu nối dây tín hiệu ở phía sau thùng." }
  ],
  "notes": "Vẽ mặt cắt dọc: mặt trước hướng sang phải. Màng loa dày 0,2 mm đường kính 0,15 m, biên độ dao động vài mm (phóng to khi vẽ). Cuộn dây quấn trên ống nhôm đặt giữa khe nam châm. fill là màu gỗ của thùng."
}
*/
const makeSpeaker = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const DEPTH = 0.2;
  const H = 0.32;
  const FRONT = DEPTH / 2;
  const CY = -H / 2 - 0.006;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0015));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Chân đế và thùng loa: thành gỗ dày, mặt cắt tô sọc gỗ, bên trong có lớp xốp tiêu âm.
  for (const x of [-0.07, 0.07]) group.add(new Konva.Rect({ x: m(x - 0.014), y: m(-0.006), width: m(0.028), height: m(0.006), cornerRadius: m(0.002), fill: "#0b0f19", listening: false }));
  group.add(new Konva.Rect({ x: m(-DEPTH / 2), y: m(-H - 0.006), width: m(DEPTH), height: m(H), cornerRadius: m(0.006), ...lin(m(-DEPTH / 2), 0, m(DEPTH / 2), 0, [0, "#4a2b0e", 0.3, fill, 1, "#3b2209"]), stroke: "#2a1606", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.016), shadowOpacity: 0.45, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-DEPTH / 2 + 0.014), y: m(-H + 0.008), width: m(DEPTH - 0.028), height: m(H - 0.028), cornerRadius: m(0.003), ...lin(0, m(-H + 0.008), 0, m(-0.02), [0, "#e5dcc8", 1, "#c9bda0"]), stroke: "#8a7a58", strokeWidth: lw * 0.8, listening: false }));
  for (let i = 0; i < 16; i += 1) group.add(ln([-DEPTH / 2 + 0.018, -H + 0.016 + i * 0.0172, -DEPTH / 2 + 0.03, -H + 0.022 + i * 0.0172, -DEPTH / 2 + 0.042, -H + 0.016 + i * 0.0172], "rgba(138,122,88,0.5)", lw * 0.8));
  // Vân gỗ ở mặt cắt thành thùng.
  for (let i = 0; i < 6; i += 1) group.add(ln([-DEPTH / 2 + 0.002, -H - 0.003 + i * 0.002, DEPTH / 2 - 0.002, -H - 0.003 + i * 0.002], i % 2 ? "rgba(90,53,18,0.4)" : "rgba(255,230,190,0.3)", lw * 0.6));

  // Nam châm vòng và hai cực thép: sau lưng loa (bên trái), tô màu cực.
  group.add(new Konva.Rect({ x: m(-0.058), y: m(CY - 0.052), width: m(0.036), height: m(0.104), cornerRadius: m(0.004), ...lin(m(-0.058), 0, m(-0.022), 0, [0, "#1f2937", 0.3, "#4b5563", 1, "#0b0f19"]), stroke: "#030712", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.022), y: m(CY - 0.046), width: m(0.014), height: m(0.092), ...lin(m(-0.022), 0, m(-0.008), 0, [0, "#64748b", 0.5, "#f8fafc", 1, "#475569"]), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.008), y: m(CY - 0.052), width: m(0.012), height: m(0.032), ...lin(m(-0.008), 0, m(0.004), 0, [0, "#7f1d1d", 0.5, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.008), y: m(CY + 0.02), width: m(0.012), height: m(0.032), ...lin(m(-0.008), 0, m(0.004), 0, [0, "#1e3a8a", 0.5, "#3b82f6", 1, "#1e3a8a"]), stroke: "#0b1e63", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Text({ x: m(-0.0075), y: m(CY - 0.0455), text: "N", fontSize: m(0.0105), fontStyle: "bold", fill: "#fecaca", listening: false }));
  group.add(new Konva.Text({ x: m(-0.0075), y: m(CY + 0.0245), text: "S", fontSize: m(0.0105), fontStyle: "bold", fill: "#bfdbfe", listening: false }));
  // Giá khung kim loại (basket) giữ màng loa.
  group.add(new Konva.Line({ points: [m(0.0), m(CY - 0.06), m(0.034), m(CY - 0.078), m(FRONT - 0.016), m(CY - 0.078), m(FRONT - 0.016), m(CY - 0.084), m(0.034), m(CY - 0.084), m(0), m(CY - 0.066)], closed: true, fill: "#64748b", stroke: "#1e293b", strokeWidth: lw, lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(0.0), m(CY + 0.06), m(0.034), m(CY + 0.078), m(FRONT - 0.016), m(CY + 0.078), m(FRONT - 0.016), m(CY + 0.084), m(0.034), m(CY + 0.084), m(0), m(CY + 0.066)], closed: true, fill: "#64748b", stroke: "#1e293b", strokeWidth: lw, lineJoin: "round", listening: false }));

  // BỘ PHẬN TRƯỢT: màng loa hình nón (nhìn cắt), nếp gấp ngoài, nắp bụi và ống cuộn dây với cuộn dây đồng. Gốc nhóm ở tâm màng.
  const cone = new Konva.Group({ x: m(0.006), y: m(CY) });
  cone.add(new Konva.Line({ points: [m(0.058), m(-0.074), m(0.014), m(-0.026), m(0.01), m(-0.012), m(0.01), m(0.012), m(0.014), m(0.026), m(0.058), m(0.074), m(0.056), m(0.075), m(0.011), m(0.03), m(0.007), m(0.013), m(0.007), m(-0.013), m(0.011), m(-0.03), m(0.056), m(-0.075)], closed: true, ...lin(0, 0, m(0.06), 0, [0, "#4b5563", 0.5, "#e5e7eb", 1, "#6b7280"]), stroke: "#111827", strokeWidth: lw * 0.9, lineJoin: "round", listening: false }));
  cone.add(new Konva.Line({ points: [m(0.062), m(-0.074), m(0.07), m(-0.0805), m(0.082), m(-0.0805), m(0.089), m(-0.0735)], stroke: "#0b0f19", strokeWidth: m(0.0042), lineCap: "round", lineJoin: "round", tension: 0.5, listening: false }));
  cone.add(new Konva.Line({ points: [m(0.062), m(0.074), m(0.07), m(0.0805), m(0.082), m(0.0805), m(0.089), m(0.0735)], stroke: "#0b0f19", strokeWidth: m(0.0042), lineCap: "round", lineJoin: "round", tension: 0.5, listening: false }));
  cone.add(new Konva.Line({ points: [m(0.01), m(-0.011), m(0.0245), m(-0.0093), m(0.0245), m(0.0093), m(0.01), m(0.011)], closed: true, tension: 0.4, ...lin(0, m(-0.011), 0, m(0.011), [0, "#fca5a5", 0.5, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.8, listening: false }));
  cone.add(new Konva.Rect({ x: m(-0.03), y: m(-0.0105), width: m(0.04), height: m(0.021), fill: "#cbd5e1", stroke: "#475569", strokeWidth: lw * 0.7, listening: false }));
  for (let i = 0; i < 9; i += 1) cone.add(ln([-0.0285 + i * 0.0043, -0.0105, -0.0285 + i * 0.0043, 0.0105], "#b87333", lw * 1.6));
  group.add(cone);
  // Lưới che mặt loa (vẽ dọc, đè lên) và đầu nối dây phía sau thùng.
  group.add(new Konva.Rect({ x: m(FRONT - 0.014), y: m(-H + 0.01), width: m(0.012), height: m(H - 0.032), cornerRadius: m(0.003), fill: "rgba(15,23,42,0.88)", stroke: "#475569", strokeWidth: lw * 0.8, listening: false }));
  for (let i = 0; i < 18; i += 1) group.add(ln([FRONT - 0.012, -H + 0.016 + i * 0.0152, FRONT - 0.004, -H + 0.016 + i * 0.0152], "rgba(148,163,184,0.5)", lw * 0.7));
  const tx = -DEPTH / 2 - 0.004;
  group.add(new Konva.Circle({ x: m(tx), y: m(-0.06), radius: m(0.0075), fill: "#dc2626", stroke: "#450a0a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: m(tx), y: m(-0.085), radius: m(0.0075), fill: "#111827", stroke: "#374151", strokeWidth: lw, listening: false }));
  group.add(ln([tx + 0.007, -0.06, -0.075, -0.06, -0.06, CY + 0.02], "#b91c1c", m(0.003)));
  group.add(ln([tx + 0.007, -0.085, -0.08, -0.085, -0.06, CY - 0.012], "#0b0f19", m(0.003)));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(0.01), width: m(0.2), align: "center", text: label, fontSize: m(0.014), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { cone: { node: cone, motion: "slide" as const, axis: "right" as const, min: -0.012, max: 0.012 } },
    points: { base: { x: 0, y: 0 }, coneCenter: { x: m(0.006 + 0.0245), y: m(CY) }, terminal: { x: m(tx), y: m(-0.0725) } },
  };
};
