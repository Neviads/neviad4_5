/* OBJECT-META
{
  "catalog": "Chuông điện",
  "title": "Chuông điện: nam châm điện hai cuộn trên lõi sắt chữ U, lá thép mang búa gõ chuông, vít tiếp xúc, chuông kim loại hình vòm và hai chốt nối pin",
  "fill": "#fbbf24",
  "anchor": "Giữa đáy đế, chạm mặt bàn.",
  "useWhen": ["Cần chuông điện nam châm điện hai cuộn, lá thép mang búa gõ và vít tiếp xúc.","Cần búa lắc ±8 độ đập vào chuông kim loại và hai chốt nối pin."],
  "avoidWhen": ["Cần nam châm điện giữ bi hay ống dây có lõi sắt: dùng nam-cham-dien-giu-bi hoặc ong-day-loi-sat.","Cần loa phát âm bằng màng: dùng loa; chuông này chỉ gõ bằng búa."],
  "size": { "width": 0.152, "height": 0.108 },
  "parts": [
    { "name": "hammer", "label": "Lá thép và búa", "motion": "rotate", "min": -8, "max": 8, "description": "Góc lắc của lá thép cùng búa quanh chân lá, độ theo chiều kim đồng hồ; dương là búa hướng sang chuông, âm là lá bị nam châm hút về phía cuộn dây." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy đế." },
    { "name": "bell", "description": "Đỉnh chuông." },
    { "name": "hammerHead", "description": "Đầu búa ở trạng thái nghỉ." },
    { "name": "terminalPlus", "description": "Chốt nối cực + của pin." },
    { "name": "terminalMinus", "description": "Chốt nối cực − của pin." }
  ],
  "notes": "Đế gỗ 0,14 m × 0,014 m; nam châm điện hai cuộn ở bên trái (lõi sắt non), lá thép dài 0,075 m treo ở chân đế, có vít tiếp xúc phía sau; chuông kim loại đường kính 0,05 m ở bên phải. Khi có dòng điện, lá bị hút, búa quay đập vào chuông (góc dương), đồng thời lá rời vít làm hở mạch và bật lại. fill là màu đồng thau của chuông."
}
*/
const makeElectricBell = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const BH = 0.014;
  const PX = -0.004;
  const PY = -BH - 0.003;

  // Đế gỗ có vân và hai chốt nối pin ở mép trái.
  group.add(new Konva.Rect({ x: m(-0.07), y: m(-BH), width: m(0.14), height: m(BH), cornerRadius: m(0.003), ...lin(0, m(-BH), 0, 0, [0, "#d6a15a", 0.5, "#a16207", 1, "#5a2d0c"]), stroke: "#3b1d08", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  for (let i = 0; i < 4; i += 1) group.add(ln([-0.066 + i * 0.002, -BH + 0.003 + i * 0.0024, 0.066 - i * 0.003, -BH + 0.0034 + i * 0.0024], "rgba(60,30,10,0.3)", lw * 0.7));
  for (const [x, c, cc] of [[-0.06, "#ef4444", "#7f1d1d"], [-0.05, "#1f2937", "#030712"]] as [number, string, string][]) {
    group.add(new Konva.Circle({ x: m(x), y: m(-BH - 0.003), radius: m(0.0046), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0046), fillRadialGradientColorStops: [0, "#fff", 0.35, c, 1, cc], stroke: cc, strokeWidth: lw * 0.6, listening: false }));
  }

  // Nam châm điện: gông sắt hình chữ U nằm sau, hai lõi nằm ngang bên trong hai cuộn dây đồng.
  group.add(new Konva.Rect({ x: m(-0.048), y: m(-0.098), width: m(0.011), height: m(0.08), ...lin(m(-0.048), 0, m(-0.037), 0, steel), stroke: "#334155", strokeWidth: lw, listening: false }));
  for (const y of [-0.075, -0.045]) {
    group.add(new Konva.Rect({ x: m(-0.044), y: m(y - 0.0055), width: m(0.044), height: m(0.011), ...lin(0, m(y - 0.0055), 0, m(y + 0.0055), steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Rect({ x: m(-0.0415), y: m(y - 0.011), width: m(0.028), height: m(0.022), cornerRadius: m(0.003), ...lin(0, m(y - 0.011), 0, m(y + 0.011), [0, "#fef3c7", 0.25, "#d97706", 0.7, "#7c2d12", 1, "#2a0a02"]), stroke: "#431407", strokeWidth: lw * 0.8, listening: false }));
    for (let i = 0; i < 8; i += 1) group.add(ln([-0.0405 + i * 0.0034, y - 0.0105, -0.0383 + i * 0.0034, y + 0.0105], "rgba(67,20,7,0.5)", lw * 0.6));
    group.add(new Konva.Rect({ x: m(-0.0415), y: m(y - 0.0105), width: m(0.028), height: m(0.0025), fill: "rgba(255,255,255,0.4)", listening: false }));
    group.add(new Konva.Rect({ x: m(-0.0005), y: m(y - 0.0048), width: m(0.003), height: m(0.0096), ...lin(0, m(y - 0.0048), 0, m(y + 0.0048), steel), stroke: "#1e293b", strokeWidth: lw * 0.6, listening: false }));
  }
  // Giá đỡ lá thép và vít tiếp xúc ở phía sau lá.
  group.add(new Konva.Rect({ x: m(PX - 0.011), y: m(PY - 0.004), width: m(0.022), height: m(0.007), cornerRadius: m(0.0015), ...lin(m(PX - 0.011), 0, m(PX + 0.011), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(0.016), y: m(-0.082), width: m(0.012), height: m(0.064 + 0.001), ...lin(m(0.016), 0, m(0.028), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(0.0108), y: m(-0.06), width: m(0.0052), height: m(0.004), fill: "#e2e8f0", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  group.add(ln([0.0108, -0.058, 0.016, -0.058], "#94a3b8", lw * 1.3));
  group.add(new Konva.Circle({ x: m(0.0108), y: m(-0.058), radius: m(0.0024), fill: "#e2e8f0", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));

  // Chuông: nón hình vòm đồng thau có nút giữ, đặt lên trụ đỡ ở đế.
  const bx = 0.054;
  group.add(new Konva.Rect({ x: m(bx - 0.0055), y: m(-0.034), width: m(0.011), height: m(0.034 - BH), ...lin(m(bx - 0.0055), 0, m(bx + 0.0055), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Line({ points: [m(bx - 0.025), m(-0.034), m(bx - 0.0245), m(-0.044), m(bx - 0.018), m(-0.058), m(bx - 0.0085), m(-0.066), m(bx), m(-0.0685), m(bx + 0.0085), m(-0.066), m(bx + 0.018), m(-0.058), m(bx + 0.0245), m(-0.044), m(bx + 0.025), m(-0.034)], closed: true, tension: 0.35, ...lin(m(bx - 0.025), 0, m(bx + 0.025), 0, [0, "#fef9c3", 0.28, fill, 0.7, "#92400e", 1, "#451a03"]), stroke: "#78350f", strokeWidth: lw * 1.1, lineJoin: "round", shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, shadowOffset: { x: m(0.0015), y: m(0.003) }, listening: false }));
  group.add(new Konva.Arc({ x: m(bx), y: m(-0.034), innerRadius: m(0.0205), outerRadius: m(0.023), angle: 55, rotation: 215, fill: "rgba(255,255,255,0.7)", listening: false }));
  group.add(new Konva.Circle({ x: m(bx), y: m(-0.0705), radius: m(0.0032), fill: "#e2e8f0", stroke: "#475569", strokeWidth: lw * 0.7, listening: false }));
  group.add(ln([bx - 0.025, -0.0346, bx + 0.025, -0.0346], "#78350f", lw * 1.3));

  // BỘ PHẬN QUAY: lá thép lò xo + búa bi. Gốc nhóm ở chân lá, nơi lá bắt vào đế.
  const hammer = new Konva.Group({ x: m(PX), y: m(PY) });
  hammer.add(new Konva.Rect({ x: m(-0.0035), y: m(-0.077), width: m(0.007), height: m(0.077), ...lin(m(-0.0035), 0, m(0.0035), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  hammer.add(new Konva.Rect({ x: m(-0.0075), y: m(-0.0805), width: m(0.015), height: m(0.007), ...lin(m(-0.0075), 0, m(0.0075), 0, [0, "#475569", 0.4, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 0.7, listening: false }));
  hammer.add(ln([0, -0.0795, 0.026, -0.0795], "#0f172a", m(0.0042)));
  hammer.add(ln([0, -0.0795, 0.026, -0.0795], "#cbd5e1", m(0.003)));
  hammer.add(new Konva.Circle({ x: m(0.0305), y: m(-0.0795), radius: m(0.0058), fillRadialGradientStartPoint: { x: m(-0.0018), y: m(-0.002) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0058), fillRadialGradientColorStops: [0, "#ffffff", 0.35, "#94a3b8", 1, "#1e293b"], stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  group.add(hammer);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.006), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { hammer: { node: hammer, motion: "rotate" as const, min: -8, max: 8 } },
    points: { base: { x: 0, y: 0 }, bell: { x: m(bx), y: m(-0.0705) }, hammerHead: { x: m(PX + 0.0305), y: m(PY - 0.0795) }, terminalPlus: { x: m(-0.06), y: m(-BH - 0.003) }, terminalMinus: { x: m(-0.05), y: m(-BH - 0.003) } },
  };
};
