/* OBJECT-META
{
  "catalog": "Bình cầu, bình tam giác",
  "title": "Bình tam giác (bình nón) có chất lỏng",
  "fill": "#38bdf8",
  "anchor": "Giữa đáy bình, chạm mặt đặt.",
  "useWhen": ["Cần bình tam giác (bình nón) 250 mL có vạch chia và chất lỏng với mực thay đổi được.","Cần mặt chất lỏng luôn chạm đúng thành bình dù thành nghiêng (bộ phận level)."],
  "avoidWhen": ["Cần bình có vòi tràn: dùng binh-tran.","Cần cốc trụ thẳng có mỏ rót: dùng coc-thuy-tinh.","Không có nút, ống dẫn hay nhiệt kế kèm theo."],
  "size": { "width": 0.15, "height": 0.22 },
  "parts": [
    { "name": "level", "label": "Mực chất lỏng", "motion": "slide", "axis": "up", "min": 0, "max": 0.19, "description": "Độ cao mặt chất lỏng tính từ đáy trong, mét. Khối chất lỏng tự bám theo thành nghiêng và cổ bình." }
  ],
  "points": [
    { "name": "bottom", "description": "Giữa đáy." },
    { "name": "mouth", "description": "Giữa miệng bình." }
  ],
  "notes": "Chất lỏng vẽ bằng Konva.Shape đọc độ cao của bộ phận level mỗi lần vẽ và tính bề rộng trong của bình ở độ cao đó, nên mặt chất lỏng luôn chạm đúng thành bình dù thành nghiêng. Vạch chia ghi mL cho bình 250 mL. fill là màu chất lỏng."
}
*/
const makeErlenmeyerFlask = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const HEIGHT = 0.22;
  const BASE = 0.15;
  const NECK = 0.045;
  const SHOULDER = 0.155; // độ cao nơi thành nghiêng gặp cổ
  const WALL = 0.004;
  const LIP = 0.006;
  const m = (v: number) => v * ppm;

  const group = new Konva.Group({ x: p.x, y: p.y });

  /** Nửa bề rộng TRONG của bình ở độ cao h (mét, tính từ đáy). */
  const innerHalf = (h: number) => {
    const bottomHalf = BASE / 2 - WALL - 0.004;
    const neckHalf = NECK / 2 - WALL;
    if (h >= SHOULDER) return neckHalf;
    return bottomHalf - (h / SHOULDER) * (bottomHalf - neckHalf);
  };

  // Bộ phận level: nhóm rỗng, chỉ mang độ cao mặt chất lỏng (trượt lên).
  const level = new Konva.Group({ x: 0, y: 0 });
  group.add(level);

  // Chất lỏng: đa giác từ đáy trong lên tới mặt thoáng, bám thành bình.
  group.add(new Konva.Shape({
    fill, opacity: 0.78, listening: false,
    sceneFunc: (ctx, shape) => {
      const h = Math.min(HEIGHT - 0.012, Math.max(0, -(level.y() || 0) / ppm));
      if (h <= 0.0005) return;
      const floor = WALL;
      const top = Math.max(floor, h);
      const steps = 16;
      ctx.beginPath();
      ctx.moveTo(m(-innerHalf(floor)), m(-floor));
      for (let i = 1; i <= steps; i += 1) {
        const y = floor + ((top - floor) * i) / steps;
        ctx.lineTo(m(-innerHalf(y)), m(-y));
      }
      for (let i = steps; i >= 0; i -= 1) {
        const y = floor + ((top - floor) * i) / steps;
        ctx.lineTo(m(innerHalf(y)), m(-y));
      }
      ctx.closePath();
      ctx.fillStrokeShape(shape);
    },
  }));
  // Mặt thoáng: dải sáng mảnh.
  group.add(new Konva.Shape({
    stroke: "rgba(255,255,255,0.55)", strokeWidth: Math.max(1, m(0.0025)), lineCap: "round", listening: false,
    sceneFunc: (ctx, shape) => {
      const h = Math.min(HEIGHT - 0.012, Math.max(0, -(level.y() || 0) / ppm));
      if (h <= WALL + 0.001) return;
      ctx.beginPath();
      ctx.moveTo(m(-innerHalf(h)), m(-h));
      ctx.lineTo(m(innerHalf(h)), m(-h));
      ctx.fillStrokeShape(shape);
    },
  }));

  // Thành bình bằng thuỷ tinh: đường bao ngoài, trong suốt.
  const outer = [
    -BASE / 2 + 0.01, 0, -BASE / 2, -0.012, -NECK / 2, -SHOULDER, -NECK / 2, -(HEIGHT - LIP), -NECK / 2 - LIP, -HEIGHT,
    NECK / 2 + LIP, -HEIGHT, NECK / 2, -(HEIGHT - LIP), NECK / 2, -SHOULDER, BASE / 2, -0.012, BASE / 2 - 0.01, 0,
  ].map(m);
  group.add(new Konva.Line({
    points: outer, closed: true, tension: 0.08,
    fillLinearGradientStartPoint: { x: m(-BASE / 2), y: 0 }, fillLinearGradientEndPoint: { x: m(BASE / 2), y: 0 },
    fillLinearGradientColorStops: [0, "rgba(186,230,253,0.22)", 0.45, "rgba(224,242,254,0.06)", 1, "rgba(148,197,230,0.2)"],
    stroke: "rgba(226,232,240,0.9)", strokeWidth: Math.max(1, m(WALL * 0.75)), lineJoin: "round", listening: false,
  }));
  // Vành miệng.
  group.add(new Konva.Rect({ x: m(-NECK / 2 - LIP), y: m(-HEIGHT), width: m(NECK + 2 * LIP), height: m(LIP), cornerRadius: m(0.002), fill: "rgba(226,232,240,0.55)", stroke: "rgba(241,245,249,0.9)", strokeWidth: Math.max(1, m(0.0015)), listening: false }));
  // Vệt phản chiếu dọc thành trái.
  group.add(new Konva.Line({ points: [m(-BASE / 2 + 0.018), m(-0.02), m(-NECK / 2 - 0.006), m(-SHOULDER + 0.012)], stroke: "rgba(255,255,255,0.45)", strokeWidth: Math.max(1, m(0.004)), lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(-NECK / 2 + 0.006), m(-SHOULDER - 0.008), m(-NECK / 2 + 0.006), m(-HEIGHT + 0.015)], stroke: "rgba(255,255,255,0.35)", strokeWidth: Math.max(1, m(0.003)), lineCap: "round", listening: false }));

  // Vạch chia (mL) trên thành phải: 50 mL mỗi vạch theo độ cao gần đúng của bình 250 mL.
  const marks = [[0.03, "50"], [0.056, "100"], [0.08, "150"], [0.1, "200"], [0.118, "250"]] as const;
  for (const [h, text] of marks) {
    const x = innerHalf(h) - 0.004;
    group.add(new Konva.Line({ points: [m(x - 0.018), m(-h), m(x), m(-h)], stroke: "rgba(241,245,249,0.85)", strokeWidth: Math.max(1, m(0.0015)), listening: false }));
    group.add(new Konva.Text({ x: m(x - 0.046), y: m(-h - 0.006), width: m(0.026), align: "right", text, fontSize: m(0.0095), fill: "rgba(241,245,249,0.85)", listening: false }));
  }
  group.add(new Konva.Text({ x: m(-0.03), y: m(-0.138), width: m(0.06), align: "center", text: "mL", fontSize: m(0.009), fill: "rgba(241,245,249,0.7)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-BASE / 2), y: m(0.01), width: m(BASE), align: "center", text: label, fontSize: m(0.016), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { level: { node: level, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.19 } },
    points: { bottom: { x: 0, y: 0 }, mouth: { x: 0, y: m(-HEIGHT) } },
  };
};
