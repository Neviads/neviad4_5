/* OBJECT-META
{
  "catalog": "Sao chổi, thiên thạch",
  "title": "Sao chổi có nhân băng đá, đầu sao phát sáng và hai đuôi (đuôi bụi cong, đuôi ion thẳng) cùng một thiên thạch đá lởm chởm bên cạnh",
  "fill": "#bae6fd",
  "anchor": "Nhân sao chổi.",
  "useWhen": ["Cần sao chổi sơ đồ có nhân băng, đầu sáng, đuôi bụi cong, đuôi ion thẳng và một thiên thạch đá.","Cần cảnh thiên văn mô tả đuôi hướng xa Mặt Trời."],
  "avoidWhen": ["Cần hành tinh hay vệ tinh quay quanh: dùng hanh-tinh, mat-trang hoặc ve-tinh-nhan-tao.","Cần quỹ đạo elip của sao chổi; vật này chỉ vẽ hình thể, không có quỹ đạo."],
  "size": { "width": 0.9, "height": 0.24 },
  "parts": [],
  "points": [
    { "name": "nucleus", "description": "Nhân sao chổi." },
    { "name": "tailEnd", "description": "Cuối đuôi ion." },
    { "name": "meteoroid", "description": "Tâm thiên thạch đá." }
  ],
  "notes": "Mô hình sơ đồ: nhân 0,03 m, đầu sao 0,12 m, đuôi ion thẳng dài 0,55 m về bên phải (xa Mặt Trời ở bên trái) và đuôi bụi cong dài 0,42 m. Thiên thạch đá lởm chởm 0,05 m ở dưới trái. fill là màu đuôi ion xanh lam."
}
*/
const makeComet = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Đuôi bụi: dải cong toả rộng dần, màu vàng nhạt; đuôi ion: dải thẳng xanh lam.
  group.add(new Konva.Line({ points: [0, m(-0.03), m(0.15), m(-0.075), m(0.3), m(-0.06), m(0.42), m(-0.01), m(0.3), m(0.0), m(0.15), m(0.03), 0, m(0.03)], closed: true, tension: 0.4, fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(0.42), y: 0 }, fillLinearGradientColorStops: [0, "rgba(254,243,199,0.8)", 0.5, "rgba(253,224,171,0.3)", 1, "rgba(253,224,171,0)"], listening: false }));
  group.add(new Konva.Line({ points: [0, m(-0.014), m(0.2), m(-0.03), m(0.55), m(-0.034), m(0.55), m(-0.008), m(0.2), m(-0.002), 0, m(0.008)], closed: true, tension: 0.15, fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(0.55), y: 0 }, fillLinearGradientColorStops: [0, fill, 0.4, "rgba(56,189,248,0.4)", 1, "rgba(56,189,248,0)"], listening: false }));
  for (let i = 0; i < 9; i += 1) group.add(new Konva.Line({ points: [m(0.04 + i * 0.05), m(-0.02 - (i % 3) * 0.004), m(0.2 + i * 0.04), m(-0.022 - (i % 3) * 0.006)], stroke: "rgba(255,255,255,0.28)", strokeWidth: lw * 0.8, lineCap: "round", listening: false }));

  // Đầu sao (coma): quầng sáng đồng tâm và nhân băng đá sần sùi với vài hố.
  group.add(new Konva.Circle({ radius: m(0.12), fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.12), fillRadialGradientColorStops: [0, "rgba(255,255,255,0.95)", 0.25, "rgba(186,230,253,0.75)", 0.6, "rgba(56,189,248,0.25)", 1, "rgba(56,189,248,0)"], listening: false }));
  group.add(new Konva.Line({ points: [m(-0.03), m(-0.005), m(-0.022), m(-0.022), m(-0.004), m(-0.03), m(0.016), m(-0.022), m(0.03), m(-0.004), m(0.022), m(0.016), m(0.002), m(0.03), m(-0.02), m(0.02)], closed: true, tension: 0.2, fillRadialGradientStartPoint: { x: m(-0.01), y: m(-0.012) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.035), fillRadialGradientColorStops: [0, "#d4d4d8", 0.6, "#71717a", 1, "#27272a"], stroke: "#18181b", strokeWidth: lw, lineJoin: "round", listening: false }));
  for (const [x, y, r] of [[-0.008, -0.01, 0.005], [0.01, 0.006, 0.004], [-0.014, 0.012, 0.003]] as [number, number, number][]) group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fill: "rgba(24,24,27,0.6)", listening: false }));

  // Thiên thạch đá: đa giác lởm chởm, mặt sáng/tối, hố và vết nứt.
  const mx = -0.2;
  const my = 0.09;
  group.add(new Konva.Line({ points: [m(mx - 0.025), m(my - 0.005), m(mx - 0.012), m(my - 0.022), m(mx + 0.008), m(my - 0.026), m(mx + 0.026), m(my - 0.01), m(mx + 0.024), m(my + 0.012), m(mx + 0.006), m(my + 0.024), m(mx - 0.015), m(my + 0.02)], closed: true, fillLinearGradientStartPoint: { x: m(-0.03), y: m(-0.03) }, fillLinearGradientEndPoint: { x: m(0.03), y: m(0.03) }, fillLinearGradientColorStops: [0, "#a8a29e", 0.5, "#57534e", 1, "#1c1917"], stroke: "#0c0a09", strokeWidth: lw * 1.1, lineJoin: "round", shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.5, listening: false }));
  group.add(new Konva.Line({ points: [m(mx - 0.012), m(my - 0.022), m(mx + 0.008), m(my - 0.026), m(mx + 0.002), m(my - 0.008)], closed: true, fill: "rgba(255,255,255,0.22)", listening: false }));
  group.add(new Konva.Line({ points: [m(mx - 0.01), m(my), m(mx + 0.004), m(my + 0.008), m(mx + 0.014), m(my + 0.002)], stroke: "rgba(12,10,9,0.7)", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Circle({ x: m(mx + 0.012), y: m(my - 0.008), radius: m(0.004), fill: "rgba(12,10,9,0.5)", listening: false }));
  group.add(new Konva.Line({ points: [m(mx - 0.025), m(my - 0.005), m(mx - 0.09), m(my - 0.015), m(mx - 0.15), m(my - 0.01)], stroke: "rgba(251,146,60,0.5)", strokeWidth: m(0.008), lineCap: "round", opacity: 0.6, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(0.13), width: m(0.2), align: "center", text: label, fontSize: m(0.02), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { nucleus: { x: 0, y: 0 }, tailEnd: { x: m(0.55), y: m(-0.02) }, meteoroid: { x: m(mx), y: m(my) } } };
};
