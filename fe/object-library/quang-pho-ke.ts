/* OBJECT-META
{
  "catalog": "Quang phổ kế / máy quang phổ lăng kính",
  "title": "Máy quang phổ lăng kính nhìn từ trên xuống: bàn tròn chia độ, lăng kính ở giữa, ống chuẩn trực có khe quay được và ống ngắm cố định",
  "fill": "#1f2937",
  "anchor": "Tâm bàn tròn, chỗ đặt lăng kính.",
  "useWhen": ["Cần máy quang phổ lăng kính nhìn từ trên xuống: bàn tròn chia độ 10°, lăng kính giữa, ống chuẩn trực quay được.","Cần đo góc lệch tán sắc."],
  "avoidWhen": ["Cần lăng kính đơn để vẽ tia khúc xạ, tán sắc: dùng lang-kinh.","Cần khe Young cho giao thoa: dùng khe-young; cảnh nhìn ngang không hợp vì vật này nhìn từ trên."],
  "size": { "width": 0.426, "height": 0.299 },
  "parts": [
    { "name": "collimator", "label": "Ống chuẩn trực", "motion": "rotate", "min": -60, "max": 60, "description": "Góc quay của ống chuẩn trực quanh tâm bàn, độ theo chiều kim đồng hồ khi nhìn từ trên xuống; 0° là ống nằm ngang chĩa vào tâm từ phía trái." }
  ],
  "points": [
    { "name": "center", "description": "Tâm bàn tròn, tâm lăng kính." },
    { "name": "slit", "description": "Khe hẹp ở đầu ngoài ống chuẩn trực khi ống ở 0°." },
    { "name": "eyepiece", "description": "Thị kính ở đầu ngoài ống ngắm." },
    { "name": "prism", "description": "Đỉnh góc chiết quang của lăng kính." }
  ],
  "notes": "Hình vẽ nhìn từ trên xuống (bàn nằm ngang). Bàn tròn bán kính 0,1 m chia độ từng 10°; lăng kính thuỷ tinh đều cạnh 0,05 m ở tâm. Ống chuẩn trực dài 0,14 m quay quanh tâm; ống ngắm dài 0,14 m cố định, chĩa về phía dưới bên phải 30° dưới đường ngang. Chùm sáng qua khe, lăng kính tán sắc thành quang phổ — do cảnh vẽ. fill là màu sơn ống."
}
*/
const makeSpectrometer = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const TR = 0.1;
  const tel = (30 * Math.PI) / 180;

  // Một ống (nhìn từ trên): thân hình trụ có gradient dọc theo bề ngang, hướng theo +x trong toạ độ cục bộ.
  const tubeBody = (g: Konva.Group, x0: number, x1: number, hw: number, stops: (number | string)[]) => {
    g.add(new Konva.Rect({ x: m(x0), y: m(-hw), width: m(x1 - x0), height: m(hw * 2), cornerRadius: m(0.002), ...lin(0, m(-hw), 0, m(hw), stops), stroke: "#030712", strokeWidth: lw, listening: false }));
  };
  const paint = [0, "#9ca3af", 0.3, fill, 1, "#030712"];

  // Chân đế: ba chân tam giác bên dưới bàn, lộ ra ở rìa.
  for (const a of [90, 210, 330]) {
    const r = (a * Math.PI) / 180;
    group.add(ln([0, 0, 0.112 * Math.cos(r), 0.112 * Math.sin(r)], "#0f172a", m(0.016)));
    group.add(new Konva.Circle({ x: m(0.112 * Math.cos(r)), y: m(0.112 * Math.sin(r)), radius: m(0.0095), ...lin(m(-0.01), m(-0.01), m(0.01), m(0.01), [0, "#e2e8f0", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  }

  // Bàn tròn chia độ: vành thép có vạch từng 2°, số mỗi 30°, mặt bàn tối.
  group.add(new Konva.Circle({ radius: m(TR + 0.007), ...lin(m(-TR), m(-TR), m(TR), m(TR), steel), stroke: "#0f172a", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.015), shadowOpacity: 0.45, shadowOffset: { x: m(0.003), y: m(0.005) }, listening: false }));
  group.add(new Konva.Circle({ radius: m(TR - 0.003), fillRadialGradientStartPoint: { x: m(-0.02), y: m(-0.02) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(TR), fillRadialGradientColorStops: [0, "#1e293b", 1, "#020617"], stroke: "#475569", strokeWidth: lw * 0.8, listening: false }));
  for (let d = 0; d < 360; d += 2) {
    const a = (d * Math.PI) / 180;
    const major = d % 10 === 0;
    const r1 = TR + 0.0045;
    const r2 = r1 - (major ? 0.007 : 0.0035);
    group.add(ln([r1 * Math.cos(a), r1 * Math.sin(a), r2 * Math.cos(a), r2 * Math.sin(a)], major ? "#0f172a" : "rgba(15,23,42,0.7)", major ? lw : lw * 0.55));
  }
  for (let d = 0; d < 360; d += 30) {
    const a = (d * Math.PI) / 180;
    group.add(new Konva.Text({ x: m((TR - 0.0155) * Math.cos(a) - 0.008), y: m((TR - 0.0155) * Math.sin(a) - 0.0035), width: m(0.016), align: "center", text: String(d), fontSize: m(0.0058), fill: "#cbd5e1", listening: false }));
  }
  // Vòng vi cấp (vernier) hình cung ở nửa dưới.
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(TR + 0.0075), outerRadius: m(TR + 0.0105), angle: 38, rotation: 62, fill: "#e2e8f0", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));

  // Lăng kính thuỷ tinh đều: tam giác trong suốt, bóng mờ, mép sáng và đáy tối (mặt đáy hướng phía dưới).
  const side = 0.05;
  const h = (side * Math.sqrt(3)) / 2;
  const tri = [0, -h * 0.66, -side / 2, h * 0.34, side / 2, h * 0.34];
  group.add(new Konva.Line({ points: tri.map((v, i) => m(v + (i % 2 === 0 ? 0.0025 : 0.003))), closed: true, fill: "rgba(0,0,0,0.4)", listening: false }));
  group.add(new Konva.Line({ points: tri.map(m), closed: true, ...lin(m(-0.03), m(-0.03), m(0.03), m(0.03), [0, "rgba(240,249,255,0.9)", 0.45, "rgba(125,211,252,0.55)", 1, "rgba(56,189,248,0.7)"]), stroke: "#e0f2fe", strokeWidth: lw * 1.4, lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(0), m(-h * 0.66 + 0.007), m(-side / 2 + 0.007), m(h * 0.34 - 0.003), m(side / 2 - 0.007), m(h * 0.34 - 0.003)], closed: true, stroke: "rgba(15,23,42,0.35)", strokeWidth: lw * 0.8, lineJoin: "round", listening: false }));
  group.add(ln([-0.004, -h * 0.66 + 0.012, -side / 2 + 0.01, h * 0.34 - 0.0055], "rgba(255,255,255,0.85)", lw * 1.6));
  group.add(new Konva.Circle({ x: 0, y: m(-h * 0.66), radius: m(0.0016), fill: "#fff", listening: false }));

  // ỐNG NGẮM cố định chĩa xuống bên phải: ống sơn, ống thị kính thu nhỏ và núm lấy nét.
  const telGroup = new Konva.Group({ rotation: 30 });
  tubeBody(telGroup, 0.05, 0.16, 0.0125, paint);
  tubeBody(telGroup, 0.05, 0.062, 0.0145, steel);
  tubeBody(telGroup, 0.1, 0.105, 0.0145, steel);
  tubeBody(telGroup, 0.16, 0.2, 0.0085, steel);
  tubeBody(telGroup, 0.2, 0.2125, 0.011, [0, "#111827", 0.4, "#4b5563", 1, "#030712"]);
  telGroup.add(new Konva.Rect({ x: m(0.0615), y: m(-0.0095), width: m(0.0014), height: m(0.019), fill: "rgba(125,211,252,0.85)", listening: false }));
  telGroup.add(new Konva.Circle({ x: m(0.13), y: m(0.0195), radius: m(0.005), ...lin(m(0.125), m(0.0145), m(0.135), m(0.0245), [0, "#e2e8f0", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  telGroup.add(new Konva.Line({ points: [m(0.056), m(-0.0105), m(0.158), m(-0.0105)], stroke: "rgba(255,255,255,0.28)", strokeWidth: lw * 1.3, listening: false }));
  group.add(telGroup);
  // Giá đỡ ống ngắm gắn với bàn.
  group.add(ln([0.045 * Math.cos(tel), 0.045 * Math.sin(tel), 0.075 * Math.cos(tel), 0.075 * Math.sin(tel)], "#0f172a", m(0.013)));

  // BỘ PHẬN QUAY: ống chuẩn trực chĩa vào tâm; gốc nhóm ở tâm bàn nên cùng quay quanh trục bàn.
  const collimator = new Konva.Group();
  tubeBody(collimator, -0.2, -0.052, 0.0125, paint);
  tubeBody(collimator, -0.07, -0.062, 0.0145, steel);
  tubeBody(collimator, -0.13, -0.122, 0.0145, steel);
  tubeBody(collimator, -0.236, -0.2, 0.011, [0, "#1f2937", 0.35, "#9ca3af", 0.7, "#475569", 1, "#030712"]);
  // Khe hẹp có hai hàm thép và núm vặn chỉnh độ rộng khe.
  collimator.add(new Konva.Rect({ x: m(-0.247), y: m(-0.0105), width: m(0.011), height: m(0.021), cornerRadius: m(0.001), ...lin(0, m(-0.0105), 0, m(0.0105), steel), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  collimator.add(new Konva.Rect({ x: m(-0.2475), y: m(-0.0012), width: m(0.0035), height: m(0.0024), fill: "#fffbe6", shadowColor: "#fde047", shadowBlur: m(0.01), shadowOpacity: 0.95, listening: false }));
  collimator.add(new Konva.Circle({ x: m(-0.16), y: m(-0.0195), radius: m(0.0052), ...lin(m(-0.165), m(-0.0245), m(-0.155), m(-0.0145), [0, "#e2e8f0", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  collimator.add(new Konva.Line({ points: [m(-0.195), m(-0.0105), m(-0.057), m(-0.0105)], stroke: "rgba(255,255,255,0.28)", strokeWidth: lw * 1.3, listening: false }));
  collimator.add(new Konva.Rect({ x: m(-0.0535), y: m(-0.0095), width: m(0.0014), height: m(0.019), fill: "rgba(125,211,252,0.85)", listening: false }));
  group.add(collimator);
  group.add(new Konva.Circle({ radius: m(0.0042), fill: "#e2e8f0", stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(0.123), width: m(0.2), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { collimator: { node: collimator, motion: "rotate" as const, min: -60, max: 60 } },
    points: { center: { x: 0, y: 0 }, slit: { x: m(-0.247), y: 0 }, eyepiece: { x: m(0.2125 * Math.cos(tel)), y: m(0.2125 * Math.sin(tel)) }, prism: { x: 0, y: m(-(side * Math.sqrt(3) * 0.66) / 2) } },
  };
};
