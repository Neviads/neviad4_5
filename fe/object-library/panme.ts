/* OBJECT-META
{
  "catalog": "Panme (thước vi kế)",
  "title": "Panme đo ngoài 0–25 mm: khung chữ C, đe, trục đo, ống chia và tang trống có cơ cấu cóc",
  "fill": "#334155",
  "anchor": "Mặt đo của đe (đầu đe), trên đường trục của panme.",
  "useWhen": ["Cần panme đo ngoài 0–25 mm: khung chữ C, đe, trục đo và tang trống có cóc, đọc được 0,01 mm.", "Cảnh đo đường kính dây hay bề dày vật nhỏ bằng độ mở spindle trượt sang phải."],
  "avoidWhen": ["Cần đo dài có du xích: dùng thuoc-kep; cần thước cứng dài: dùng thuoc-thang.", "Vật chỉ đo tới 25 mm; tang trống không quay riêng mà chỉ tịnh tiến cùng spindle."],
  "size": {
    "width": 0.131,
    "height": 0.055
  },
  "parts": [
    {
      "name": "spindle",
      "label": "Trục đo và tang trống",
      "motion": "slide",
      "axis": "right",
      "min": 0,
      "max": 0.025,
      "description": "Độ mở giữa đe và đầu trục đo (mét); tang trống và cóc đi theo vì chúng vặn trục tiến lùi."
    }
  ],
  "points": [
    {
      "name": "anvil",
      "description": "Mặt đo của đe."
    },
    {
      "name": "spindleTip",
      "description": "Mặt đo của trục đo khi khép; vị trí thật = spindleTip + spindle sang phải."
    },
    {
      "name": "axis",
      "description": "Điểm trên trục panme ngay phía sau đe."
    }
  ],
  "notes": "Bước ren 0,5 mm, tang trống 50 vạch nên đọc được 0,01 mm. Một vòng tang trống làm trục đo tiến 0,5 mm: chuyển động quay của tang trống được thể hiện bằng độ tịnh tiến của spindle. fill là màu sơn khung."
}
*/
const makeMicrometer = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const ANVIL = 0.006;
  const BARREL_X = 0.047;
  const BARREL_LEN = 0.052;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0012));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });

  const group = new Konva.Group({ x: p.x, y: p.y });

  // Khung bằng thép sơn: một thanh cong đi từ lưng đe vòng xuống phía dưới trục rồi nối vào ống chia.
  const arc = [-0.004, 0.0, -0.014, 0.004, -0.02, 0.014, -0.014, 0.027, 0.004, 0.037, 0.03, 0.04, 0.052, 0.032, 0.058, 0.013, 0.058, 0.004];
  group.add(new Konva.Line({ points: arc.map(m), stroke: "#0b1220", strokeWidth: m(0.0125), lineCap: "round", lineJoin: "round", tension: 0.45, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Line({ points: arc.map(m), stroke: fill, strokeWidth: m(0.0095), lineCap: "round", lineJoin: "round", tension: 0.45, listening: false }));
  group.add(new Konva.Line({ points: arc.map((v, i) => m(i % 2 === 0 ? v - 0.0016 : v - 0.0016)), stroke: "rgba(255,255,255,0.35)", strokeWidth: m(0.0016), lineCap: "round", lineJoin: "round", tension: 0.45, listening: false }));
  // Tấm cách nhiệt ốp hai bên khung (chỗ cầm tay).
  group.add(new Konva.Rect({ x: m(0.012), y: m(0.0335), width: m(0.03), height: m(0.0085), cornerRadius: m(0.003), fill: "#111827", stroke: "#374151", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0245), y: m(0.01), width: m(0.0085), height: m(0.014), cornerRadius: m(0.003), rotation: -22, fill: "#111827", stroke: "#374151", strokeWidth: lw * 0.6, listening: false }));
  // Đe: trụ thép tôi có mặt đo phẳng.
  group.add(new Konva.Rect({ x: m(-0.006), y: m(-0.0055), width: m(0.012 + ANVIL), height: m(0.011), ...lin(0, m(-0.0055), 0, m(0.0055), steel), stroke: "#334155", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: [m(0.012), m(-0.0055), m(0.012), m(0.0055)].map((v) => v), stroke: "#0f172a", strokeWidth: lw * 1.2, listening: false }));

  // Ống chia (đứng yên): thước chính chia 0,5 mm trên ống trụ, vạch ngang ở giữa.
  group.add(new Konva.Rect({ x: m(BARREL_X - 0.01), y: m(-0.0105), width: m(BARREL_LEN + 0.01), height: m(0.021), ...lin(0, m(-0.0105), 0, m(0.0105), [0, "#475569", 0.2, "#f8fafc", 0.5, "#e2e8f0", 1, "#64748b"]), stroke: "#334155", strokeWidth: lw, listening: false }));
  group.add(ln([BARREL_X - 0.008, 0, BARREL_X + BARREL_LEN, 0], "#0f172a", lw * 0.9));
  for (let i = 0; i <= 25; i += 1) {
    const x = BARREL_X + 0.0005 + i * 0.0018;
    group.add(ln([x, 0, x, i % 5 === 0 ? -0.0075 : -0.0045], "#0f172a", lw * 0.8));
    if (i % 5 === 0 && i < 25) group.add(new Konva.Text({ x: m(x - 0.003), y: m(-0.0098), text: String(i), fontSize: m(0.004), fontStyle: "bold", fill: "#0f172a", listening: false }));
    if (i < 25) group.add(ln([x + 0.0009, 0, x + 0.0009, 0.0045], "#0f172a", lw * 0.7));
  }
  // Vỏ ren sau ống chia nối với khung.
  group.add(new Konva.Rect({ x: m(0.018), y: m(-0.008), width: m(BARREL_X - 0.018 - 0.01), height: m(0.016), ...lin(0, m(-0.008), 0, m(0.008), steel), stroke: "#334155", strokeWidth: lw, listening: false }));

  // BỘ PHẬN TRƯỢT: trục đo + tang trống + cóc. Gốc nhóm ở mặt đo của trục khi khép.
  const spindle = new Konva.Group({ x: m(ANVIL + 0.006), y: 0 });
  spindle.add(new Konva.Rect({ x: 0, y: m(-0.0045), width: m(0.03), height: m(0.009), ...lin(0, m(-0.0045), 0, m(0.0045), steel), stroke: "#334155", strokeWidth: lw, listening: false }));
  // Tang trống chia 50 vạch quanh chu vi.
  const dx = 0.03;
  spindle.add(new Konva.Rect({ x: m(dx), y: m(-0.0125), width: m(0.038), height: m(0.025), cornerRadius: m(0.003), ...lin(0, m(-0.0125), 0, m(0.0125), [0, "#334155", 0.2, "#f1f5f9", 0.55, "#cbd5e1", 1, "#475569"]), stroke: "#334155", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.3, listening: false }));
  for (let i = 0; i < 25; i += 1) {
    const y = -0.0105 + i * 0.00088;
    spindle.add(ln([dx + 0.0005, y, dx + (i % 5 === 0 ? 0.0105 : 0.0075), y], "#0f172a", lw * (i % 5 === 0 ? 0.9 : 0.6)));
  }
  spindle.add(new Konva.Text({ x: m(dx + 0.0125), y: m(-0.0105), text: "0", fontSize: m(0.0042), fontStyle: "bold", fill: "#0f172a", listening: false }));
  spindle.add(new Konva.Text({ x: m(dx + 0.0125), y: m(-0.0005), text: "25", fontSize: m(0.0042), fontStyle: "bold", fill: "#0f172a", listening: false }));
  // Cóc điều chỉnh lực đo: núm có khía.
  spindle.add(new Konva.Rect({ x: m(dx + 0.038), y: m(-0.0105), width: m(0.026), height: m(0.021), cornerRadius: m(0.004), ...lin(0, m(-0.0105), 0, m(0.0105), [0, "#1f2937", 0.3, "#64748b", 1, "#0b1220"]), stroke: "#0b1220", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 9; i += 1) spindle.add(ln([dx + 0.04 + i * 0.0026, -0.0098, dx + 0.04 + i * 0.0026, 0.0098], "rgba(255,255,255,0.18)", lw * 0.8));
  group.add(spindle);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.05), y: m(0.037), text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { spindle: { node: spindle, motion: "slide" as const, axis: "right" as const, min: 0, max: 0.025 } },
    points: { anvil: { x: m(0.012), y: 0 }, spindleTip: { x: m(ANVIL + 0.006), y: 0 }, axis: { x: m(-0.004), y: 0 } },
  };
};
