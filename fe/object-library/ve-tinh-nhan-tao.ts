/* OBJECT-META
{
  "catalog": "Vệ tinh nhân tạo",
  "title": "Vệ tinh nhân tạo: thân hộp bọc lá vàng, hai cánh pin Mặt Trời có thanh trục quay, chảo ăn-ten, cột ăn-ten và các thiết bị trên thân",
  "fill": "#fbbf24",
  "anchor": "Tâm thân vệ tinh.",
  "useWhen": ["Cần vệ tinh nhân tạo thân hộp lá vàng, hai cánh pin Mặt Trời và chảo ăn-ten, quay quanh Trái Đất.","Cần xoay hai cánh pin −90° đến 90° để hướng về Mặt Trời."],
  "avoidWhen": ["Cần vệ tinh tự nhiên: dùng mat-trang.","Cần tàu có người lái hay trạm vũ trụ: dùng tau-vu-tru.","Mô hình sơ đồ nhìn từ cạnh, quay cả hai cánh cùng nhau, không quay riêng từng cánh."],
  "size": { "width": 0.94, "height": 0.258 },
  "parts": [
    { "name": "panels", "label": "Tấm pin Mặt Trời", "motion": "rotate", "min": -90, "max": 90, "description": "Góc quay của hai tấm pin quanh trục ngang qua thân, độ theo chiều kim đồng hồ; 0° là hai tấm nằm ngang sang hai bên, dương là tấm bên phải hạ xuống, tấm bên trái nâng lên." }
  ],
  "points": [
    { "name": "center", "description": "Tâm thân vệ tinh." },
    { "name": "dish", "description": "Giữa chảo ăn-ten phía trên thân." },
    { "name": "panelTipRight", "description": "Mút ngoài tấm pin bên phải khi góc quay bằng 0." },
    { "name": "panelTipLeft", "description": "Mút ngoài tấm pin bên trái khi góc quay bằng 0." }
  ],
  "notes": "Mô hình sơ đồ: thân 0,2 m × 0,16 m, mỗi cánh pin dài 0,38 m gồm ba panel; hai cánh quay cùng nhau để hướng mặt pin về phía Mặt Trời. Chảo ăn-ten đường kính 0,12 m. fill là màu lá cách nhiệt vàng của thân."
}
*/
const makeSatellite = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0016));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const BW = 0.1;
  const BH = 0.08;

  // Cột ăn-ten phía trên, chảo ăn-ten có cần đỡ và bộ thu ở tiêu điểm.
  group.add(new Konva.Line({ points: [m(0.03), m(-BH), m(0.03), m(-BH - 0.09)], stroke: "#cbd5e1", strokeWidth: m(0.004), lineCap: "round", listening: false }));
  group.add(new Konva.Circle({ x: m(0.03), y: m(-BH - 0.092), radius: m(0.006), fill: "#ef4444", stroke: "#7f1d1d", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.04), m(-BH), m(-0.04), m(-BH - 0.03)], stroke: "#94a3b8", strokeWidth: m(0.006), listening: false }));
  group.add(new Konva.Shape({ ...lin(m(-0.1), 0, m(0.0), 0, [0, "#f8fafc", 0.5, "#cbd5e1", 1, "#475569"]), stroke: "#334155", strokeWidth: lw, listening: false, sceneFunc: (ctx, shape) => { ctx.beginPath(); ctx.moveTo(m(-0.1), m(-BH - 0.07)); ctx.quadraticCurveTo(m(-0.04), m(-BH - 0.015), m(0.02), m(-BH - 0.07)); ctx.quadraticCurveTo(m(-0.04), m(-BH - 0.04), m(-0.1), m(-BH - 0.07)); ctx.closePath(); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Line({ points: [m(-0.04), m(-BH - 0.03), m(-0.04), m(-BH - 0.092)], stroke: "#94a3b8", strokeWidth: m(0.0025), listening: false }));
  group.add(new Konva.Circle({ x: m(-0.04), y: m(-BH - 0.094), radius: m(0.0045), fill: "#fbbf24", stroke: "#78350f", strokeWidth: lw * 0.6, listening: false }));

  // Thân vệ tinh: hộp bọc nhiều lớp lá vàng nhàu, viền thép, cửa sổ thiết bị và logo.
  group.add(new Konva.Rect({ x: m(-BW), y: m(-BH), width: m(BW * 2), height: m(BH * 2), cornerRadius: m(0.006), ...lin(0, 0, m(BW * 2), m(BH * 2), [0, "#fef3c7", 0.25, fill, 0.55, "#b45309", 0.8, fill, 1, "#78350f"]), stroke: "#451a03", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.015), shadowOpacity: 0.5, shadowOffset: { x: m(0.004), y: m(0.006) }, listening: false }));
  for (let i = 0; i < 7; i += 1) group.add(new Konva.Line({ points: [m(-BW + 0.01), m(-BH + 0.012 + i * 0.022), m(-BW * 0.3), m(-BH + 0.02 + i * 0.022), m(BW * 0.4), m(-BH + 0.01 + i * 0.022), m(BW - 0.01), m(-BH + 0.018 + i * 0.022)], stroke: "rgba(255,255,255,0.28)", strokeWidth: lw * 0.8, tension: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.07), y: m(0.03), width: m(0.06), height: m(0.03), cornerRadius: m(0.004), fill: "#0f172a", stroke: "#94a3b8", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: m(-0.04), y: m(0.045), radius: m(0.011), fillRadialGradientStartPoint: { x: m(-0.003), y: m(-0.003) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.011), fillRadialGradientColorStops: [0, "#e0f2fe", 0.5, "#38bdf8", 1, "#1e3a8a"], stroke: "#e2e8f0", strokeWidth: lw, listening: false }));
  group.add(new Konva.Text({ x: m(0.002), y: m(0.035), width: m(0.09), text: "NEVIAD-1", fontSize: m(0.011), fontStyle: "bold", fill: "#451a03", listening: false }));
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) group.add(new Konva.Circle({ x: m(sx * (BW - 0.007)), y: m(sy * (BH - 0.007)), radius: m(0.0028), fill: "#e2e8f0", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));

  // BỘ PHẬN QUAY: trục ngang xuyên thân, hai cánh pin mỗi cánh ba panel xanh sẫm có lưới tế bào quang điện.
  const panels = new Konva.Group();
  panels.add(new Konva.Line({ points: [m(-0.47), 0, m(0.47), 0], stroke: "#0f172a", strokeWidth: m(0.011), lineCap: "round", listening: false }));
  panels.add(new Konva.Line({ points: [m(-0.47), 0, m(0.47), 0], stroke: "#94a3b8", strokeWidth: m(0.0075), lineCap: "round", listening: false }));
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k += 1) {
      const x0 = s > 0 ? BW + 0.01 + k * 0.118 : -BW - 0.01 - (k + 1) * 0.118 + 0.0;
      panels.add(new Konva.Rect({ x: m(x0), y: m(-0.052), width: m(0.114), height: m(0.104), ...lin(0, 0, m(0.114), m(0.104), [0, "#1d4ed8", 0.5, "#1e3a8a", 1, "#0b1a4a"]), stroke: "#cbd5e1", strokeWidth: lw * 1.1, listening: false }));
      for (let i = 1; i < 6; i += 1) panels.add(new Konva.Line({ points: [m(x0 + i * 0.019), m(-0.052), m(x0 + i * 0.019), m(0.052)], stroke: "rgba(147,197,253,0.45)", strokeWidth: lw * 0.6, listening: false }));
      for (let i = 1; i < 4; i += 1) panels.add(new Konva.Line({ points: [m(x0), m(-0.052 + i * 0.026), m(x0 + 0.114), m(-0.052 + i * 0.026)], stroke: "rgba(147,197,253,0.45)", strokeWidth: lw * 0.6, listening: false }));
      panels.add(new Konva.Line({ points: [m(x0 + 0.004), m(-0.05), m(x0 + 0.05), m(-0.05), m(x0 + 0.004), m(-0.012)], closed: true, fill: "rgba(255,255,255,0.14)", listening: false }));
    }
  }
  panels.add(new Konva.Circle({ radius: m(0.012), ...lin(m(-0.012), m(-0.012), m(0.012), m(0.012), [0, "#f8fafc", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(panels);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.2), y: m(0.115), width: m(0.4), align: "center", text: label, fontSize: m(0.02), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: { panels: { node: panels, motion: "rotate" as const, min: -90, max: 90 } }, points: { center: { x: 0, y: 0 }, dish: { x: m(-0.04), y: m(-BH - 0.05) }, panelTipRight: { x: m(0.47), y: 0 }, panelTipLeft: { x: m(-0.47), y: 0 } } };
};
