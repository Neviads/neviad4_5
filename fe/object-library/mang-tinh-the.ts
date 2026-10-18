/* OBJECT-META
{
  "catalog": "Mạng tinh thể (ô mạng)",
  "title": "Ô mạng tinh thể lập phương tâm mặt phóng to: các nút cầu bóng nối bằng liên kết, khung lập phương và lò xo biểu diễn dao động nhỏ",
  "fill": "#60a5fa",
  "anchor": "Tâm ô mạng.",
  "useWhen": ["Cần ô mạng lập phương tâm mặt phóng to với nút cầu nối liên kết, cho cấu trúc chất rắn tinh thể.","Cần minh hoạ dao động nhỏ của nút mạng quanh vị trí cân bằng bằng lò xo."],
  "avoidWhen": ["Cần phân tử riêng lẻ hoặc chất khí hỗn loạn: dùng phan-tu-khi hoặc phan-tu-nuoc.","Cần mô hình nguyên tử có hạt nhân và electron: dùng nguyen-tu-bohr.","Chỉ là một ô cơ sở, không phải khối tinh thể lớn."],
  "size": { "width": 0.1, "height": 0.1 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm ô mạng." },
    { "name": "cornerTL", "description": "Nút ở góc trên trái của mặt trước." },
    { "name": "cornerBR", "description": "Nút ở góc dưới phải của mặt trước." }
  ],
  "notes": "Mô hình minh hoạ, phóng to hàng tỉ lần: ô lập phương cạnh 0,08 m, các nút (ion) bán kính 0,0085 m xếp ở 8 đỉnh và 6 tâm mặt, nhìn hơi nghiêng để thấy chiều sâu. Các nút dao động nhỏ quanh vị trí cân bằng. fill là màu nút."
}
*/
const makeCrystalLattice = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const S = 0.08;
  const dx = 0.014;
  const dy = -0.012;
  const R = 0.0085;
  const pt = (x: number, y: number, z: number) => ({ x: (x - 0.5) * S + (z - 0.5) * dx, y: (y - 0.5) * S + (z - 0.5) * dy });
  type P3 = [number, number, number];
  const corners: P3[] = [];
  for (const z of [1, 0]) for (const y of [0, 1]) for (const x of [0, 1]) corners.push([x, y, z]);
  const faces: P3[] = [[0.5, 0.5, 0], [0.5, 0.5, 1], [0, 0.5, 0.5], [1, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 1, 0.5]];
  const nodes = [...corners, ...faces].sort((a, b) => b[2] - a[2]);
  const edge = (a: P3, b: P3, c: string, w: number) => {
    const A = pt(...a);
    const B = pt(...b);
    group.add(new Konva.Line({ points: [m(A.x), m(A.y), m(B.x), m(B.y)], stroke: c, strokeWidth: w, lineCap: "round", listening: false }));
  };
  // Cạnh khối lập phương: mặt sau mờ, mặt trước sáng.
  for (const z of [1, 0]) {
    const c = z === 1 ? "rgba(148,163,184,0.45)" : "rgba(226,232,240,0.9)";
    edge([0, 0, z], [1, 0, z], c, lw * 1.2);
    edge([1, 0, z], [1, 1, z], c, lw * 1.2);
    edge([1, 1, z], [0, 1, z], c, lw * 1.2);
    edge([0, 1, z], [0, 0, z], c, lw * 1.2);
  }
  for (const x of [0, 1]) for (const y of [0, 1]) edge([x, y, 0], [x, y, 1], "rgba(203,213,225,0.7)", lw * 1.2);
  // Liên kết từ nút tâm mặt tới bốn đỉnh của mặt (lò xo mảnh).
  for (const f of faces) for (const c of corners) {
    const d = Math.abs(f[0] - c[0]) + Math.abs(f[1] - c[1]) + Math.abs(f[2] - c[2]);
    if (d === 1) edge(f, c, "rgba(125,211,252,0.5)", lw * 0.8);
  }
  for (const n of nodes) {
    const q = pt(...n);
    const depth = 1 - n[2];
    const r = R * (0.88 + 0.12 * depth);
    group.add(new Konva.Circle({ x: m(q.x + 0.0012), y: m(q.y + 0.0016), radius: m(r), fill: "rgba(0,0,0,0.3)", listening: false }));
    group.add(new Konva.Circle({ x: m(q.x), y: m(q.y), radius: m(r), fillRadialGradientStartPoint: { x: m(-r * 0.35), y: m(-r * 0.4) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#ffffff", 0.3, fill, 1, "#1e3a8a"], stroke: "#1e3a8a", strokeWidth: lw * 0.7, listening: false }));
    group.add(new Konva.Text({ x: m(q.x - r * 0.5), y: m(q.y - r * 0.5), width: m(r), align: "center", text: "+", fontSize: m(r * 1.1), fontStyle: "bold", fill: "rgba(255,255,255,0.9)", listening: false }));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.056), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  const tl = pt(0, 0, 0);
  const br = pt(1, 1, 0);
  return { group, parts: {}, points: { center: { x: 0, y: 0 }, cornerTL: { x: m(tl.x), y: m(tl.y) }, cornerBR: { x: m(br.x), y: m(br.y) } } };
};
