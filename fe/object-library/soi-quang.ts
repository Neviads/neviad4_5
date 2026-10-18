/* OBJECT-META
{
  "catalog": "Sợi quang",
  "title": "Cuộn sợi quang có hai đầu nối và mặt cắt phóng to: lõi thuỷ tinh, lớp vỏ phản xạ, áo bảo vệ, tia sáng phản xạ toàn phần",
  "fill": "#f59e0b",
  "anchor": "Tâm đầu nối vào (đầu bên trái, nơi ánh sáng đi vào).",
  "useWhen": ["Cần cuộn sợi quang đa mode có hai đầu nối và hình phóng to mặt cắt lõi, vỏ, áo.","Cần minh hoạ phản xạ toàn phần truyền ánh sáng dọc sợi."],
  "avoidWhen": ["Cần lăng kính hay thấu kính để khúc xạ, tán sắc: dùng lang-kinh hoặc thau-kinh-hoi-tu.","Cần chỉ nguồn sáng hẹp phát tia: dùng laser."],
  "size": { "width": 0.509, "height": 0.218 },
  "parts": [],
  "points": [
    { "name": "input", "description": "Mặt đầu vào của lõi sợi quang." },
    { "name": "output", "description": "Mặt đầu ra của lõi sợi quang." },
    { "name": "crossSection", "description": "Tâm hình phóng to mặt cắt dọc của sợi quang." }
  ],
  "notes": "Cuộn sợi đa mode lõi 50 µm, vỏ phản xạ 125 µm, áo 0,9 mm. Hình phóng to bên phải là mặt cắt dọc: tia sáng đi vào lõi dưới góc nhỏ bị phản xạ toàn phần ở ranh giới lõi – vỏ (n lõi > n vỏ) và truyền dọc sợi. fill là màu áo bảo vệ của sợi."
}
*/
const makeOpticalFiber = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Cuộn sợi: ba vòng gần như tròn chồng lên nhau, đường kính 0,12 m; mỗi vòng có sáng - tối để ra khối.
  const cx = 0.095;
  const cy = 0.04;
  const loop = (r: number, tilt: number) => {
    const pts: number[] = [];
    for (let i = 0; i <= 48; i += 1) {
      const a = (i / 48) * Math.PI * 2;
      pts.push(m(cx + r * Math.cos(a) * (1 + tilt * 0.08)), m(cy + r * Math.sin(a) * 0.78));
    }
    return pts;
  };
  for (const [r, tilt] of [[0.062, 0], [0.056, 1], [0.05, 2]] as const) {
    group.add(new Konva.Line({ points: loop(r, tilt), closed: true, stroke: "#0b0f19", strokeWidth: m(0.0095), lineJoin: "round", listening: false }));
    group.add(new Konva.Line({ points: loop(r, tilt), closed: true, stroke: fill, strokeWidth: m(0.0075), lineJoin: "round", listening: false }));
    group.add(new Konva.Line({ points: loop(r, tilt).map((v, i) => (i % 2 === 0 ? v : v - m(0.0022))), closed: true, stroke: "rgba(255,255,255,0.35)", strokeWidth: m(0.0018), lineJoin: "round", listening: false }));
  }
  // Hai đầu sợi đi ra từ cuộn: một sang trái (vào), một sang phải (ra).
  group.add(new Konva.Line({ points: [m(cx - 0.062), m(cy), m(cx - 0.085), m(cy + 0.035), m(-0.02), m(cy + 0.06), m(-0.03), m(0.0)], stroke: "#0b0f19", strokeWidth: m(0.0095), lineCap: "round", tension: 0.5, listening: false }));
  group.add(new Konva.Line({ points: [m(cx - 0.062), m(cy), m(cx - 0.085), m(cy + 0.035), m(-0.02), m(cy + 0.06), m(-0.03), m(0.0)], stroke: fill, strokeWidth: m(0.0075), lineCap: "round", tension: 0.5, listening: false }));
  group.add(new Konva.Line({ points: [m(cx + 0.062), m(cy), m(cx + 0.078), m(cy - 0.03), m(0.2), m(cy - 0.05), m(0.222), m(0.0)], stroke: "#0b0f19", strokeWidth: m(0.0095), lineCap: "round", tension: 0.5, listening: false }));
  group.add(new Konva.Line({ points: [m(cx + 0.062), m(cy), m(cx + 0.078), m(cy - 0.03), m(0.2), m(cy - 0.05), m(0.222), m(0.0)], stroke: fill, strokeWidth: m(0.0075), lineCap: "round", tension: 0.5, listening: false }));

  // Hai đầu nối (ferrule thép + vỏ nhựa xanh): đầu vào ở x = 0 và đầu ra ở x = 0,222.
  for (const [x, flip] of [[0, -1], [0.222, 1]] as const) {
    group.add(new Konva.Rect({ x: m(x - 0.008), y: m(-0.034), width: m(0.016), height: m(0.034), cornerRadius: m(0.003), ...lin(m(x - 0.008), 0, m(x + 0.008), 0, [0, "#1e3a8a", 0.4, "#3b82f6", 1, "#0b1e63"]), stroke: "#0b1226", strokeWidth: lw, listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.0035), y: m(-0.052), width: m(0.007), height: m(0.019), ...lin(m(x - 0.0035), 0, m(x + 0.0035), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(-0.052), radius: m(0.0022), fill: "#fef3c7", shadowColor: flip < 0 ? "#fbbf24" : "#ef4444", shadowBlur: m(0.008), shadowOpacity: 0.9, listening: false }));
    group.add(new Konva.Text({ x: m(x - 0.02), y: m(-0.016), width: m(0.04), align: "center", text: flip < 0 ? "IN" : "OUT", fontSize: m(0.0075), fontStyle: "bold", fill: "#dbeafe", listening: false }));
  }

  // Hình phóng to: mặt cắt dọc của sợi quang ở bên phải (bóng tròn lớn).
  const bx = 0.39;
  const by = -0.01;
  const R = 0.085;
  group.add(new Konva.Circle({ x: m(bx), y: m(by), radius: m(R + 0.004), ...lin(m(bx - R), m(by - R), m(bx + R), m(by + R), [0, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Circle({ x: m(bx), y: m(by), radius: m(R), fill: "#0b1220", listening: false }));
  // Các lớp: áo (dưới và trên), vỏ phản xạ, lõi ở giữa.
  group.add(new Konva.Rect({ x: m(bx - R + 0.004), y: m(by - 0.058), width: m(2 * R - 0.008), height: m(0.116), fill: fill, opacity: 0.75, listening: false }));
  group.add(new Konva.Rect({ x: m(bx - R + 0.004), y: m(by - 0.04), width: m(2 * R - 0.008), height: m(0.08), fill: "#cbd5e1", opacity: 0.55, listening: false }));
  group.add(new Konva.Rect({ x: m(bx - R + 0.004), y: m(by - 0.02), width: m(2 * R - 0.008), height: m(0.04), ...lin(0, m(by - 0.02), 0, m(by + 0.02), [0, "rgba(224,242,254,0.95)", 0.5, "rgba(125,211,252,0.85)", 1, "rgba(224,242,254,0.95)"]), listening: false }));
  // Tia sáng phản xạ toàn phần zig-zag trong lõi.
  const zig: number[] = [];
  const x0 = bx - R + 0.008;
  const yTop = by - 0.0185;
  const yBot = by + 0.0185;
  let y = by;
  let dir = -1;
  zig.push(m(x0), m(y));
  let x = x0;
  const step = 0.0215;
  y = yTop;
  x += step * (0.5 + 0.5 * 0.5);
  zig.push(m(x), m(y));
  for (let i = 0; i < 6; i += 1) {
    x += step;
    y = dir < 0 ? yBot : yTop;
    zig.push(m(x), m(y));
    dir *= -1;
    if (x > bx + R - 0.02) break;
  }
  group.add(new Konva.Line({ points: zig, stroke: "#ef4444", strokeWidth: lw * 2.2, lineCap: "round", lineJoin: "round", shadowColor: "#ef4444", shadowBlur: m(0.01), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Line({ points: zig, stroke: "#fecaca", strokeWidth: lw * 0.9, lineCap: "round", lineJoin: "round", listening: false }));
  for (const yy of [by - 0.02, by + 0.02, by - 0.04, by + 0.04]) group.add(new Konva.Line({ points: [m(bx - R + 0.004), m(yy), m(bx + R - 0.004), m(yy)], stroke: "rgba(15,23,42,0.5)", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Text({ x: m(bx - 0.03), y: m(by - 0.0065), width: m(0.06), align: "center", text: "LÕI", fontSize: m(0.0092), fontStyle: "bold", fill: "#075985", listening: false }));
  group.add(new Konva.Text({ x: m(bx - 0.03), y: m(by - 0.0345), width: m(0.06), align: "center", text: "VỎ PHẢN XẠ", fontSize: m(0.0066), fontStyle: "bold", fill: "#334155", listening: false }));
  group.add(new Konva.Text({ x: m(bx - 0.03), y: m(by - 0.054), width: m(0.06), align: "center", text: "ÁO BẢO VỆ", fontSize: m(0.0066), fontStyle: "bold", fill: "#78350f", listening: false }));
  group.add(new Konva.Circle({ x: m(bx), y: m(by), radius: m(R), stroke: "rgba(255,255,255,0.55)", strokeWidth: lw * 1.4, listening: false }));
  group.add(new Konva.Arc({ x: m(bx), y: m(by), innerRadius: m(R - 0.007), outerRadius: m(R - 0.0035), angle: 55, rotation: 205, fill: "rgba(255,255,255,0.6)", listening: false }));
  // Đường kẻ chấm nối đầu nối vào với vòng phóng to.
  group.add(new Konva.Line({ points: [m(0.222), m(-0.052), m(bx - R + 0.012), m(by - 0.03)], stroke: "rgba(148,163,184,0.6)", strokeWidth: lw, dash: [m(0.004), m(0.003)], listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.01), y: m(0.1), width: m(0.3), align: "center", text: label, fontSize: m(0.013), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { input: { x: m(0), y: m(-0.052) }, output: { x: m(0.222), y: m(-0.052) }, crossSection: { x: m(bx), y: m(by) } } };
};
