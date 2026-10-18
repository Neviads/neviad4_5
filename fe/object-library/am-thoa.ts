/* OBJECT-META
{
  "catalog": "Âm thoa (có búa gõ, hộp cộng hưởng)",
  "title": "Âm thoa thép 440 Hz gắn trên hộp cộng hưởng bằng gỗ, kèm búa cao su gõ",
  "fill": "#c8873f",
  "anchor": "Giữa đáy hộp cộng hưởng, chạm mặt bàn.",
  "useWhen": ["Thí nghiệm sóng âm cần âm thoa 440 Hz gắn hộp cộng hưởng, có hai nhánh dao động ngược pha.","Cần búa cao su gõ làm âm thoa phát âm (điểm mallet)."],
  "avoidWhen": ["Cần nguồn âm khác (loa, dây đàn): dùng day-dan cho dây đàn, vật này chỉ là âm thoa đơn tần 440 Hz.","Hai nhánh chỉ dao động ngang trong mặt phẳng hình, không minh hoạ sóng âm lan trong không khí."],
  "size": { "width": 0.32, "height": 0.32 },
  "parts": [
    { "name": "prongLeft", "label": "Nhánh trái", "motion": "rotate", "min": -4, "max": 4, "description": "Góc dao động của nhánh trái quanh gốc nhánh, độ; dương là nghiêng sang phải. Hai nhánh dao động ngược pha." },
    { "name": "prongRight", "label": "Nhánh phải", "motion": "rotate", "min": -4, "max": 4, "description": "Góc dao động của nhánh phải quanh gốc nhánh, độ; dương là nghiêng sang phải. Khi nhánh trái +a thì nhánh phải −a." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy hộp." },
    { "name": "stemTop", "description": "Chỗ cuống âm thoa nối hai nhánh." },
    { "name": "tipLeft", "description": "Đầu nhánh trái ở tư thế nghỉ." },
    { "name": "tipRight", "description": "Đầu nhánh phải ở tư thế nghỉ." },
    { "name": "mallet", "description": "Đầu búa cao su." }
  ],
  "notes": "Hai nhánh cao 0,17 m, cách nhau 0,016 m, dao động ngược pha ở tần số 440 Hz; cảnh dùng tần số thật hay chậm lại để nhìn thấy. Hộp cộng hưởng hở một đầu về phía người nghe. fill là màu gỗ của hộp."
}
*/
const makeTuningFork = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const BOX_L = 0.22;
  const BOX_H = 0.085;
  const PRONG_H = 0.17;
  const GAP = 0.016;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const left = -BOX_L / 2;
  const top = -BOX_H - 0.006;
  const sx = -0.03;

  // Hộp cộng hưởng: thân gỗ có vân, miệng hở bên phải.
  for (const x of [-0.09, 0.09]) group.add(new Konva.Rect({ x: m(x - 0.012), y: m(-0.006), width: m(0.024), height: m(0.006), cornerRadius: m(0.002), fill: "#111827", listening: false }));
  group.add(new Konva.Rect({ x: m(left), y: m(top), width: m(BOX_L), height: m(BOX_H), cornerRadius: m(0.004), ...lin(0, m(top), 0, m(top + BOX_H), [0, "#e7b274", 0.12, fill, 0.8, "#8a5524", 1, "#5a3512"]), stroke: "#3b220c", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  for (let i = 0; i < 8; i += 1) group.add(new Konva.Line({ points: [m(left + 0.004), m(top + 0.008 + i * 0.0092), m(left + 0.07), m(top + 0.009 + i * 0.0092), m(left + BOX_L - 0.02), m(top + 0.0075 + i * 0.0092)], stroke: i % 2 ? "rgba(90,53,18,0.35)" : "rgba(255,230,190,0.25)", strokeWidth: lw * 0.6, tension: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(left + BOX_L - 0.0125), y: m(top + 0.012), width: m(0.014), height: m(BOX_H - 0.024), cornerRadius: m(0.003), fill: "#050a14", stroke: "#3b220c", strokeWidth: lw, listening: false }));

  // Cuống âm thoa vặn vào ổ trên nắp hộp.
  group.add(new Konva.Ellipse({ x: m(sx), y: m(top + 0.0008), radiusX: m(0.0145), radiusY: m(0.004), ...lin(m(sx - 0.0145), 0, m(sx + 0.0145), 0, steel), stroke: "#334155", strokeWidth: lw, listening: false }));
  const stemBottom = top;
  const stemTop = top - 0.055;
  group.add(new Konva.Rect({ x: m(sx - 0.0045), y: m(stemTop), width: m(0.009), height: m(stemBottom - stemTop), ...lin(m(sx - 0.0045), 0, m(sx + 0.0045), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  // Gốc chữ U nối cuống với hai nhánh.
  const ux = GAP / 2 + 0.0045;
  group.add(new Konva.Line({ points: [m(sx - ux - 0.004), m(stemTop - 0.018), m(sx - ux), m(stemTop - 0.002), m(sx), m(stemTop + 0.004), m(sx + ux), m(stemTop - 0.002), m(sx + ux + 0.004), m(stemTop - 0.018)], stroke: "#0f172a", strokeWidth: m(0.0105), lineCap: "round", lineJoin: "round", tension: 0.45, listening: false }));
  group.add(new Konva.Line({ points: [m(sx - ux - 0.004), m(stemTop - 0.018), m(sx - ux), m(stemTop - 0.002), m(sx), m(stemTop + 0.004), m(sx + ux), m(stemTop - 0.002), m(sx + ux + 0.004), m(stemTop - 0.018)], stroke: "#cbd5e1", strokeWidth: m(0.0082), lineCap: "round", lineJoin: "round", tension: 0.45, listening: false }));

  // BỘ PHẬN QUAY: hai nhánh, mỗi nhánh một nhóm quay quanh gốc ở đáy chữ U.
  const prong = (side: number) => {
    const g = new Konva.Group({ x: m(sx + side * (GAP / 2 + 0.0045)), y: m(stemTop - 0.018) });
    g.add(new Konva.Rect({ x: m(-0.0041), y: m(-PRONG_H), width: m(0.0082), height: m(PRONG_H), cornerRadius: m(0.0025), ...lin(m(-0.0041), 0, m(0.0041), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.25, listening: false }));
    g.add(new Konva.Line({ points: [m(side * -0.0018), m(-PRONG_H + 0.004), m(side * -0.0018), m(-0.004)], stroke: "rgba(255,255,255,0.85)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
    g.add(new Konva.Text({ x: m(-0.012), y: m(-PRONG_H * 0.55), width: m(0.024), align: "center", rotation: 0, text: "", fontSize: m(0.005), fill: "#0f172a", listening: false }));
    return g;
  };
  const prongLeft = prong(-1);
  const prongRight = prong(1);
  group.add(prongLeft, prongRight);
  group.add(new Konva.Text({ x: m(sx - 0.03), y: m(stemTop + 0.0), width: m(0.06), align: "center", text: "440", fontSize: m(0.007), fontStyle: "bold", fill: "#0f172a", listening: false }));

  // Búa cao su: đầu búa tròn và cán gỗ nằm trước hộp.
  const mx = 0.065;
  group.add(new Konva.Line({ points: [m(mx), m(-0.0045), m(mx + 0.11), m(-0.012)], stroke: "#8a5a2b", strokeWidth: m(0.0085), lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(mx + 0.002), m(-0.0062), m(mx + 0.105), m(-0.0132)], stroke: "rgba(255,225,180,0.55)", strokeWidth: m(0.0022), lineCap: "round", listening: false }));
  group.add(new Konva.Circle({ x: m(mx - 0.004), y: m(-0.0075), radius: m(0.0095), fillRadialGradientStartPoint: { x: m(mx - 0.007), y: m(-0.0105) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: m(mx - 0.004), y: m(-0.0075) }, fillRadialGradientEndRadius: m(0.0095), fillRadialGradientColorStops: [0, "#7f7f84", 0.5, "#4b4b50", 1, "#1c1c20"], stroke: "#000", strokeWidth: lw * 0.8, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(0.01), width: m(0.2), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      prongLeft: { node: prongLeft, motion: "rotate" as const, min: -4, max: 4 },
      prongRight: { node: prongRight, motion: "rotate" as const, min: -4, max: 4 },
    },
    points: { base: { x: 0, y: 0 }, stemTop: { x: m(sx), y: m(stemTop) }, tipLeft: { x: m(sx - ux), y: m(stemTop - 0.018 - PRONG_H) }, tipRight: { x: m(sx + ux), y: m(stemTop - 0.018 - PRONG_H) }, mallet: { x: m(mx - 0.004), y: m(-0.0075) } },
  };
};
