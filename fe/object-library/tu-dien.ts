/* OBJECT-META
{
  "catalog": "Tụ điện (thực tế, tụ phẳng)",
  "title": "Tụ phẳng dùng trong phòng thí nghiệm: hai bản kim loại tròn đặt song song trên hai giá cách điện, bản phải dịch được trên thanh ray, có hai đầu nối",
  "fill": "#cbd5e1",
  "anchor": "Giữa khe giữa hai bản khi bản phải ở vị trí nghỉ, ngang tâm bản.",
  "useWhen": ["Cần tụ phẳng có hai bản tròn song song, bản phải dịch được 0–0,05 m để đổi khoảng cách d.","Cần hai đầu nối ở hai bản để mắc nguồn hay đo hiệu điện thế khi khảo sát C = ε₀S/d."],
  "avoidWhen": ["Cần ký hiệu tụ điện trong sơ đồ mạch: dùng vật ký hiệu khác, đây là tụ thực tế nhìn từ cạnh.","Cần điện nghiệm đo hiệu điện thế giữa hai bản: dùng dien-nghiem.","Chỉ dịch bản phải theo trục ngang, bản trái cố định, không có chất điện môi chèn vào."],
  "size": { "width": 0.168, "height": 0.162 },
  "parts": [
    { "name": "plate", "label": "Bản tụ phải", "motion": "slide", "axis": "right", "min": 0, "max": 0.05, "description": "Độ dịch bản tụ bên phải ra xa bản trái, mét; khoảng cách giữa hai bản là 0,02 m + giá trị này." }
  ],
  "points": [
    { "name": "gap", "description": "Giữa khe giữa hai bản ở vị trí nghỉ, ngang tâm bản." },
    { "name": "leftTerminal", "description": "Đầu nối của bản trái." },
    { "name": "rightTerminal", "description": "Đầu nối của bản phải (đi theo bản khi dịch)." },
    { "name": "base", "description": "Giữa đáy giá." }
  ],
  "notes": "Hai bản đĩa tròn đường kính 0,1 m, dày 0,008 m, nhìn từ cạnh; khoảng cách ban đầu d = 0,02 m, dịch bản phải thêm 0–0,05 m. Điện dung C = ε₀S/d nên giảm khi d tăng. Thanh ray đỡ bản phải và bản phải có đầu nối lệch lên trên. fill là màu kim loại bản."
}
*/
const makeParallelPlateCapacitor = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const PH = 0.1;
  const PT = 0.008;
  const GAP = 0.02;
  const LX = -GAP / 2 - PT;
  const RX = GAP / 2;
  const baseY = 0.067;

  // Thanh ray đế (tối) và đế nhựa dưới hai giá, giá bản trái cố định.
  group.add(new Konva.Rect({ x: m(-0.075), y: m(baseY - 0.012), width: m(0.15), height: m(0.012), cornerRadius: m(0.003), ...lin(0, m(baseY - 0.012), 0, m(baseY), [0, "#6b7280", 0.3, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0105), y: m(baseY - 0.0155), width: m(0.145 - 0.07), height: m(0.0032), cornerRadius: m(0.001), ...lin(0, m(baseY - 0.0155), 0, m(baseY - 0.0123), steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  for (let i = 0; i < 12; i += 1) group.add(ln([-0.0105 + i * 0.0063, baseY - 0.0152, -0.0105 + i * 0.0063, baseY - 0.0125], "rgba(15,23,42,0.5)", lw * 0.7));
  // Giá bản trái: trụ ebonit cách điện từ đế lên bản.
  group.add(new Konva.Rect({ x: m(LX + PT / 2 - 0.0075), y: m(PH / 2 - 0.002), width: m(0.015), height: m(baseY - 0.012 - PH / 2 + 0.002), ...lin(m(LX + PT / 2 - 0.0075), 0, m(LX + PT / 2 + 0.0075), 0, [0, "#030712", 0.3, "#6b7280", 0.55, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.8, listening: false }));
  for (let i = 0; i < 4; i += 1) group.add(ln([LX + PT / 2 - 0.0075, 0.06 + i * 0.0045 - 0.0, LX + PT / 2 + 0.0075, 0.06 + i * 0.0045], "rgba(255,255,255,0.14)", lw));

  // Bản trái: đĩa kim loại nhìn từ cạnh, đầu nối đồng đỏ ở cạnh trên.
  group.add(new Konva.Rect({ x: m(LX), y: m(-PH / 2), width: m(PT), height: m(PH), cornerRadius: m(0.0014), ...lin(m(LX), 0, m(LX + PT), 0, [0, "#64748b", 0.3, "#ffffff", 0.7, fill, 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, listening: false }));
  group.add(ln([LX + 0.0008, -PH / 2 + 0.003, LX + 0.0008, PH / 2 - 0.003], "rgba(255,255,255,0.7)", lw * 1.1));
  group.add(new Konva.Rect({ x: m(LX + PT / 2 - 0.0035), y: m(-PH / 2 - 0.0085), width: m(0.007), height: m(0.0095), cornerRadius: m(0.0012), ...lin(m(LX), 0, m(LX + PT), 0, [0, "#fdba74", 0.5, "#b45309", 1, "#431407"]), stroke: "#431407", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Circle({ x: m(LX + PT / 2), y: m(-PH / 2 - 0.0105), radius: m(0.0034), fill: "#b45309", stroke: "#431407", strokeWidth: lw * 0.7, listening: false }));

  // BỘ PHẬN TRƯỢT: bản phải với trụ ebonit, trượt dọc theo ray. Gốc nhóm ở vị trí nghỉ.
  const plate = new Konva.Group();
  plate.add(new Konva.Rect({ x: m(RX + PT / 2 - 0.0075), y: m(PH / 2 - 0.002), width: m(0.015), height: m(baseY - 0.012 - PH / 2 + 0.002), ...lin(m(RX + PT / 2 - 0.0075), 0, m(RX + PT / 2 + 0.0075), 0, [0, "#030712", 0.3, "#6b7280", 0.55, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.8, listening: false }));
  plate.add(new Konva.Rect({ x: m(RX - 0.008), y: m(baseY - 0.0185), width: m(0.02), height: m(0.008), cornerRadius: m(0.002), ...lin(0, m(baseY - 0.0185), 0, m(baseY - 0.0105), [0, "#9ca3af", 0.4, "#374151", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.8, listening: false }));
  for (let i = 0; i < 4; i += 1) plate.add(ln([RX + PT / 2 - 0.0075, 0.06 + i * 0.0045, RX + PT / 2 + 0.0075, 0.06 + i * 0.0045], "rgba(255,255,255,0.14)", lw));
  plate.add(new Konva.Rect({ x: m(RX), y: m(-PH / 2), width: m(PT), height: m(PH), cornerRadius: m(0.0014), ...lin(m(RX), 0, m(RX + PT), 0, [0, "#64748b", 0.3, "#ffffff", 0.7, fill, 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, listening: false }));
  plate.add(ln([RX + 0.0008, -PH / 2 + 0.003, RX + 0.0008, PH / 2 - 0.003], "rgba(255,255,255,0.7)", lw * 1.1));
  plate.add(new Konva.Rect({ x: m(RX + PT / 2 - 0.0035), y: m(-PH / 2 - 0.0085), width: m(0.007), height: m(0.0095), cornerRadius: m(0.0012), ...lin(m(RX), 0, m(RX + PT), 0, [0, "#fdba74", 0.5, "#b45309", 1, "#431407"]), stroke: "#431407", strokeWidth: lw * 0.7, listening: false }));
  plate.add(new Konva.Circle({ x: m(RX + PT / 2), y: m(-PH / 2 - 0.0105), radius: m(0.0034), fill: "#b45309", stroke: "#431407", strokeWidth: lw * 0.7, listening: false }));
  group.add(plate);

  // Chỉ thị: khoảng cách giữa hai bản d.
  group.add(new Konva.Arrow({ points: [m(LX + PT + 0.0005), m(-PH / 2 - 0.0215), m(RX - 0.0005), m(-PH / 2 - 0.0215)], stroke: "#fbbf24", fill: "#fbbf24", strokeWidth: lw, pointerLength: m(0.0035), pointerWidth: m(0.003), pointerAtBeginning: true, listening: false }));
  group.add(new Konva.Text({ x: m(-0.006), y: m(-PH / 2 - 0.0345), width: m(0.012), align: "center", text: "d", fontSize: m(0.0085), fontStyle: "italic bold", fill: "#fbbf24", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.09), y: m(baseY + 0.006), width: m(0.18), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { plate: { node: plate, motion: "slide" as const, axis: "right" as const, min: 0, max: 0.05 } },
    points: { gap: { x: 0, y: 0 }, leftTerminal: { x: m(LX + PT / 2), y: m(-PH / 2 - 0.0105) }, rightTerminal: { x: m(RX + PT / 2), y: m(-PH / 2 - 0.0105) }, base: { x: 0, y: m(baseY) } },
  };
};
