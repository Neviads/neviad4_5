/* OBJECT-META
{
  "catalog": "Ampe kế (kim)",
  "title": "Ampe kế chỉ thị kim 0–3 A: vỏ bakelite đen, mặt kính có gương chống thị sai, hai đầu nối + và −",
  "fill": "#1f2937",
  "anchor": "Trục kim (tâm mặt đồng hồ).",
  "useWhen": ["Cần ampe kế kim thang 0–3 A, chia 0,1 A, mắc nối tiếp có hai đầu + và −.","Cần kim quay quanh trục pivot để đặt số chỉ dòng điện."],
  "avoidWhen": ["Cần số đọc điện tử hoặc đo nhiều đại lượng: dùng dong-ho-da-nang.","Cần điện kế số 0 ở giữa, kim lệch hai phía: dùng dien-ke-g.","Thang cố định 0–3 A, không đổi được sang mA hay 10 A."],
  "size": { "width": 0.13, "height": 0.13 },
  "parts": [
    { "name": "needle", "label": "Kim chỉ", "motion": "rotate", "min": 0, "max": 90, "description": "Góc quay của kim từ vạch 0 A, độ theo chiều kim đồng hồ; 90° ứng với 3 A." }
  ],
  "points": [
    { "name": "pivot", "description": "Trục kim." },
    { "name": "plus", "description": "Đầu nối dương (đỏ)." },
    { "name": "minus", "description": "Đầu nối âm (đen)." },
    { "name": "zero", "description": "Vạch 0 A." }
  ],
  "notes": "Thang chia 0,1 A, số ghi 0 – 1 – 2 – 3, ký hiệu A to ở giữa. Dòng điện vào đầu +, ra đầu −. Vít chỉnh số 0 ở dưới mặt. fill là màu vỏ."
}
*/
const makeAmmeter = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.04;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0012));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const polar = (r: number, deg: number): [number, number] => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];
  const START = -45;
  const SWEEP = 90;
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Vỏ bakelite: thân chữ nhật bo, vát mép và bóng đổ.
  group.add(new Konva.Rect({ x: m(-0.062), y: m(-0.058), width: m(0.124), height: m(0.122), cornerRadius: m(0.009), ...lin(m(-0.062), m(-0.058), m(0.062), m(0.064), [0, "#4b5563", 0.15, fill, 0.8, "#0b0f19", 1, "#030712"]), stroke: "#030712", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.016), shadowOpacity: 0.5, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  group.add(ln([-0.055, -0.0545, 0.055, -0.0545], "rgba(255,255,255,0.28)", lw * 1.3));
  // Hốc cửa sổ mặt đồng hồ và mặt số kem.
  group.add(new Konva.Rect({ x: m(-0.0515), y: m(-0.0495), width: m(0.103), height: m(0.077), cornerRadius: m(0.005), fill: "#020617", stroke: "#475569", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.049), y: m(-0.047), width: m(0.098), height: m(0.072), cornerRadius: m(0.004), ...lin(0, m(-0.047), 0, m(0.025), [0, "#fffdf5", 1, "#ece6d0"]), listening: false }));
  // Dải gương chống thị sai dọc cung thang.
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(R - 0.0125), outerRadius: m(R - 0.0092), angle: SWEEP + 8, rotation: START - 94, fill: "#cbd5e1", stroke: "#94a3b8", strokeWidth: lw * 0.4, listening: false }));
  // Cung thang và vạch chia 0,1 A.
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(R - 0.0003), outerRadius: m(R + 0.0003), angle: SWEEP, rotation: START - 90, fill: "#0f172a", listening: false }));
  for (let i = 0; i <= 30; i += 1) {
    const deg = START + (i * SWEEP) / 30;
    const major = i % 10 === 0;
    const half = i % 5 === 0;
    const [x1, y1] = polar(R, deg);
    const [x2, y2] = polar(R - (major ? 0.0095 : half ? 0.0068 : 0.0045), deg);
    group.add(ln([x1, y1, x2, y2], "#0f172a", major ? lw * 1.6 : lw * 0.8));
    if (major) {
      const [tx, ty] = polar(R + 0.0095, deg);
      group.add(new Konva.Text({ x: m(tx), y: m(ty), width: m(0.012), offsetX: m(0.006), offsetY: m(0.0042), align: "center", text: String(i / 10), fontSize: m(0.0105), fontStyle: "bold", fill: "#0f172a", listening: false }));
    }
  }
  group.add(new Konva.Text({ x: m(-0.012), y: m(-0.0295), width: m(0.024), align: "center", text: "A", fontSize: m(0.0225), fontStyle: "bold", fill: "#0f172a", listening: false }));
  group.add(new Konva.Text({ x: m(-0.03), y: m(0.0095), width: m(0.06), align: "center", text: "DC  0 – 3 A", fontSize: m(0.0058), fill: "#334155", listening: false }));
  group.add(new Konva.Text({ x: m(-0.03), y: m(0.0165), width: m(0.06), align: "center", text: "CL 1.5  ⊓", fontSize: m(0.0048), fill: "#64748b", listening: false }));

  // BỘ PHẬN QUAY: kim đen mảnh có đối trọng; ở 0 A kim chỉ vạch đầu thang.
  const needle = new Konva.Group({ x: 0, y: 0, rotation: START });
  needle.add(new Konva.Line({ points: [m(-0.0016), m(0.011), m(-0.0007), m(-R + 0.0035), 0, m(-R - 0.0045), m(0.0007), m(-R + 0.0035), m(0.0016), m(0.011)], closed: true, fill: "#0f172a", stroke: "#000", strokeWidth: lw * 0.4, shadowColor: "#000", shadowBlur: m(0.002), shadowOpacity: 0.4, shadowOffset: { x: m(0.0008), y: m(0.001) }, listening: false }));
  needle.add(new Konva.Rect({ x: m(-0.0035), y: m(0.0085), width: m(0.007), height: m(0.007), cornerRadius: m(0.0015), fill: "#0f172a", listening: false }));
  group.add(needle);
  group.add(new Konva.Circle({ radius: m(0.0048), ...lin(m(-0.0048), m(-0.0048), m(0.0048), m(0.0048), [0, "#f8fafc", 0.5, "#94a3b8", 1, "#1f2937"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  // Kính: vệt phản chiếu chéo.
  group.add(new Konva.Line({ points: [m(-0.049), m(-0.047), m(-0.012), m(-0.047), m(-0.049), m(-0.0125)], closed: true, fill: "rgba(255,255,255,0.14)", listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0505), m(0.025), m(-0.0505), m(-0.0485)], stroke: "rgba(255,255,255,0.18)", strokeWidth: lw * 2, listening: false }));

  // Vít chỉnh số 0 và hai đầu nối (đỏ + và đen −).
  group.add(new Konva.Circle({ x: 0, y: m(0.0385), radius: m(0.0058), ...lin(0, m(0.0327), 0, m(0.0443), [0, "#e2e8f0", 1, "#475569"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(ln([-0.0045, 0.0385, 0.0045, 0.0385], "#0f172a", lw * 1.4));
  const posts: [number, string, string, string][] = [[-0.032, "#dc2626", "#fecaca", "+"], [0.032, "#111827", "#9ca3af", "−"]];
  for (const [x, color, hi, sign] of posts) {
    group.add(new Konva.Circle({ x: m(x), y: m(0.0505), radius: m(0.0092), ...lin(m(x - 0.0092), 0, m(x + 0.0092), 0, [0, "#475569", 0.4, "#f1f5f9", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(0.0505), radius: m(0.0066), fillRadialGradientStartPoint: { x: m(x - 0.002), y: m(0.0485) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: m(x), y: m(0.0505) }, fillRadialGradientEndRadius: m(0.0066), fillRadialGradientColorStops: [0, hi, 0.5, color, 1, "#000"], stroke: "#030712", strokeWidth: lw * 0.8, listening: false }));
    group.add(ln([x - 0.0045, 0.0505, x + 0.0045, 0.0505], "rgba(0,0,0,0.6)", lw * 1.2));
    group.add(new Konva.Text({ x: m(x - 0.008), y: m(0.0425 - 0.0105), width: m(0.016), align: "center", text: sign, fontSize: m(0.009), fontStyle: "bold", fill: color === "#111827" ? "#e5e7eb" : "#fca5a5", listening: false }));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.07), width: m(0.12), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { needle: { node: needle, motion: "rotate" as const, min: 0, max: SWEEP } },
    points: { pivot: { x: 0, y: 0 }, plus: { x: m(-0.032), y: m(0.0505) }, minus: { x: m(0.032), y: m(0.0505) }, zero: { x: m(polar(R, START)[0]), y: m(polar(R, START)[1]) } },
  };
};
