/* OBJECT-META
{
  "catalog": "Cơ cấu tay quay – con trượt",
  "title": "Cơ cấu tay quay – con trượt (bánh đà, thanh truyền, con trượt)",
  "fill": "#3b82f6",
  "anchor": "Tâm trục bánh đà (tâm tay quay).",
  "useWhen": ["Cần cơ cấu tay quay–con trượt: bánh đà, thanh truyền nối chốt tay quay với chốt con trượt, biến chuyển động quay thành tịnh tiến.","Cần đọc góc crank và vị trí slider."],
  "avoidWhen": ["Cần chỉ động cơ điện hay động cơ nhiệt đầy đủ: dùng dong-co-dien, dong-co-nhiet.","Engine phải tự tính vị trí slider theo góc tay quay, nếu không thanh truyền sai độ dài."],
  "size": { "width": 0.56, "height": 0.21 },
  "parts": [
    { "name": "crank", "label": "Góc tay quay", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của bánh đà, độ, chiều kim đồng hồ trên màn hình; 0° là chốt ở bên phải." },
    { "name": "slider", "label": "Con trượt lùi", "motion": "slide", "axis": "left", "min": 0, "max": 0.14, "description": "Quãng con trượt lùi sang trái tính từ điểm chết ngoài. Engine tính: 0,31 − (0,07·cosθ + √(0,24² − 0,07²·sin²θ))." }
  ],
  "points": [
    { "name": "crankCenter", "description": "Tâm trục bánh đà." },
    { "name": "crankPin", "description": "Chốt tay quay ở góc 0°." },
    { "name": "sliderPin", "description": "Chốt con trượt ở điểm chết ngoài." }
  ],
  "notes": "Thanh truyền vẽ bằng Konva.Shape nối thẳng chốt tay quay (đọc góc của crank) với chốt con trượt (đọc vị trí của slider) mỗi lần vẽ, nên hai đầu luôn dính vào hai chốt. Engine phải tính slider từ crank theo công thức trên, nếu không thanh truyền sẽ dài ngắn thất thường. fill là màu bánh đà và con trượt."
}
*/
const makeCrankSlider = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const CRANK = 0.07; // bán kính tay quay
  const ROD = 0.24; // chiều dài thanh truyền
  const WHEEL = 0.095;
  const BLOCK_W = 0.1;
  const BLOCK_H = 0.06;
  const BASE_TOP = 0.095;
  const BASE_H = 0.02;
  const m = (v: number) => v * ppm;

  const group = new Konva.Group({ x: p.x, y: p.y });
  const steel = "#94a3b8";
  const dark = "#1e293b";
  const edge = "#e2e8f0";
  const thin = Math.max(1, m(0.003));

  // Đế máy.
  group.add(new Konva.Rect({
    x: m(-0.12), y: m(BASE_TOP), width: m(0.56), height: m(BASE_H), cornerRadius: m(0.004),
    fillLinearGradientStartPoint: { x: 0, y: m(BASE_TOP) }, fillLinearGradientEndPoint: { x: 0, y: m(BASE_TOP + BASE_H) },
    fillLinearGradientColorStops: [0, "#64748b", 1, "#334155"], stroke: edge, strokeWidth: thin, listening: false,
  }));
  // Gối đỡ trục bánh đà.
  group.add(new Konva.Line({
    points: [m(-0.05), m(BASE_TOP), m(-0.025), m(0.0), m(0.025), m(0.0), m(0.05), m(BASE_TOP)], closed: true,
    fill: "#475569", stroke: edge, strokeWidth: thin, lineJoin: "round", listening: false,
  }));
  // Rãnh dẫn hướng con trượt: hai thanh ray trên hai cột.
  const railTop = -BLOCK_H / 2 - 0.006;
  const railBottom = BLOCK_H / 2;
  for (const x of [0.135, 0.425]) {
    group.add(new Konva.Rect({ x: m(x - 0.008), y: m(railTop), width: m(0.016), height: m(BASE_TOP - railTop), fill: "#475569", stroke: edge, strokeWidth: thin, listening: false }));
  }
  for (const y of [railTop, railBottom]) {
    group.add(new Konva.Rect({ x: m(0.13), y: m(y), width: m(0.3), height: m(0.006), fill: steel, stroke: "#cbd5e1", strokeWidth: thin * 0.6, listening: false }));
  }

  // Con trượt: gốc nhóm là chốt, ở điểm chết ngoài (CRANK + ROD).
  const slider = new Konva.Group({ x: m(CRANK + ROD), y: 0 });
  slider.add(new Konva.Rect({
    x: m(-BLOCK_W / 2), y: m(-BLOCK_H / 2), width: m(BLOCK_W), height: m(BLOCK_H), cornerRadius: m(0.006),
    fill, stroke: edge, strokeWidth: thin, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.35, listening: false,
  }));
  slider.add(new Konva.Rect({ x: m(-BLOCK_W / 2 + 0.008), y: m(-BLOCK_H / 2 + 0.006), width: m(BLOCK_W - 0.016), height: m(0.008), fill: "rgba(255,255,255,0.25)", listening: false }));
  group.add(slider);

  // Bánh đà (tay quay): gốc nhóm là tâm trục; nan hoa cho thấy nó quay.
  const crank = new Konva.Group({ x: 0, y: 0 });
  crank.add(new Konva.Circle({ radius: m(WHEEL), fill, stroke: edge, strokeWidth: thin, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, listening: false }));
  crank.add(new Konva.Circle({ radius: m(WHEEL - 0.014), fill: dark, opacity: 0.55, listening: false }));
  for (let i = 0; i < 4; i += 1) {
    crank.add(new Konva.Rect({ x: 0, y: m(-0.008), width: m(WHEEL - 0.01), height: m(0.016), rotation: 45 + i * 90, fill, listening: false }));
  }
  crank.add(new Konva.Circle({ radius: m(0.022), fill: "#cbd5e1", stroke: dark, strokeWidth: thin, listening: false }));
  crank.add(new Konva.Circle({ x: m(CRANK), y: 0, radius: m(0.016), fill, stroke: edge, strokeWidth: thin, listening: false }));
  group.add(crank);

  /** Hai đầu thanh truyền lúc vẽ: chốt tay quay theo góc của crank, chốt con trượt theo vị trí của slider. */
  const ends = () => {
    const angle = ((crank.rotation() || 0) * Math.PI) / 180;
    return { ax: m(CRANK) * Math.cos(angle), ay: m(CRANK) * Math.sin(angle), bx: slider.x() || 0, by: slider.y() || 0 };
  };
  // Thanh truyền: thanh dẹt bo tròn hai đầu, có một vệt sáng chạy dọc thân.
  group.add(new Konva.Shape({
    fill: "#9aa8b9", stroke: dark, strokeWidth: thin, listening: false,
    sceneFunc: (ctx, shape) => {
      const { ax, ay, bx, by } = ends();
      const angle = Math.atan2(by - ay, bx - ax);
      const r = m(0.016);
      ctx.beginPath();
      ctx.arc(ax, ay, r, angle + Math.PI / 2, angle - Math.PI / 2, false);
      ctx.arc(bx, by, r, angle - Math.PI / 2, angle + Math.PI / 2, false);
      ctx.closePath();
      ctx.fillStrokeShape(shape);
    },
  }));
  group.add(new Konva.Shape({
    stroke: "rgba(255,255,255,0.55)", strokeWidth: Math.max(1, m(0.004)), lineCap: "round", listening: false,
    sceneFunc: (ctx, shape) => {
      const { ax, ay, bx, by } = ends();
      const angle = Math.atan2(by - ay, bx - ax);
      const ox = -Math.sin(angle) * m(0.006);
      const oy = Math.cos(angle) * m(0.006);
      const inset = m(0.024);
      ctx.beginPath();
      ctx.moveTo(ax + Math.cos(angle) * inset - ox, ay + Math.sin(angle) * inset - oy);
      ctx.lineTo(bx - Math.cos(angle) * inset - ox, by - Math.sin(angle) * inset - oy);
      ctx.fillStrokeShape(shape);
    },
  }));
  // Hai chốt trên cùng.
  group.add(new Konva.Shape({
    fill: dark, stroke: "#cbd5e1", strokeWidth: thin * 0.8, listening: false,
    sceneFunc: (ctx, shape) => {
      const { ax, ay, bx, by } = ends();
      ctx.beginPath();
      ctx.arc(ax, ay, m(0.007), 0, Math.PI * 2, false);
      ctx.moveTo(bx + m(0.007), by);
      ctx.arc(bx, by, m(0.007), 0, Math.PI * 2, false);
      ctx.fillStrokeShape(shape);
    },
  }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.12), y: m(BASE_TOP + BASE_H + 0.012), width: m(0.56), align: "center", text: label, fontSize: m(0.024), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      crank: { node: crank, motion: "rotate" as const, min: 0, max: 360 },
      slider: { node: slider, motion: "slide" as const, axis: "left" as const, min: 0, max: 0.14 },
    },
    points: { crankCenter: { x: 0, y: 0 }, crankPin: { x: m(CRANK), y: 0 }, sliderPin: { x: m(CRANK + ROD), y: 0 } },
  };
};
