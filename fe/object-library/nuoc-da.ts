/* OBJECT-META
{
  "catalog": "Viên nước đá / cốc đá",
  "title": "Cốc thuỷ tinh đựng nước lạnh với ba viên đá khối trong mờ nổi trên mặt, thành cốc đọng sương và một viên đá vỡ cạnh",
  "fill": "#bae6fd",
  "anchor": "Giữa đáy cốc, chạm mặt bàn.",
  "useWhen": ["Cần cốc nước lạnh 0 °C có ba viên đá lập phương nổi một phần, thành cốc đọng sương.", "Cảnh minh hoạ đá nổi trên nước (chìm khoảng 92 % thể tích), sự tan đá hay chuyển thể."],
  "avoidWhen": ["Cần cốc đo thể tích có vạch chia mL: dùng ong-dong.", "Cảnh đá tan dần không có sẵn trong vật; luôn là ba viên cố định, trạng thái tan do cảnh vẽ."],
  "size": { "width": 0.075, "height": 0.1 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy cốc." },
    { "name": "waterSurface", "description": "Giữa mặt nước." },
    { "name": "ice", "description": "Giữa nhóm ba viên đá nổi." }
  ],
  "notes": "Cốc cao 0,09 m, đường kính 0,07 m, nước cao 0,06 m ở 0 °C, ba viên đá lập phương cạnh 0,02 m nổi một phần trên mặt nước (khối lượng riêng nước đá 0,92 g/cm³ nên chìm 92 % thể tích). Đá tan là trạng thái do cảnh vẽ. fill là màu nước và viên đá."
}
*/
const makeIceCup = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.07;
  const H = 0.09;
  const WALL = 0.002;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const left = -W / 2;
  const WL = 0.062;

  group.add(new Konva.Ellipse({ x: m(0.003), y: m(-0.001), radiusX: m(W / 2 + 0.004), radiusY: m(0.003), fill: "rgba(0,0,0,0.4)", listening: false }));
  // Nước lạnh trong cốc: xanh nhạt hơn ở mặt, đậm ở đáy.
  group.add(new Konva.Rect({ x: m(left), y: m(-H), width: m(W), height: m(H), cornerRadius: m(0.002), fill: "rgba(186,230,253,0.1)", listening: false }));
  group.add(new Konva.Rect({ x: m(left + WALL), y: m(-0.004 - WL), width: m(W - WALL * 2), height: m(WL), ...lin(0, 0, 0, m(WL), [0, "rgba(224,242,254,0.55)", 1, "rgba(14,116,144,0.6)"]), listening: false }));
  group.add(new Konva.Rect({ x: m(left + WALL), y: m(-0.004 - WL), width: m(W - WALL * 2), height: m(WL), fill, opacity: 0.18, listening: false }));
  group.add(ln([left + WALL + 0.001, -0.004 - WL, left + W - WALL - 0.001, -0.004 - WL], "rgba(255,255,255,0.9)", lw * 1.6));

  // Ba viên đá khối: chìm một phần, mặt trên sáng, mặt bên mờ có vết nứt, góc bo nhẹ.
  const cube = (x: number, y: number, s: number, rot: number) => {
    const g = new Konva.Group({ x: m(x), y: m(y), rotation: rot });
    g.add(new Konva.Rect({ x: m(-s / 2), y: m(-s / 2), width: m(s), height: m(s), cornerRadius: m(0.0025), ...lin(0, 0, m(s), m(s), [0, "rgba(255,255,255,0.9)", 0.45, "rgba(186,230,253,0.7)", 1, "rgba(125,211,252,0.78)"]), stroke: "rgba(240,249,255,0.95)", strokeWidth: lw * 1.2, shadowColor: "#0ea5e9", shadowBlur: m(0.004), shadowOpacity: 0.5, listening: false }));
    g.add(new Konva.Rect({ x: m(-s / 2 + 0.0022), y: m(-s / 2 + 0.0022), width: m(s * 0.45), height: m(s * 0.28), cornerRadius: m(0.0012), fill: "rgba(255,255,255,0.7)", listening: false }));
    g.add(ln([-s * 0.1, s * 0.05, s * 0.18, s * 0.2, s * 0.3, s * 0.42], "rgba(255,255,255,0.55)", lw * 0.8));
    g.add(ln([s * 0.05, -s * 0.2, s * 0.15, -s * 0.05], "rgba(255,255,255,0.45)", lw * 0.7));
    return g;
  };
  group.add(cube(-0.0165, -0.004 - WL - 0.0014, 0.0185, -9));
  group.add(cube(0.0125, -0.004 - WL - 0.0035, 0.02, 8));
  group.add(cube(-0.0005, -0.004 - WL + 0.011, 0.0185, 15));
  // Bóng bóng khí rất nhỏ trong nước.
  for (const [x, y] of [[-0.026, -0.02], [0.024, -0.012], [-0.012, -0.035], [0.02, -0.04]] as [number, number][]) group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(0.0014), fill: "rgba(255,255,255,0.45)", stroke: "rgba(255,255,255,0.8)", strokeWidth: lw * 0.4, listening: false }));

  // Thành cốc: viền sáng, sương mịn ở phía ngoài, vệt phản chiếu dọc và gờ miệng.
  group.add(new Konva.Rect({ x: m(left), y: m(-H), width: m(W), height: m(H), cornerRadius: m(0.002), stroke: "rgba(226,240,252,0.95)", strokeWidth: m(0.0022), listening: false }));
  group.add(new Konva.Rect({ x: m(left), y: m(-0.0055), width: m(W), height: m(0.0055), fill: "rgba(148,163,184,0.5)", stroke: "rgba(226,240,252,0.9)", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 18; i += 1) group.add(new Konva.Circle({ x: m(left + 0.003 + ((i * 37) % 64) / 1000), y: m(-0.014 - ((i * 53) % 52) / 1000), radius: m(0.0007 + (i % 3) * 0.0003), fill: "rgba(224,242,254,0.55)", listening: false }));
  group.add(ln([left + 0.0055, -H + 0.004, left + 0.0055, -0.012], "rgba(255,255,255,0.75)", lw * 2.4));
  group.add(ln([left + W - 0.006, -H + 0.01, left + W - 0.006, -0.03], "rgba(255,255,255,0.32)", lw * 1.5));
  group.add(new Konva.Rect({ x: m(left - 0.0025), y: m(-H - 0.0025), width: m(W + 0.005), height: m(0.0035), cornerRadius: m(0.0015), ...lin(0, 0, 0, m(0.0035), [0, "rgba(255,255,255,0.9)", 1, "rgba(148,163,184,0.7)"]), stroke: "rgba(226,240,252,0.95)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Text({ x: m(-0.03), y: m(-0.0295), width: m(0.06), align: "center", text: "0 °C", fontSize: m(0.0075), fontStyle: "bold", fill: "rgba(224,242,254,0.9)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.006), width: m(0.12), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, waterSurface: { x: 0, y: m(-0.004 - WL) }, ice: { x: 0, y: m(-0.004 - WL) } } };
};
