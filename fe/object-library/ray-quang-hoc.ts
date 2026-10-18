/* OBJECT-META
{
  "catalog": "Băng / ray quang học (giá quang học có thước)",
  "title": "Băng quang học dài 1 m bằng nhôm định hình, thước chia mm và con trượt có trụ gá",
  "fill": "#9aa5b4",
  "anchor": "Đầu trái của băng, ở mặt trên của thanh.",
  "useWhen": ["Cần băng quang học dài 1 m nhôm định hình, thước chia mm, con trượt có trụ gá để đọc vị trí dụng cụ.","Cần dựng bộ đo tiêu cự thấu kính trên giá."],
  "avoidWhen": ["Cần chỉ một thanh ray cho xe chạy: dùng hai-thanh-ray; cần giá có đồ kẹp: dùng gia-thi-nghiem.","Băng không kèm thấu kính, vật, màn; phải thêm riêng."],
  "size": {
    "width": 1,
    "height": 0.255
  },
  "parts": [
    {
      "name": "carriage",
      "label": "Con trượt",
      "motion": "slide",
      "axis": "right",
      "min": 0,
      "max": 0.78,
      "description": "Vị trí con trượt trên băng so với vạch 10 cm, mét; trụ gá và vạch chỉ đi theo."
    }
  ],
  "points": [
    {
      "name": "railStart",
      "description": "Vạch 0 cm, đầu trái của băng."
    },
    {
      "name": "railEnd",
      "description": "Vạch 100 cm, đầu phải của băng."
    },
    {
      "name": "carriagePost",
      "description": "Chân trụ gá của con trượt ở vạch 10 cm; vị trí thật = carriagePost + carriage sang phải."
    }
  ],
  "notes": "Băng dài 1,00 m, thước chia 1 mm có số ghi mỗi 10 cm. Vạch chỉ của con trượt trùng với đường tâm trụ gá nên đọc được vị trí dụng cụ. fill là màu nhôm."
}
*/
const makeOpticalBench = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const LEN = 1.0;
  const BAR_H = 0.036;
  const REST_X = 0.1;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0018));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });

  const group = new Konva.Group({ x: p.x, y: p.y });

  // Hai chân đỡ có vít chỉnh độ cao.
  for (const x of [0.07, LEN - 0.07]) {
    group.add(new Konva.Rect({ x: m(x - 0.03), y: m(BAR_H), width: m(0.06), height: m(0.05), cornerRadius: m(0.004), ...lin(m(x - 0.03), 0, m(x + 0.03), 0, [0, "#475569", 0.3, "#cbd5e1", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.05), y: m(BAR_H + 0.05), width: m(0.1), height: m(0.012), cornerRadius: m(0.004), fill: "#111827", stroke: "#374151", strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(BAR_H + 0.026), radius: m(0.006), fill: "#0f172a", stroke: "#94a3b8", strokeWidth: lw * 0.7, listening: false }));
  }

  // Thân băng: nhôm định hình, rãnh chữ T ở mặt dưới và dải thước ở mặt trước.
  group.add(new Konva.Rect({ x: 0, y: 0, width: m(LEN), height: m(BAR_H), cornerRadius: m(0.004), ...lin(0, 0, 0, m(BAR_H), [0, "#f1f5f9", 0.15, fill, 0.8, "#64748b", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.35, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  group.add(new Konva.Line({ points: [m(0.006), m(0.004), m(LEN - 0.006), m(0.004)], stroke: "rgba(255,255,255,0.7)", strokeWidth: lw, lineCap: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(0.012), y: m(0.012), width: m(LEN - 0.024), height: m(0.019), fill: "#fefce8", stroke: "#a16207", strokeWidth: lw * 0.6, listening: false }));
  // Vạch chia: mm, 5 mm, cm và số mỗi 10 cm.
  for (let mm = 0; mm <= 1000; mm += 2) {
    const x = 0.012 + (mm / 1000) * (LEN - 0.024);
    const major = mm % 100 === 0;
    const mid = mm % 10 === 0;
    const h = major ? 0.013 : mid ? 0.0085 : 0.0045;
    group.add(new Konva.Line({ points: [m(x), m(0.012), m(x), m(0.012 + h)], stroke: "#1f2937", strokeWidth: major ? lw * 0.9 : lw * 0.5, listening: false }));
  }
  for (let cm = 0; cm <= 100; cm += 10) {
    const x = 0.012 + (cm / 100) * (LEN - 0.024);
    group.add(new Konva.Text({ x: m(x - 0.02), y: m(0.0255), width: m(0.04), align: "center", text: String(cm), fontSize: m(0.0075), fontStyle: "bold", fill: "#1f2937", listening: false }));
  }

  // BỘ PHẬN TRƯỢT: con trượt gá lên băng. Gốc nhóm ở tâm trụ gá, trên mặt băng.
  const carriage = new Konva.Group({ x: m(REST_X), y: 0 });
  carriage.add(new Konva.Rect({ x: m(-0.04), y: m(-0.022), width: m(0.08), height: m(0.026), cornerRadius: m(0.004), ...lin(m(-0.04), 0, m(0.04), 0, [0, "#1e293b", 0.3, "#475569", 0.7, "#334155", 1, "#0f172a"]), stroke: "#0b1220", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  carriage.add(new Konva.Rect({ x: m(-0.04), y: m(0.0), width: m(0.08), height: m(0.004), fill: "#cbd5e1", listening: false }));
  carriage.add(new Konva.Rect({ x: m(-0.0075), y: m(-0.15), width: m(0.015), height: m(0.13), cornerRadius: m(0.0075), ...lin(m(-0.0075), 0, m(0.0075), 0, [0, "#64748b", 0.3, "#f8fafc", 0.65, "#cbd5e1", 1, "#475569"]), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  carriage.add(new Konva.Circle({ x: 0, y: m(-0.15), radius: m(0.0075), fill: "#e2e8f0", stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  // Vít hãm bên cạnh và vạch chỉ xuống thước.
  carriage.add(new Konva.Rect({ x: m(0.04), y: m(-0.014), width: m(0.014), height: m(0.007), fill: "#cbd5e1", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  carriage.add(new Konva.Rect({ x: m(0.052), y: m(-0.021), width: m(0.012), height: m(0.021), cornerRadius: m(0.004), ...lin(0, m(-0.021), 0, 0, [0, "#7f1d1d", 0.5, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.6, listening: false }));
  carriage.add(new Konva.Line({ points: [0, m(0.004), 0, m(0.031)], stroke: "#dc2626", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  carriage.add(new Konva.Line({ points: [m(-0.005), m(0.031), m(0.005), m(0.031), 0, m(0.0385)], closed: true, fill: "#dc2626", listening: false }));
  group.add(carriage);

  if (label) {
    group.add(new Konva.Text({ x: m(0.1), y: m(BAR_H + 0.016), width: m(0.8), align: "center", text: label, fontSize: m(0.022), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { carriage: { node: carriage, motion: "slide" as const, axis: "right" as const, min: 0, max: 0.78 } },
    points: { railStart: { x: m(0.012), y: 0 }, railEnd: { x: m(LEN - 0.012), y: 0 }, carriagePost: { x: m(REST_X), y: 0 } },
  };
};
