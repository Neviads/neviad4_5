/* OBJECT-META
{
  "catalog": "Cây, đồi, mặt đường (nền phong cảnh)",
  "title": "Nền phong cảnh ngoài trời: mặt đường nhựa có vạch trắng và lề cỏ, đồi xanh nhiều lớp phía sau, các cây tán tròn và cây thông, vài bụi cây",
  "fill": "#16a34a",
  "anchor": "Giữa mép dưới mặt đường (đầu dưới mặt cắt).",
  "useWhen": ["Cần phông nền ngoài trời gồm mặt đường nhựa, đồi và cây phía sau vật chuyển động.","Cần mặt đường nằm ngang rộng 40 m với bề mặt y = -0,4 m cho xe chạy."],
  "avoidWhen": ["Cần mặt bàn hay sàn phòng thí nghiệm: dùng ban-thi-nghiem.","Cần tường cứng hoặc toà nhà làm mốc: dùng tuong hoặc toa-nha; vật này không có mặt phẳng nghiêng hay dốc."],
  "size": { "width": 40.0, "height": 9.0 },
  "parts": [],
  "points": [
    { "name": "roadCenter", "description": "Giữa mép dưới mặt đường." },
    { "name": "roadSurface", "description": "Giữa bề mặt đường, nơi vật chuyển động trên đường đứng." },
    { "name": "hillTop", "description": "Đỉnh đồi cao nhất." },
    { "name": "treeBase", "description": "Chân cây lớn bên trái." }
  ],
  "notes": "Dải phong cảnh rộng 40 m, cao 9 m: mặt đường nhựa dày 0,4 m ở đáy, phía sau là hai lớp đồi và đồng cỏ, rồi các cây dọc đường. Đặt phía sau các vật chuyển động để tạo bối cảnh. Mặt trên của đường là mặt phẳng ngang y = −0,4 m. fill là màu cỏ."
}
*/
const makeLandscape = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.06));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const HW = 20;
  const pts = (a: number[]) => a.map(m);

  // Hai lớp đồi: lớp xa mờ xanh lam, lớp gần xanh lục sáng với gạch cỏ.
  group.add(new Konva.Line({ points: pts([-HW, -1.5, -14, -4.5, -8, -7.5, -2, -8.7, 6, -7.6, 12, -5, 20, -6.5, HW, -1.5]), closed: true, tension: 0.4, ...lin(0, m(-8.7), 0, m(-1.5), [0, "#93c5fd", 1, "#3b82f6"]), opacity: 0.6, listening: false }));
  group.add(new Konva.Line({ points: pts([-HW, -1.5, -15, -3.4, -9, -5.4, -4, -5.8, 2, -4.6, 8, -3.2, 14, -3.6, 20, -2.6, HW, -1.5]), closed: true, tension: 0.45, ...lin(0, m(-5.8), 0, m(-1.5), [0, "#86efac", 0.5, fill, 1, "#14532d"]), stroke: "#14532d", strokeWidth: lw * 0.7, listening: false }));
  for (let i = 0; i < 40; i += 1) group.add(new Konva.Line({ points: pts([-19 + i, -1.8, -18.9 + i, -2.0 - (i % 4) * 0.4]), stroke: "rgba(21,128,61,0.55)", strokeWidth: lw * 0.5, listening: false }));

  // Cây tán tròn (thân nâu, ba mảng tán) và cây thông (ba tầng tam giác).
  const roundTree = (x: number, s: number, c1: string) => {
    group.add(new Konva.Rect({ x: m(x - 0.18 * s), y: m(-2.6 * s - 1.5), width: m(0.36 * s), height: m(2.6 * s), ...lin(0, 0, m(0.36 * s), 0, [0, "#92400e", 1, "#451a03"]), stroke: "#2a0a02", strokeWidth: lw * 0.5, listening: false }));
    for (const [dx, dy, r] of [[-0.8, -2.6, 1.2], [0.8, -2.5, 1.1], [0, -3.7, 1.5]] as [number, number, number][]) group.add(new Konva.Circle({ x: m(x + dx * s), y: m(dy * s - 1.5), radius: m(r * s), fillRadialGradientStartPoint: { x: m(-0.4 * r * s), y: m(-0.4 * r * s) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r * s), fillRadialGradientColorStops: [0, "#bbf7d0", 0.5, c1, 1, "#052e16"], stroke: "#052e16", strokeWidth: lw * 0.5, listening: false }));
  };
  const pine = (x: number, s: number) => {
    group.add(new Konva.Rect({ x: m(x - 0.15 * s), y: m(-1.5 - 0.7 * s), width: m(0.3 * s), height: m(0.7 * s), fill: "#78350f", listening: false }));
    for (let i = 0; i < 3; i += 1) group.add(new Konva.Line({ points: pts([x - (1.3 - i * 0.28) * s, -1.5 - (0.7 + i * 1.05) * s, x, -1.5 - (2.2 + i * 1.05) * s, x + (1.3 - i * 0.28) * s, -1.5 - (0.7 + i * 1.05) * s]), closed: true, ...lin(m(x - 1.3), 0, m(x + 1.3), 0, [0, "#4ade80", 0.5, "#15803d", 1, "#052e16"]), stroke: "#052e16", strokeWidth: lw * 0.5, lineJoin: "round", listening: false }));
  };
  roundTree(-14, 1.0, "#22c55e");
  pine(-9.5, 0.85);
  roundTree(-4, 0.7, "#16a34a");
  pine(6.5, 1.0);
  roundTree(12, 1.25, "#4ade80");
  pine(16.5, 0.8);
  for (const [x, r] of [[-17, 0.7], [1.5, 0.55], [9, 0.65], [19, 0.6]] as [number, number][]) {
    group.add(new Konva.Circle({ x: m(x), y: m(-1.5 - r * 0.5), radius: m(r), ...lin(0, 0, 0, m(r * 2), [0, "#86efac", 1, "#14532d"]), stroke: "#052e16", strokeWidth: lw * 0.5, listening: false }));
    group.add(new Konva.Circle({ x: m(x + r * 0.9), y: m(-1.5 - r * 0.3), radius: m(r * 0.7), fill: "#22c55e", stroke: "#052e16", strokeWidth: lw * 0.5, listening: false }));
  }

  // Lề cỏ rồi mặt đường: nhựa tối với vạch phân làn trắng đứt đoạn, vạch mép, và các vết nhựa.
  group.add(new Konva.Rect({ x: m(-HW), y: m(-1.5), width: m(HW * 2), height: m(1.1), ...lin(0, 0, 0, m(1.1), [0, fill, 1, "#14532d"]), listening: false }));
  group.add(new Konva.Rect({ x: m(-HW), y: m(-0.4), width: m(HW * 2), height: m(0.4), ...lin(0, 0, 0, m(0.4), [0, "#52525b", 1, "#18181b"]), stroke: "#09090b", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Line({ points: pts([-HW, -0.4, HW, -0.4]), stroke: "#f4f4f5", strokeWidth: m(0.08), listening: false }));
  for (let i = 0; i < 20; i += 1) group.add(new Konva.Rect({ x: m(-19.5 + i * 2), y: m(-0.22), width: m(1.0), height: m(0.06), fill: "#fde047", listening: false }));
  for (let i = 0; i < 10; i += 1) group.add(new Konva.Line({ points: pts([-18 + i * 4, -0.12, -17.2 + i * 4, -0.09]), stroke: "rgba(0,0,0,0.5)", strokeWidth: lw * 0.4, listening: false }));
  group.add(new Konva.Line({ points: pts([-HW, -0.02, HW, -0.02]), stroke: "#e4e4e7", strokeWidth: m(0.06), listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-6), y: m(0.3), width: m(12), align: "center", text: label, fontSize: m(0.7), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { roadCenter: { x: 0, y: 0 }, roadSurface: { x: 0, y: m(-0.4) }, hillTop: { x: m(-2), y: m(-8.7) }, treeBase: { x: m(-14), y: m(-1.5) } } };
};
