/* OBJECT-META
{
  "catalog": "Bể nước / chậu chất lỏng trong suốt",
  "title": "Bể kính chữ nhật đựng nước màu: thành thuỷ tinh có viền keo, thước mm một bên và mặt nước phản chiếu",
  "fill": "#38bdf8",
  "anchor": "Giữa đáy bể, chạm mặt bàn.",
  "useWhen": ["Cần bể kính chữ nhật đựng nước nhìn thẳng mặt trước để thấy mặt nước và thước mm.","Thí nghiệm khúc xạ ánh sáng ở mặt phân cách không khí – nước."],
  "avoidWhen": ["Cần bình có vòi tràn đo thể tích vật chìm: dùng binh-tran.","Cần cốc nhỏ có mỏ rót và vạch chia: dùng coc-thuy-tinh.","Bể không có tia sáng hay nguồn sáng sẵn, phải thêm riêng."],
  "size": { "width": 0.28, "height": 0.2 },
  "parts": [
    { "name": "level", "label": "Mực nước", "motion": "slide", "axis": "up", "min": 0, "max": 0.16, "description": "Độ cao mặt nước trong bể tính từ đáy trong (mét). Khối nước bám đúng lòng bể." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy bể." },
    { "name": "waterSurface", "description": "Giữa mặt nước ở mực nước 0,10 m (một mức thường dùng)." },
    { "name": "cornerLeft", "description": "Góc trong trái ở đáy." },
    { "name": "cornerRight", "description": "Góc trong phải ở đáy." }
  ],
  "notes": "Bể rộng 0,26 m, cao 0,18 m, nhìn thẳng mặt trước nên thấy lớp nước và mặt nước; kính dày 4 mm. Dùng cho thí nghiệm khúc xạ ánh sáng ở mặt phân cách không khí – nước. fill là màu nước."
}
*/
const makeGlassTank = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.26;
  const H = 0.18;
  const WALL = 0.004;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const left = -W / 2;

  // Đế đỡ bằng gỗ ép mỏng và hai miếng đệm cao su.
  for (const x of [-0.1, 0.1]) group.add(new Konva.Rect({ x: m(x - 0.018), y: m(-0.005), width: m(0.036), height: m(0.005), cornerRadius: m(0.002), fill: "#0b0f19", listening: false }));

  // BỘ PHẬN TRƯỢT: nhóm rỗng mang độ cao mặt nước.
  const level = new Konva.Group({ x: 0, y: 0 });
  group.add(level);
  const top = () => Math.max(0, -(level.y() || 0) / ppm);

  // Khối nước: tô theo độ cao hiện tại, đậm dần xuống đáy, mặt nước sáng viền.
  group.add(new Konva.Shape({
    ...lin(0, m(-H), 0, 0, [0, "rgba(186,230,253,0.55)", 1, "rgba(14,116,144,0.82)"]), fill, opacity: 0.9, listening: false,
    sceneFunc: (ctx, shape) => {
      const h = Math.min(H - 0.01, top());
      if (h <= 0.001) return;
      ctx.beginPath();
      ctx.moveTo(m(left + WALL), m(-WALL));
      ctx.lineTo(m(left + WALL), m(-WALL - h));
      ctx.lineTo(m(left + W - WALL), m(-WALL - h));
      ctx.lineTo(m(left + W - WALL), m(-WALL));
      ctx.closePath();
      ctx.fillStrokeShape(shape);
    },
  }));
  group.add(new Konva.Shape({
    stroke: "rgba(255,255,255,0.85)", strokeWidth: lw * 1.6, lineCap: "round", listening: false,
    sceneFunc: (ctx, shape) => {
      const h = Math.min(H - 0.01, top());
      if (h <= 0.001) return;
      ctx.beginPath();
      ctx.moveTo(m(left + WALL), m(-WALL - h));
      ctx.lineTo(m(left + W - WALL), m(-WALL - h));
      ctx.fillStrokeShape(shape);
    },
  }));
  // Tia phản chiếu mặt nước bán trong suốt: dải sáng nằm ngay dưới mặt nước.
  group.add(new Konva.Shape({
    fill: "rgba(255,255,255,0.18)", listening: false,
    sceneFunc: (ctx, shape) => {
      const h = Math.min(H - 0.01, top());
      if (h <= 0.001) return;
      ctx.beginPath();
      ctx.moveTo(m(left + WALL), m(-WALL - h));
      ctx.lineTo(m(left + W - WALL), m(-WALL - h));
      ctx.lineTo(m(left + W - WALL), m(-WALL - h + 0.011));
      ctx.lineTo(m(left + WALL), m(-WALL - h + 0.011));
      ctx.closePath();
      ctx.fillStrokeShape(shape);
    },
  }));

  // Thành kính: bốn mặt trong suốt có viền dày, keo silicone ở các mép và vệt phản chiếu.
  group.add(new Konva.Rect({ x: m(left), y: m(-H), width: m(W), height: m(H), ...lin(m(left), 0, m(left + W), 0, [0, "rgba(186,230,253,0.4)", 0.12, "rgba(248,250,252,0.06)", 0.8, "rgba(224,242,254,0.05)", 1, "rgba(100,170,210,0.4)"]), stroke: "rgba(226,240,252,0.95)", strokeWidth: lw * 1.6, shadowColor: "#38bdf8", shadowBlur: m(0.012), shadowOpacity: 0.25, listening: false }));
  group.add(new Konva.Rect({ x: m(left + WALL), y: m(-H + WALL), width: m(W - 2 * WALL), height: m(H - 2 * WALL), stroke: "rgba(226,240,252,0.5)", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(left), y: m(-WALL * 1.6), width: m(W), height: m(WALL * 1.6), fill: "rgba(100,170,210,0.4)", stroke: "rgba(226,240,252,0.9)", strokeWidth: lw, listening: false }));
  for (const x of [left, left + W - 0.0035]) group.add(new Konva.Rect({ x: m(x), y: m(-H), width: m(0.0035), height: m(H), fill: "rgba(148,163,184,0.5)", listening: false }));
  group.add(ln([left + 0.01, -H + 0.012, left + 0.01, -0.02], "rgba(255,255,255,0.7)", lw * 2.6));
  group.add(ln([left + W - 0.012, -H + 0.04, left + W - 0.012, -0.06], "rgba(255,255,255,0.25)", lw * 1.6));
  // Thước mm dán ở thành trái: vạch mỗi cm, số mỗi 5 cm.
  for (let cm = 0; cm <= 16; cm += 1) {
    const y = -WALL - cm / 100;
    group.add(ln([left + WALL, y, left + WALL + (cm % 5 === 0 ? 0.013 : 0.007), y], "rgba(226,232,240,0.85)", cm % 5 === 0 ? lw * 1.1 : lw * 0.7));
    if (cm % 5 === 0 && cm > 0) group.add(new Konva.Text({ x: m(left + WALL + 0.0145), y: m(y - 0.0036), text: String(cm), fontSize: m(0.0075), fontStyle: "bold", fill: "rgba(226,232,240,0.85)", listening: false }));
  }
  group.add(ln([left, -H, left - 0.006, -H - 0.004, left + W + 0.006, -H - 0.004, left + W, -H], "rgba(241,245,249,0.9)", lw * 1.4));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(0.008), width: m(0.2), align: "center", text: label, fontSize: m(0.013), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { level: { node: level, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.16 } },
    points: { base: { x: 0, y: 0 }, waterSurface: { x: 0, y: m(-WALL - 0.1) }, cornerLeft: { x: m(left + WALL), y: m(-WALL) }, cornerRight: { x: m(left + W - WALL), y: m(-WALL) } },
  };
};
