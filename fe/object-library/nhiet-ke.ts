/* OBJECT-META
{
  "catalog": "Nhiệt kế (chất lỏng)",
  "title": "Nhiệt kế rượu pha đỏ −10 – 110 °C: bầu chứa, ống mao dẫn có vạch chia 1 °C, nền sứ trắng và khuyên treo",
  "fill": "#dc2626",
  "anchor": "Tâm bầu nhiệt kế (chỗ nhúng vào chất cần đo).",
  "useWhen": ["Cần nhiệt kế rượu pha đỏ −10 đến 110 °C có cột chất lỏng dâng theo nhiệt độ (bộ phận column).", "Cảnh dạy đọc vạch chia 1 °C, bầu nhúng vào chất cần đo."],
  "avoidWhen": ["Cần số đọc LCD hoặc cảm biến: dùng nhiet-ke-dien-tu.", "Vật chỉ đo −10 đến 110 °C; nhiệt độ cao hơn (như hơi nước trên 110 °C) thì vượt thang."],
  "size": {
    "width": 0.018,
    "height": 0.342
  },
  "parts": [
    {
      "name": "column",
      "label": "Cột chất lỏng",
      "motion": "slide",
      "axis": "up",
      "min": 0,
      "max": 0.264,
      "description": "Độ dâng của đỉnh cột chất lỏng so với vạch −10 °C (mét); 0,0022 m cho mỗi °C nên 0,264 m ứng với 110 °C."
    }
  ],
  "points": [
    {
      "name": "bulb",
      "description": "Tâm bầu nhiệt kế."
    },
    {
      "name": "zeroMark",
      "description": "Vạch 0 °C."
    },
    {
      "name": "top",
      "description": "Khuyên treo ở đỉnh."
    }
  ],
  "notes": "Vạch −10 °C cách tâm bầu 0,034 m; mỗi °C dài 0,0022 m, số ghi mỗi 10 °C. Cột chất lỏng bắt đầu từ trong bầu và dâng theo bộ phận column. fill là màu chất lỏng."
}
*/
const makeLiquidThermometer = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const BASE = 0.034;
  const PER_C = 0.0022;
  const TUBE_TOP = 0.318;
  const W = 0.016;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0011));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Khuyên treo thuỷ tinh ở đỉnh.
  group.add(new Konva.Circle({ x: 0, y: m(-TUBE_TOP - 0.0085), radius: m(0.0062), stroke: "rgba(226,232,240,0.95)", strokeWidth: lw * 1.6, listening: false }));

  // Thân thuỷ tinh: tấm sứ trắng sau ống mao dẫn.
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(-TUBE_TOP), width: m(W), height: m(TUBE_TOP - 0.018), cornerRadius: [m(0.006), m(0.006), 0, 0], ...lin(m(-W / 2), 0, m(W / 2), 0, [0, "rgba(186,230,253,0.5)", 0.25, "rgba(248,250,252,0.9)", 0.7, "rgba(255,255,255,0.95)", 1, "rgba(148,190,225,0.6)"]), stroke: "rgba(226,232,240,0.95)", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.3, listening: false }));
  // Bầu nhiệt kế.
  group.add(new Konva.Circle({ x: 0, y: 0, radius: m(0.0092), fillRadialGradientStartPoint: { x: m(-0.003), y: m(-0.003) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0092), fillRadialGradientColorStops: [0, "#fecaca", 0.45, fill, 1, "#7f1d1d"], stroke: "rgba(226,232,240,0.95)", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.3, listening: false }));
  group.add(new Konva.Circle({ x: m(-0.003), y: m(-0.003), radius: m(0.0017), fill: "rgba(255,255,255,0.85)", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0035), y: m(-0.018), width: m(0.007), height: m(0.012), fill: fill, listening: false }));

  // BỘ PHẬN TRƯỢT: nhóm rỗng mang độ dâng của cột chất lỏng.
  const column = new Konva.Group({ x: 0, y: 0 });
  group.add(column);
  group.add(new Konva.Shape({
    ...lin(m(-0.002), 0, m(0.002), 0, [0, "#7f1d1d", 0.4, "#ef4444", 1, "#7f1d1d"]), fill: fill, listening: false,
    sceneFunc: (ctx, shape) => {
      const rise = Math.max(0, -(column.y() || 0) / ppm);
      const top = BASE + rise;
      ctx.beginPath();
      ctx.moveTo(m(-0.0019), m(-0.004));
      ctx.lineTo(m(-0.0019), m(-top));
      ctx.lineTo(m(0.0019), m(-top));
      ctx.lineTo(m(0.0019), m(-0.004));
      ctx.closePath();
      ctx.fillStrokeShape(shape);
    },
  }));
  // Ống mao dẫn: hai vạch thuỷ tinh quanh cột chất lỏng, cùng vệt sáng.
  group.add(ln([-0.0029, -0.012, -0.0029, -TUBE_TOP + 0.01], "rgba(148,163,184,0.7)", lw));
  group.add(ln([0.0029, -0.012, 0.0029, -TUBE_TOP + 0.01], "rgba(148,163,184,0.7)", lw));
  group.add(ln([-W / 2 + 0.0012, -0.02, -W / 2 + 0.0012, -TUBE_TOP + 0.01], "rgba(255,255,255,0.85)", lw * 1.6));

  // Vạch chia 1 °C từ −10 đến 110 °C: số mỗi 10 °C.
  for (let t = -10; t <= 110; t += 1) {
    const y = -BASE - (t + 10) * PER_C;
    const ten = t % 10 === 0;
    const five = t % 5 === 0;
    group.add(ln([W / 2 - 0.0008, y, W / 2 - (ten ? 0.0062 : five ? 0.0045 : 0.003), y], "#0f172a", ten ? lw * 1.2 : lw * 0.7));
    if (ten) group.add(new Konva.Text({ x: m(-W / 2 + 0.0004), y: m(y - 0.0033), width: m(0.0078), align: "center", text: String(t), fontSize: m(0.0048), fontStyle: "bold", fill: "#0f172a", listening: false }));
  }
  group.add(new Konva.Text({ x: m(-0.0058), y: m(-TUBE_TOP + 0.002), width: m(0.0116), align: "center", text: "°C", fontSize: m(0.0058), fontStyle: "bold", fill: "#1d4ed8", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(0.012), y: m(-0.16), text: label, fontSize: m(0.009), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { column: { node: column, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.264 } },
    points: { bulb: { x: 0, y: 0 }, zeroMark: { x: 0, y: m(-BASE - 10 * PER_C) }, top: { x: 0, y: m(-TUBE_TOP - 0.0147) } },
  };
};
