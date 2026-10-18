/* OBJECT-META
{
  "catalog": "Dây nối + kẹp cá sấu / chốt cắm",
  "title": "Dây nối thí nghiệm: một đầu kẹp cá sấu có hàm răng, đầu kia chốt cắm chuối mạ vàng, dây đồng bện bọc nhựa đỏ lượn mềm",
  "fill": "#dc2626",
  "anchor": "Giữa dây, trên đường nối hai đầu.",
  "useWhen": ["Cần dây nối thí nghiệm dài 0,36 m có kẹp cá sấu một đầu và chốt cắm chuối mạ vàng đầu kia.","Cần dây điện bọc nhựa đỏ lượn mềm nối hai điểm trong mạch."],
  "avoidWhen": ["Cần đoạn dây dẫn thẳng căng giữa hai giá để xét từ trường: dùng day-dan-thang.","Cần sợi dây cơ học không giãn: dùng day; vật này có đầu kẹp và chốt, không phải dây treo."],
  "size": { "width": 0.372, "height": 0.027 },
  "parts": [],
  "points": [
    { "name": "clip", "description": "Đầu hàm kẹp cá sấu, nơi kẹp vào vật." },
    { "name": "plug", "description": "Đầu chốt cắm chuối, nơi cắm vào lỗ chốt." },
    { "name": "mid", "description": "Giữa dây." }
  ],
  "notes": "Dài 0,36 m tính cả hai đầu: kẹp cá sấu 0,034 m, chốt cắm 0,03 m, dây đồng bện bọc nhựa mềm đường kính 0,004 m. Vẽ thẳng nằm ngang; khi nối thật, hai đầu đặt theo hai điểm nối và dây lượn mềm giữa hai đầu. fill là màu vỏ nhựa dây."
}
*/
const makeLeadWire = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const L = 0.18;
  const wire = [-L + 0.034, 0, -0.09, -0.011, -0.03, 0.01, 0.03, -0.009, 0.09, 0.011, L - 0.03, 0];

  // Dây: viền tối, vỏ nhựa đỏ, vệt sáng mảnh và bóng đổ dưới.
  group.add(new Konva.Line({ points: wire.map((v, i) => m(i % 2 === 1 ? v + 0.004 : v + 0.001)), stroke: "rgba(0,0,0,0.3)", strokeWidth: m(0.005), lineCap: "round", lineJoin: "round", tension: 0.5, listening: false }));
  group.add(new Konva.Line({ points: wire.map(m), stroke: "#450a0a", strokeWidth: m(0.0048), lineCap: "round", lineJoin: "round", tension: 0.5, listening: false }));
  group.add(new Konva.Line({ points: wire.map(m), stroke: fill, strokeWidth: m(0.0036), lineCap: "round", lineJoin: "round", tension: 0.5, listening: false }));
  group.add(new Konva.Line({ points: wire.map((v, i) => m(i % 2 === 1 ? v - 0.0012 : v)), stroke: "rgba(255,255,255,0.5)", strokeWidth: m(0.0009), lineCap: "round", lineJoin: "round", tension: 0.5, listening: false }));

  // Kẹp cá sấu (bên trái): vỏ nhựa đỏ bọc, hai hàm thép có răng cưa mở nhẹ, chốt bản lề.
  const cx = -L;
  group.add(new Konva.Rect({ x: m(cx + 0.015), y: m(-0.0062), width: m(0.021), height: m(0.0124), cornerRadius: m(0.003), ...lin(0, m(-0.0062), 0, m(0.0062), [0, "#fecaca", 0.35, fill, 1, "#450a0a"]), stroke: "#450a0a", strokeWidth: lw * 0.9, listening: false }));
  group.add(ln([cx + 0.017, -0.0036, cx + 0.034, -0.0036], "rgba(255,255,255,0.55)", lw));
  group.add(new Konva.Line({ points: [m(cx + 0.0155), m(-0.005), m(cx + 0.0005), m(-0.0105), m(cx), m(-0.0095), m(cx + 0.0155), m(-0.002)], closed: true, ...lin(0, m(-0.0105), 0, m(-0.002), steel), stroke: "#1e293b", strokeWidth: lw * 0.9, lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(cx + 0.0155), m(0.005), m(cx + 0.0005), m(0.0105), m(cx), m(0.0095), m(cx + 0.0155), m(0.002)], closed: true, ...lin(0, m(0.002), 0, m(0.0105), [0, "#475569", 0.5, "#e2e8f0", 1, "#64748b"]), stroke: "#1e293b", strokeWidth: lw * 0.9, lineJoin: "round", listening: false }));
  for (let i = 0; i < 6; i += 1) {
    const x = cx + 0.0025 + i * 0.002;
    group.add(new Konva.Line({ points: [m(x), m(-0.0098 + i * 0.0007), m(x + 0.001), m(-0.0075 + i * 0.0006), m(x + 0.002), m(-0.0098 + i * 0.0007)], stroke: "#0f172a", strokeWidth: lw * 0.7, lineJoin: "round", listening: false }));
    group.add(new Konva.Line({ points: [m(x), m(0.0098 - i * 0.0007), m(x + 0.001), m(0.0075 - i * 0.0006), m(x + 0.002), m(0.0098 - i * 0.0007)], stroke: "#0f172a", strokeWidth: lw * 0.7, lineJoin: "round", listening: false }));
  }
  group.add(new Konva.Circle({ x: m(cx + 0.0155), y: 0, radius: m(0.0022), fill: "#e2e8f0", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Line({ points: [m(cx + 0.034), m(0), m(cx + 0.036), m(0)], stroke: fill, strokeWidth: m(0.0036), listening: false }));

  // Chốt cắm chuối (bên phải): đuôi nhựa đỏ, vòng thép, thân chuối có khe xẻ và lò xo đồng.
  const px = L;
  group.add(new Konva.Rect({ x: m(px - 0.031), y: m(-0.0053), width: m(0.012), height: m(0.0106), cornerRadius: m(0.002), ...lin(0, m(-0.0053), 0, m(0.0053), [0, "#fecaca", 0.35, fill, 1, "#450a0a"]), stroke: "#450a0a", strokeWidth: lw * 0.9, listening: false }));
  group.add(new Konva.Rect({ x: m(px - 0.0195), y: m(-0.0058), width: m(0.012), height: m(0.0116), cornerRadius: m(0.0018), ...lin(0, m(-0.0058), 0, m(0.0058), [0, "#fef3c7", 0.35, "#f59e0b", 1, "#451a03"]), stroke: "#451a03", strokeWidth: lw * 0.8, listening: false }));
  for (let i = 0; i < 4; i += 1) group.add(ln([px - 0.0185 + i * 0.0028, -0.0055, px - 0.0185 + i * 0.0028, 0.0055], "rgba(67,20,7,0.55)", lw * 0.7));
  group.add(new Konva.Line({ points: [m(px - 0.0075), m(-0.0036), m(px + 0.004), m(-0.0034), m(px + 0.0105), m(-0.0014), m(px + 0.0115), m(0), m(px + 0.0105), m(0.0014), m(px + 0.004), m(0.0034), m(px - 0.0075), m(0.0036)], closed: true, ...lin(0, m(-0.0036), 0, m(0.0036), [0, "#fff7ed", 0.35, "#fbbf24", 1, "#78350f"]), stroke: "#78350f", strokeWidth: lw * 0.8, lineJoin: "round", listening: false }));
  group.add(ln([px - 0.002, -0.0018, px + 0.0105, -0.0006], "#451a03", lw * 0.8));
  group.add(ln([px - 0.0075, -0.0021, px + 0.004, -0.0019], "rgba(255,255,255,0.65)", lw * 0.9));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(0.016), width: m(0.2), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { clip: { x: m(cx), y: 0 }, plug: { x: m(px + 0.0115), y: 0 }, mid: { x: 0, y: 0 } } };
};
