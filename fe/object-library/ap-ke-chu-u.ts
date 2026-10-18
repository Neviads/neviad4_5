/* OBJECT-META
{
  "catalog": "Áp kế chữ U (ống chất lỏng)",
  "title": "Áp kế chữ U bằng ống thuỷ tinh đựng nước màu, gắn trên bảng gỗ có thước mm hai bên, ống cao su nối bình",
  "fill": "#38bdf8",
  "anchor": "Giữa đáy chữ U (điểm thấp nhất của ống).",
  "useWhen": ["Cần ống chữ U đựng nước màu có thước mm để đọc độ chênh mực hai nhánh.","Thí nghiệm đo áp suất qua chênh lệch mực nước hai nhánh (leftLevel, rightLevel)."],
  "avoidWhen": ["Cần đồng hồ kim đo áp suất khí có số kPa: dùng ap-ke-kim.","Cần ba ống khác hình dạng nối đáy: dùng binh-thong-nhau.","Thước chỉ chạy ±8 cm quanh vạch 0, không đo chênh lệch lớn hơn."],
  "size": { "width": 0.2, "height": 0.4 },
  "parts": [
    { "name": "leftLevel", "label": "Mực nhánh trái", "motion": "slide", "axis": "up", "min": -0.08, "max": 0.08, "description": "Độ cao mặt thoáng của nhánh trái so với mức cân bằng (mét)." },
    { "name": "rightLevel", "label": "Mực nhánh phải", "motion": "slide", "axis": "up", "min": -0.08, "max": 0.08, "description": "Độ cao mặt thoáng của nhánh phải so với mức cân bằng (mét). Chênh áp = ρ·g·(rightLevel − leftLevel)." }
  ],
  "points": [
    { "name": "bottom", "description": "Giữa đáy chữ U." },
    { "name": "leftTop", "description": "Miệng nhánh trái (thông khí quyển)." },
    { "name": "rightTop", "description": "Miệng nhánh phải (nối bình qua ống cao su)." },
    { "name": "zero", "description": "Vạch 0 chung của hai thước, ngang mức cân bằng của hai mặt thoáng." }
  ],
  "notes": "Hai nhánh cách nhau 0,06 m, cao 0,3 m; mức cân bằng ở 0,16 m trên đáy. Chất lỏng là nước màu (fill); mỗi nhánh có thước mm chạy từ −8 đến +8 cm quanh vạch 0."
}
*/
const makeUManometer = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const HALF = 0.03;
  const BASE_Y = 0.04;
  const LEG_TOP = 0.34;
  const EQ = 0.2;
  const R_IN = 0.0058;
  const R_OUT = 0.0078;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0012));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const zeroY = -EQ;

  // Bảng gỗ ép sơn trắng làm nền, có chân đế.
  group.add(new Konva.Rect({ x: m(-0.098), y: m(-0.378), width: m(0.196), height: m(0.378), cornerRadius: m(0.005), ...lin(0, m(-0.378), 0, 0, [0, "#f1f5f9", 1, "#cbd5e1"]), stroke: "#64748b", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.018), shadowOpacity: 0.45, shadowOffset: { x: m(0.004), y: m(0.008) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.07), y: m(-0.008), width: m(0.14), height: m(0.008), cornerRadius: m(0.003), fill: "#475569", listening: false }));

  // Thước mm hai bên: vạch 0 chung ở mức cân bằng.
  for (const side of [-1, 1]) {
    const x = side * 0.0655;
    group.add(new Konva.Rect({ x: m(x - 0.011), y: m(zeroY - 0.09), width: m(0.022), height: m(0.18), fill: "#fefce8", stroke: "#a16207", strokeWidth: lw * 0.6, listening: false }));
    for (let mm = -80; mm <= 80; mm += 2) {
      const y = zeroY - mm / 1000;
      const cm = mm % 10 === 0;
      const half = mm % 5 === 0;
      group.add(ln([x + side * -0.011, y, x + side * -0.011 + side * (cm ? 0.0085 : half ? 0.006 : 0.0035), y], "#0f172a", cm ? lw * 1.1 : lw * 0.6));
      if (cm && mm !== 0 && mm % 20 === 0) group.add(new Konva.Text({ x: m(x - (side === -1 ? 0.0105 : -0.0015)), y: m(y - 0.0028), width: m(0.009), align: side === -1 ? "left" : "right", text: String(Math.abs(mm / 10)), fontSize: m(0.0048), fontStyle: "bold", fill: "#0f172a", listening: false }));
    }
    group.add(ln([x - 0.011, zeroY, x + 0.011, zeroY], "#dc2626", lw * 1.4));
  }

  // Hai bộ phận trượt: mực hai nhánh (nhóm rỗng mang độ cao).
  const leftLevel = new Konva.Group({ x: 0, y: 0 });
  const rightLevel = new Konva.Group({ x: 0, y: 0 });
  group.add(leftLevel, rightLevel);
  const lvl = (g: Konva.Group) => EQ + (-(g.y() || 0)) / ppm;
  const path = (ctx: Konva.Context, r: number) => {
    const L = lvl(leftLevel);
    const Rr = lvl(rightLevel);
    ctx.beginPath();
    ctx.moveTo(m(-HALF), m(-Math.max(L, BASE_Y)));
    ctx.lineTo(m(-HALF), m(-BASE_Y));
    ctx.arc(0, m(-BASE_Y), m(HALF), Math.PI, 0, true);
    ctx.lineTo(m(HALF), m(-Math.max(Rr, BASE_Y)));
    void r;
  };
  // Ống thuỷ tinh: ống ngoài trong mờ và lòng ống.
  const glass = (ctx: Konva.Context) => {
    ctx.beginPath();
    ctx.moveTo(m(-HALF), m(-LEG_TOP));
    ctx.lineTo(m(-HALF), m(-BASE_Y));
    ctx.arc(0, m(-BASE_Y), m(HALF), Math.PI, 0, true);
    ctx.lineTo(m(HALF), m(-LEG_TOP));
  };
  group.add(new Konva.Shape({ stroke: "rgba(226,240,252,0.95)", strokeWidth: m(R_OUT * 2), lineCap: "butt", lineJoin: "round", opacity: 0.55, listening: false, sceneFunc: (ctx, shape) => { glass(ctx); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Shape({ stroke: "rgba(15,23,42,0.5)", strokeWidth: m(R_IN * 2), lineCap: "butt", lineJoin: "round", listening: false, sceneFunc: (ctx, shape) => { glass(ctx); ctx.fillStrokeShape(shape); } }));
  // Chất lỏng đi dọc đường tâm ống.
  group.add(new Konva.Shape({ stroke: fill, strokeWidth: m(R_IN * 2 - 0.0008), lineCap: "butt", lineJoin: "round", listening: false, sceneFunc: (ctx, shape) => { path(ctx, 0); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Shape({ stroke: "rgba(255,255,255,0.45)", strokeWidth: m(0.0016), lineCap: "round", listening: false, sceneFunc: (ctx, shape) => { path(ctx, 0); ctx.fillStrokeShape(shape); } }));
  // Mép ống (viền thuỷ tinh) vẽ lại lên trên chất lỏng để thấy độ dày thành ống.
  for (const side of [-1, 1]) {
    group.add(ln([side * (HALF - R_OUT), -LEG_TOP, side * (HALF - R_OUT), -BASE_Y], "rgba(255,255,255,0.7)", lw * 1.2));
    group.add(ln([side * (HALF + R_OUT), -LEG_TOP, side * (HALF + R_OUT), -BASE_Y], "rgba(148,163,184,0.7)", lw));
    group.add(new Konva.Ellipse({ x: m(side * HALF), y: m(-LEG_TOP), radiusX: m(R_OUT + 0.0012), radiusY: m(0.0018), stroke: "rgba(241,245,249,0.95)", strokeWidth: lw * 1.2, listening: false }));
  }
  // Ống cao su nối nhánh phải sang một bình bên ngoài.
  group.add(new Konva.Line({ points: [m(HALF), m(-LEG_TOP + 0.002), m(HALF + 0.02), m(-LEG_TOP - 0.012), m(HALF + 0.05), m(-LEG_TOP - 0.01), m(0.098), m(-LEG_TOP + 0.04)], stroke: "#1f2937", strokeWidth: m(0.0075), lineCap: "round", tension: 0.5, listening: false }));
  group.add(new Konva.Line({ points: [m(HALF), m(-LEG_TOP + 0.002), m(HALF + 0.02), m(-LEG_TOP - 0.012), m(HALF + 0.05), m(-LEG_TOP - 0.01), m(0.098), m(-LEG_TOP + 0.04)], stroke: "rgba(255,255,255,0.18)", strokeWidth: m(0.0022), lineCap: "round", tension: 0.5, listening: false }));
  // Kẹp giữ ống vào bảng.
  for (const side of [-1, 1]) {
    for (const y of [0.1, 0.28]) group.add(new Konva.Rect({ x: m(side * HALF - 0.0095), y: m(-y), width: m(0.019), height: m(0.012), cornerRadius: m(0.002), ...lin(0, m(-y), 0, m(-y + 0.012), [0, "#94a3b8", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw * 0.7, listening: false }));
  }
  group.add(new Konva.Text({ x: m(-0.035), y: m(-0.022), width: m(0.07), align: "center", text: "Δh = ?", fontSize: m(0.0105), fontStyle: "italic", fill: "#475569", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.095), y: m(0.006), width: m(0.19), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      leftLevel: { node: leftLevel, motion: "slide" as const, axis: "up" as const, min: -0.08, max: 0.08 },
      rightLevel: { node: rightLevel, motion: "slide" as const, axis: "up" as const, min: -0.08, max: 0.08 },
    },
    points: { bottom: { x: 0, y: 0 }, leftTop: { x: m(-HALF), y: m(-LEG_TOP) }, rightTop: { x: m(HALF), y: m(-LEG_TOP) }, zero: { x: 0, y: m(zeroY) } },
  };
};
