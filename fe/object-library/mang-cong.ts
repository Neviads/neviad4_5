/* OBJECT-META
{
  "catalog": "Máng cong / ray tàu lượn",
  "title": "Ray cong kiểu tàu lượn: hai bờ cao thấp khác nhau, đáy thấp ở giữa, đỡ bằng các cột thép trên tấm đế gỗ",
  "fill": "#cbd5e1",
  "anchor": "Điểm thấp nhất của lòng ray (y = 0), ở giữa.",
  "useWhen": ["Cần ray cong lòng máng với đáy thấp ở giữa, hai bờ cao thấp khác nhau cho vật lăn trượt qua lại.","Cần minh hoạ thế năng và động năng khi vật chuyển động trên ray cong kiểu tàu lượn."],
  "avoidWhen": ["Cần đường thẳng nằm ngang hoặc nghiêng có thước mm: dùng mang-ray.","Cần mặt nghiêng thẳng chỉnh góc: dùng mat-nghieng.","Cần ray tròn khép kín (vòng xiếc): ray này hở hai đầu."],
  "size": { "width": 1.09, "height": 0.609 },
  "parts": [],
  "points": [
    { "name": "bottom", "description": "Điểm thấp nhất của lòng ray." },
    { "name": "leftTop", "description": "Mép cao ở đầu trái (cao 0,38 m so với điểm thấp nhất)." },
    { "name": "rightTop", "description": "Mép cao ở đầu phải (cao 0,26 m)." },
    { "name": "ground", "description": "Mặt tấm đế, 0,13 m dưới điểm thấp nhất." }
  ],
  "notes": "Lòng ray có độ cao h(x) = 0,38·(|x|/0,45)^1,8 ở nhánh trái và 0,26·(x/0,45)^1,8 ở nhánh phải, x là khoảng cách ngang tới điểm thấp nhất. Dùng cho bảo toàn cơ năng; engine tính vị trí vật theo cùng công thức. fill là màu thép của ray."
}
*/
const makeCurvedTrack = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const HALF = 0.5;
  const LEFT_H = 0.38;
  const RIGHT_H = 0.26;
  const SCALE = 0.45;
  const THICK = 0.016;
  const GROUND = 0.13;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0015));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const height = (x: number) => (x < 0 ? LEFT_H * (Math.abs(x) / SCALE) ** 1.8 : RIGHT_H * (x / SCALE) ** 1.8);
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Tấm đế gỗ và các cột đỡ dưới ray.
  group.add(new Konva.Rect({ x: m(-0.54), y: m(GROUND), width: m(1.08), height: m(0.02), cornerRadius: m(0.004), ...lin(0, m(GROUND), 0, m(GROUND + 0.02), [0, "#d6b080", 1, "#8a5a2b"]), stroke: "#4a2f12", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  for (const x of [-0.46, -0.31, -0.15, 0, 0.15, 0.3, 0.44]) {
    const top = -height(x) + THICK;
    group.add(new Konva.Rect({ x: m(x - 0.0055), y: m(top), width: m(0.011), height: m(GROUND - top), ...lin(m(x - 0.0055), 0, m(x + 0.0055), 0, [0, "#64748b", 0.3, "#f1f5f9", 0.65, "#cbd5e1", 1, "#475569"]), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.012), y: m(GROUND - 0.008), width: m(0.024), height: m(0.008), cornerRadius: m(0.002), fill: "#475569", stroke: "#1e293b", strokeWidth: lw * 0.6, listening: false }));
  }

  // Thân ray: dải thép uốn cong có chiều dày; mặt trên và mặt dưới là hai đường bậc cao.
  const top: number[] = [];
  const bottom: number[] = [];
  const steps = 80;
  for (let i = 0; i <= steps; i += 1) {
    const x = -HALF + (i / steps) * 2 * HALF;
    top.push(m(x), m(-height(x)));
    bottom.unshift(m(-height(x) + THICK));
    bottom.unshift(m(x));
  }
  group.add(new Konva.Line({ points: [...top, ...bottom], closed: true, lineJoin: "round", ...lin(0, m(-0.4), 0, m(0.02), [0, "#f8fafc", 0.4, fill, 1, "#64748b"]), stroke: "#334155", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  // Rãnh dẫn ở giữa lòng ray (đường tối) và vệt sáng ở mép trên.
  const groove: number[] = [];
  const edge: number[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = -HALF + (i / steps) * 2 * HALF;
    groove.push(m(x), m(-height(x) + 0.0052));
    edge.push(m(x), m(-height(x) + 0.0014));
  }
  group.add(new Konva.Line({ points: groove, stroke: "rgba(2,6,23,0.7)", strokeWidth: m(0.0042), lineCap: "round", lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: edge, stroke: "rgba(255,255,255,0.85)", strokeWidth: lw * 1.2, lineCap: "round", lineJoin: "round", listening: false }));
  // Hai đầu chặn và vạch mốc độ cao 10 cm.
  for (const [x, h] of [[-HALF, LEFT_H], [HALF, RIGHT_H]] as const) {
    group.add(new Konva.Rect({ x: m(x - 0.006), y: m(-h - 0.02), width: m(0.012), height: m(0.032), cornerRadius: m(0.003), fill: "#111827", stroke: "#374151", strokeWidth: lw * 0.8, listening: false }));
  }
  for (let hh = 0.1; hh <= LEFT_H + 0.001; hh += 0.1) {
    group.add(new Konva.Line({ points: [m(-0.55), m(-hh), m(-0.535), m(-hh)], stroke: "#fbbf24", strokeWidth: lw, listening: false }));
    group.add(new Konva.Text({ x: m(-0.595), y: m(-hh - 0.0045), width: m(0.04), align: "right", text: `${Math.round(hh * 100)}`, fontSize: m(0.0095), fontStyle: "bold", fill: "#fbbf24", listening: false }));
  }
  group.add(new Konva.Text({ x: m(-0.595), y: m(-LEFT_H - 0.032), text: "h (cm)", fontSize: m(0.0095), fill: "#fbbf24", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.3), y: m(GROUND + 0.026), width: m(0.6), align: "center", text: label, fontSize: m(0.02), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { bottom: { x: 0, y: 0 }, leftTop: { x: m(-HALF), y: m(-LEFT_H) }, rightTop: { x: m(HALF), y: m(-RIGHT_H) }, ground: { x: 0, y: m(GROUND) } } };
};
