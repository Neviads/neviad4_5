/* OBJECT-META
{
  "catalog": "Khối gỗ / khối hộp",
  "title": "Khối gỗ hình hộp có vân gỗ, mặt đáy nhám và móc kéo bắt vít ở một đầu",
  "fill": "#c8863a",
  "anchor": "Giữa mặt đáy, chạm mặt phẳng.",
  "useWhen": ["Cần khối gỗ hình hộp có móc kéo bên phải, kéo trên mặt phẳng để đo ma sát bằng lực kế.", "Cảnh cần vật có điểm đặt trọng lực ở tâm và đáy nhám ghi hệ số ma sát."],
  "avoidWhen": ["Cần vật nặng treo móc trên dây hay lò xo: dùng qua-nang-moc.", "Cần vật nhỏ lăn hay hình cầu: dùng vien-bi, qua-bong; khối này chỉ trượt, không lăn."],
  "size": { "width": 0.15, "height": 0.1 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa mặt đáy." },
    { "name": "center", "description": "Tâm khối, điểm đặt trọng lực." },
    { "name": "hook", "description": "Tâm khuyên móc kéo ở mặt bên phải." }
  ],
  "notes": "Khối 0,14 m × 0,085 m nhìn từ cạnh, kèm mặt trên thấy xiên 0,012 m để có chiều sâu. Móc bắt ở mặt phải để buộc dây hay lực kế. Tấm đệm nhám dưới đáy ghi hệ số ma sát (đen). fill là màu gỗ."
}
*/
const makeWoodBlock = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.14;
  const H = 0.085;
  const SK = 0.012;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Đệm nhám dưới đáy.
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.002), y: m(-0.0035), width: m(W - 0.004), height: m(0.0035), cornerRadius: m(0.0012), fill: "#1f2937", listening: false }));
  for (let i = 0; i < 24; i += 1) group.add(new Konva.Circle({ x: m(-W / 2 + 0.006 + i * 0.0056), y: m(-0.0018), radius: m(0.0007), fill: "#4b5563", listening: false }));
  // Mặt trên thấy xiên (tối hơn mặt trước).
  group.add(new Konva.Line({ points: [m(-W / 2), m(-H - 0.0035), m(-W / 2 + SK), m(-H - 0.0035 - SK), m(W / 2 + SK), m(-H - 0.0035 - SK), m(W / 2), m(-H - 0.0035)], closed: true, ...lin(0, m(-H - SK), 0, m(-H), [0, "#f5d9a4", 1, "#e0b377"]), stroke: "#5a3a16", strokeWidth: lw, lineJoin: "round", listening: false }));
  // Mặt bên phải.
  group.add(new Konva.Line({ points: [m(W / 2), m(-0.0035), m(W / 2 + SK), m(-0.0035 - SK), m(W / 2 + SK), m(-H - 0.0035 - SK), m(W / 2), m(-H - 0.0035)], closed: true, ...lin(m(W / 2), 0, m(W / 2 + SK), 0, [0, "#b57a30", 1, "#8c5a1d"]), stroke: "#5a3a16", strokeWidth: lw, lineJoin: "round", listening: false }));
  // Mặt trước.
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(-H - 0.0035), width: m(W), height: m(H), cornerRadius: m(0.002), ...lin(0, m(-H - 0.0035), 0, m(-0.0035), [0, "#e3a85c", 0.18, fill, 0.8, "#a8671f", 1, "#7a4a14"]), stroke: "#5a3a16", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  // Vân gỗ: các đường dọc uốn nhẹ và vài mắt gỗ.
  for (let i = 0; i < 9; i += 1) {
    const y = -H + 0.003 + i * 0.0092;
    group.add(new Konva.Line({ points: [m(-W / 2 + 0.003), m(y), m(-0.03), m(y - 0.0014 + (i % 3) * 0.001), m(0.03), m(y + 0.0012), m(W / 2 - 0.003), m(y - 0.0008)], stroke: i % 2 ? "rgba(90,58,22,0.38)" : "rgba(255,226,170,0.3)", strokeWidth: lw * 0.8, tension: 0.4, listening: false }));
  }
  group.add(new Konva.Ellipse({ x: m(-0.03), y: m(-0.047), radiusX: m(0.0075), radiusY: m(0.0042), stroke: "rgba(90,58,22,0.65)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Ellipse({ x: m(-0.03), y: m(-0.047), radiusX: m(0.0034), radiusY: m(0.0018), fill: "rgba(90,58,22,0.5)", listening: false }));
  group.add(new Konva.Line({ points: [m(-W / 2 + 0.004), m(-H + 0.0), m(W / 2 - 0.004), m(-H + 0.0)], stroke: "rgba(255,255,255,0.4)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));

  // Móc kéo vặn vào mặt phải: ốc vít có khuyên.
  const hx = W / 2 + SK * 0.5;
  const hy = -0.047;
  group.add(new Konva.Line({ points: [m(W / 2 - 0.0005), m(hy), m(hx + 0.006), m(hy)], stroke: "#cbd5e1", strokeWidth: m(0.0042), lineCap: "round", listening: false }));
  group.add(new Konva.Circle({ x: m(hx + 0.0125), y: m(hy), radius: m(0.0072), stroke: "#e2e8f0", strokeWidth: m(0.0036), shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.3, listening: false }));
  for (let i = 0; i < 3; i += 1) group.add(new Konva.Line({ points: [m(W / 2 + 0.0008 + i * 0.0026), m(hy - 0.0024), m(W / 2 + 0.0008 + i * 0.0026), m(hy + 0.0024)], stroke: "rgba(15,23,42,0.5)", strokeWidth: lw * 0.8, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(-0.052), width: m(0.12), align: "center", text: label, fontSize: m(0.02), fontStyle: "bold", fill: "#4a2b0a", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, center: { x: 0, y: m(-H / 2 - 0.0035) }, hook: { x: m(hx + 0.0125), y: m(hy) } } };
};
