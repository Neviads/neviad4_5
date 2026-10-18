/* OBJECT-META
{
  "catalog": "Mặt Trăng",
  "title": "Mặt Trăng tròn: biển bazan tối, cao nguyên sáng, nhiều hố va chạm có tia sáng toả ra và phần bóng ở rìa bên phải",
  "fill": "#d4d4d8",
  "anchor": "Tâm Mặt Trăng.",
  "useWhen": ["Cần Mặt Trăng tròn có biển bazan, hố va chạm, bóng ở rìa phải, dùng cho bài thiên văn.","Cần thiên thể phụ cận Trái Đất ở cùng tỉ lệ phóng to đường kính 0,27."],
  "avoidWhen": ["Cần Mặt Trời hoặc ngôi sao phát sáng: dùng mat-troi.","Cần Trái Đất hoặc hành tinh nói chung: dùng trai-dat hoặc hanh-tinh.","Chỉ vẽ đĩa tròn, không biểu diễn các pha trăng tròn khuyết."],
  "size": { "width": 0.27, "height": 0.27 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm Mặt Trăng." },
    { "name": "limbLeft", "description": "Mép trái (hướng về Mặt Trời)." },
    { "name": "tycho", "description": "Hố va chạm lớn có tia sáng ở phía dưới." }
  ],
  "notes": "Hình sơ đồ bán kính vẽ 0,13 m (thực 1 737 km). Các biển tối (Mare Imbrium, Serenitatis, Tranquillitatis, Nubium) và hố va chạm vẽ theo mặt nhìn thấy từ Trái Đất. Phần rìa phải hơi tối vì ánh sáng chiếu từ bên trái. fill là màu bề mặt sáng."
}
*/
const makeMoon = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.13;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const group = new Konva.Group({ x: p.x, y: p.y });

  group.add(new Konva.Circle({ radius: m(R), fillRadialGradientStartPoint: { x: m(-0.04), y: m(-0.04) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "#fafafa", 0.55, fill, 1, "#52525b"], stroke: "#3f3f46", strokeWidth: lw, shadowColor: "#e5e7eb", shadowBlur: m(0.03), shadowOpacity: 0.45, listening: false }));
  // Biển bazan tối: các vết bầu dục không đều.
  for (const [x, y, w, h, r] of [[-0.035, -0.055, 0.04, 0.03, -20], [0.015, -0.03, 0.03, 0.026, 10], [0.05, 0.0, 0.032, 0.035, 30], [-0.055, 0.015, 0.03, 0.04, 0], [-0.0, 0.045, 0.03, 0.022, 15]] as [number, number, number, number, number][]) {
    group.add(new Konva.Ellipse({ x: m(x), y: m(y), radiusX: m(w), radiusY: m(h), rotation: r, fill: "rgba(82,82,91,0.55)", listening: false }));
    group.add(new Konva.Ellipse({ x: m(x + 0.004), y: m(y + 0.004), radiusX: m(w * 0.6), radiusY: m(h * 0.6), rotation: r, fill: "rgba(63,63,70,0.35)", listening: false }));
  }
  // Hố va chạm: vành sáng ở phía nguồn sáng, đáy tối, và tia sáng toả ra từ hố lớn.
  const crater = (x: number, y: number, r: number) => {
    group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fillRadialGradientStartPoint: { x: m(r * 0.4), y: m(r * 0.4) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "rgba(113,113,122,0.8)", 1, "rgba(212,212,216,0.2)"], stroke: "rgba(39,39,42,0.6)", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Arc({ x: m(x), y: m(y), innerRadius: m(r * 0.88), outerRadius: m(r * 1.02), angle: 120, rotation: 150, fill: "rgba(255,255,255,0.6)", listening: false }));
  };
  for (const [x, y, r] of [[-0.075, -0.08, 0.009], [0.07, -0.07, 0.012], [0.09, 0.045, 0.008], [-0.095, 0.05, 0.011], [-0.02, 0.085, 0.007], [0.035, 0.085, 0.0095], [0.0, -0.1, 0.006], [-0.03, -0.01, 0.005]] as [number, number, number][]) crater(x, y, r);
  const tx = 0.01;
  const ty = 0.1;
  for (let i = 0; i < 10; i += 1) {
    const a = (i * Math.PI) / 5 + 0.3;
    group.add(new Konva.Line({ points: [m(tx), m(ty), m(tx + 0.07 * Math.cos(a)), m(ty + 0.05 * Math.sin(a))], stroke: "rgba(255,255,255,0.38)", strokeWidth: lw * 0.8, listening: false }));
  }
  crater(tx, ty, 0.012);
  // Bóng ở rìa phải (ánh sáng từ trái).
  group.add(new Konva.Circle({ radius: m(R), fillLinearGradientStartPoint: { x: m(-R), y: 0 }, fillLinearGradientEndPoint: { x: m(R), y: 0 }, fillLinearGradientColorStops: [0, "rgba(255,255,255,0.1)", 0.55, "rgba(0,0,0,0)", 1, "rgba(9,9,11,0.6)"], listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(R + 0.012), width: m(0.2), align: "center", text: label, fontSize: m(0.016), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, limbLeft: { x: m(-R), y: 0 }, tycho: { x: m(tx), y: m(ty) } } };
};
