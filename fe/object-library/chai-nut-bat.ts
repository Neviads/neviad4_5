/* OBJECT-META
{
  "catalog": "Chai có nút (nút bật)",
  "title": "Chai thuỷ tinh cổ hẹp đậy nút bần: các phân tử khí nóng bên trong đẩy nút lên, thành chai có giọt hơi nước và nhãn",
  "fill": "#d6a15a",
  "anchor": "Giữa đáy chai, chạm mặt bàn.",
  "useWhen": ["Cần chai thuỷ tinh đậy nút bần để minh hoạ khí nóng nở ra đẩy nút bật lên.","Cần nút chai trượt lên 0 đến 0,04 m và phân tử khí chuyển động bên trong."],
  "avoidWhen": ["Cần bình khí kín có van hoặc áp kế: dùng binh-khi-kin.","Cần ống nghiệm hay bình cầu để đun: dùng ong-nghiem hoặc binh-tam-giac; chai này không có chất lỏng đo được."],
  "size": { "width": 0.07, "height": 0.178 },
  "parts": [
    { "name": "stopper", "label": "Nút chai", "motion": "slide", "axis": "up", "min": 0, "max": 0.04, "description": "Độ nút bật lên khỏi miệng chai, mét; 0 là nút đậy kín, tăng dần khi khí trong chai nở ra đẩy nút lên." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy chai." },
    { "name": "mouth", "description": "Giữa miệng chai." },
    { "name": "stopperTop", "description": "Mặt trên của nút khi đậy kín." }
  ],
  "notes": "Chai cao 0,15 m, thân đường kính 0,062 m, cổ 0,022 m dài 0,05 m, đáy lõm; nút bần dài 0,022 m cắm sâu 0,016 m vào cổ. Bên trong có các phân tử khí (chấm) chuyển động nhanh khi bị đun nóng. Khí nở ra làm áp suất tăng tới khi đẩy được nút bật lên. fill là màu nút bần."
}
*/
const makeStopperBottle = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const R = 0.031;
  const NR = 0.011;
  const neckTop = -0.15;
  const shoulder = -0.095;

  group.add(new Konva.Ellipse({ x: m(0.003), y: m(-0.001), radiusX: m(R + 0.006), radiusY: m(0.003), fill: "rgba(0,0,0,0.4)", listening: false }));
  // Hình dạng chai: thân trụ, vai nghiêng, cổ hẹp.
  const outline = [-NR, neckTop, -NR, shoulder - 0.012, -0.018, shoulder, -R, shoulder + 0.014, -R, -0.008, -R + 0.004, -0.0015, R - 0.004, -0.0015, R, -0.008, R, shoulder + 0.014, 0.018, shoulder, NR, shoulder - 0.012, NR, neckTop];
  group.add(new Konva.Line({ points: outline.map(m), closed: true, tension: 0.18, ...lin(m(-R), 0, m(R), 0, [0, "rgba(255,255,255,0.55)", 0.25, "rgba(186,230,253,0.18)", 0.8, "rgba(100,116,139,0.35)", 1, "rgba(30,64,175,0.4)"]), stroke: "rgba(226,240,252,0.95)", strokeWidth: m(0.0024), lineJoin: "round", listening: false }));
  // Đáy lõm.
  group.add(new Konva.Line({ points: [m(-R + 0.005), m(-0.002), m(-0.012), m(-0.0085), m(0.012), m(-0.0085), m(R - 0.005), m(-0.002)], tension: 0.4, stroke: "rgba(226,240,252,0.8)", strokeWidth: lw * 0.9, listening: false }));
  // Nhãn giấy giữa thân và các giọt hơi nước ngưng tụ.
  group.add(new Konva.Rect({ x: m(-R + 0.0015), y: m(-0.062), width: m(R * 2 - 0.003), height: m(0.032), ...lin(0, 0, m(R * 2), 0, [0, "#fef9c3", 0.5, "#fde68a", 1, "#b45309"]), stroke: "#78350f", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Text({ x: m(-R), y: m(-0.0575), width: m(R * 2), align: "center", text: "KHÔNG KHÍ", fontSize: m(0.0058), fontStyle: "bold", fill: "#451a03", listening: false }));
  group.add(new Konva.Text({ x: m(-R), y: m(-0.0475), width: m(R * 2), align: "center", text: "nóng 80 °C", fontSize: m(0.0048), fill: "#78350f", listening: false }));
  for (const [x, y] of [[-0.024, -0.085], [0.02, -0.078], [-0.015, -0.1], [0.012, -0.022], [-0.022, -0.02]] as [number, number][]) group.add(new Konva.Ellipse({ x: m(x), y: m(y), radiusX: m(0.0014), radiusY: m(0.0019), fill: "rgba(224,242,254,0.75)", stroke: "rgba(255,255,255,0.8)", strokeWidth: lw * 0.4, listening: false }));
  // Các phân tử khí và mũi tên chuyển động hỗn loạn.
  for (const [x, y, ax, ay] of [[-0.016, -0.115, -0.005, -0.004], [0.004, -0.13, 0.004, -0.005], [-0.004, -0.103, 0.005, 0.003], [0.02, -0.088, -0.004, -0.005], [-0.02, -0.072, 0.004, -0.004]] as [number, number, number, number][]) {
    group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(0.0024), fill: "#fecaca", stroke: "#ef4444", strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Arrow({ points: [m(x), m(y), m(x + ax), m(y + ay)], stroke: "#fca5a5", fill: "#fca5a5", strokeWidth: lw * 0.8, pointerLength: m(0.0025), pointerWidth: m(0.002), listening: false }));
  }
  // Vệt phản chiếu dọc thân và cổ.
  group.add(ln([-R + 0.005, -0.012, -R + 0.005, shoulder + 0.02], "rgba(255,255,255,0.75)", lw * 2.4));
  group.add(ln([-NR + 0.0035, shoulder - 0.012, -NR + 0.0035, neckTop + 0.004], "rgba(255,255,255,0.75)", lw * 1.8));
  group.add(ln([R - 0.005, -0.02, R - 0.005, shoulder + 0.028], "rgba(255,255,255,0.28)", lw * 1.4));
  // Gờ miệng chai: vòng dày hơn quanh cổ.
  group.add(new Konva.Rect({ x: m(-NR - 0.0022), y: m(neckTop - 0.0015), width: m(NR * 2 + 0.0044), height: m(0.0065), cornerRadius: m(0.0018), ...lin(0, 0, 0, m(0.0065), [0, "rgba(255,255,255,0.85)", 1, "rgba(100,116,139,0.6)"]), stroke: "rgba(226,240,252,0.95)", strokeWidth: lw, listening: false }));

  // BỘ PHẬN TRƯỢT: nút bần côn cắm vào cổ, có vân và vòng đỉnh.
  const stopper = new Konva.Group({ x: 0, y: 0 });
  stopper.add(new Konva.Line({ points: [m(-0.0095), m(neckTop + 0.016), m(0.0095), m(neckTop + 0.016), m(0.0115), m(neckTop - 0.006), m(-0.0115), m(neckTop - 0.006)], closed: true, ...lin(m(-0.0115), 0, m(0.0115), 0, [0, "#7c2d12", 0.3, "#fcd34d", 0.6, fill, 1, "#451a03"]), stroke: "#451a03", strokeWidth: lw, lineJoin: "round", listening: false }));
  for (const [x, y] of [[-0.005, -0.007], [0.003, -0.002], [-0.002, 0.005], [0.006, 0.009], [-0.007, 0.012]] as [number, number][]) stopper.add(new Konva.Circle({ x: m(x), y: m(neckTop + y), radius: m(0.0009), fill: "rgba(67,20,7,0.55)", listening: false }));
  stopper.add(new Konva.Rect({ x: m(-0.0125), y: m(neckTop - 0.0095), width: m(0.025), height: m(0.0035), cornerRadius: m(0.0014), ...lin(0, 0, m(0.025), 0, [0, "#fef3c7", 0.5, "#d97706", 1, "#78350f"]), stroke: "#78350f", strokeWidth: lw * 0.8, listening: false }));
  group.add(stopper);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.006), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { stopper: { node: stopper, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.04 } },
    points: { base: { x: 0, y: 0 }, mouth: { x: 0, y: m(neckTop) }, stopperTop: { x: 0, y: m(neckTop - 0.0095) } },
  };
};
