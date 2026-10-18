/* OBJECT-META
{
  "catalog": "Oát kế / Jun kế",
  "title": "Oát kế điện động 0–100 W: mặt ngang có gương, kim đỏ, chỉnh số 0 và bốn đầu nối dòng và áp",
  "fill": "#374151",
  "anchor": "Trục kim (tâm cung thang).",
  "useWhen": ["Cần oát kế điện động 0–100 W có kim chỉ và bốn đầu nối: hai đầu dòng nối tiếp, hai đầu áp song song với tải.", "Cảnh đo công suất điện của tải, đọc số trên thang chia 2 W."],
  "avoidWhen": ["Cần chỉ đo dòng hay chỉ đo áp: dùng ampe kế hoặc vôn kế riêng, không dùng oát kế.", "Thang chỉ 0–100 W; công suất lớn hơn thì vượt. Jun kế cùng khung nhưng ghi thang J."],
  "size": {
    "width": 0.197,
    "height": 0.198
  },
  "parts": [
    {
      "name": "needle",
      "label": "Kim chỉ",
      "motion": "rotate",
      "min": 0,
      "max": 100,
      "description": "Góc quay của kim từ vạch 0 W, độ theo chiều kim đồng hồ; 100° ứng với 100 W."
    }
  ],
  "points": [
    {
      "name": "pivot",
      "description": "Trục kim."
    },
    {
      "name": "currentIn",
      "description": "Đầu nối dòng vào (đỏ)."
    },
    {
      "name": "currentOut",
      "description": "Đầu nối dòng ra (đỏ)."
    },
    {
      "name": "voltageIn",
      "description": "Đầu nối áp vào (đen)."
    },
    {
      "name": "voltageOut",
      "description": "Đầu nối áp ra (đen)."
    }
  ],
  "notes": "Thang chia 2 W, số ghi mỗi 10 W; Jun kế cùng khung nhưng ghi thang J. Hai đầu nối dòng mắc nối tiếp với tải, hai đầu nối áp mắc song song với tải. fill là màu vỏ."
}
*/
const makeWattmeter = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.07;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const polar = (r: number, deg: number): [number, number] => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];
  const START = -50;
  const SWEEP = 100;
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Vỏ kim loại sơn búa, cửa sổ rộng.
  group.add(new Konva.Rect({ x: m(-0.098), y: m(-0.082), width: m(0.196), height: m(0.158), cornerRadius: m(0.008), ...lin(m(-0.098), m(-0.082), m(0.098), m(0.076), [0, "#6b7280", 0.12, fill, 0.8, "#111827", 1, "#030712"]), stroke: "#030712", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.016), shadowOpacity: 0.5, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  for (const [x, y] of [[-0.09, -0.074], [0.09, -0.074], [-0.09, 0.068], [0.09, 0.068]]) group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(0.0034), fill: "#9ca3af", stroke: "#111827", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.083), y: m(-0.068), width: m(0.166), height: m(0.1), cornerRadius: m(0.005), fill: "#020617", stroke: "#4b5563", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0805), y: m(-0.0655), width: m(0.161), height: m(0.095), cornerRadius: m(0.004), ...lin(0, m(-0.0655), 0, m(0.0295), [0, "#fffdf5", 1, "#e9e3cc"]), listening: false }));

  // Hai cung thang: 0–100 W (trên) và vùng gương chống thị sai.
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(R - 0.0155), outerRadius: m(R - 0.0125), angle: SWEEP + 10, rotation: START - 95, fill: "#cbd5e1", stroke: "#94a3b8", strokeWidth: lw * 0.4, listening: false }));
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(R - 0.0003), outerRadius: m(R + 0.0003), angle: SWEEP, rotation: START - 90, fill: "#0f172a", listening: false }));
  for (let i = 0; i <= 50; i += 1) {
    const deg = START + (i * SWEEP) / 50;
    const major = i % 5 === 0;
    const [x1, y1] = polar(R, deg);
    const [x2, y2] = polar(R - (major ? 0.0105 : 0.0055), deg);
    group.add(ln([x1, y1, x2, y2], "#0f172a", major ? lw * 1.6 : lw * 0.8));
    if (major) {
      const [tx, ty] = polar(R + 0.0095, deg);
      group.add(new Konva.Text({ x: m(tx), y: m(ty), width: m(0.014), offsetX: m(0.007), offsetY: m(0.0045), align: "center", text: String((i / 5) * 10), fontSize: m(0.0092), fontStyle: "bold", fill: "#0f172a", listening: false }));
    }
  }
  // Đoạn cuối thang 80–100 W tô đỏ mảnh.
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(R + 0.0006), outerRadius: m(R + 0.0021), angle: (SWEEP / 100) * 20, rotation: START - 90 + (SWEEP / 100) * 80, fill: "#dc2626", listening: false }));
  group.add(new Konva.Text({ x: m(-0.03), y: m(-0.0365), width: m(0.06), align: "center", text: "W", fontSize: m(0.0275), fontStyle: "bold", fill: "#0f172a", listening: false }));
  group.add(new Konva.Text({ x: m(-0.05), y: m(0.0095), width: m(0.1), align: "center", text: "WATTMETER · 100 W · 5 A · 250 V", fontSize: m(0.0058), fill: "#334155", listening: false }));
  group.add(new Konva.Text({ x: m(-0.05), y: m(0.0175), width: m(0.1), align: "center", text: "50 Hz  CL 1.0", fontSize: m(0.0052), fill: "#64748b", listening: false }));

  // BỘ PHẬN QUAY: kim đỏ có đối trọng.
  const needle = new Konva.Group({ x: 0, y: 0, rotation: START });
  needle.add(new Konva.Line({ points: [m(-0.0017), m(0.012), m(-0.0008), m(-R + 0.004), 0, m(-R - 0.003), m(0.0008), m(-R + 0.004), m(0.0017), m(0.012)], closed: true, fill: "#dc2626", stroke: "#7f1d1d", strokeWidth: lw * 0.4, shadowColor: "#000", shadowBlur: m(0.0025), shadowOpacity: 0.4, shadowOffset: { x: m(0.001), y: m(0.0012) }, listening: false }));
  needle.add(new Konva.Rect({ x: m(-0.0036), y: m(0.0085), width: m(0.0072), height: m(0.0075), cornerRadius: m(0.0016), fill: "#dc2626", listening: false }));
  group.add(needle);
  group.add(new Konva.Circle({ radius: m(0.0052), ...lin(m(-0.0052), m(-0.0052), m(0.0052), m(0.0052), [0, "#f8fafc", 0.5, "#94a3b8", 1, "#1f2937"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0805), m(-0.0655), m(-0.04), m(-0.0655), m(-0.0805), m(-0.0285)], closed: true, fill: "rgba(255,255,255,0.14)", listening: false }));
  // Vít chỉnh 0 dưới mặt.
  group.add(new Konva.Circle({ x: 0, y: m(0.0265), radius: m(0.0045), fill: "#cbd5e1", stroke: "#1f2937", strokeWidth: lw, listening: false }));
  group.add(ln([-0.0034, 0.0265, 0.0034, 0.0265], "#0f172a", lw * 1.4));

  // Bốn đầu nối: hai đỏ (dòng), hai đen (áp), dán nhãn.
  const posts: [number, string, string, string][] = [[-0.066, "#dc2626", "#fecaca", "I+"], [-0.022, "#dc2626", "#fecaca", "I−"], [0.022, "#111827", "#9ca3af", "U+"], [0.066, "#111827", "#9ca3af", "U−"]];
  for (const [x, color, hi, text] of posts) {
    group.add(new Konva.Circle({ x: m(x), y: m(0.0545), radius: m(0.0085), ...lin(m(x - 0.0085), 0, m(x + 0.0085), 0, [0, "#475569", 0.4, "#f1f5f9", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(0.0545), radius: m(0.0061), fillRadialGradientStartPoint: { x: m(x - 0.0018), y: m(0.0527) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: m(x), y: m(0.0545) }, fillRadialGradientEndRadius: m(0.0061), fillRadialGradientColorStops: [0, hi, 0.5, color, 1, "#000"], stroke: "#030712", strokeWidth: lw * 0.8, listening: false }));
    group.add(ln([x - 0.004, 0.0545, x + 0.004, 0.0545], "rgba(0,0,0,0.6)", lw * 1.2));
    group.add(new Konva.Text({ x: m(x - 0.009), y: m(0.0645), width: m(0.018), align: "center", text, fontSize: m(0.0062), fontStyle: "bold", fill: "#e5e7eb", listening: false }));
  }
  group.add(new Konva.Line({ points: [m(-0.07), m(0.0425), m(-0.018), m(0.0425)], stroke: "#fca5a5", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: [m(0.018), m(0.0425), m(0.07), m(0.0425)], stroke: "#9ca3af", strokeWidth: lw, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.09), y: m(0.084), width: m(0.18), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { needle: { node: needle, motion: "rotate" as const, min: 0, max: SWEEP } },
    points: { pivot: { x: 0, y: 0 }, currentIn: { x: m(-0.066), y: m(0.0545) }, currentOut: { x: m(-0.022), y: m(0.0545) }, voltageIn: { x: m(0.022), y: m(0.0545) }, voltageOut: { x: m(0.066), y: m(0.0545) } },
  };
};
