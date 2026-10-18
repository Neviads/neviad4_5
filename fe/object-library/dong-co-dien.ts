/* OBJECT-META
{
  "catalog": "Động cơ điện một chiều",
  "title": "Mô hình động cơ điện một chiều nhìn dọc trục: hai nam châm cong N (đỏ) và S (xanh) ở hai bên, rô to ba cực có cuộn dây và cổ góp, hai chổi than, đế gỗ",
  "fill": "#d97706",
  "anchor": "Giữa đáy đế, chạm mặt bàn.",
  "useWhen": ["Cần động cơ điện một chiều có nam châm cung, rô to ba cực, cổ góp ba lá và hai chổi than.", "Cảnh lực từ lên dòng điện làm rô to quay; chiều quay đổi khi đảo cực nguồn."],
  "avoidWhen": ["Cần máy phát điện quay ra dòng điện: dùng may-phat-dien.", "Cần động cơ nhiệt có xi lanh và pít tông: dùng dong-co-nhiet."],
  "size": { "width": 0.15, "height": 0.154 },
  "parts": [
    { "name": "rotor", "label": "Rô to", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của rô to quanh trục, độ theo chiều kim đồng hồ khi nhìn từ phía trước; 0° là cực thứ nhất hướng thẳng lên." }
  ],
  "points": [
    { "name": "axis", "description": "Trục rô to." },
    { "name": "base", "description": "Giữa đáy đế." },
    { "name": "brushPlus", "description": "Chổi than nối cực + (bên trái)." },
    { "name": "brushMinus", "description": "Chổi than nối cực − (bên phải)." }
  ],
  "notes": "Nam châm vĩnh cửu hình cung bán kính trong 0,038 m; rô to ba cực bán kính 0,03 m quấn ba cuộn dây đồng, cổ góp ba lá ở đầu trục; hai chổi than ở hai bên cổ góp. Dòng điện qua rô to chịu lực từ làm rô to quay; đảo cực nguồn thì đổi chiều quay. fill là màu dây đồng của cuộn."
}
*/
const makeDcMotor = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cy = -0.062;
  const RI = 0.038;
  const RO = 0.05;

  // Đế gỗ có vân, hai chốt nguồn đỏ/đen ở hai đầu.
  group.add(new Konva.Rect({ x: m(-0.075), y: m(-0.016), width: m(0.15), height: m(0.016), cornerRadius: m(0.003), ...lin(0, m(-0.016), 0, 0, [0, "#d6a15a", 0.5, "#a16207", 1, "#5a2d0c"]), stroke: "#3b1d08", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  for (let i = 0; i < 5; i += 1) group.add(ln([-0.07 + i * 0.001, -0.0125 + i * 0.0021, 0.07 - i * 0.002, -0.0128 + i * 0.0021], "rgba(60,30,10,0.3)", lw * 0.7));
  for (const [x, c, cc] of [[-0.06, "#ef4444", "#7f1d1d"], [0.06, "#1f2937", "#030712"]] as [number, string, string][]) {
    group.add(new Konva.Circle({ x: m(x), y: m(-0.008), radius: m(0.0048), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0048), fillRadialGradientColorStops: [0, "#fff", 0.35, c, 1, cc], stroke: cc, strokeWidth: lw * 0.6, listening: false }));
  }
  // Giá đỡ thép từ đế lên chổi than và trục.
  group.add(new Konva.Rect({ x: m(-0.012), y: m(cy + RO - 0.004), width: m(0.024), height: m(-cy - RO - 0.012 + 0.004), ...lin(m(-0.012), 0, m(0.012), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));

  // Nam châm bên trái (N đỏ) và bên phải (S xanh): cung dày bao quanh rô to, mặt cực sáng ở trong.
  const magnet = (angle: number, c: string, cc: string, text: string, tx: number) => {
    group.add(new Konva.Arc({ x: 0, y: m(cy), innerRadius: m(RI), outerRadius: m(RO), angle: 100, rotation: angle - 50, fill: c, stroke: cc, strokeWidth: lw * 1.1, listening: false }));
    group.add(new Konva.Arc({ x: 0, y: m(cy), innerRadius: m(RI), outerRadius: m(RI + 0.0032), angle: 100, rotation: angle - 50, fill: "rgba(255,255,255,0.4)", listening: false }));
    group.add(new Konva.Text({ x: m(tx - 0.007), y: m(cy - 0.0065), width: m(0.014), align: "center", text, fontSize: m(0.012), fontStyle: "bold", fill: "#fff", listening: false }));
  };
  magnet(180, "#dc2626", "#450a0a", "N", -0.0445);
  magnet(0, "#2563eb", "#172554", "S", 0.0445);
  // Nhẫn thép bên ngoài nối hai cực (vỏ từ) phần trên và dưới.
  group.add(new Konva.Arc({ x: 0, y: m(cy), innerRadius: m(RO), outerRadius: m(RO + 0.0045), angle: 80, rotation: 230, fill: "#94a3b8", stroke: "#1e293b", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Arc({ x: 0, y: m(cy), innerRadius: m(RO), outerRadius: m(RO + 0.0045), angle: 80, rotation: 50, fill: "#94a3b8", stroke: "#1e293b", strokeWidth: lw * 0.8, listening: false }));

  // BỘ PHẬN QUAY: rô to ba cực: lõi thép ba chấu, mỗi chấu quấn một cuộn đồng; trục và cổ góp ba lá ở giữa.
  const rotor = new Konva.Group({ x: 0, y: m(cy) });
  for (let k = 0; k < 3; k += 1) {
    const a = (k * 120 - 90) * Math.PI / 180;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    rotor.add(new Konva.Line({ points: [m(ux * 0.006), m(uy * 0.006), m(ux * 0.028), m(uy * 0.028)], stroke: "#0f172a", strokeWidth: m(0.014), lineCap: "round", listening: false }));
    rotor.add(new Konva.Line({ points: [m(ux * 0.006), m(uy * 0.006), m(ux * 0.028), m(uy * 0.028)], stroke: fill, strokeWidth: m(0.0115), lineCap: "round", listening: false }));
    for (let j = 0; j < 5; j += 1) {
      const t = 0.01 + j * 0.0044;
      rotor.add(new Konva.Line({ points: [m(ux * t - uy * 0.0057), m(uy * t + ux * 0.0057), m(ux * t + uy * 0.0057), m(uy * t - ux * 0.0057)], stroke: "rgba(67,20,7,0.65)", strokeWidth: lw * 0.8, lineCap: "round", listening: false }));
    }
    // Đầu chấu: mũ thép cong khít khe hở với cực nam châm.
    rotor.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(0.0285), outerRadius: m(0.03), angle: 46, rotation: k * 120 - 90 - 23, fill: "#cbd5e1", stroke: "#1e293b", strokeWidth: lw * 0.7, listening: false }));
  }
  rotor.add(new Konva.Circle({ radius: m(0.0105), ...lin(m(-0.0105), m(-0.0105), m(0.0105), m(0.0105), steel), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  // Cổ góp: ba lá đồng ghép cách điện quanh trục, vạch xanh cách ly.
  for (let k = 0; k < 3; k += 1) rotor.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(0.0045), outerRadius: m(0.0095), angle: 112, rotation: k * 120 - 90 + 4, fill: k === 0 ? "#fbbf24" : k === 1 ? "#f59e0b" : "#d97706", stroke: "#431407", strokeWidth: lw * 0.6, listening: false }));
  rotor.add(new Konva.Circle({ radius: m(0.0042), fill: "#1e293b", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  rotor.add(new Konva.Circle({ radius: m(0.0014), fill: "#e2e8f0", listening: false }));
  group.add(rotor);

  // Chổi than: hai thanh than đen có lò xo ép vào cổ góp từ hai bên, nối với dây đến chốt.
  for (const s of [-1, 1]) {
    group.add(new Konva.Rect({ x: m(s > 0 ? 0.0105 : -0.0215), y: m(cy - 0.004), width: m(0.011), height: m(0.008), fill: "#111827", stroke: "#000", strokeWidth: lw * 0.7, listening: false }));
    group.add(new Konva.Line({ points: [m(s * 0.0215), m(cy), m(s * 0.0245), m(cy - 0.002), m(s * 0.0265), m(cy + 0.002), m(s * 0.0285), m(cy - 0.002)], stroke: "#e2e8f0", strokeWidth: lw * 1.2, lineJoin: "round", listening: false }));
    group.add(ln([s * 0.0255, cy + 0.004, s * 0.0255, -0.008, s * 0.06, -0.008], s > 0 ? "#1f2937" : "#ef4444", lw * 1.7));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.006), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { rotor: { node: rotor, motion: "rotate" as const, min: 0, max: 360 } },
    points: { axis: { x: 0, y: m(cy) }, base: { x: 0, y: 0 }, brushPlus: { x: m(-0.0255), y: m(cy) }, brushMinus: { x: m(0.0255), y: m(cy) } },
  };
};
