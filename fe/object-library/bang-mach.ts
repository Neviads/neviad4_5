/* OBJECT-META
{
  "catalog": "Bảng mạch / bảng lắp ráp",
  "title": "Bảng lắp ráp mạch điện học sinh: tấm nhựa trắng có lưới lỗ, các chốt cắm đồng tâm có số và đường nối in sẵn",
  "fill": "#f1f5f9",
  "anchor": "Tâm bảng.",
  "useWhen": ["Cần bảng lắp mạch điện học sinh với lưới chốt cắm 7 cột × 4 hàng cách 0,04 m.","Cần nền để đặt linh kiện bằng cách khớp hai chốt, có sẵn thanh cấp điện + và −."],
  "avoidWhen": ["Cần tấm lưới toạ độ để đặt vectơ lực: dùng bang-thep.","Bảng không có linh kiện hay dây nối, phải thêm linh kiện riêng.","Chỉ 28 chốt, mạch lớn hơn sẽ không đủ chỗ."],
  "size": { "width": 0.32, "height": 0.2 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm bảng." },
    { "name": "topLeft", "description": "Chốt ở góc trên trái." },
    { "name": "bottomRight", "description": "Chốt ở góc dưới phải." }
  ],
  "notes": "Tấm 0,32 m × 0,2 m dày 6 mm; lưới chốt cách đều 0,04 m, 7 cột × 4 hàng, hai hàng ngoài cùng là thanh cấp điện (đỏ + và xanh −). Khớp với các linh kiện đặt trên bảng bằng cách đặt đúng hai chốt. fill là màu mặt bảng."
}
*/
const makeCircuitBoard = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const W = 0.32;
  const H = 0.2;
  const COLS = 7;
  const ROWS = 4;
  const GX = 0.04;
  const GY = 0.04;

  // Tấm nhựa trắng: cạnh dày bên dưới (tối), mặt chính, viền bo và bốn ốc ở góc.
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.003), y: m(-H / 2 + 0.006), width: m(W), height: m(H), cornerRadius: m(0.006), fill: "#64748b", stroke: "#0f172a", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.016), shadowOpacity: 0.5, shadowOffset: { x: m(0.004), y: m(0.006) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(-H / 2), width: m(W), height: m(H), cornerRadius: m(0.006), ...lin(m(-W / 2), m(-H / 2), m(W / 2), m(H / 2), [0, "#ffffff", 0.5, fill, 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw * 1.2, listening: false }));
  group.add(ln([-W / 2 + 0.008, -H / 2 + 0.002, W / 2 - 0.008, -H / 2 + 0.002], "rgba(255,255,255,0.95)", lw * 1.4));
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) group.add(new Konva.Circle({ x: m(sx * (W / 2 - 0.01)), y: m(sy * (H / 2 - 0.01)), radius: m(0.0033), fill: "#94a3b8", stroke: "#1e293b", strokeWidth: lw * 0.7, listening: false }));

  // Hai thanh cấp điện ở trên và dưới (đỏ +, xanh −) với vạch in màu.
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.02), y: m(-H / 2 + 0.0085), width: m(W - 0.04), height: m(0.005), cornerRadius: m(0.0015), fill: "#fecaca", stroke: "#dc2626", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.02), y: m(H / 2 - 0.0135), width: m(W - 0.04), height: m(0.005), cornerRadius: m(0.0015), fill: "#bfdbfe", stroke: "#2563eb", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Text({ x: m(-W / 2 + 0.008), y: m(-H / 2 + 0.0075), text: "+", fontSize: m(0.0072), fontStyle: "bold", fill: "#dc2626", listening: false }));
  group.add(new Konva.Text({ x: m(-W / 2 + 0.008), y: m(H / 2 - 0.0145), text: "−", fontSize: m(0.0075), fontStyle: "bold", fill: "#2563eb", listening: false }));

  // Đường mạch in sẵn nối các chốt (xám mảnh) trước khi vẽ chốt.
  for (let r = 0; r < ROWS; r += 1) {
    const y = (r - (ROWS - 1) / 2) * GY;
    group.add(ln([-((COLS - 1) / 2) * GX, y, ((COLS - 1) / 2) * GX, y], "rgba(100,116,139,0.35)", m(0.0016)));
  }

  // Lưới chốt: vòng đồng có lỗ, số thứ tự nhỏ phía trên mỗi cột.
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const x = (c - (COLS - 1) / 2) * GX;
      const y = (r - (ROWS - 1) / 2) * GY;
      group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(0.0075), ...lin(m(x - 0.0075), m(y - 0.0075), m(x + 0.0075), m(y + 0.0075), [0, "#fff7ed", 0.4, "#d6a15a", 1, "#7c2d12"]), stroke: "#431407", strokeWidth: lw * 0.8, listening: false }));
      group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(0.0042), fill: "#1c1917", stroke: "#78350f", strokeWidth: lw * 0.6, listening: false }));
      group.add(new Konva.Circle({ x: m(x - 0.0013), y: m(y - 0.0013), radius: m(0.0011), fill: "rgba(255,255,255,0.35)", listening: false }));
    }
  }
  for (let c = 0; c < COLS; c += 1) group.add(new Konva.Text({ x: m((c - (COLS - 1) / 2) * GX - 0.006), y: m(-(ROWS - 1) / 2 * GY - 0.0165), width: m(0.012), align: "center", text: String(c + 1), fontSize: m(0.0058), fontStyle: "bold", fill: "#475569", listening: false }));
  group.add(new Konva.Text({ x: m(W / 2 - 0.058), y: m(H / 2 - 0.0225), text: "NEVIAD", fontSize: m(0.0072), fontStyle: "bold", fill: "rgba(71,85,105,0.7)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(H / 2 + 0.012), width: m(0.2), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: { center: { x: 0, y: 0 }, topLeft: { x: m(-((COLS - 1) / 2) * GX), y: m(-((ROWS - 1) / 2) * GY) }, bottomRight: { x: m(((COLS - 1) / 2) * GX), y: m(((ROWS - 1) / 2) * GY) } },
  };
};
