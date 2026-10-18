/* OBJECT-META
{
  "catalog": "Máy gia tốc vòng (cyclotron, hai cực chữ D)",
  "title": "Cyclotron nhìn từ trên xuống: hai hộp rỗng hình chữ D kim loại cách nhau bởi khe hẹp, nguồn ion ở tâm, cực nam châm bao ngoài và nguồn cao tần nối hai D",
  "fill": "#cbd5e1",
  "anchor": "Tâm khe giữa hai D, trên nguồn ion.",
  "useWhen": ["Cần máy gia tốc cyclotron nhìn từ trên xuống với hai D, khe 0,008 m, nguồn ion tâm và cực nam châm.","Cần nguồn cao tần nối hai D để gia tốc hạt qua khe."],
  "avoidWhen": ["Cần ống phóng điện tử lệch trong từ trường: dùng ong-phong-dien-tu.","Cần nhìn ngang để thấy chiều cao: hình này chỉ nhìn từ trên xuống, quỹ đạo do cảnh vẽ."],
  "size": { "width": 0.173, "height": 0.146 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Nguồn ion ở tâm khe giữa hai D." },
    { "name": "gap", "description": "Giữa khe hẹp giữa hai D." },
    { "name": "exit", "description": "Cửa ra của chùm hạt ở mép phải." },
    { "name": "rf", "description": "Điểm nối nguồn cao tần với hai D." }
  ],
  "notes": "Hai D có bán kính 0,06 m cách nhau khe 0,008 m, đặt trong từ trường đều B vuông góc mặt phẳng (cực nam châm tròn bán kính 0,068 m bao quanh). Hạt tích điện nhận gia tốc mỗi lần qua khe nhờ điện áp cao tần giữa hai D và đi quỹ đạo xoắn ốc mở rộng dần ra cửa ra. Quỹ đạo vẽ do cảnh vẽ. fill là màu kim loại của hai D."
}
*/
const makeCyclotron = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const R = 0.06;
  const G = 0.004;
  const PR = 0.068;

  // Cực nam châm tròn phía sau: viền sắt, mặt sẫm, các ốc bắt vít.
  group.add(new Konva.Circle({ radius: m(PR + 0.006), fillLinearGradientStartPoint: { x: m(-PR), y: m(-PR) }, fillLinearGradientEndPoint: { x: m(PR), y: m(PR) }, fillLinearGradientColorStops: [0, "#f1f5f9", 0.5, "#64748b", 1, "#1e293b"], stroke: "#0f172a", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.5, shadowOffset: { x: m(0.003), y: m(0.005) }, listening: false }));
  group.add(new Konva.Circle({ radius: m(PR - 0.002), fill: "#0b1220", stroke: "#475569", strokeWidth: lw * 0.8, listening: false }));
  for (let k = 0; k < 8; k += 1) {
    const a = (k * Math.PI) / 4 + Math.PI / 8;
    group.add(new Konva.Circle({ x: m((PR + 0.002) * Math.cos(a)), y: m((PR + 0.002) * Math.sin(a)), radius: m(0.0016), fill: "#e2e8f0", stroke: "#0f172a", strokeWidth: lw * 0.5, listening: false }));
  }
  // Từ trường B hướng ra khỏi mặt phẳng: các chấm ở nền.
  for (let r = -4; r <= 4; r += 1) for (let c = -4; c <= 4; c += 1) {
    const x = c * 0.0225;
    const y = r * 0.0225;
    if (Math.abs(x) < R && Math.abs(y) < R * 0.8) continue;
    if (x * x + y * y > (PR - 0.006) ** 2) continue;
    group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(0.0014), fill: "rgba(96,165,250,0.5)", listening: false }));
  }
  // Hai D: nửa đĩa trái và phải, tách nhau khe G.
  const dee = (side: number) => {
    const cx0 = side * (G / 2);
    group.add(new Konva.Shape({ listening: false, fillLinearGradientStartPoint: { x: 0, y: m(-R) }, fillLinearGradientEndPoint: { x: 0, y: m(R) }, fillLinearGradientColorStops: [0, "#f8fafc", 0.4, fill, 1, "#475569"], stroke: "#0f172a", strokeWidth: lw * 1.2, lineJoin: "round", shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.003) }, sceneFunc: (ctx, shape) => {
      ctx.beginPath();
      ctx.moveTo(m(cx0), m(-R));
      ctx.arc(m(cx0), 0, m(R), -Math.PI / 2, Math.PI / 2, side < 0);
      ctx.lineTo(m(cx0), m(R));
      ctx.closePath();
      ctx.fillStrokeShape(shape);
    } }));
    group.add(new Konva.Arc({ x: m(cx0), y: 0, innerRadius: m(R - 0.0075), outerRadius: m(R - 0.0035), angle: 70, rotation: side > 0 ? -45 : 135, fill: "rgba(255,255,255,0.55)", listening: false }));
    for (let i = 1; i <= 3; i += 1) group.add(new Konva.Arc({ x: m(cx0), y: 0, innerRadius: m(R * i * 0.26), outerRadius: m(R * i * 0.26 + 0.0004), angle: 180, rotation: side > 0 ? -90 : 90, fill: "rgba(15,23,42,0.22)", listening: false }));
    group.add(new Konva.Text({ x: m(cx0 + side * 0.032 - 0.008), y: m(-0.009), width: m(0.016), align: "center", text: "D", fontSize: m(0.018), fontStyle: "bold", fill: "rgba(15,23,42,0.5)", listening: false }));
  };
  dee(-1);
  dee(1);
  // Quỹ đạo xoắn ốc của hạt từ tâm ra cửa phải và hai điện cực cao tần.
  const sp: number[] = [];
  for (let i = 0; i <= 140; i += 1) {
    const t = (i / 140) * Math.PI * 7;
    const r = 0.004 + (i / 140) * 0.052;
    sp.push(r * Math.sin(t), -r * Math.cos(t));
  }
  group.add(new Konva.Line({ points: sp.map(m), stroke: "rgba(250,204,21,0.9)", strokeWidth: lw * 1.4, lineCap: "round", lineJoin: "round", listening: false, shadowColor: "#fde047", shadowBlur: m(0.005), shadowOpacity: 0.9 }));
  group.add(new Konva.Line({ points: [m(R), 0, m(R + 0.016), 0], stroke: "rgba(250,204,21,0.8)", strokeWidth: lw * 1.4, dash: [m(0.003), m(0.002)], listening: false }));
  group.add(new Konva.Circle({ radius: m(0.0034), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0034), fillRadialGradientColorStops: [0, "#fff", 0.4, "#f87171", 1, "#7f1d1d"], listening: false }));
  // Nguồn cao tần ở dưới: hai dây tới hai D và ký hiệu ~.
  group.add(new Konva.Line({ points: [m(-R * 0.55), m(R * 0.83), m(-R * 0.55), m(R + 0.008), m(-0.012), m(R + 0.008)], stroke: "#94a3b8", strokeWidth: lw * 1.4, lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(R * 0.55), m(R * 0.83), m(R * 0.55), m(R + 0.008), m(0.012), m(R + 0.008)], stroke: "#94a3b8", strokeWidth: lw * 1.4, lineJoin: "round", listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(R + 0.008), radius: m(0.0085), fill: "#111827", stroke: "#e2e8f0", strokeWidth: lw * 1.2, listening: false }));
  group.add(new Konva.Text({ x: m(-0.008), y: m(R + 0.0035), width: m(0.016), align: "center", text: "~", fontSize: m(0.011), fontStyle: "bold", fill: "#f1f5f9", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.09), y: m(R + 0.02), width: m(0.18), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, gap: { x: 0, y: m(-R * 0.5) }, exit: { x: m(R + 0.016), y: 0 }, rf: { x: 0, y: m(R + 0.008) } } };
};
