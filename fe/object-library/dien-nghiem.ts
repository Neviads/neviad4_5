/* OBJECT-META
{
  "catalog": "Điện nghiệm",
  "title": "Điện nghiệm lá vàng: bình thuỷ tinh trong có nút cách điện, thanh kim loại mang quả cầu ở trên và hai lá vàng mỏng ở dưới, đặt trên đế gỗ",
  "fill": "#fbbf24",
  "anchor": "Giữa đáy đế, chạm mặt bàn.",
  "useWhen": ["Cần dụng cụ phát hiện nhiễm điện với hai lá vàng xoè ra khi thanh kim loại nhiễm điện.", "Cảnh nhiễm điện do tiếp xúc hoặc hưởng ứng cần quả cầu kim loại trên cùng chạm vật nhiễm điện."],
  "avoidWhen": ["Cần dụng cụ đo độ lớn điện tích có thang chia: điện nghiệm này chỉ cho độ xoè, không có thang.", "Cần chỉ quả cầu tích điện trên dây treo: dùng qua-cau-tich-dien."],
  "size": { "width": 0.11, "height": 0.18 },
  "parts": [
    { "name": "leafLeft", "label": "Lá trái", "motion": "rotate", "min": 0, "max": 60, "description": "Góc xoè của lá trái quanh bản lề ở đầu thanh, độ theo chiều kim đồng hồ; 0° là lá rủ thẳng đứng, tăng thì lá bật ra phía trái." },
    { "name": "leafRight", "label": "Lá phải", "motion": "rotate", "min": -60, "max": 0, "description": "Góc xoè của lá phải quanh bản lề ở đầu thanh, độ theo chiều kim đồng hồ; 0° là lá rủ thẳng đứng, giảm xuống thì lá bật ra phía phải." }
  ],
  "points": [
    { "name": "knob", "description": "Tâm quả cầu kim loại ở trên cùng, nơi chạm vật nhiễm điện." },
    { "name": "hinge", "description": "Bản lề hai lá, đầu dưới thanh kim loại." },
    { "name": "base", "description": "Giữa đáy đế." }
  ],
  "notes": "Bình thuỷ tinh cao 0,1 m đường kính 0,08 m đặt trên đế gỗ; thanh kim loại xuyên nút cao su, đầu trên có quả cầu đường kính 0,022 m, đầu dưới mang hai lá vàng dài 0,03 m. Hai lá chụm khi chưa nhiễm điện, xoè ra khi thanh nhiễm điện (cùng dấu nên đẩy nhau). fill là màu lá vàng."
}
*/
const makeElectroscope = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const JW = 0.08;
  const baseH = 0.014;
  const jTop = -baseH - 0.1;
  const hingeY = -baseH - 0.05;

  // Đế gỗ tròn có vân.
  group.add(new Konva.Rect({ x: m(-0.0535), y: m(-baseH), width: m(0.107), height: m(baseH), cornerRadius: m(0.004), ...lin(0, 0, 0, m(baseH), [0, "#d6a15a", 0.5, "#a16207", 1, "#5a2d0c"]), stroke: "#3b1d08", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(ln([-0.048, -baseH + 0.003, 0.048, -baseH + 0.0035], "rgba(255,230,180,0.5)", lw));
  // Bình thuỷ tinh: lòng trong suốt, viền dày, miệng bình có vành.
  group.add(new Konva.Rect({ x: m(-JW / 2), y: m(jTop), width: m(JW), height: m(0.1), cornerRadius: m(0.004), fill: "rgba(186,230,253,0.1)", stroke: "rgba(226,240,252,0.9)", strokeWidth: m(0.0026), listening: false }));
  group.add(new Konva.Rect({ x: m(-JW / 2 + 0.0026), y: m(-baseH - 0.006), width: m(JW - 0.0052), height: m(0.006), fill: "rgba(148,163,184,0.45)", listening: false }));
  group.add(ln([-JW / 2 + 0.0065, jTop + 0.006, -JW / 2 + 0.0065, -baseH - 0.008], "rgba(255,255,255,0.55)", lw * 2));
  group.add(ln([JW / 2 - 0.005, jTop + 0.01, JW / 2 - 0.005, -baseH - 0.02], "rgba(255,255,255,0.22)", lw * 1.2));
  group.add(new Konva.Rect({ x: m(-JW / 2 - 0.002), y: m(jTop - 0.002), width: m(JW + 0.004), height: m(0.004), cornerRadius: m(0.0015), fill: "rgba(226,240,252,0.95)", stroke: "#94a3b8", strokeWidth: lw * 0.7, listening: false }));
  // Nút cao su cách điện ở cổ bình.
  group.add(new Konva.Rect({ x: m(-0.016), y: m(jTop - 0.012), width: m(0.032), height: m(0.014), cornerRadius: m(0.002), ...lin(0, 0, m(0.032), 0, [0, "#6b7280", 0.35, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.8, listening: false }));
  group.add(ln([-0.0125, jTop - 0.0105, -0.0125, jTop + 0.0005], "rgba(255,255,255,0.25)", lw));
  // Thanh kim loại từ quả cầu xuyên nút xuống đầu mang lá.
  group.add(new Konva.Rect({ x: m(-0.0021), y: m(jTop - 0.035), width: m(0.0042), height: m(hingeY - jTop + 0.035), ...lin(0, 0, m(0.0042), 0, steel), stroke: "#334155", strokeWidth: lw * 0.5, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(jTop - 0.046), radius: m(0.011), fillRadialGradientStartPoint: { x: m(-0.004), y: m(-0.004) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.011), fillRadialGradientColorStops: [0, "#ffffff", 0.35, "#cbd5e1", 0.8, "#64748b", 1, "#1e293b"], stroke: "#334155", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, shadowOffset: { x: m(0.0015), y: m(0.003) }, listening: false }));
  group.add(new Konva.Arc({ x: 0, y: m(jTop - 0.046), innerRadius: m(0.0072), outerRadius: m(0.0092), angle: 58, rotation: 205, fill: "rgba(255,255,255,0.85)", listening: false }));
  // Giá chữ T nhỏ làm bản lề cho hai lá.
  group.add(new Konva.Rect({ x: m(-0.0035), y: m(hingeY - 0.0025), width: m(0.007), height: m(0.005), cornerRadius: m(0.0012), ...lin(0, 0, m(0.007), 0, steel), stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));

  // BỘ PHẬN QUAY: hai lá vàng mỏng, bản lề ở đầu dưới thanh; lá treo thẳng xuống khi nghỉ.
  const leaf = (sign: number) => {
    const g = new Konva.Group({ x: sign * m(0.0016), y: m(hingeY + 0.002) });
    g.add(new Konva.Line({ points: [m(-0.0035), 0, m(0.0035), 0, m(0.0034), m(0.03), m(-0.0034), m(0.03)], closed: true, ...lin(0, 0, m(0.007), 0, [0, "#fef3c7", 0.4, fill, 1, "#92400e"]), stroke: "#92400e", strokeWidth: lw * 0.8, lineJoin: "round", listening: false }));
    g.add(new Konva.Line({ points: [m(-0.0016), m(0.002), m(-0.0016), m(0.028)], stroke: "rgba(255,255,255,0.7)", strokeWidth: lw * 0.9, lineCap: "round", listening: false }));
    return g;
  };
  const leafLeft = leaf(-1);
  const leafRight = leaf(1);
  group.add(leafLeft);
  group.add(leafRight);
  group.add(new Konva.Circle({ x: 0, y: m(hingeY + 0.002), radius: m(0.0022), fill: "#475569", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.006), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      leafLeft: { node: leafLeft, motion: "rotate" as const, min: 0, max: 60 },
      leafRight: { node: leafRight, motion: "rotate" as const, min: -60, max: 0 },
    },
    points: { knob: { x: 0, y: m(jTop - 0.046) }, hinge: { x: 0, y: m(hingeY + 0.002) }, base: { x: 0, y: 0 } },
  };
};
