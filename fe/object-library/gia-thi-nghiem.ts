/* OBJECT-META
{
  "catalog": "Giá thí nghiệm (chân đế, trụ đứng, khớp nối, thanh ngang)",
  "title": "Giá thí nghiệm sắt: đế gang, trụ đứng, khớp nối trượt được và thanh ngang",
  "fill": "#334155",
  "anchor": "Giữa đáy chân đế, chạm mặt bàn.",
  "useWhen": ["Cần giá đỡ có chân đế, trụ đứng cao 0,70 m và khớp nối trượt lên xuống mang thanh ngang.", "Cảnh treo lò xo hoặc con lắc cần điểm treo ở đầu thanh ngang với độ cao chỉnh được."],
  "avoidWhen": ["Cần bàn hoặc mặt phẳng đặt dụng cụ: dùng ban-thi-nghiem.", "Cần giá có thang đo độ cao hoặc có nhiều khớp: giá này chỉ có một khớp trượt."],
  "size": { "width": 0.31, "height": 0.72 },
  "parts": [
    { "name": "clamp", "label": "Khớp nối", "motion": "slide", "axis": "up", "min": 0, "max": 0.36, "description": "Độ cao khớp nối trượt lên dọc trụ so với vị trí thấp nhất (mét); thanh ngang đi theo." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy chân đế." },
    { "name": "rodTop", "description": "Đỉnh trụ đứng." },
    { "name": "armEnd", "description": "Đầu thanh ngang khi khớp nối ở thấp nhất; vị trí thật = armEnd + clamp lên." }
  ],
  "notes": "Cao 0,70 m. fill là màu men sơn của đế. Khớp nối gồm khối kẹp, vít hãm trên, núm vặn bên trái và thanh ngang thò sang phải."
}
*/
const makeLabStand = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const BASE_W = 0.24;
  const BASE_H = 0.028;
  const ROD_X = -0.065;
  const ROD_R = 0.0065;
  const ROD_H = 0.7;
  const ARM_LEN = 0.26;
  const ARM_R = 0.0055;
  const BOSS = 0.042;
  const REST_Y = 0.2;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0025));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f1f5f9", 0.6, "#cbd5e1", 1, "#475569"];

  const group = new Konva.Group({ x: p.x, y: p.y });

  // Chân cao su dưới đế.
  for (const x of [-0.095, 0.095]) {
    group.add(new Konva.Rect({ x: m(x - 0.018), y: m(-0.004), width: m(0.036), height: m(0.004), cornerRadius: m(0.002), fill: "#0b1220", listening: false }));
  }
  // Đế gang phủ men.
  group.add(new Konva.Rect({
    x: m(-BASE_W / 2), y: m(-BASE_H - 0.004), width: m(BASE_W), height: m(BASE_H), cornerRadius: m(0.007),
    ...lin(0, m(-BASE_H - 0.004), 0, m(-0.004), [0, "#94a3b8", 0.15, fill, 1, "#0f172a"]),
    stroke: "#0b1220", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.004) }, listening: false,
  }));
  group.add(new Konva.Line({ points: [m(-BASE_W / 2 + 0.01), m(-BASE_H - 0.0015), m(BASE_W / 2 - 0.01), m(-BASE_H - 0.0015)], stroke: "rgba(255,255,255,0.35)", strokeWidth: lw, lineCap: "round", listening: false }));
  // Lỗ bắt vít và đầu bu lông.
  group.add(new Konva.Ellipse({ x: m(0.075), y: m(-0.018), radiusX: m(0.011), radiusY: m(0.0045), fill: "#020617", stroke: "#64748b", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Circle({ x: m(0.1), y: m(-0.018), radius: m(0.0035), fill: "#94a3b8", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));

  // Trụ đứng bằng thép mạ.
  const rodTop = -ROD_H;
  group.add(new Konva.Rect({ x: m(ROD_X - ROD_R), y: m(rodTop), width: m(ROD_R * 2), height: m(ROD_H - BASE_H - 0.004), cornerRadius: m(ROD_R), ...lin(m(ROD_X - ROD_R), 0, m(ROD_X + ROD_R), 0, steel), stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
  // Cổ ren giữ trụ ở đáy.
  group.add(new Konva.Rect({ x: m(ROD_X - 0.012), y: m(-BASE_H - 0.016), width: m(0.024), height: m(0.014), cornerRadius: m(0.003), ...lin(m(ROD_X - 0.012), 0, m(ROD_X + 0.012), 0, steel), stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));

  // BỘ PHẬN TRƯỢT: khớp nối quanh trụ. Gốc nhóm là tâm khớp ở vị trí thấp nhất.
  const clamp = new Konva.Group({ x: m(ROD_X), y: m(-REST_Y) });
  // Thanh ngang xuyên qua khối kẹp.
  clamp.add(new Konva.Rect({ x: m(-0.03), y: m(-ARM_R), width: m(ARM_LEN + 0.03), height: m(ARM_R * 2), cornerRadius: m(ARM_R), ...lin(0, m(-ARM_R), 0, m(ARM_R), [0, "#475569", 0.3, "#f8fafc", 0.65, "#cbd5e1", 1, "#475569"]), stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
  clamp.add(new Konva.Circle({ x: m(ARM_LEN), y: 0, radius: m(ARM_R * 1.05), fill: "#cbd5e1", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  // Khối kẹp chữ thập.
  clamp.add(new Konva.Rect({
    x: m(-BOSS / 2), y: m(-BOSS / 2), width: m(BOSS), height: m(BOSS), cornerRadius: m(0.006),
    ...lin(m(-BOSS / 2), 0, m(BOSS / 2), 0, [0, "#475569", 0.25, "#e2e8f0", 0.55, "#94a3b8", 1, "#334155"]),
    stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.35, listening: false,
  }));
  clamp.add(new Konva.Line({ points: [m(-BOSS / 2 + 0.004), m(-BOSS / 2 + 0.003), m(BOSS / 2 - 0.004), m(-BOSS / 2 + 0.003)], stroke: "rgba(255,255,255,0.6)", strokeWidth: lw, lineCap: "round", listening: false }));
  // Vít hãm phía trên: thân vít và núm có khía.
  clamp.add(new Konva.Rect({ x: m(-0.0035), y: m(-BOSS / 2 - 0.016), width: m(0.007), height: m(0.016), fill: "#cbd5e1", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  clamp.add(new Konva.Rect({ x: m(-0.012), y: m(-BOSS / 2 - 0.026), width: m(0.024), height: m(0.011), cornerRadius: m(0.004), ...lin(m(-0.012), 0, m(0.012), 0, [0, "#7f1d1d", 0.4, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.6, listening: false }));
  for (let i = -2; i <= 2; i += 1) clamp.add(new Konva.Line({ points: [m(i * 0.0042), m(-BOSS / 2 - 0.0255), m(i * 0.0042), m(-BOSS / 2 - 0.0165)], stroke: "rgba(0,0,0,0.3)", strokeWidth: lw * 0.6, listening: false }));
  // Núm vặn bên trái.
  clamp.add(new Konva.Rect({ x: m(-BOSS / 2 - 0.018), y: m(-0.0035), width: m(0.018), height: m(0.007), fill: "#cbd5e1", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  clamp.add(new Konva.Rect({ x: m(-BOSS / 2 - 0.03), y: m(-0.012), width: m(0.013), height: m(0.024), cornerRadius: m(0.004), ...lin(0, m(-0.012), 0, m(0.012), [0, "#7f1d1d", 0.4, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.6, listening: false }));
  group.add(clamp);

  if (label) {
    group.add(new Konva.Text({ x: m(-BASE_W / 2), y: m(0.012), width: m(BASE_W), align: "center", text: label, fontSize: m(0.02), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { clamp: { node: clamp, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.36 } },
    points: { base: { x: 0, y: 0 }, rodTop: { x: m(ROD_X), y: m(rodTop) }, armEnd: { x: m(ROD_X + ARM_LEN), y: m(-REST_Y) } },
  };
};
