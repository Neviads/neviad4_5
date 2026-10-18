/* OBJECT-META
{
  "catalog": "Nam châm điện giữ bi (máy rơi tự do)",
  "title": "Nam châm điện giữ viên bi thép trên giá: cuộn dây quấn trong vỏ thép, hai dây nguồn, công tắc ngắt điện và viên bi bị giữ ở đáy",
  "fill": "#334155",
  "anchor": "Tâm viên bi khi còn bị nam châm giữ (điểm thả).",
  "useWhen": ["Cần nam châm điện giữ viên bi thép, ngắt công tắc thì bi rơi tại điểm thả cho bài rơi tự do.","Cần cuộn dây quấn trong vỏ thép với hai dây nguồn và công tắc ngắt."],
  "avoidWhen": ["Cần nam châm vĩnh cửu có cực N/S: dùng nam-cham-thang hoặc nam-cham-chu-u.","Cần ống dây có lõi sắt để đo từ trường: dùng ong-day-loi-sat.","Cần viên bi rời không kèm giá giữ: dùng vien-bi."],
  "size": { "width": 0.234, "height": 0.305 },
  "parts": [],
  "points": [
    { "name": "release", "description": "Tâm viên bi khi còn bị giữ: vị trí bắt đầu rơi." },
    { "name": "magnetFace", "description": "Mặt từ dưới của lõi sắt." },
    { "name": "switch", "description": "Công tắc ngắt điện thả bi." }
  ],
  "notes": "Nam châm cao 0,06 m, viên bi thép bán kính 0,015 m treo dưới mặt từ. Cắt điện bằng công tắc thì bi rơi tự do; cảnh dùng điểm release làm điểm xuất phát. Dây nguồn nối sang hộp công tắc bên phải. fill là màu vỏ thép."
}
*/
const makeMagnetRelease = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const BALL_R = 0.015;
  const faceY = -BALL_R * 2 - 0.0;

  // Giá đỡ: trụ đứng bên trái và xà ngang đưa nam châm ra.
  group.add(new Konva.Rect({ x: m(-0.108), y: m(faceY - 0.14), width: m(0.014), height: m(0.265), cornerRadius: m(0.004), ...lin(m(-0.108), 0, m(-0.094), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.108), y: m(faceY - 0.1), width: m(0.088), height: m(0.012), cornerRadius: m(0.004), ...lin(0, m(faceY - 0.1), 0, m(faceY - 0.088), [0, "#f8fafc", 0.2, "#cbd5e1", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.122), y: m(faceY - 0.1085), width: m(0.03), height: m(0.029), cornerRadius: m(0.003), ...lin(m(-0.122), 0, m(-0.092), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.134), y: m(faceY - 0.1015), width: m(0.015), height: m(0.012), cornerRadius: m(0.004), ...lin(0, 0, m(0.015), 0, [0, "#7f1d1d", 0.5, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.7, listening: false }));

  // Nam châm điện: vỏ thép hình trụ úp, cuộn dây đồng quấn bên trong lộ ra ở mặt dưới, lõi sắt giữa.
  const w = 0.07;
  const h = 0.06;
  const topY = faceY - h;
  group.add(new Konva.Rect({ x: m(-0.02), y: m(topY - 0.012), width: m(0.04), height: m(0.014), cornerRadius: m(0.003), ...lin(m(-0.02), 0, m(0.02), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(-w / 2), y: m(topY), width: m(w), height: m(h), cornerRadius: m(0.007), ...lin(m(-w / 2), 0, m(w / 2), 0, [0, "#0b1226", 0.2, "#6b7280", 0.55, fill, 1, "#030712"]), stroke: "#030712", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Line({ points: [m(-w / 2 + 0.006), m(topY + 0.004), m(w / 2 - 0.006), m(topY + 0.004)], stroke: "rgba(255,255,255,0.55)", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));
  // Dải ghi và vòng dây đồng quanh thân.
  group.add(new Konva.Rect({ x: m(-w / 2 + 0.004), y: m(topY + 0.012), width: m(w - 0.008), height: m(0.028), fill: "rgba(184,115,51,0.92)", stroke: "#5c3315", strokeWidth: lw * 0.8, listening: false }));
  for (let i = 0; i < 16; i += 1) group.add(new Konva.Line({ points: [m(-w / 2 + 0.004), m(topY + 0.0125 + i * 0.00175), m(w / 2 - 0.004), m(topY + 0.0135 + i * 0.00175)], stroke: i % 2 ? "rgba(92,51,21,0.55)" : "rgba(255,214,150,0.55)", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Text({ x: m(-w / 2), y: m(topY + 0.044), width: m(w), align: "center", text: "12 V DC", fontSize: m(0.0072), fontStyle: "bold", fill: "#e5e7eb", listening: false }));
  // Mặt từ: lõi sắt thấy ở giữa mặt dưới và vành thép ngoài.
  group.add(new Konva.Rect({ x: m(-w / 2), y: m(faceY - 0.006), width: m(w), height: m(0.006), cornerRadius: [0, 0, m(0.003), m(0.003)], ...lin(m(-w / 2), 0, m(w / 2), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.012), y: m(faceY - 0.002), width: m(0.024), height: m(0.0045), cornerRadius: m(0.0012), fill: "#e2e8f0", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));

  // Viên bi thép bị giữ ngay dưới mặt từ.
  const cy = -BALL_R;
  group.add(new Konva.Circle({ x: 0, y: m(cy), radius: m(BALL_R), fillLinearGradientStartPoint: { x: 0, y: m(cy - BALL_R) }, fillLinearGradientEndPoint: { x: 0, y: m(cy + BALL_R) }, fillLinearGradientColorStops: [0, "#e0f2fe", 0.34, "#94a3b8", 0.48, "#f8fafc", 0.52, "#475569", 0.75, "#1e293b", 1, "#64748b"], stroke: "#334155", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Ellipse({ x: m(-0.0062), y: m(cy - 0.0062), radiusX: m(0.0025), radiusY: m(0.0016), rotation: -35, fill: "#ffffff", listening: false }));

  // Dây nguồn đỏ và đen đi lên rồi sang hộp công tắc.
  const boxX = 0.04;
  const boxY = faceY - 0.18;
  group.add(new Konva.Line({ points: [m(-0.014), m(topY - 0.006), m(-0.03), m(topY - 0.03), m(0.0), m(boxY + 0.02), m(boxX), m(boxY + 0.02)], stroke: "#7f1d1d", strokeWidth: m(0.0042), lineCap: "round", tension: 0.5, listening: false }));
  group.add(new Konva.Line({ points: [m(0.014), m(topY - 0.006), m(0.03), m(topY - 0.026), m(0.045), m(boxY + 0.04), m(boxX + 0.01), m(boxY + 0.034)], stroke: "#0b0f19", strokeWidth: m(0.0042), lineCap: "round", tension: 0.5, listening: false }));
  // Hộp công tắc có nút bập bênh và đèn báo.
  group.add(new Konva.Rect({ x: m(boxX), y: m(boxY), width: m(0.06), height: m(0.05), cornerRadius: m(0.006), ...lin(0, m(boxY), 0, m(boxY + 0.05), [0, "#4b5563", 0.15, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(boxX + 0.008), y: m(boxY + 0.012), width: m(0.026), height: m(0.026), cornerRadius: m(0.004), ...lin(0, m(boxY + 0.012), 0, m(boxY + 0.038), [0, "#fca5a5", 0.3, "#dc2626", 1, "#450a0a"]), stroke: "#450a0a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Text({ x: m(boxX + 0.008), y: m(boxY + 0.0205), width: m(0.026), align: "center", text: "OFF", fontSize: m(0.0085), fontStyle: "bold", fill: "#fef2f2", listening: false }));
  group.add(new Konva.Circle({ x: m(boxX + 0.046), y: m(boxY + 0.0165), radius: m(0.0034), fill: "#22c55e", shadowColor: "#22c55e", shadowBlur: m(0.006), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Text({ x: m(boxX + 0.036), y: m(boxY + 0.028), width: m(0.022), align: "center", text: "ON", fontSize: m(0.0058), fill: "#9ca3af", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(0.01), width: m(0.2), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { release: { x: 0, y: m(cy) }, magnetFace: { x: 0, y: m(faceY) }, switch: { x: m(boxX + 0.021), y: m(boxY + 0.025) } } };
};
