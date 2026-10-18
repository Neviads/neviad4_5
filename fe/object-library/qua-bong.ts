/* OBJECT-META
{
  "catalog": "Quả bóng (đá, tennis, bowling)",
  "title": "Quả bóng đá cỡ 5: các mảng da lục giác trắng và ngũ giác đen, đường may và vệt sáng",
  "fill": "#f8fafc",
  "anchor": "Tâm quả bóng.",
  "useWhen": ["Cần quả bóng đá cỡ 5, đường kính 0,22 m, nặng 0,43 kg, hoạ tiết lục giác trắng và ngũ giác đen.","Cần vật tròn lăn hoặc rơi tự do, có điểm đáy và đỉnh."],
  "avoidWhen": ["Cần bóng tennis hoặc bowling: vật này chỉ vẽ bóng đá, nên dùng vien-bi hoặc vật khác.","Cần bóng bay phồng được: dùng qua-bong-bay."],
  "size": {
    "width": 0.22,
    "height": 0.278
  },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Tâm quả bóng."
    },
    {
      "name": "bottom",
      "description": "Điểm thấp nhất, nơi chạm sàn."
    },
    {
      "name": "top",
      "description": "Điểm cao nhất."
    }
  ],
  "notes": "Đường kính 0,22 m, khối lượng 0,43 kg. Muốn bóng tennis hay bóng bowling thì dùng cùng khung nhưng đổi hoạ tiết: bóng này chỉ vẽ bóng đá. fill là màu mảng da trắng."
}
*/
const makeFootball = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.11;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0016));
  const ang = (deg: number) => (deg * Math.PI) / 180;
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Bóng đổ xuống sàn.
  group.add(new Konva.Ellipse({ x: m(0.008), y: m(R + 0.003), radiusX: m(R * 0.82), radiusY: m(0.0095), fill: "rgba(0,0,0,0.45)", listening: false }));
  // Nền da trắng của cả quả cầu.
  group.add(new Konva.Circle({ radius: m(R), fillRadialGradientStartPoint: { x: m(-0.035), y: m(-0.04) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "#ffffff", 0.6, fill, 1, "#d1d5db"], stroke: "#1f2937", strokeWidth: lw * 1.6, listening: false }));

  // Các mảng ngũ giác đen: một ở giữa (hơi lệch lên) và năm mảng nhìn nghiêng ở quanh vành, co lại theo phối cảnh.
  const pentagon = (cx: number, cy: number, r: number, rot: number, squash: number) => {
    const pts: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const a = ang(rot + i * 72 - 90);
      pts.push(m(cx + r * Math.cos(a) * squash), m(cy + r * Math.sin(a)));
    }
    return new Konva.Line({ points: pts, closed: true, lineJoin: "round", fillLinearGradientStartPoint: { x: m(cx - r), y: m(cy - r) }, fillLinearGradientEndPoint: { x: m(cx + r), y: m(cy + r) }, fillLinearGradientColorStops: [0, "#374151", 1, "#030712"], stroke: "#000", strokeWidth: lw, listening: false });
  };
  const cx0 = 0.004;
  const cy0 = -0.006;
  const r0 = 0.032;
  // Đường may nối đỉnh ngũ giác giữa ra năm ngũ giác ngoài.
  const outer: [number, number, number, number][] = [];
  for (let i = 0; i < 5; i += 1) {
    const a = ang(i * 72 - 90);
    const ox = cx0 + 0.083 * Math.cos(a) * 0.92;
    const oy = cy0 + 0.083 * Math.sin(a) * 0.98;
    outer.push([ox, oy, 0.027, i * 72 + 36]);
    const ix = cx0 + r0 * Math.cos(a);
    const iy = cy0 + r0 * Math.sin(a);
    group.add(new Konva.Line({ points: [m(ix), m(iy), m(cx0 + (0.083 - 0.027) * Math.cos(a)), m(cy0 + (0.083 - 0.027) * Math.sin(a))], stroke: "#4b5563", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));
  }
  // Nối các ngũ giác ngoài với nhau bằng cung ngắn (đường may lục giác).
  for (let i = 0; i < 5; i += 1) {
    const a1 = ang(i * 72 - 90);
    const a2 = ang((i + 1) * 72 - 90);
    const am = (a1 + a2) / 2;
    group.add(new Konva.Line({ points: [m(cx0 + 0.058 * Math.cos(a1 + 0.2)), m(cy0 + 0.058 * Math.sin(a1 + 0.2)), m(cx0 + 0.072 * Math.cos(am)), m(cy0 + 0.072 * Math.sin(am)), m(cx0 + 0.058 * Math.cos(a2 - 0.2)), m(cy0 + 0.058 * Math.sin(a2 - 0.2))], stroke: "#4b5563", strokeWidth: lw * 1.1, tension: 0.4, listening: false }));
    group.add(new Konva.Line({ points: [m(cx0 + 0.083 * Math.cos(am) * 0.95), m(cy0 + 0.083 * Math.sin(am) * 0.98), m(cx0 + 0.1042 * Math.cos(am)), m(cy0 + 0.1042 * Math.sin(am))], stroke: "#4b5563", strokeWidth: lw * 1.1, lineCap: "round", listening: false }));
  }
  for (const [ox, oy, r, rot] of outer) {
    const d = Math.hypot(ox, oy);
    const squash = 1 - 0.38 * (d / R) ** 2;
    group.add(pentagon(ox, oy, r * (1 - 0.18 * (d / R)), rot, Math.max(0.55, squash)));
  }
  group.add(pentagon(cx0, cy0, r0, 0, 1));
  // Nửa dưới tối dần do ánh sáng, vệt sáng bóng ở trên trái, viền sáng quanh.
  group.add(new Konva.Circle({ radius: m(R - 0.0009), fillRadialGradientStartPoint: { x: m(-0.04), y: m(-0.045) }, fillRadialGradientStartRadius: m(0.02), fillRadialGradientEndPoint: { x: m(0.02), y: m(0.025) }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "rgba(255,255,255,0)", 0.75, "rgba(15,23,42,0.05)", 1, "rgba(15,23,42,0.28)"], listening: false }));
  group.add(new Konva.Ellipse({ x: m(-0.043), y: m(-0.052), radiusX: m(0.0185), radiusY: m(0.0105), rotation: -38, fill: "rgba(255,255,255,0.78)", listening: false }));
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(R - 0.0042), outerRadius: m(R - 0.0016), angle: 50, rotation: 200, fill: "rgba(255,255,255,0.4)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-R), y: m(R + 0.012), width: m(2 * R), align: "center", text: label, fontSize: m(0.016), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, bottom: { x: 0, y: m(R) }, top: { x: 0, y: m(-R) } } };
};
