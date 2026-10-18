/* OBJECT-META
{
  "catalog": "Phong vũ biểu / ống Torricelli",
  "title": "Ống Torricelli: ống thuỷ tinh kín đầu chứa cột thuỷ ngân, úp trong chậu thuỷ ngân, đặt cạnh thước 0–90 cm",
  "fill": "#cbd5e1",
  "anchor": "Giữa đáy chậu thuỷ ngân, chạm mặt bàn.",
  "useWhen": ["Cần thí nghiệm Torricelli: ống thuỷ tinh dài 1 m, cột thuỷ ngân úp trong chậu, thước 0–90 cm có vạch 76 cm.","Cần đo áp suất khí quyển bằng chiều cao cột thuỷ ngân."],
  "avoidWhen": ["Cần áp kế kim hoặc đồng hồ áp suất: dùng ap-ke-kim; áp kế chữ U: dùng ap-ke-chu-u.","Thước chỉ tới 90 cm; không phù hợp nếu cần đọc cột cao hơn."],
  "size": {
    "width": 0.165,
    "height": 1.06
  },
  "parts": [
    {
      "name": "column",
      "label": "Cột thuỷ ngân",
      "motion": "slide",
      "axis": "up",
      "min": 0,
      "max": 0.9,
      "description": "Độ cao đỉnh cột thuỷ ngân so với mặt thuỷ ngân trong chậu (mét); khí quyển chuẩn là 0,76 m. Phần ống phía trên cột là chân không."
    }
  ],
  "points": [
    {
      "name": "dish",
      "description": "Giữa đáy chậu."
    },
    {
      "name": "pool",
      "description": "Mặt thuỷ ngân trong chậu, nơi đo độ cao cột."
    },
    {
      "name": "tubeTop",
      "description": "Đỉnh ống thuỷ tinh (đầu kín)."
    }
  ],
  "notes": "Ống dài 1,00 m, đường kính ngoài 0,012 m; thước chạy từ mặt thuỷ ngân (0) lên 90 cm, số ghi mỗi 10 cm, vạch 76 cm có mũi tên. fill là màu thuỷ ngân (bạc)."
}
*/
const makeTorricelliTube = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const POOL = 0.045;
  const TUBE_TOP = 1.06;
  const TUBE_R = 0.0075;
  const RULER_X = 0.055;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const mercury = [0, "#475569", 0.3, "#f8fafc", 0.55, fill, 1, "#334155"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Thước gỗ có chia mm bên phải ống, vạch 0 ở mặt thuỷ ngân.
  const top = -POOL - 0.92;
  group.add(new Konva.Rect({ x: m(RULER_X - 0.012), y: m(top), width: m(0.024), height: m(0.92 + 0.02), cornerRadius: m(0.003), ...lin(m(RULER_X - 0.012), 0, m(RULER_X + 0.012), 0, [0, "#e9c796", 0.5, "#fdf0cf", 1, "#c39a5a"]), stroke: "#6b4a1e", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.3, listening: false }));
  for (let mm = 0; mm <= 900; mm += 5) {
    const y = -POOL - mm / 1000;
    const cm = mm % 100 === 0;
    const half = mm % 50 === 0;
    group.add(ln([RULER_X - 0.011, y, RULER_X - 0.011 + (cm ? 0.0095 : half ? 0.0072 : mm % 10 === 0 ? 0.0052 : 0.0032), y], "#1f1305", cm ? lw * 1.2 : lw * 0.7));
    if (cm) group.add(new Konva.Text({ x: m(RULER_X - 0.0005), y: m(y - 0.0042), text: String(mm / 10), fontSize: m(0.0078), fontStyle: "bold", fill: "#1f1305", listening: false }));
  }
  group.add(new Konva.Arrow({ points: [m(RULER_X + 0.04), m(-POOL - 0.76), m(RULER_X + 0.014), m(-POOL - 0.76)], stroke: "#fbbf24", fill: "#fbbf24", strokeWidth: lw * 1.4, pointerLength: m(0.0075), pointerWidth: m(0.0065), listening: false }));
  group.add(new Konva.Text({ x: m(RULER_X + 0.042), y: m(-POOL - 0.7645), text: "76 cm", fontSize: m(0.0085), fontStyle: "bold", fill: "#fbbf24", listening: false }));

  // Kẹp giữ ống gắn vào thước ở hai chỗ.
  for (const y of [-0.38, -0.82]) group.add(new Konva.Rect({ x: m(0.0095), y: m(y), width: m(RULER_X - 0.0095 - 0.012 + 0.002), height: m(0.012), ...lin(0, m(y), 0, m(y + 0.012), [0, "#94a3b8", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw * 0.7, listening: false }));

  // Chậu thuỷ ngân: thuỷ tinh dày, mặt thuỷ ngân ở độ cao POOL.
  group.add(new Konva.Line({ points: [m(-0.07), m(-0.0775), m(-0.062), m(-0.0075), m(-0.04), 0, m(0.04), 0, m(0.062), m(-0.0075), m(0.07), m(-0.0775)], ...lin(0, m(-0.0775), 0, 0, [0, "rgba(125,211,252,0.3)", 1, "rgba(14,116,144,0.55)"]), stroke: "rgba(226,232,240,0.95)", strokeWidth: lw * 1.4, lineJoin: "round", closed: true, tension: 0.12, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.35, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0675), m(-POOL), m(-0.0615), m(-0.009), m(-0.04), m(-0.003), m(0.04), m(-0.003), m(0.0615), m(-0.009), m(0.0675), m(-POOL)], closed: true, tension: 0.12, ...lin(m(-0.0675), 0, m(0.0675), 0, mercury), stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Ellipse({ x: 0, y: m(-POOL), radiusX: m(0.0675), radiusY: m(0.0032), fill: "rgba(248,250,252,0.85)", stroke: "#94a3b8", strokeWidth: lw * 0.6, listening: false }));
  group.add(ln([-0.045, -POOL - 0.0006, -0.025, -POOL - 0.0012], "rgba(255,255,255,0.95)", lw * 1.2));

  // BỘ PHẬN TRƯỢT: nhóm rỗng mang độ cao đỉnh cột thuỷ ngân.
  const column = new Konva.Group({ x: 0, y: 0 });
  group.add(column);
  // Ống thuỷ tinh kín đầu trên, cắm sâu xuống thuỷ ngân.
  group.add(new Konva.Rect({ x: m(-TUBE_R), y: m(-TUBE_TOP), width: m(2 * TUBE_R), height: m(TUBE_TOP - 0.012), cornerRadius: [m(TUBE_R), m(TUBE_R), 0, 0], ...lin(m(-TUBE_R), 0, m(TUBE_R), 0, [0, "rgba(186,230,253,0.5)", 0.3, "rgba(248,250,252,0.2)", 0.75, "rgba(224,242,254,0.18)", 1, "rgba(100,170,210,0.5)"]), stroke: "rgba(226,232,240,0.95)", strokeWidth: lw * 1.3, listening: false }));
  // Thuỷ ngân trong ống: từ đáy ống tới đỉnh cột.
  group.add(new Konva.Shape({
    ...lin(m(-TUBE_R), 0, m(TUBE_R), 0, mercury), fill, listening: false,
    sceneFunc: (ctx, shape) => {
      const h = Math.max(0, -(column.y() || 0) / ppm);
      const topY = -POOL - h;
      ctx.beginPath();
      ctx.moveTo(m(-TUBE_R + 0.0018), m(-0.012));
      ctx.lineTo(m(-TUBE_R + 0.0018), m(topY + 0.0012));
      ctx.quadraticCurveTo(0, m(topY - 0.0042), m(TUBE_R - 0.0018), m(topY + 0.0012));
      ctx.lineTo(m(TUBE_R - 0.0018), m(-0.012));
      ctx.closePath();
      ctx.fillStrokeShape(shape);
    },
  }));
  group.add(ln([-TUBE_R + 0.0028, -0.02, -TUBE_R + 0.0028, -TUBE_TOP + 0.01], "rgba(255,255,255,0.7)", lw * 1.5));
  group.add(new Konva.Text({ x: m(-0.07), y: m(-TUBE_TOP + 0.03), width: m(0.062), align: "right", text: "chân không", fontSize: m(0.0085), fontStyle: "italic", fill: "#94a3b8", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.006), width: m(0.14), align: "center", text: label, fontSize: m(0.014), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { column: { node: column, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.9 } },
    points: { dish: { x: 0, y: 0 }, pool: { x: 0, y: m(-POOL) }, tubeTop: { x: 0, y: m(-TUBE_TOP) } },
  };
};
