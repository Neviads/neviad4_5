/* OBJECT-META
{
  "catalog": "Vôn kế (kim)",
  "title": "Vôn kế chỉ thị kim 0–6 V: vỏ tròn bằng nhôm anod xanh, mặt trắng có số lớn, hai đầu nối + và −",
  "fill": "#1e3a8a",
  "anchor": "Trục kim (tâm mặt đồng hồ).",
  "useWhen": ["Cần vôn kế kim 0–6 V chia 0,2 V, hai đầu nối + và −, mắc song song đoạn mạch cần đo.","Cần kim chỉ quay quanh trục tâm mặt đồng hồ để đọc điện áp."],
  "avoidWhen": ["Cần ampe kế đo cường độ dòng điện: dùng ampe-ke.","Cần đồng hồ vạn năng nhiều thang đo: dùng dong-ho-da-nang.","Chỉ có một thang 0–6 V, không có chế độ đo dòng hay điện trở."],
  "size": {
    "width": 0.124,
    "height": 0.144
  },
  "parts": [
    {
      "name": "needle",
      "label": "Kim chỉ",
      "motion": "rotate",
      "min": 0,
      "max": 100,
      "description": "Góc quay của kim từ vạch 0 V, độ theo chiều kim đồng hồ; 100° ứng với 6 V."
    }
  ],
  "points": [
    {
      "name": "pivot",
      "description": "Trục kim."
    },
    {
      "name": "plus",
      "description": "Đầu nối dương (đỏ)."
    },
    {
      "name": "minus",
      "description": "Đầu nối âm (đen)."
    },
    {
      "name": "zero",
      "description": "Vạch 0 V."
    }
  ],
  "notes": "Thang chia 0,2 V, số ghi mỗi 1 V, ký hiệu V to ở giữa; điện trở trong lớn nên vôn kế mắc song song với đoạn mạch cần đo. fill là màu vỏ."
}
*/
const makeVoltmeter = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.062;
  const SCALE = 0.048;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0012));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const polar = (r: number, deg: number): [number, number] => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];
  const START = -50;
  const SWEEP = 100;
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Vỏ tròn nhôm anod: vành sáng bên ngoài, lõi màu.
  group.add(new Konva.Circle({ radius: m(R), ...lin(m(-R), m(-R), m(R), m(R), [0, "#93c5fd", 0.25, fill, 0.8, "#0b1b4d", 1, "#050c24"]), stroke: "#020617", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.016), shadowOpacity: 0.5, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  group.add(new Konva.Circle({ radius: m(R - 0.005), fill: "transparent", stroke: "rgba(191,219,254,0.6)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ radius: m(0.0555), ...lin(m(0.0555), m(0.0555), m(-0.0555), m(-0.0555), [0, "#cbd5e1", 0.5, "#64748b", 1, "#1e293b"]), stroke: "#020617", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ radius: m(0.0515), fillRadialGradientStartPoint: { x: m(-0.014), y: m(-0.018) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0515), fillRadialGradientColorStops: [0, "#ffffff", 0.7, "#f8fafc", 1, "#d9dee7"], listening: false }));

  // Cung thang 0–6 V, vạch chia 0,2 V, số mỗi 1 V; vạch 0 và 6 đậm hơn.
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(SCALE - 0.0004), outerRadius: m(SCALE + 0.0004), angle: SWEEP, rotation: START - 90, fill: "#0f172a", listening: false }));
  for (let i = 0; i <= 30; i += 1) {
    const deg = START + (i * SWEEP) / 30;
    const major = i % 5 === 0;
    const [x1, y1] = polar(SCALE, deg);
    const [x2, y2] = polar(SCALE - (major ? 0.0105 : 0.0062), deg);
    group.add(ln([x1, y1, x2, y2], "#0f172a", major ? lw * 1.8 : lw * 0.8));
    if (major) {
      const [tx, ty] = polar(SCALE - 0.0175, deg);
      group.add(new Konva.Text({ x: m(tx), y: m(ty), width: m(0.012), offsetX: m(0.006), offsetY: m(0.0043), align: "center", text: String(i / 5), fontSize: m(0.0102), fontStyle: "bold", fill: "#0f172a", listening: false }));
    }
  }
  group.add(new Konva.Text({ x: m(-0.016), y: m(0.0055), width: m(0.032), align: "center", text: "V", fontSize: m(0.027), fontStyle: "bold", fill: "#0f172a", listening: false }));
  group.add(new Konva.Text({ x: m(-0.03), y: m(0.0395), width: m(0.06), align: "center", text: "DC  0 – 6 V", fontSize: m(0.0058), fill: "#334155", listening: false }));
  group.add(new Konva.Text({ x: m(-0.03), y: m(-0.0125), width: m(0.06), align: "center", text: "VOLTMETER", fontSize: m(0.0042), fontStyle: "bold", fill: "#64748b", listening: false }));

  // BỘ PHẬN QUAY: kim đen thon, đuôi đối trọng; ở 0 V kim chỉ vạch đầu thang.
  const needle = new Konva.Group({ x: 0, y: 0, rotation: START });
  needle.add(new Konva.Line({ points: [m(-0.0017), m(0.012), m(-0.0008), m(-SCALE + 0.002), 0, m(-SCALE - 0.0035), m(0.0008), m(-SCALE + 0.002), m(0.0017), m(0.012)], closed: true, fill: "#0f172a", stroke: "#000", strokeWidth: lw * 0.4, shadowColor: "#000", shadowBlur: m(0.0025), shadowOpacity: 0.4, shadowOffset: { x: m(0.001), y: m(0.0012) }, listening: false }));
  needle.add(new Konva.Circle({ x: 0, y: m(0.0105), radius: m(0.0032), fill: "#0f172a", listening: false }));
  group.add(needle);
  group.add(new Konva.Circle({ radius: m(0.0055), ...lin(m(-0.0055), m(-0.0055), m(0.0055), m(0.0055), [0, "#f8fafc", 0.5, "#94a3b8", 1, "#1f2937"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  // Kính: vệt sáng.
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(0.0475), outerRadius: m(0.0505), angle: 70, rotation: 205, fill: "rgba(255,255,255,0.6)", listening: false }));

  // Hai đầu nối ở dưới vỏ.
  const posts: [number, string, string, string][] = [[-0.03, "#dc2626", "#fecaca", "+"], [0.03, "#111827", "#9ca3af", "−"]];
  for (const [x, color, hi, sign] of posts) {
    group.add(new Konva.Circle({ x: m(x), y: m(R + 0.006), radius: m(0.0092), ...lin(m(x - 0.0092), 0, m(x + 0.0092), 0, [0, "#475569", 0.4, "#f1f5f9", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(R + 0.006), radius: m(0.0066), fillRadialGradientStartPoint: { x: m(x - 0.002), y: m(R + 0.004) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: m(x), y: m(R + 0.006) }, fillRadialGradientEndRadius: m(0.0066), fillRadialGradientColorStops: [0, hi, 0.5, color, 1, "#000"], stroke: "#030712", strokeWidth: lw * 0.8, listening: false }));
    group.add(ln([x - 0.0045, R + 0.006, x + 0.0045, R + 0.006], "rgba(0,0,0,0.6)", lw * 1.2));
    group.add(new Konva.Text({ x: m(x - 0.008), y: m(R + 0.017), width: m(0.016), align: "center", text: sign, fontSize: m(0.009), fontStyle: "bold", fill: color === "#111827" ? "#e5e7eb" : "#fca5a5", listening: false }));
  }
  group.add(new Konva.Rect({ x: m(-0.039), y: m(R - 0.004), width: m(0.078), height: m(0.01), fill: "#0b1b4d", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(R + 0.03), width: m(0.12), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { needle: { node: needle, motion: "rotate" as const, min: 0, max: SWEEP } },
    points: { pivot: { x: 0, y: 0 }, plus: { x: m(-0.03), y: m(R + 0.006) }, minus: { x: m(0.03), y: m(R + 0.006) }, zero: { x: m(polar(SCALE, START)[0]), y: m(polar(SCALE, START)[1]) } },
  };
};
