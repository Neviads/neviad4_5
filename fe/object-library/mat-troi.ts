/* OBJECT-META
{
  "catalog": "Mặt Trời",
  "title": "Mặt Trời: quả cầu plasma vàng cam có hạt granulation, vết đen, vành nhật hoa phát sáng và các tai lửa phun lên ở mép",
  "fill": "#fbbf24",
  "anchor": "Tâm Mặt Trời.",
  "useWhen": ["Cần Mặt Trời vàng cam có vết đen, nhật hoa và tai lửa, như nguồn sáng hoặc nhiệt trong bài thiên văn.","Cần ngôi sao trung tâm của hệ Mặt Trời với đường kính vẽ 0,64."],
  "avoidWhen": ["Cần Mặt Trăng: dùng mat-trang.","Cần bóng đèn hoặc nguồn sáng thí nghiệm: dùng bong-den hoặc den-chieu.","Cần hành tinh chuyển động quanh: dùng hanh-tinh hoặc trai-dat."],
  "size": { "width": 0.64, "height": 0.64 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm Mặt Trời." },
    { "name": "limbRight", "description": "Mép phải, phía hướng ra các hành tinh." },
    { "name": "sunspot", "description": "Giữa nhóm vết đen." }
  ],
  "notes": "Hình sơ đồ bán kính vẽ 0,2 m (thực 696 000 km), không đúng tỉ lệ với các thiên thể khác. Bề mặt vàng cam sáng, rìa hơi sẫm (làm tối rìa), có các vết đen, ba tai lửa và vành nhật hoa. fill là màu bề mặt."
}
*/
const makeSun = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.2;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.002));
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Nhật hoa: hai vòng toả sáng mờ và các tia dài.
  group.add(new Konva.Circle({ radius: m(R * 1.6), fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: m(R * 0.9), fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R * 1.6), fillRadialGradientColorStops: [0, "rgba(253,224,71,0.55)", 0.5, "rgba(251,146,60,0.18)", 1, "rgba(251,146,60,0)"], listening: false }));
  for (let i = 0; i < 24; i += 1) {
    const a = (i * Math.PI) / 12;
    const len = i % 2 === 0 ? 1.42 : 1.26;
    group.add(new Konva.Line({ points: [m(R * 1.02 * Math.cos(a)), m(R * 1.02 * Math.sin(a)), m(R * len * Math.cos(a)), m(R * len * Math.sin(a))], stroke: "rgba(253,224,71,0.38)", strokeWidth: m(i % 2 === 0 ? 0.008 : 0.005), lineCap: "round", listening: false }));
  }
  // Tai lửa nhật hoa (prominence): ba vòng cung đỏ cam bay lên khỏi mép.
  for (const [deg, size] of [[-35, 0.12], [38, 0.09], [150, 0.1]] as [number, number][]) {
    group.add(new Konva.Arc({ x: m(R * 1.0 * Math.cos((deg * Math.PI) / 180)), y: m(R * 1.0 * Math.sin((deg * Math.PI) / 180)), innerRadius: m(size * 0.75), outerRadius: m(size), angle: 180, rotation: deg - 90, fill: "rgba(239,68,68,0.85)", shadowColor: "#f97316", shadowBlur: m(0.025), shadowOpacity: 0.9, listening: false }));
  }

  // Cầu Mặt Trời: tâm trắng vàng, rìa cam đỏ (làm tối rìa).
  group.add(new Konva.Circle({ radius: m(R), fillRadialGradientStartPoint: { x: m(-0.03), y: m(-0.03) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "#fffbeb", 0.35, "#fde047", 0.75, fill, 1, "#ea580c"], listening: false }));
  // Hạt granulation: nhiều chấm sáng tối nhỏ phân bố đều (xác định bằng công thức).
  for (let i = 0; i < 90; i += 1) {
    const a = i * 2.399;
    const r = R * 0.93 * Math.sqrt((i + 0.5) / 90);
    group.add(new Konva.Ellipse({ x: m(r * Math.cos(a)), y: m(r * Math.sin(a)), radiusX: m(0.012), radiusY: m(0.008), rotation: (i * 37) % 180, fill: i % 3 === 0 ? "rgba(194,65,12,0.28)" : "rgba(255,255,255,0.2)", listening: false }));
  }
  // Vết đen: nhóm ba vết có bán ảnh.
  for (const [x, y, r] of [[0.07, -0.06, 0.02], [0.098, -0.045, 0.012], [0.052, -0.088, 0.01]] as [number, number, number][]) {
    group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r * 1.6), fill: "rgba(154,52,18,0.55)", listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fill: "#1c0a02", listening: false }));
  }
  group.add(new Konva.Circle({ radius: m(R), stroke: "rgba(234,88,12,0.7)", strokeWidth: lw, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.2), y: m(R * 1.45), width: m(0.4), align: "center", text: label, fontSize: m(0.03), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, limbRight: { x: m(R), y: 0 }, sunspot: { x: m(0.07), y: m(-0.06) } } };
};
