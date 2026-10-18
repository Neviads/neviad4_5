/* OBJECT-META
{
  "catalog": "Tế bào quang điện",
  "title": "Tế bào quang điện chân không: bóng thuỷ tinh có catot bán trụ phủ xesi, anot dạng vòng, đế nhựa có bốn chân cắm",
  "fill": "#bae6fd",
  "anchor": "Giữa đáy đế, chạm mặt bàn.",
  "useWhen": ["Cần tế bào quang điện chân không có catot bán trụ phủ xesi và anot vòng để khảo sát hiện tượng quang điện ngoài.","Cần bóng kín có hai chân K, A mắc vào mạch đo cường độ dòng quang điện theo UAK."],
  "avoidWhen": ["Cần cổng quang điện đo thời gian (cảm biến chắn sáng): dùng cong-quang-dien.","Cần ống phóng tia X hay ống phóng electron: dùng ong-coolidge hoặc ong-phong-dien-tu.","Vật chỉ là bóng đứng yên, không có bộ phận chỉnh được; dòng quang điện do cảnh vẽ."],
  "size": { "width": 0.107, "height": 0.148 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy đế." },
    { "name": "cathode", "description": "Giữa mặt trong của catot K (bán trụ bên trái)." },
    { "name": "anode", "description": "Anot A ở tâm bóng." },
    { "name": "terminalK", "description": "Chân cắm nối catot." },
    { "name": "terminalA", "description": "Chân cắm nối anot." }
  ],
  "notes": "Bóng thuỷ tinh đường kính 0,09 m hút chân không. Catot K là chỏm bán trụ phủ kim loại kiềm (xesi), anot A là vòng dây mảnh ở tâm để không cản ánh sáng. Ánh sáng chiếu từ bên trái qua thành bóng vào catot; hai chân ra đế mắc vào mạch, hiệu điện thế UAK đặt giữa chúng. fill là màu thuỷ tinh."
}
*/
const makePhotocell = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.045;
  const cy = -0.092;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Đế nhựa đen có vân và bốn chân cắm (hai chân dùng, hai chân phụ).
  group.add(new Konva.Rect({ x: m(-0.026), y: m(-0.044), width: m(0.052), height: m(0.032), cornerRadius: m(0.004), ...lin(m(-0.026), 0, m(0.026), 0, [0, "#030712", 0.3, "#4b5563", 0.6, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.45, listening: false }));
  group.add(ln([-0.02, -0.036, -0.02, -0.018], "rgba(255,255,255,0.2)", lw * 1.2));
  group.add(new Konva.Rect({ x: m(-0.03), y: m(-0.014), width: m(0.06), height: m(0.006), cornerRadius: m(0.0015), fill: "#111827", stroke: "#000", strokeWidth: lw * 0.8, listening: false }));
  const pin = [0, "#92400e", 0.4, "#fbbf24", 1, "#78350f"];
  for (const x of [-0.018, -0.006, 0.006, 0.018]) {
    group.add(new Konva.Rect({ x: m(x - 0.0017), y: m(-0.008), width: m(0.0034), height: m(0.008), ...lin(m(x - 0.0017), 0, m(x + 0.0017), 0, pin), listening: false }));
  }

  // Cổ bóng và thân bóng thuỷ tinh có độ dày: viền ngoài, lòng trong suốt và vệt phản chiếu.
  group.add(new Konva.Rect({ x: m(-0.012), y: m(-0.062), width: m(0.024), height: m(0.026), ...lin(m(-0.012), 0, m(0.012), 0, [0, "rgba(148,163,184,0.6)", 0.4, "rgba(224,242,254,0.7)", 1, "rgba(100,116,139,0.6)"]), stroke: "rgba(15,23,42,0.6)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(cy), radius: m(R), fillRadialGradientStartPoint: { x: m(-0.02), y: m(-0.02) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "rgba(255,255,255,0.4)", 0.6, "rgba(186,230,253,0.14)", 1, "rgba(56,189,248,0.3)"], stroke: "rgba(224,242,254,0.95)", strokeWidth: m(0.0024), shadowColor: "#7dd3fc", shadowBlur: m(0.012), shadowOpacity: 0.5, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(cy), radius: m(R - 0.0024), stroke: "rgba(15,23,42,0.4)", strokeWidth: lw * 0.8, listening: false }));
  // Vệt chất hút khí (getter) bạc ở đỉnh bóng.
  group.add(new Konva.Ellipse({ x: m(0.002), y: m(cy - R + 0.0075), radiusX: m(0.01), radiusY: m(0.0042), ...lin(m(-0.008), 0, m(0.012), 0, [0, "#475569", 0.5, "#e2e8f0", 1, "#334155"]), opacity: 0.9, listening: false }));

  // Catot K: bản bán trụ bên trái phủ lớp xesi vàng, mặt trong sáng hơn.
  group.add(new Konva.Arc({ x: 0, y: m(cy), innerRadius: m(0.0325), outerRadius: m(0.0385), angle: 124, rotation: 118, fill: "#a16207", stroke: "#422006", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Arc({ x: 0, y: m(cy), innerRadius: m(0.0322), outerRadius: m(0.0348), angle: 124, rotation: 118, fill: "#fcd34d", listening: false }));
  group.add(new Konva.Arc({ x: 0, y: m(cy), innerRadius: m(0.036), outerRadius: m(0.0378), angle: 70, rotation: 140, fill: "rgba(255,255,255,0.35)", listening: false }));
  // Anot A: vòng dây mảnh ở tâm trên thanh đỡ.
  group.add(new Konva.Ellipse({ x: m(0.002), y: m(cy), radiusX: m(0.0045), radiusY: m(0.015), stroke: "#e2e8f0", strokeWidth: m(0.0016), listening: false }));
  group.add(new Konva.Ellipse({ x: m(0.002), y: m(cy), radiusX: m(0.0045), radiusY: m(0.015), stroke: "#475569", strokeWidth: lw * 0.5, listening: false }));
  // Dây dẫn xuống đế: catot đi theo thành trái, anot theo trục giữa.
  group.add(ln([-0.0345, cy + 0.016, -0.012, -0.055, -0.0165, -0.044, -0.018, -0.008], "#e2e8f0", lw * 1.5));
  group.add(ln([0.002, cy + 0.015, 0.002, -0.056, 0.0045, -0.044, 0.006, -0.008], "#e2e8f0", lw * 1.5));
  // Nhãn K và A.
  group.add(new Konva.Text({ x: m(-0.0285), y: m(cy - 0.013), text: "K", fontSize: m(0.0105), fontStyle: "bold", fill: "#fef3c7", listening: false }));
  group.add(new Konva.Text({ x: m(0.0085), y: m(cy - 0.0145), text: "A", fontSize: m(0.0105), fontStyle: "bold", fill: "#e2e8f0", listening: false }));
  // Vệt phản chiếu sáng phía trên trái.
  group.add(new Konva.Arc({ x: 0, y: m(cy), innerRadius: m(R - 0.0085), outerRadius: m(R - 0.0045), angle: 55, rotation: 215, fill: "rgba(255,255,255,0.7)", listening: false }));
  group.add(new Konva.Circle({ x: m(-0.0295), y: m(cy - 0.0295), radius: m(0.0028), fill: "#fff", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.008), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: { base: { x: 0, y: 0 }, cathode: { x: m(-0.0325), y: m(cy) }, anode: { x: m(0.002), y: m(cy) }, terminalK: { x: m(-0.018), y: m(0.0) }, terminalA: { x: m(0.006), y: m(0.0) } },
  };
};
