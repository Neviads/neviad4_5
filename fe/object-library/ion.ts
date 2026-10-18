/* OBJECT-META
{
  "catalog": "Ion (+ / −)",
  "title": "Cặp ion Na⁺ và Cl⁻ vẽ phóng to: cation đỏ nhỏ mang dấu +, anion lục lớn mang dấu −, kèm hào quang điện tích",
  "fill": "#f87171",
  "anchor": "Giữa hai ion.",
  "useWhen": ["Cần minh hoạ cặp ion Na⁺ và Cl⁻ với tỉ lệ bán kính thật, ion âm lớn hơn ion dương.", "Cảnh nói về hình thành liên kết ion hay điện tích của ion, cần dấu + và − rõ."],
  "avoidWhen": ["Cần electron, proton hay hạt đơn lẻ: dùng electron, proton.", "Cần mô hình nguyên tử có lớp vỏ: dùng nguyen-tu-bohr; cần phân tử nước: dùng phan-tu-nuoc."],
  "size": { "width": 0.14, "height": 0.09 },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Giữa hai ion."
    },
    {
      "name": "cation",
      "description": "Tâm ion dương Na⁺."
    },
    {
      "name": "anion",
      "description": "Tâm ion âm Cl⁻."
    }
  ],
  "notes": "Na⁺ (bán kính ion 0,95·10⁻¹⁰ m) và Cl⁻ (1,81·10⁻¹⁰ m) vẽ phóng to khoảng 2·10⁸ lần (0,02 m và 0,035 m), giữ tỉ lệ kích thước thật; ion âm lớn hơn vì thêm electron. Dấu + đỏ và − xanh chỉ điện tích. fill là màu ion dương."
}
*/
const makeIonPair = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0006));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const ball = (x: number, y: number, r: number, c1: string, c2: string, c3: string) => group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fillRadialGradientStartPoint: { x: -m(r) * 0.35, y: -m(r) * 0.35 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#ffffff", 0.3, c1, 1, c2], stroke: c3, strokeWidth: lw, shadowColor: c1, shadowBlur: m(r) * 0.5, shadowOpacity: 0.45, listening: false }));
  const tx = (x: number, y: number, s: number, text: string, color: string) => group.add(new Konva.Text({ x: m(x - s * 2.5), y: m(y - s * 0.6), width: m(s * 5), align: "center", text, fontSize: m(s), fontStyle: "bold", fill: color, listening: false }));
  for (const [x, r, c1, c2, c3, halo, sign, name, tc] of [[-0.03, 0.02, fill, "#7f1d1d", "#450a0a", "rgba(248,113,113,0.28)", "+", "Na⁺", "#fecaca"], [0.035, 0.035, "#4ade80", "#14532d", "#052e16", "rgba(74,222,128,0.25)", "−", "Cl⁻", "#bbf7d0"]] as [number, number, string, string, string, string, string, string, string][]) {
    group.add(new Konva.Circle({ x: m(x), radius: m(r + 0.01), fill: halo, listening: false }));
    ball(x, 0, r, c1, c2, c3);
    group.add(new Konva.Line({ points: [m(x - r * 0.4), 0, m(x + r * 0.4), 0], stroke: "#f8fafc", strokeWidth: m(r * 0.2), lineCap: "round", listening: false }));
    if (sign === "+") group.add(new Konva.Line({ points: [m(x), m(-r * 0.4), m(x), m(r * 0.4)], stroke: "#f8fafc", strokeWidth: m(r * 0.2), lineCap: "round", listening: false }));
    tx(x, r + 0.0125, 0.0075, name, tc);
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.052), width: m(0.14), align: "center", text: label, fontSize: m(0.0065), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, cation: { x: m(-0.03), y: 0 }, anion: { x: m(0.035), y: 0 } } };
};
