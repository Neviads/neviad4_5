/* OBJECT-META
{
  "catalog": "Nam châm chữ U",
  "title": "Nam châm hình chữ U mở lên trên: hai chân sơn đỏ (N) và xanh (S) ở đầu, thân thép bóng, khe giữa hai cực để đặt dây dẫn",
  "fill": "#dc2626",
  "anchor": "Giữa đáy chữ U, ở điểm thấp nhất.",
  "useWhen": ["Cần nam châm chữ U mở lên trên, chân đỏ N và xanh S, có khe giữa hai cực để đặt dây dẫn.","Cần từ trường đều giữa hai cực cho bài lực từ lên dây mang dòng."],
  "avoidWhen": ["Cần nam châm thanh dài: dùng nam-cham-thang.","Cần nam châm điện bật tắt được: dùng nam-cham-dien-giu-bi.","Cần dụng cụ chỉ hướng từ trường: dùng kim-nam-cham."],
  "size": { "width": 0.072, "height": 0.107 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Điểm thấp nhất của đáy chữ U." },
    { "name": "gap", "description": "Giữa khe hai cực, ngang đầu hai chân." },
    { "name": "north", "description": "Mặt đầu cực Bắc (chân phải)." },
    { "name": "south", "description": "Mặt đầu cực Nam (chân trái)." }
  ],
  "notes": "Cao 0,095 m, rộng 0,07 m, mỗi chân dày 0,018 m, khe giữa hai cực rộng 0,034 m; từ trường trong khe gần đều, hướng từ N (chân phải, đỏ) sang S (chân trái, xanh). fill là màu cực Bắc."
}
*/
const makeUMagnet = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const W = 0.07;
  const LEG = 0.018;
  const RO = W / 2;
  const RI = RO - LEG;
  const cy = -RO;
  const top = -0.095;

  // Thân cong đáy bằng thép sáng, bóng đổ dưới.
  group.add(new Konva.Arc({ x: m(0.002), y: m(cy + 0.003), innerRadius: m(RI), outerRadius: m(RO), angle: 180, rotation: 0, fill: "rgba(0,0,0,0.4)", listening: false }));
  group.add(new Konva.Arc({ x: 0, y: m(cy), innerRadius: m(RI), outerRadius: m(RO), angle: 180, rotation: 0, fillRadialGradientStartPoint: { x: m(-0.008), y: m(0.012) }, fillRadialGradientStartRadius: m(RI), fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(RO), fillRadialGradientColorStops: [0, "#475569", 0.5, "#e2e8f0", 1, "#334155"], stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Arc({ x: 0, y: m(cy), innerRadius: m(RO - 0.0045), outerRadius: m(RO - 0.0022), angle: 110, rotation: 35, fill: "rgba(255,255,255,0.65)", listening: false }));

  // Hai chân: phần thép dưới, phần sơn màu trên đầu (đỏ phải, xanh trái), mặt cực sáng.
  const leg = (x: number, c: string, cc: string, hi: string, text: string) => {
    group.add(new Konva.Rect({ x: m(x), y: m(top), width: m(LEG), height: m(cy - top + 0.001), ...lin(0, 0, m(LEG), 0, [0, "#475569", 0.4, "#e2e8f0", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
    group.add(new Konva.Rect({ x: m(x), y: m(top), width: m(LEG), height: m(0.047), ...lin(0, 0, m(LEG), 0, [0, cc, 0.35, hi, 0.55, c, 1, cc]), stroke: cc, strokeWidth: lw, listening: false }));
    group.add(new Konva.Rect({ x: m(x + 0.0025), y: m(top + 0.003), width: m(0.0025), height: m(0.043), fill: "rgba(255,255,255,0.45)", listening: false }));
    group.add(new Konva.Rect({ x: m(x), y: m(top - 0.0012), width: m(LEG), height: m(0.0024), fill: "#f8fafc", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Text({ x: m(x), y: m(top + 0.016), width: m(LEG), align: "center", text, fontSize: m(0.012), fontStyle: "bold", fill: "#fff", listening: false }));
  };
  leg(-RO, "#2563eb", "#172554", "#bfdbfe", "S");
  leg(RI, fill, "#450a0a", "#fecaca", "N");

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.008), width: m(0.12), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, gap: { x: 0, y: m(top) }, north: { x: m(RI + LEG / 2), y: m(top) }, south: { x: m(-RO + LEG / 2), y: m(top) } } };
};
