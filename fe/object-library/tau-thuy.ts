/* OBJECT-META
{
  "catalog": "Thuyền / tàu thuỷ",
  "title": "Tàu hàng nhỏ nhìn ngang: thân tàu sơn đỏ – đen có vạch mớn nước, boong, nhà lái và ống khói, cột đèn, neo và tay vịn",
  "fill": "#b91c1c",
  "anchor": "Giữa đáy thân tàu (sống tàu).",
  "useWhen": ["Cần tàu hàng nhỏ nhìn ngang, thân đỏ–đen, có vạch mớn nước, mũi tàu hướng phải, cho bài lực đẩy Archimedes.","Cần cảnh vật nổi, phần thân chìm 1,8 m."],
  "avoidWhen": ["Cần phao nhỏ dao động trên sóng: dùng phao.","Cần khinh khí cầu hay máy bay: dùng khinh-khi-cau, may-bay."],
  "size": { "width": 18.5, "height": 8.4 },
  "parts": [],
  "points": [
    { "name": "keel", "description": "Giữa đáy thân (sống tàu)." },
    { "name": "waterline", "description": "Giữa thân ở mức đường nước khi tàu mang tải bình thường." },
    { "name": "bridge", "description": "Giữa nhà lái." },
    { "name": "bow", "description": "Mũi tàu ở độ cao boong." }
  ],
  "notes": "Tàu dài 18 m, rộng 4,5 m, cao 8,4 m tính cả ống khói, mớn nước 1,8 m; mũi tàu hướng sang phải. Vạch mớn nước và đường nước chỉ phần chìm; ở trạng thái nổi trọng lượng cân bằng với lực đẩy Archimedes của phần thân chìm. fill là màu sơn thân phía trên đường nước."
}
*/
const makeShip = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.04));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const pts = (a: number[]) => a.map(m);
  const DECK = -3.0;

  // Thân tàu: phần chìm (sơn đỏ chống hà) dưới vạch nước và phần mạn khô đen/đỏ trên cao.
  group.add(new Konva.Line({ points: pts([-9, -2.2, -8.6, -0.5, -7, -0.05, 6.5, -0.05, 8.3, -0.6, 9.2, -2.2, 9.25, -3.0, -9.0, -3.0]), closed: true, tension: 0.05, ...lin(0, m(-3), 0, 0, [0, "#1c1917", 0.4, "#292524", 0.6, fill, 1, "#450a0a"]), stroke: "#0c0a09", strokeWidth: lw, lineJoin: "round", shadowColor: "#000", shadowBlur: m(0.15), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Line({ points: pts([-9, -1.8, 9.2, -1.8]), stroke: "#fef3c7", strokeWidth: m(0.1), listening: false }));
  group.add(new Konva.Line({ points: pts([-8.8, -2.5, 9.2, -2.5]), stroke: "#fbbf24", strokeWidth: m(0.06), listening: false }));
  for (let i = 0; i < 6; i += 1) group.add(new Konva.Ellipse({ x: m(-6 + i * 2.5), y: m(-2.2), radiusX: m(0.1), radiusY: m(0.1), fill: "#0b1220", stroke: "#e2e8f0", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Text({ x: m(-8.2), y: m(-2.0), width: m(3.2), text: "VẠCH MỚN NƯỚC", fontSize: m(0.2), fill: "rgba(254,243,199,0.75)", listening: false }));
  for (let i = 0; i < 6; i += 1) {
    group.add(new Konva.Line({ points: pts([8.6, -0.4 - i * 0.28, 8.8, -0.4 - i * 0.28]), stroke: "#f8fafc", strokeWidth: lw * 0.5, listening: false }));
    group.add(new Konva.Text({ x: m(8.85), y: m(-0.5 - i * 0.28), text: String(i), fontSize: m(0.17), fill: "#f8fafc", listening: false }));
  }
  // Boong gỗ, lan can và hàng ván.
  group.add(new Konva.Rect({ x: m(-9.0), y: m(DECK - 0.1), width: m(18.25), height: m(0.18), ...lin(0, 0, 0, m(0.18), [0, "#d6a15a", 1, "#78350f"]), stroke: "#451a03", strokeWidth: lw * 0.6, listening: false }));
  for (let i = 0; i < 24; i += 1) group.add(new Konva.Line({ points: pts([-8.8 + i * 0.76, DECK - 0.1, -8.8 + i * 0.76, DECK + 0.08]), stroke: "rgba(60,30,10,0.5)", strokeWidth: lw * 0.4, listening: false }));
  group.add(new Konva.Line({ points: pts([-8.8, DECK - 0.5, 8.9, DECK - 0.5]), stroke: "#e2e8f0", strokeWidth: lw * 0.5, listening: false }));
  for (let i = 0; i < 22; i += 1) group.add(new Konva.Line({ points: pts([-8.8 + i * 0.8, DECK - 0.1, -8.8 + i * 0.8, DECK - 0.5]), stroke: "#e2e8f0", strokeWidth: lw * 0.5, listening: false }));

  // Nhà lái hai tầng, các ô cửa sổ, cột ra-đa và cột cờ.
  group.add(new Konva.Rect({ x: m(-5.8), y: m(DECK - 2.0), width: m(5.0), height: m(1.9), cornerRadius: m(0.05), ...lin(0, 0, 0, m(1.9), [0, "#ffffff", 0.5, "#e2e8f0", 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-5.3), y: m(DECK - 3.2), width: m(3.6), height: m(1.2), cornerRadius: m(0.05), ...lin(0, 0, 0, m(1.2), [0, "#ffffff", 0.5, "#e2e8f0", 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 4; i += 1) group.add(new Konva.Rect({ x: m(-5.1 + i * 0.85), y: m(DECK - 3.0), width: m(0.62), height: m(0.65), ...lin(0, 0, 0, m(0.65), [0, "#bae6fd", 1, "#0c4a6e"]), stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));
  for (let i = 0; i < 5; i += 1) group.add(new Konva.Circle({ x: m(-5.3 + i * 1.0), y: m(DECK - 1.2), radius: m(0.2), fill: "#0b1220", stroke: "#cbd5e1", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Line({ points: pts([-3.4, DECK - 3.2, -3.4, DECK - 4.4]), stroke: "#94a3b8", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Ellipse({ x: m(-3.4), y: m(DECK - 4.5), radiusX: m(0.35), radiusY: m(0.08), fill: "#475569", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Line({ points: pts([-2.4, DECK - 3.2, -2.4, DECK - 4.6]), stroke: "#cbd5e1", strokeWidth: lw * 0.5, listening: false }));
  group.add(new Konva.Line({ points: pts([-2.4, DECK - 4.6, -1.6, DECK - 4.45, -2.4, DECK - 4.3]), closed: true, fill: "#dc2626", listening: false }));
  // Ống khói, miệng đen và băng vàng.
  group.add(new Konva.Rect({ x: m(-1.4), y: m(DECK - 3.4), width: m(1.0), height: m(2.0), cornerRadius: m(0.08), ...lin(0, 0, m(1.0), 0, [0, "#7f1d1d", 0.4, "#ef4444", 1, "#450a0a"]), stroke: "#1c0505", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-1.4), y: m(DECK - 2.2), width: m(1.0), height: m(0.28), fill: "#fde047", listening: false }));
  group.add(new Konva.Rect({ x: m(-1.45), y: m(DECK - 3.5), width: m(1.1), height: m(0.18), fill: "#0b1220", listening: false }));
  // Hai cột cẩu, cuộn dây và neo ở mũi.
  group.add(new Konva.Line({ points: pts([2.2, DECK - 0.1, 2.2, DECK - 3.0, 4.6, DECK - 0.1]), stroke: "#cbd5e1", strokeWidth: lw * 0.8, lineJoin: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(5.1), y: m(DECK - 0.8), width: m(1.6), height: m(0.7), cornerRadius: m(0.06), ...lin(0, 0, 0, m(0.7), [0, "#fb923c", 1, "#9a3412"]), stroke: "#431407", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Circle({ x: m(8.7), y: m(-2.35), radius: m(0.28), stroke: "#e2e8f0", strokeWidth: lw * 0.9, listening: false }));
  group.add(new Konva.Line({ points: pts([8.7, -2.07, 8.7, -1.6, 8.5, -1.45, 8.9, -1.45]), stroke: "#e2e8f0", strokeWidth: lw * 0.9, lineJoin: "round", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-4), y: m(0.5), width: m(8), align: "center", text: label, fontSize: m(0.5), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { keel: { x: 0, y: 0 }, waterline: { x: 0, y: m(-1.8) }, bridge: { x: m(-3.5), y: m(DECK - 1.3) }, bow: { x: m(9.2), y: m(DECK) } } };
};
