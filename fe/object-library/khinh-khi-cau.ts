/* OBJECT-META
{
  "catalog": "Khinh khí cầu",
  "title": "Khinh khí cầu: khí cầu vải sọc màu hình quả lê, miệng khí cầu với đèn đốt có ngọn lửa, bốn dây thép và giỏ mây có người",
  "fill": "#dc2626",
  "anchor": "Giữa đáy giỏ.",
  "useWhen": ["Cần khinh khí cầu có giỏ, đèn đốt khí nóng cho bài lực đẩy Archimedes trong không khí.", "Cảnh cần cỡ thật (cao khoảng 15 m, đường kính 14 m) với giỏ có người."],
  "avoidWhen": ["Cần quả bóng bay hay bóng bơm khí nhẹ cỡ nhỏ: dùng qua-bong-bay.", "Cần máy bay, tên lửa hay tàu bay khác: dùng may-bay, ten-lua; vật này không có động cơ đẩy."],
  "size": { "width": 14.0, "height": 22.0 },
  "parts": [],
  "points": [
    { "name": "basket", "description": "Giữa đáy giỏ." },
    { "name": "burner", "description": "Đầu đốt phía trên giỏ, dưới miệng khí cầu." },
    { "name": "envelopeCenter", "description": "Tâm thể tích khí nóng trong khí cầu." },
    { "name": "top", "description": "Đỉnh khí cầu." }
  ],
  "notes": "Khí cầu cao 15 m, đường kính 14 m, thể tích khoảng 2 000 m³ khí nóng; giỏ mây 1,4 m × 1,1 m cao 1,1 m. Lực đẩy Archimedes của không khí lạnh lên khối khí nóng nhẹ hơn nâng cả hệ lên khi lực đẩy lớn hơn trọng lượng. fill là màu các dải sọc chính (xen kẽ với trắng)."
}
*/
const makeHotAirBalloon = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.04));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const pts = (a: number[]) => a.map(m);
  const TOP = -20;
  const BOT = -5.5;
  const RMAX = 7;

  // Bán kính khí cầu theo độ cao: tròn ở trên, thu lại về miệng ở dưới.
  const radius = (t: number) => {
    const s = Math.sin(Math.PI * Math.pow(t, 0.75));
    return RMAX * Math.pow(Math.max(0, s), 0.78) * (t > 0.8 ? 1 - ((t - 0.8) / 0.2) * 0.62 : 1);
  };
  const N = 28;
  const ys: number[] = [];
  for (let i = 0; i <= N; i += 1) ys.push(TOP + ((BOT - TOP) * i) / N);
  const rs = ys.map((_, i) => Math.max(0.55, radius(i / N)));
  rs[N] = 1.15;

  // Bóng và các dải sọc xen kẽ đỏ – vàng – trắng; bốn dải ngang trang trí.
  const NG = 10;
  group.add(new Konva.Line({ points: [...ys.map((y, i) => [m(rs[i] + 0.2), m(y + 0.2)]).flat(), ...ys.map((y, i) => [m(-rs[i] + 0.2), m(y + 0.2)]).reverse().flat()], closed: true, fill: "rgba(0,0,0,0.25)", listening: false }));
  const colors = [fill, "#fde047", "#ffffff", "#2563eb", fill, "#fde047", "#ffffff", "#2563eb", fill, "#fde047"];
  for (let g = 0; g < NG; g += 1) {
    const u0 = -1 + (2 * g) / NG;
    const u1 = -1 + (2 * (g + 1)) / NG;
    const left = ys.map((y, i) => [m(u0 * rs[i]), m(y)]).flat();
    const right = ys.map((y, i) => [m(u1 * rs[i]), m(y)]).reverse().flat();
    group.add(new Konva.Line({ points: [...left, ...right], closed: true, fill: colors[g], stroke: "rgba(15,23,42,0.45)", strokeWidth: lw * 0.5, lineJoin: "round", listening: false }));
  }
  // Làm tối rìa phải và sáng lệch trái bằng một lớp gradient ngang phủ lên.
  group.add(new Konva.Line({ points: [...ys.map((y, i) => [m(rs[i]), m(y)]).flat(), ...ys.map((y, i) => [m(-rs[i]), m(y)]).reverse().flat()], closed: true, fillLinearGradientStartPoint: { x: m(-RMAX), y: 0 }, fillLinearGradientEndPoint: { x: m(RMAX), y: 0 }, fillLinearGradientColorStops: [0, "rgba(255,255,255,0.35)", 0.35, "rgba(255,255,255,0)", 0.7, "rgba(0,0,0,0.05)", 1, "rgba(0,0,0,0.5)"], stroke: "#0b1220", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-RMAX * 0.74), y: m(ys[16]), width: m(RMAX * 1.48), height: m(0.5), fill: "rgba(11,18,32,0.55)", listening: false }));
  group.add(new Konva.Ellipse({ x: m(-2.4), y: m(-16.3), radiusX: m(1.0), radiusY: m(2.5), rotation: 22, fill: "rgba(255,255,255,0.28)", listening: false }));
  // Miệng khí cầu bằng vải chống cháy và vòng thép giữ dây.
  group.add(new Konva.Rect({ x: m(-1.25), y: m(BOT), width: m(2.5), height: m(0.9), ...lin(0, 0, m(2.5), 0, [0, "#475569", 0.5, "#cbd5e1", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));

  // Giá đỡ đầu đốt, ngọn lửa vàng cam và bốn dây thép từ miệng tới giỏ.
  for (const [x0, x1] of [[-1.1, -0.7], [-0.4, -0.25], [0.4, 0.25], [1.1, 0.7]] as [number, number][]) group.add(new Konva.Line({ points: [m(x0), m(BOT + 0.9), m(x1), m(-1.1)], stroke: "#94a3b8", strokeWidth: lw * 0.5, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.5), y: m(-3.0), width: m(1.0), height: m(0.8), cornerRadius: m(0.1), ...lin(0, 0, m(1.0), 0, [0, "#f8fafc", 0.5, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Line({ points: pts([-0.45, -3.0, 0, -5.3, 0.45, -3.0]), closed: true, tension: 0.3, fillLinearGradientStartPoint: { x: 0, y: m(-3) }, fillLinearGradientEndPoint: { x: 0, y: m(-5.3) }, fillLinearGradientColorStops: [0, "#fef9c3", 0.35, "#fb923c", 1, "rgba(239,68,68,0.15)"], shadowColor: "#f97316", shadowBlur: m(0.6), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.7), m(-3.0), m(-0.9), m(-2.2)], stroke: "#cbd5e1", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Line({ points: [m(0.7), m(-3.0), m(0.9), m(-2.2)], stroke: "#cbd5e1", strokeWidth: lw * 0.6, listening: false }));

  // Giỏ mây: đan chéo, đai da, bốn cọc góc; hai người đứng, chỉ thấy đầu và vai trên thành giỏ.
  group.add(new Konva.Rect({ x: m(-0.85), y: m(-2.2), width: m(1.7), height: m(2.2), cornerRadius: m(0.08), ...lin(0, 0, 0, m(2.2), [0, "#d6a15a", 0.5, "#a16207", 1, "#451a03"]), stroke: "#3b1d08", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 9; i += 1) {
    group.add(new Konva.Line({ points: [m(-0.85 + i * 0.2), m(-2.15), m(-0.65 + i * 0.2), m(-0.05)], stroke: "rgba(60,30,10,0.45)", strokeWidth: lw * 0.5, listening: false }));
    group.add(new Konva.Line({ points: [m(-0.65 + i * 0.2), m(-2.15), m(-0.85 + i * 0.2), m(-0.05)], stroke: "rgba(60,30,10,0.45)", strokeWidth: lw * 0.5, listening: false }));
  }
  group.add(new Konva.Rect({ x: m(-0.9), y: m(-2.3), width: m(1.8), height: m(0.18), cornerRadius: m(0.08), fill: "#78350f", stroke: "#2a0a02", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.9), y: m(-1.1), width: m(1.8), height: m(0.1), fill: "#431407", listening: false }));
  for (const [x, c] of [[-0.35, "#fecaca"], [0.3, "#bfdbfe"]] as [number, string][]) {
    group.add(new Konva.Circle({ x: m(x), y: m(-2.55), radius: m(0.2), fill: "#fcd9a0", stroke: "#78350f", strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.26), y: m(-2.35), width: m(0.52), height: m(0.28), cornerRadius: m(0.12), fill: c, stroke: "#475569", strokeWidth: lw * 0.5, listening: false }));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-3), y: m(0.3), width: m(6), align: "center", text: label, fontSize: m(0.5), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { basket: { x: 0, y: 0 }, burner: { x: 0, y: m(-3.0) }, envelopeCenter: { x: 0, y: m(-13) }, top: { x: 0, y: m(TOP) } } };
};
