/* OBJECT-META
{
  "catalog": "Áp kế (đồng hồ kim)",
  "title": "Áp kế đồng hồ kim kiểu Bourdon 0–600 kPa: vành đồng, mặt trắng, vùng đỏ nguy hiểm, ren nối đáy",
  "fill": "#c8962f",
  "anchor": "Tâm mặt đồng hồ (trục kim).",
  "useWhen": ["Cần áp kế Bourdon mặt tròn 0–600 kPa với kim và vùng đỏ nguy hiểm.","Cần đồng hồ có ren nối đáy (inlet) gắn vào bình hoặc đường ống khí."],
  "avoidWhen": ["Cần đo chênh lệch mực chất lỏng bằng ống chữ U: dùng ap-ke-chu-u.","Cần bình đã có sẵn đồng hồ 0–2,5 MPa: dùng binh-khi-kin.","Thang cố định 0–600 kPa, không phù hợp áp suất cỡ MPa."],
  "size": {
    "width": 0.124,
    "height": 0.171
  },
  "parts": [
    {
      "name": "needle",
      "label": "Kim áp suất",
      "motion": "rotate",
      "min": 0,
      "max": 270,
      "description": "Góc của kim từ vạch 0 kPa (hướng 7 giờ rưỡi), độ theo chiều kim đồng hồ; 270° ứng với 600 kPa."
    }
  ],
  "points": [
    {
      "name": "center",
      "description": "Tâm mặt đồng hồ."
    },
    {
      "name": "inlet",
      "description": "Đầu ren nối ống dẫn khí ở đáy."
    },
    {
      "name": "zero",
      "description": "Vạch 0 kPa."
    }
  ],
  "notes": "Mặt đo đường kính 0,11 m, vạch chia 20 kPa, số ghi mỗi 100 kPa, vùng 500–600 kPa tô đỏ. Kim ở 0 kPa chỉ về phía dưới bên trái. fill là màu vành đồng thau."
}
*/
const makePressureGauge = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.062;
  const FACE = 0.052;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0012));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const brass = [0, "#7c5a1a", 0.28, "#fff1bd", 0.55, fill, 1, "#5e4210"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  /** Điểm cách tâm r, lệch θ độ so với hướng lên, theo chiều kim đồng hồ. */
  const polar = (r: number, deg: number): [number, number] => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];
  const START = -135;
  const SWEEP = 270;
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Cổ ren và đai ốc lục giác ở đáy.
  group.add(new Konva.Rect({ x: m(-0.011), y: m(R - 0.004), width: m(0.022), height: m(0.032), ...lin(m(-0.011), 0, m(0.011), 0, brass), stroke: "#4a3510", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0165), y: m(R + 0.016), width: m(0.033), height: m(0.014), cornerRadius: m(0.002), ...lin(m(-0.0165), 0, m(0.0165), 0, brass), stroke: "#4a3510", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0075), y: m(R + 0.03), width: m(0.015), height: m(0.016), ...lin(m(-0.0075), 0, m(0.0075), 0, brass), stroke: "#4a3510", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 4; i += 1) group.add(ln([-0.0075, R + 0.0325 + i * 0.0035, 0.0075, R + 0.0335 + i * 0.0035], "rgba(60,40,10,0.55)", lw * 0.8));

  // Vỏ và vành đồng thau, kính phủ.
  group.add(new Konva.Circle({ radius: m(R), ...lin(m(-R), m(-R), m(R), m(R), brass), stroke: "#4a3510", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.45, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  group.add(new Konva.Circle({ radius: m(R - 0.006), ...lin(m(R), m(R), m(-R), m(-R), [0, "#f6e3a4", 0.5, fill, 1, "#4a3510"]), stroke: "#4a3510", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Circle({ radius: m(FACE + 0.003), fill: "#0b1220", listening: false }));
  group.add(new Konva.Circle({ radius: m(FACE), fillRadialGradientStartPoint: { x: m(-0.012), y: m(-0.014) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(FACE), fillRadialGradientColorStops: [0, "#ffffff", 0.75, "#f8fafc", 1, "#d6dce5"], listening: false }));
  // Vùng đỏ 500–600 kPa.
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(FACE - 0.0085), outerRadius: m(FACE - 0.0035), angle: (SWEEP / 600) * 100, rotation: START - 90 + (SWEEP / 600) * 500, fill: "#dc2626", listening: false }));

  // Vạch chia: 30 khoảng 20 kPa; số mỗi 100 kPa.
  for (let i = 0; i <= 30; i += 1) {
    const deg = START + (i * SWEEP) / 30;
    const major = i % 5 === 0;
    const [x1, y1] = polar(FACE - 0.0035, deg);
    const [x2, y2] = polar(FACE - (major ? 0.0135 : 0.0085), deg);
    group.add(ln([x1, y1, x2, y2], "#0f172a", major ? lw * 1.6 : lw * 0.9));
    if (major) {
      const [tx, ty] = polar(FACE - 0.0235, deg);
      group.add(new Konva.Text({ x: m(tx), y: m(ty), width: m(0.016), offsetX: m(0.008), offsetY: m(0.0043), align: "center", text: String(i * 20), fontSize: m(0.0085), fontStyle: "bold", fill: "#0f172a", listening: false }));
    }
  }
  group.add(new Konva.Text({ x: m(-0.02), y: m(0.012), width: m(0.04), align: "center", text: "kPa", fontSize: m(0.0105), fontStyle: "bold", fill: "#1e293b", listening: false }));
  group.add(new Konva.Text({ x: m(-0.025), y: m(-0.0158), width: m(0.05), align: "center", text: "PRESSURE", fontSize: m(0.0058), fontStyle: "bold", fill: "#475569", listening: false }));
  group.add(new Konva.Text({ x: m(-0.025), y: m(0.036), width: m(0.05), align: "center", text: "0 – 600", fontSize: m(0.0058), fill: "#64748b", listening: false }));

  // BỘ PHẬN QUAY: kim đen có đuôi đối trọng; gốc nhóm đúng tâm trục, kim chỉ vạch 0 khi nghỉ.
  const needle = new Konva.Group({ x: 0, y: 0, rotation: START });
  needle.add(new Konva.Line({ points: [m(-0.0018), m(0.012), m(-0.0011), m(-FACE + 0.0075), 0, m(-FACE + 0.0035), m(0.0011), m(-FACE + 0.0075), m(0.0018), m(0.012)], closed: true, ...lin(m(-0.0018), 0, m(0.0018), 0, [0, "#475569", 0.5, "#0f172a", 1, "#020617"]), stroke: "#000", strokeWidth: lw * 0.4, shadowColor: "#000", shadowBlur: m(0.003), shadowOpacity: 0.4, shadowOffset: { x: m(0.001), y: m(0.0015) }, listening: false }));
  needle.add(new Konva.Circle({ x: 0, y: m(0.0105), radius: m(0.0034), fill: "#0f172a", listening: false }));
  group.add(needle);
  group.add(new Konva.Circle({ radius: m(0.0058), ...lin(m(-0.0058), m(-0.0058), m(0.0058), m(0.0058), [0, "#f8fafc", 0.5, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  // Kính phủ.
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(FACE - 0.0075), outerRadius: m(FACE - 0.0032), angle: 60, rotation: 200, fill: "rgba(255,255,255,0.55)", listening: false }));
  group.add(new Konva.Line({ points: [m(-0.035), m(-0.032), m(-0.012), m(-0.045), m(0.0), m(-0.034), m(-0.026), m(-0.01)], closed: true, fill: "rgba(255,255,255,0.12)", listening: false }));
  // Ốc bắt vành.
  for (let i = 0; i < 4; i += 1) {
    const a = 45 + i * 90;
    const [sx, sy] = polar(R - 0.0032, a);
    group.add(new Konva.Circle({ x: m(sx), y: m(sy), radius: m(0.0022), fill: "#f6e3a4", stroke: "#4a3510", strokeWidth: lw * 0.6, listening: false }));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-R), y: m(R + 0.05), width: m(2 * R), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { needle: { node: needle, motion: "rotate" as const, min: 0, max: SWEEP } },
    points: { center: { x: 0, y: 0 }, inlet: { x: 0, y: m(R + 0.046) }, zero: { x: m(polar(FACE - 0.0035, START)[0]), y: m(polar(FACE - 0.0035, START)[1]) } },
  };
};
