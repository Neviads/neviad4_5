/* OBJECT-META
{
  "catalog": "Bình thông nhau",
  "title": "Bình thông nhau: ba ống thuỷ tinh khác hình dạng (trụ nhỏ, phễu rộng, ống có bầu) nối với nhau ở đáy, nước màu cùng một mực",
  "fill": "#38bdf8",
  "anchor": "Giữa đáy ống nối ở dưới.",
  "useWhen": ["Cần ba ống khác hình dạng (trụ hẹp, phễu, có bầu) nối đáy, mực nước bằng nhau.","Thí nghiệm áp suất chất lỏng chỉ phụ thuộc độ sâu, không phụ thuộc hình dạng bình."],
  "avoidWhen": ["Cần ống chữ U đo chênh áp có thước mm: dùng ap-ke-chu-u.","Cần các nhánh có chất lỏng khác nhau: chỉ có một mực nước chung một màu.","Không đặt được mực mỗi nhánh khác nhau."],
  "size": { "width": 0.4, "height": 0.296 },
  "parts": [
    { "name": "level", "label": "Mực nước chung", "motion": "slide", "axis": "up", "min": 0, "max": 0.2, "description": "Độ cao mặt thoáng chung của ba nhánh tính từ đáy lòng ống nối (mét); nước tự bám vào lòng mỗi nhánh theo hình dạng của nó." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy ống nối." },
    { "name": "topLeft", "description": "Miệng ống nhánh trái (ống trụ)." },
    { "name": "topMid", "description": "Miệng nhánh giữa (phễu)." },
    { "name": "topRight", "description": "Miệng nhánh phải (ống có bầu)." }
  ],
  "notes": "Ba nhánh cao 0,26 m, cách nhau 0,13 m. Nhánh trái là ống trụ hẹp, nhánh giữa loe thành phễu, nhánh phải có bầu phình ở giữa; mực nước bằng nhau ở cả ba dù hình dạng khác nhau (áp suất chỉ phụ thuộc độ sâu). Có vạch chia cm và vạch 0 ở đáy. fill là màu nước."
}
*/
const makeCommunicatingVessels = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const HEIGHT = 0.26;
  const PIPE_Y = 0.0;
  const WALL = 0.0026;
  const XS = [-0.13, 0, 0.13];
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  // Nửa bề rộng lòng của từng nhánh theo độ cao h (mét, tính từ đáy lòng).
  const half = (i: number, h: number) => {
    if (i === 0) return 0.0125;
    if (i === 1) return 0.0125 + 0.0225 * Math.min(1, Math.max(0, (h - 0.04) / 0.2)) ** 1.15;
    const bulge = h > 0.07 && h < 0.17 ? Math.sin(((h - 0.07) / 0.1) * Math.PI) : 0;
    return 0.0125 + 0.024 * bulge ** 0.8;
  };

  // Giá gỗ đỡ ở dưới với chân.
  group.add(new Konva.Rect({ x: m(-0.2), y: m(0.016), width: m(0.4), height: m(0.02), cornerRadius: m(0.004), ...lin(0, m(0.016), 0, m(0.036), [0, "#d6b080", 1, "#8a5a2b"]), stroke: "#4a2f12", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));

  // BỘ PHẬN TRƯỢT: nhóm rỗng mang độ cao của mực nước chung.
  const level = new Konva.Group({ x: 0, y: 0 });
  group.add(level);
  const surface = () => Math.max(0, -(level.y() || 0) / ppm);

  // Nước: ống nối ở đáy luôn đầy; mỗi nhánh đầy tới mực chung.
  group.add(new Konva.Rect({ x: m(-0.152), y: m(-0.0125), width: m(0.304), height: m(0.025), cornerRadius: m(0.0125), fill, opacity: 0.85, listening: false }));
  for (let i = 0; i < 3; i += 1) {
    group.add(new Konva.Shape({
      fill, opacity: 0.85, listening: false,
      sceneFunc: (ctx, shape) => {
        const top = surface();
        if (top <= 0.001) return;
        const steps = 22;
        ctx.beginPath();
        ctx.moveTo(m(XS[i] - half(i, 0)), 0);
        for (let k = 0; k <= steps; k += 1) {
          const h = (top * k) / steps;
          ctx.lineTo(m(XS[i] - half(i, h)), m(-h));
        }
        for (let k = steps; k >= 0; k -= 1) {
          const h = (top * k) / steps;
          ctx.lineTo(m(XS[i] + half(i, h)), m(-h));
        }
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      },
    }));
  }
  // Mặt thoáng mỏng sáng trên cả ba nhánh.
  group.add(new Konva.Shape({
    stroke: "rgba(255,255,255,0.75)", strokeWidth: lw * 1.4, lineCap: "round", listening: false,
    sceneFunc: (ctx, shape) => {
      const top = surface();
      if (top <= 0.001) return;
      ctx.beginPath();
      for (let i = 0; i < 3; i += 1) {
        ctx.moveTo(m(XS[i] - half(i, top)), m(-top));
        ctx.lineTo(m(XS[i] + half(i, top)), m(-top));
      }
      ctx.fillStrokeShape(shape);
    },
  }));

  // Ba nhánh thuỷ tinh: đường bao hai bên theo hình dạng, miệng loe nhẹ; vệt sáng ở bên trái.
  for (let i = 0; i < 3; i += 1) {
    const left: number[] = [];
    const right: number[] = [];
    const steps = 26;
    for (let k = 0; k <= steps; k += 1) {
      const h = (HEIGHT * k) / steps;
      left.push(m(XS[i] - half(i, h) - WALL), m(-h));
      right.push(m(XS[i] + half(i, h) + WALL), m(-h));
    }
    const glass = { stroke: "rgba(226,240,252,0.95)", strokeWidth: lw * 1.4, lineCap: "round" as const, lineJoin: "round" as const, listening: false };
    group.add(new Konva.Line({ points: left, tension: 0, ...glass }));
    group.add(new Konva.Line({ points: right, tension: 0, ...glass }));
    group.add(new Konva.Line({ points: [m(XS[i] - half(i, HEIGHT) - WALL - 0.003), m(-HEIGHT - 0.0004), m(XS[i] + half(i, HEIGHT) + WALL + 0.003), m(-HEIGHT - 0.0004)], stroke: "rgba(241,245,249,0.95)", strokeWidth: lw * 1.8, lineCap: "round", listening: false }));
    const inner: number[] = [];
    for (let k = 1; k <= steps - 2; k += 1) {
      const h = (HEIGHT * k) / steps;
      inner.push(m(XS[i] - half(i, h) * 0.72), m(-h));
    }
    group.add(new Konva.Line({ points: inner, stroke: "rgba(255,255,255,0.45)", strokeWidth: lw * 2, lineCap: "round", listening: false }));
  }
  // Ống nối thuỷ tinh ở đáy: vỏ trong suốt bao quanh lớp nước.
  group.add(new Konva.Rect({ x: m(-0.1525), y: m(-0.0155), width: m(0.305), height: m(0.031), cornerRadius: m(0.0155), fill: "rgba(186,230,253,0.14)", stroke: "rgba(226,240,252,0.95)", strokeWidth: lw * 1.4, listening: false }));
  // Vạch chia 1 cm, số mỗi 5 cm, cạnh nhánh phải; vạch 0 đáy.
  for (let cm = 0; cm <= 26; cm += 1) {
    const y = -cm / 100;
    group.add(new Konva.Line({ points: [m(0.1775), m(y), m(0.1775 + (cm % 5 === 0 ? 0.011 : 0.006)), m(y)], stroke: "rgba(226,232,240,0.75)", strokeWidth: lw * (cm % 5 === 0 ? 1.1 : 0.7), listening: false }));
    if (cm % 5 === 0) group.add(new Konva.Text({ x: m(0.19), y: m(y - 0.004), text: String(cm), fontSize: m(0.0078), fontStyle: "bold", fill: "rgba(226,232,240,0.85)", listening: false }));
  }
  group.add(new Konva.Rect({ x: m(0.1735), y: m(-HEIGHT), width: m(0.0035), height: m(HEIGHT), fill: "rgba(226,232,240,0.5)", listening: false }));
  // Kẹp giữ ống vào giá.
  for (const x of XS) group.add(new Konva.Rect({ x: m(x - 0.0155), y: m(0.0155), width: m(0.031), height: m(0.0075), cornerRadius: m(0.002), fill: "#475569", stroke: "#1e293b", strokeWidth: lw * 0.7, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.2), y: m(0.042), width: m(0.4), align: "center", text: label, fontSize: m(0.014), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { level: { node: level, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.2 } },
    points: { base: { x: 0, y: m(PIPE_Y) }, topLeft: { x: m(XS[0]), y: m(-HEIGHT) }, topMid: { x: m(XS[1]), y: m(-HEIGHT) }, topRight: { x: m(XS[2]), y: m(-HEIGHT) } },
  };
};
