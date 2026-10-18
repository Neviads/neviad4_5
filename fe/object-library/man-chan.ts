/* OBJECT-META
{
  "catalog": "Màn chắn / màn ảnh",
  "title": "Màn ảnh nhựa trắng mờ trong khung nhôm gắn trên trụ có con trượt, nhìn xiên để thấy mặt hứng ảnh và vạch chia mm",
  "fill": "#f8fafc",
  "anchor": "Giữa chân đế của màn, chạm mặt băng quang học.",
  "useWhen": ["Cần màn hứng ảnh của thấu kính hoặc gương trên băng quang học, nhìn xiên thấy mặt hứng.","Cần màn có trụ trượt và vạch chia mm để đo vị trí ảnh."],
  "avoidWhen": ["Cần màn chắn sáng có khe hoặc lỗ cho giao thoa: dùng den-khe hoặc khe-young.","Cần màn huỳnh quang phát chớp khi hạt va vào: dùng man-huynh-quang."],
  "size": { "width": 0.104, "height": 0.22 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa chân đế của màn." },
    { "name": "center", "description": "Tâm mặt màn, nằm trên trục chính của hệ quang học." },
    { "name": "top", "description": "Mép trên màn." }
  ],
  "notes": "Màn cao 0,16 m, rộng 0,12 m, dày 0,008 m, tâm cao 0,14 m. Vẽ nhìn xiên: mặt hứng ảnh (bên trái, hướng về thấu kính) lộ thành hình bình hành, mép phải là cạnh sau. Có thước mm ở mép dưới màn để đo kích thước ảnh. fill là màu mặt màn."
}
*/
const makeImageScreen = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.07;
  const H = 0.16;
  const SK = 0.026;
  const BOTTOM = 0.06;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const bottomY = -BOTTOM;
  const topY = bottomY - H;

  // Đế con trượt, trụ và ngàm kẹp màn.
  group.add(new Konva.Rect({ x: m(-0.04), y: m(-0.028), width: m(0.08), height: m(0.028), cornerRadius: m(0.004), ...lin(m(-0.04), 0, m(0.04), 0, [0, "#1e293b", 0.3, "#475569", 1, "#0f172a"]), stroke: "#0b0f19", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(0.026), y: m(-0.0225), width: m(0.012), height: m(0.007), fill: "#cbd5e1", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(0.036), y: m(-0.0275), width: m(0.011), height: m(0.016), cornerRadius: m(0.003), ...lin(0, 0, m(0.011), 0, [0, "#7f1d1d", 0.5, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0042), y: m(bottomY), width: m(0.0084), height: m(BOTTOM - 0.028), ...lin(m(-0.0042), 0, m(0.0042), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.012), y: m(bottomY - 0.004), width: m(0.024), height: m(0.012), cornerRadius: m(0.003), ...lin(m(-0.012), 0, m(0.012), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 0.8, listening: false }));

  // Bóng đổ mờ phía sau màn và cạnh sau của màn (nhìn nghiêng).
  group.add(new Konva.Line({ points: [m(-W / 2 + SK), m(topY), m(W / 2 + SK), m(topY), m(W / 2 + SK), m(bottomY), m(-W / 2 + SK), m(bottomY)], closed: true, ...lin(m(-W / 2 + SK), 0, m(W / 2 + SK), 0, [0, "#e2e8f0", 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw, lineJoin: "round", shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.35, shadowOffset: { x: m(0.004), y: m(0.006) }, listening: false }));
  // Cạnh trái (dày) và mặt hứng chiếu hình bình hành.
  group.add(new Konva.Line({ points: [m(-W / 2), m(topY + SK * 0.2), m(-W / 2 + SK), m(topY), m(-W / 2 + SK), m(bottomY), m(-W / 2), m(bottomY + SK * 0.2)], closed: true, ...lin(m(-W / 2), 0, m(-W / 2 + SK), 0, [0, "#cbd5e1", 1, "#64748b"]), stroke: "#475569", strokeWidth: lw, lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(-W / 2 - 0.008), m(topY + 0.0), m(W / 2), m(topY + SK * 0.2 - 0.004), m(W / 2), m(bottomY - 0.004 + SK * 0.2), m(-W / 2 - 0.008), m(bottomY + 0.0)], closed: true, ...lin(0, m(topY), 0, m(bottomY), [0, "#ffffff", 0.5, fill, 1, "#e2e8f0"]), stroke: "#94a3b8", strokeWidth: lw * 1.2, lineJoin: "round", listening: false }));
  // Khung nhôm quanh mặt màn: viền sáng ở trên và trái, tối ở dưới và phải.
  group.add(new Konva.Line({ points: [m(-W / 2 - 0.008), m(bottomY), m(-W / 2 - 0.008), m(topY), m(W / 2), m(topY + SK * 0.2 - 0.004)], stroke: "#f8fafc", strokeWidth: lw * 2.2, lineCap: "round", lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(-W / 2 - 0.008), m(bottomY), m(W / 2), m(bottomY - 0.004 + SK * 0.2), m(W / 2), m(topY + SK * 0.2 - 0.004)], stroke: "#64748b", strokeWidth: lw * 2.2, lineCap: "round", lineJoin: "round", listening: false }));
  // Lưới mm mờ trên mặt màn, vạch tâm, và thước dán ở mép dưới.
  for (let i = 1; i < 7; i += 1) group.add(new Konva.Line({ points: [m(-W / 2 - 0.008 + (i * (W + 0.008)) / 7), m(topY + 0.004 + (i * (SK * 0.2 - 0.008)) / 7), m(-W / 2 - 0.008 + (i * (W + 0.008)) / 7), m(bottomY - 0.004 + (i * SK * 0.2) / 7)], stroke: "rgba(148,163,184,0.45)", strokeWidth: lw * 0.6, listening: false }));
  for (let j = 1; j < 8; j += 1) group.add(new Konva.Line({ points: [m(-W / 2 - 0.008), m(topY + (j * H) / 8), m(W / 2), m(topY + SK * 0.2 - 0.004 + (j * H) / 8 - (j * 0) / 8)], stroke: "rgba(148,163,184,0.45)", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Text({ x: m(-W / 2 + 0.004), y: m(topY + 0.01), text: "SCREEN", fontSize: m(0.0085), fontStyle: "bold", fill: "rgba(71,85,105,0.7)", listening: false }));
  const cy = (topY + bottomY) / 2;
  group.add(new Konva.Circle({ x: m(-W / 2 - 0.008 + (W + 0.008) / 2), y: m(cy + 0.002), radius: m(0.0034), stroke: "#dc2626", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2 - 0.008), y: m(bottomY - 0.009), width: m(W + 0.008), height: m(0.007), fill: "#fefce8", stroke: "#a16207", strokeWidth: lw * 0.6, listening: false }));
  for (let mm = 0; mm <= 7; mm += 1) group.add(new Konva.Line({ points: [m(-W / 2 - 0.008 + mm * 0.0112), m(bottomY - 0.009), m(-W / 2 - 0.008 + mm * 0.0112), m(bottomY - 0.009 + (mm % 5 === 0 ? 0.005 : 0.003))], stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.05), y: m(0.006), width: m(0.1), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, center: { x: m(-W / 2 - 0.008 + (W + 0.008) / 2), y: m(cy + 0.002) }, top: { x: 0, y: m(topY) } } };
};
