/* OBJECT-META
{
  "catalog": "Bảng thép / bảng từ có lưới",
  "title": "Bảng từ trắng có lưới ô vuông, khung nhôm, máng bút và nam châm giữ giấy",
  "fill": "#f1f5f9",
  "anchor": "Tâm mặt bảng.",
  "useWhen": ["Cần bảng từ trắng có lưới ô 5 cm × 5 cm (12 × 8 ô) để vẽ và tổng hợp lực.","Cần hai nam châm giữ giấy (magnetA, magnetB) và trục toạ độ đậm ở giữa."],
  "avoidWhen": ["Cần bảng lắp mạch điện có chốt cắm: dùng bang-mach.","Lưới cố định 5 cm, không đổi tỉ lệ ô được.","Bảng không có vectơ hay chữ sẵn, phải vẽ thêm bằng cảnh."],
  "size": { "width": 0.84, "height": 0.62 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm mặt bảng." },
    { "name": "topLeft", "description": "Góc trên trái của vùng lưới." },
    { "name": "bottomRight", "description": "Góc dưới phải của vùng lưới." },
    { "name": "magnetA", "description": "Tâm nam châm thứ nhất (xanh)." },
    { "name": "magnetB", "description": "Tâm nam châm thứ hai (đỏ)." }
  ],
  "notes": "Lưới ô vuông 5 cm × 5 cm, 12 × 8 ô, trục toạ độ đậm ở giữa. Dùng để đặt các vectơ lực khi tổng hợp lực. fill là màu mặt bảng."
}
*/
const makeMagneticBoard = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.8;
  const H = 0.56;
  const FRAME = 0.02;
  const CELL = 0.05;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0022));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });

  const group = new Konva.Group({ x: p.x, y: p.y });
  const fw = W + 2 * FRAME;
  const fh = H + 2 * FRAME;

  // Khung nhôm có bóng đổ ra sau.
  group.add(new Konva.Rect({ x: m(-fw / 2), y: m(-fh / 2), width: m(fw), height: m(fh), cornerRadius: m(0.008), ...lin(m(-fw / 2), m(-fh / 2), m(fw / 2), m(fh / 2), [0, "#f1f5f9", 0.5, "#94a3b8", 1, "#64748b"]), stroke: "#475569", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.03), shadowOpacity: 0.5, shadowOffset: { x: m(0.006), y: m(0.012) }, listening: false }));
  // Mặt bảng thép sơn trắng, bóng nhẹ.
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(-H / 2), width: m(W), height: m(H), ...lin(m(-W / 2), m(-H / 2), m(W / 2), m(H / 2), [0, "#ffffff", 0.55, fill, 1, "#cbd5e1"]), stroke: "#94a3b8", strokeWidth: lw * 0.8, listening: false }));

  // Lưới ô vuông 5 cm; trục đậm ở giữa.
  const cols = Math.round(W / CELL);
  const rows = Math.round(H / CELL);
  for (let i = 0; i <= cols; i += 1) {
    const x = -W / 2 + i * CELL;
    const axis = i === Math.floor(cols / 2);
    group.add(new Konva.Line({ points: [m(x), m(-H / 2), m(x), m(H / 2)], stroke: axis ? "#334155" : "#bcc6d2", strokeWidth: axis ? lw * 1.4 : lw * 0.6, listening: false }));
  }
  for (let j = 0; j <= rows; j += 1) {
    const y = -H / 2 + j * CELL;
    const axis = j === Math.floor(rows / 2);
    group.add(new Konva.Line({ points: [m(-W / 2), m(y), m(W / 2), m(y)], stroke: axis ? "#334155" : "#bcc6d2", strokeWidth: axis ? lw * 1.4 : lw * 0.6, listening: false }));
  }
  // Mũi tên trục và ký hiệu O.
  const ox = -W / 2 + Math.floor(cols / 2) * CELL;
  const oy = -H / 2 + Math.floor(rows / 2) * CELL;
  group.add(new Konva.Arrow({ points: [m(ox), m(oy), m(W / 2 - 0.004), m(oy)], stroke: "#334155", fill: "#334155", strokeWidth: lw * 1.2, pointerLength: m(0.012), pointerWidth: m(0.01), listening: false }));
  group.add(new Konva.Arrow({ points: [m(ox), m(oy), m(ox), m(-H / 2 + 0.004)], stroke: "#334155", fill: "#334155", strokeWidth: lw * 1.2, pointerLength: m(0.012), pointerWidth: m(0.01), listening: false }));
  group.add(new Konva.Text({ x: m(ox - 0.026), y: m(oy + 0.004), text: "O", fontSize: m(0.02), fontStyle: "bold", fill: "#334155", listening: false }));
  // Phản chiếu chéo trên mặt bảng.
  group.add(new Konva.Line({ points: [m(-W / 2), m(H / 2 - 0.05), m(-W / 2 + 0.3), m(-H / 2), m(-W / 2 + 0.38), m(-H / 2), m(-W / 2), m(H / 2 - 0.2)], closed: true, fill: "rgba(255,255,255,0.35)", listening: false }));

  // Máng bút bên dưới với hai cây bút lông.
  const trayY = fh / 2 - 0.004;
  group.add(new Konva.Rect({ x: m(-0.28), y: m(trayY), width: m(0.56), height: m(0.026), cornerRadius: [0, 0, m(0.008), m(0.008)], ...lin(0, m(trayY), 0, m(trayY + 0.026), [0, "#e2e8f0", 1, "#7b8794"]), stroke: "#475569", strokeWidth: lw, listening: false }));
  const pens: [number, string][] = [[-0.1, "#2563eb"], [0.02, "#dc2626"]];
  for (const [x, color] of pens) {
    group.add(new Konva.Rect({ x: m(x - 0.06), y: m(trayY - 0.014), width: m(0.12), height: m(0.014), cornerRadius: m(0.005), fill: color, stroke: "rgba(0,0,0,0.4)", strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.062), y: m(trayY - 0.0125), width: m(0.026), height: m(0.011), cornerRadius: m(0.004), fill: "#f8fafc", stroke: "rgba(0,0,0,0.3)", strokeWidth: lw * 0.5, listening: false }));
  }
  // Ốc bắt khung ở bốn góc.
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) group.add(new Konva.Circle({ x: m(sx * (W / 2 + 0.01)), y: m(sy * (H / 2 + 0.01)), radius: m(0.0042), fill: "#e2e8f0", stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));

  // Hai nam châm tròn giữ tờ giấy ghi chú.
  const magnets: [number, number, string][] = [[0.2, -0.14, "#2563eb"], [-0.2, 0.12, "#dc2626"]];
  for (const [x, y, color] of magnets) {
    group.add(new Konva.Rect({ x: m(x - 0.05), y: m(y - 0.0), width: m(0.1), height: m(0.07), fill: "#fef9c3", stroke: "#a16207", strokeWidth: lw * 0.6, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.25, shadowOffset: { x: 0, y: m(0.002) }, listening: false }));
    for (let k = 0; k < 3; k += 1) group.add(new Konva.Line({ points: [m(x - 0.04), m(y + 0.02 + k * 0.014), m(x + 0.04 - k * 0.012), m(y + 0.02 + k * 0.014)], stroke: "rgba(30,41,59,0.45)", strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(y + 0.003), radius: m(0.0125), fillRadialGradientStartPoint: { x: m(-0.004), y: m(-0.004) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0125), fillRadialGradientColorStops: [0, "#f8fafc", 0.4, color, 1, "#0b1220"], stroke: "#0b1220", strokeWidth: lw * 0.6, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.4, listening: false }));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-W / 2 + 0.02), y: m(-H / 2 + 0.014), text: label, fontSize: m(0.024), fill: "#1e293b", listening: false }));
  }

  return {
    group,
    parts: {},
    points: {
      center: { x: 0, y: 0 },
      topLeft: { x: m(-W / 2), y: m(-H / 2) },
      bottomRight: { x: m(W / 2), y: m(H / 2) },
      magnetA: { x: m(0.2), y: m(-0.137) },
      magnetB: { x: m(-0.2), y: m(0.123) },
    },
  };
};
