/* OBJECT-META
{
  "catalog": "Xe trượt trên đệm khí + đệm khí",
  "title": "Đệm khí tuyến tính: ray nhôm tam giác đục lỗ phun khí, ống dẫn khí từ máy thổi, xe trượt có tấm chắn sáng và đệm lò xo ở đầu ray",
  "fill": "#e2e8f0",
  "anchor": "Giữa mặt ray ngay dưới xe trượt, ở trạng thái xe trượt tại gốc.",
  "useWhen": ["Cần đệm khí tuyến tính dài 0,88 m với xe trượt có tấm chắn sáng rộng 0,02 m để đo vận tốc, ma sát gần bằng 0.","Cần ray có đệm lò xo ở đầu và ống dẫn khí để nghiên cứu va chạm hay định luật bảo toàn động lượng."],
  "avoidWhen": ["Cần xe lăn bánh có ổ bi chạy trên ray: dùng xe-lan.","Cần xe có ma sát lăn đo trên mặt phẳng nghiêng: dùng mat-nghieng và xe-lan.","Mũi tên xanh chỉ luồng khí chỉ là ký hiệu, không phải hiện tượng vật lý được mô phỏng."],
  "size": {
    "width": 0.975,
    "height": 0.177
  },
  "parts": [
    {
      "name": "glider",
      "label": "Xe trượt",
      "motion": "slide",
      "axis": "right",
      "min": 0,
      "max": 0.65,
      "description": "Vị trí xe trượt dọc ray so với gốc (mét); cánh xe nằm trên lớp đệm khí nên không có ma sát."
    }
  ],
  "points": [
    {
      "name": "railStart",
      "description": "Đầu trái của ray, gần ống dẫn khí."
    },
    {
      "name": "railEnd",
      "description": "Đầu phải của ray, nơi đặt đệm lò xo."
    },
    {
      "name": "gliderBase",
      "description": "Chân xe trượt ở gốc, ngay trên mặt ray."
    },
    {
      "name": "flag",
      "description": "Mép trên của tấm chắn sáng ở gốc."
    }
  ],
  "notes": "Ray dài 0,88 m, tiết diện hình tam giác úp, hai hàng lỗ phun khí ở hai bên; xe trượt hình chữ A ôm lấy ray, trên có tấm chắn sáng rộng 0,02 m. Các mũi tên xanh chỉ luồng khí là ký hiệu, không phải hiện tượng. fill là màu nhôm."
}
*/
const makeAirTrack = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const LEN = 0.88;
  const RAIL_H = 0.034;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const y0 = 0;

  // Chân đỡ có ốc chỉnh, và ống dẫn khí ở đầu trái nối sang máy thổi.
  for (const x of [0.06, LEN - 0.06]) {
    group.add(new Konva.Rect({ x: m(x - 0.012), y: m(y0 + RAIL_H), width: m(0.024), height: m(0.054), ...lin(m(x - 0.012), 0, m(x + 0.012), 0, steel), stroke: "#334155", strokeWidth: lw, listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.03), y: m(y0 + RAIL_H + 0.054), width: m(0.06), height: m(0.009), cornerRadius: m(0.003), fill: "#111827", stroke: "#374151", strokeWidth: lw * 0.7, listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(y0 + RAIL_H + 0.026), radius: m(0.0048), fill: "#0f172a", stroke: "#94a3b8", strokeWidth: lw * 0.7, listening: false }));
  }
  group.add(new Konva.Line({ points: [m(0), m(y0 + RAIL_H / 2), m(-0.03), m(y0 + RAIL_H / 2 + 0.02), m(-0.06), m(y0 + RAIL_H + 0.03), m(-0.085), m(y0 + RAIL_H + 0.05)], stroke: "#0b0f19", strokeWidth: m(0.0125), lineCap: "round", tension: 0.5, listening: false }));
  group.add(new Konva.Line({ points: [m(0), m(y0 + RAIL_H / 2), m(-0.03), m(y0 + RAIL_H / 2 + 0.02), m(-0.06), m(y0 + RAIL_H + 0.03), m(-0.085), m(y0 + RAIL_H + 0.05)], stroke: "rgba(255,255,255,0.15)", strokeWidth: m(0.003), lineCap: "round", tension: 0.5, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.012), y: m(y0 + RAIL_H / 2 - 0.0095), width: m(0.014), height: m(0.019), cornerRadius: m(0.002), fill: "#475569", stroke: "#1e293b", strokeWidth: lw, listening: false }));

  // Ray nhôm tam giác: mặt trước phẳng, rãnh dọc, hai hàng lỗ phun khí.
  group.add(new Konva.Rect({ x: 0, y: m(y0), width: m(LEN), height: m(RAIL_H), cornerRadius: m(0.003), ...lin(0, m(y0), 0, m(y0 + RAIL_H), [0, "#f8fafc", 0.12, fill, 0.8, "#94a3b8", 1, "#475569"]), stroke: "#334155", strokeWidth: lw * 1.1, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.35, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  group.add(new Konva.Line({ points: [m(0.006), m(y0 + 0.0028), m(LEN - 0.006), m(y0 + 0.0028)], stroke: "rgba(255,255,255,0.85)", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));
  for (let r = 0; r < 2; r += 1) {
    const y = y0 + 0.0085 + r * 0.0085;
    for (let x = 0.012; x < LEN - 0.006; x += 0.014) group.add(new Konva.Circle({ x: m(x + (r ? 0.007 : 0)), y: m(y), radius: m(0.0013), fill: "#0f172a", listening: false }));
  }
  group.add(new Konva.Rect({ x: m(0.006), y: m(y0 + 0.021), width: m(LEN - 0.012), height: m(0.011), fill: "#fefce8", stroke: "#a16207", strokeWidth: lw * 0.6, listening: false }));
  for (let cm = 0; cm <= 87; cm += 1) {
    const x = 0.006 + cm / 100;
    const ten = cm % 10 === 0;
    group.add(new Konva.Line({ points: [m(x), m(y0 + 0.021), m(x), m(y0 + 0.021 + (ten ? 0.0065 : 0.0035))], stroke: "#0f172a", strokeWidth: ten ? lw : lw * 0.6, listening: false }));
    if (ten) group.add(new Konva.Text({ x: m(x - 0.01), y: m(y0 + 0.0275), width: m(0.02), align: "center", text: String(cm), fontSize: m(0.0042), fontStyle: "bold", fill: "#0f172a", listening: false }));
  }
  // Đệm lò xo ở đầu phải ray, gờ cứng ở đầu trái.
  group.add(new Konva.Rect({ x: m(LEN - 0.002), y: m(y0 - 0.026), width: m(0.012), height: m(0.04), cornerRadius: m(0.002), ...lin(m(LEN - 0.002), 0, m(LEN + 0.01), 0, steel), stroke: "#334155", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 4; i += 1) group.add(new Konva.Line({ points: [m(LEN - 0.034 + i * 0.0072), m(y0 - 0.0215), m(LEN - 0.034 + i * 0.0072 + 0.0036), m(y0 - 0.0045)], stroke: "#94a3b8", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(LEN - 0.042), y: m(y0 - 0.0245), width: m(0.007), height: m(0.023), fill: "#cbd5e1", stroke: "#475569", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.006), y: m(y0 - 0.02), width: m(0.008), height: m(0.034), cornerRadius: m(0.002), fill: "#475569", stroke: "#1e293b", strokeWidth: lw, listening: false }));

  // BỘ PHẬN TRƯỢT: xe trượt hình chữ A ôm ray, tấm chắn sáng, đệm khí. Gốc nhóm trên mặt ray.
  const glider = new Konva.Group({ x: m(0.05), y: m(y0) });
  glider.add(new Konva.Rect({ x: m(-0.055), y: m(-0.0055), width: m(0.11), height: m(0.0042), cornerRadius: m(0.001), fill: "rgba(125,211,252,0.6)", listening: false }));
  for (const x of [-0.04, -0.02, 0, 0.02, 0.04]) glider.add(new Konva.Arrow({ points: [m(x), m(0.0085), m(x), m(-0.0045)], stroke: "#38bdf8", fill: "#38bdf8", strokeWidth: lw * 0.8, pointerLength: m(0.0028), pointerWidth: m(0.0026), listening: false }));
  glider.add(new Konva.Rect({ x: m(-0.055), y: m(-0.032), width: m(0.11), height: m(0.0265), cornerRadius: m(0.003), ...lin(0, m(-0.032), 0, m(-0.0055), [0, "#fca5a5", 0.2, "#ef4444", 0.9, "#7f1d1d", 1, "#450a0a"]), stroke: "#450a0a", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, listening: false }));
  glider.add(new Konva.Line({ points: [m(-0.05), m(-0.0295), m(0.05), m(-0.0295)], stroke: "rgba(255,255,255,0.55)", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));
  glider.add(new Konva.Rect({ x: m(-0.052), y: m(-0.014), width: m(0.104), height: m(0.0075), fill: "rgba(15,23,42,0.4)", listening: false }));
  // Tấm chắn sáng cắm lên giữa xe.
  glider.add(new Konva.Rect({ x: m(-0.0035), y: m(-0.0385), width: m(0.007), height: m(0.0075), fill: "#94a3b8", stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  glider.add(new Konva.Rect({ x: m(-0.01), y: m(-0.0795), width: m(0.02), height: m(0.042), cornerRadius: m(0.0012), ...lin(m(-0.01), 0, m(0.01), 0, [0, "#374151", 0.3, "#0b0f19", 1, "#000"]), stroke: "#6b7280", strokeWidth: lw, listening: false }));
  glider.add(new Konva.Line({ points: [m(-0.0085), m(-0.0775), m(-0.0085), m(-0.04)], stroke: "rgba(255,255,255,0.25)", strokeWidth: lw, listening: false }));
  // Hai đầu xe có lò xo giảm chấn và cái móc.
  for (const side of [-1, 1]) {
    glider.add(new Konva.Line({ points: [m(side * 0.055), m(-0.0185), m(side * 0.062), m(-0.0185), m(side * 0.063), m(-0.0155), m(side * 0.062), m(-0.0125), m(side * 0.055), m(-0.0125)], stroke: "#cbd5e1", strokeWidth: lw * 1.3, lineCap: "round", lineJoin: "round", listening: false }));
  }
  group.add(glider);

  if (label) {
    group.add(new Konva.Text({ x: m(0.2), y: m(y0 + RAIL_H + 0.012), width: m(0.5), align: "center", text: label, fontSize: m(0.015), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { glider: { node: glider, motion: "slide" as const, axis: "right" as const, min: 0, max: 0.65 } },
    points: { railStart: { x: 0, y: 0 }, railEnd: { x: m(LEN), y: 0 }, gliderBase: { x: m(0.05), y: 0 }, flag: { x: m(0.05), y: m(-0.0795) } },
  };
};
