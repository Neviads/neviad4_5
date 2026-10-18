/* OBJECT-META
{
  "catalog": "Nam châm thẳng (N đỏ, S xanh)",
  "title": "Nam châm thanh thẳng sơn hai màu: nửa đỏ cực Bắc (N) bên phải, nửa xanh cực Nam (S) bên trái, mép vát và vạch phân cách ở giữa",
  "fill": "#dc2626",
  "anchor": "Tâm nam châm, giữa hai cực.",
  "useWhen": ["Cần nam châm thanh thẳng hai màu, đỏ N bên phải, xanh S bên trái, kích thước nhỏ 0,102 m.","Cần nam châm vĩnh cửu đơn giản có vạch ngăn giữa hai cực."],
  "avoidWhen": ["Cần nam châm chữ U có khe giữa hai cực: dùng nam-cham-chu-u.","Cần nam châm điện bật tắt: dùng nam-cham-dien-giu-bi.","Cần ảnh đường sức mạt sắt: dùng mat-sat. Nam châm này không vẽ từ phổ."],
  "size": { "width": 0.102, "height": 0.023 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm nam châm." },
    { "name": "north", "description": "Giữa mặt đầu cực Bắc (N, bên phải)." },
    { "name": "south", "description": "Giữa mặt đầu cực Nam (S, bên trái)." }
  ],
  "notes": "Thanh dài 0,1 m, tiết diện 0,02 m × 0,02 m; từ trường mạnh nhất ở hai đầu. Đường sức đi ra từ cực N (đỏ, phải) và đi vào cực S (xanh, trái); các đường sức do cảnh vẽ. fill là màu nửa cực Bắc."
}
*/
const makeBarMagnet = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const L = 0.1;
  const H = 0.02;

  group.add(new Konva.Rect({ x: m(-L / 2 + 0.002), y: m(-H / 2 + 0.003), width: m(L), height: m(H), cornerRadius: m(0.002), fill: "rgba(0,0,0,0.4)", shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(-L / 2), y: m(-H / 2), width: m(L / 2), height: m(H), cornerRadius: [m(0.002), 0, 0, m(0.002)], ...lin(0, 0, 0, m(H), [0, "#bfdbfe", 0.3, "#2563eb", 1, "#172554"]), stroke: "#172554", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: 0, y: m(-H / 2), width: m(L / 2), height: m(H), cornerRadius: [0, m(0.002), m(0.002), 0], ...lin(0, 0, 0, m(H), [0, "#fecaca", 0.3, fill, 1, "#450a0a"]), stroke: "#450a0a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: [m(-L / 2 + 0.003), m(-H / 2 + 0.0022), m(L / 2 - 0.003), m(-H / 2 + 0.0022)], stroke: "rgba(255,255,255,0.6)", strokeWidth: lw * 1.4, lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(-L / 2 + 0.003), m(H / 2 - 0.0016), m(L / 2 - 0.003), m(H / 2 - 0.0016)], stroke: "rgba(0,0,0,0.3)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [0, m(-H / 2), 0, m(H / 2)], stroke: "rgba(15,23,42,0.5)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Text({ x: m(-L / 2), y: m(-0.0063), width: m(L / 2), align: "center", text: "S", fontSize: m(0.0125), fontStyle: "bold", fill: "#f8fafc", listening: false }));
  group.add(new Konva.Text({ x: 0, y: m(-0.0063), width: m(L / 2), align: "center", text: "N", fontSize: m(0.0125), fontStyle: "bold", fill: "#f8fafc", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.014), width: m(0.12), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, north: { x: m(L / 2), y: 0 }, south: { x: m(-L / 2), y: 0 } } };
};
