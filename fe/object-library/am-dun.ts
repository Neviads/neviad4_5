/* OBJECT-META
{
  "catalog": "Ấm đun / nồi",
  "title": "Nồi nhôm có hai quai và nắp đậy có núm cầm: nắp bị hơi nước đẩy hở khi nước sôi, hơi nước bốc lên thành làn mỏng",
  "fill": "#cbd5e1",
  "anchor": "Giữa đáy nồi, chạm mặt bàn.",
  "useWhen": ["Cần nồi nhôm hai quai có nắp để minh hoạ nước sôi, hơi nước đẩy nắp nhấc lên.","Thí nghiệm đun nước cần mô tả hơi bốc ra khi sôi qua điểm steam."],
  "avoidWhen": ["Cần dụng cụ chứa nước trong suốt để thấy mực nước: dùng coc-thuy-tinh hoặc be-nuoc.","Nồi vẽ nhìn ngang, không thấy bên trong nồi.","Cần nguồn nhiệt tích hợp: dùng bep-dien, nồi này không tự nóng."],
  "size": { "width": 0.168, "height": 0.103 },
  "parts": [
    { "name": "lid", "label": "Nắp nồi", "motion": "slide", "axis": "up", "min": 0, "max": 0.015, "description": "Độ nắp nồi bị hơi nước đẩy nhấc lên khỏi miệng, mét; 0 là đậy kín." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy nồi." },
    { "name": "rim", "description": "Giữa miệng nồi (khi nắp đậy kín)." },
    { "name": "steam", "description": "Điểm hơi nước bắt đầu bốc lên khi nắp nhấc." }
  ],
  "notes": "Nồi cao 0,075 m, đường kính 0,12 m, thành mỏng 0,0015 m, hai quai ốp nhựa đen; nắp lõm có núm cầm. Khi nước sôi, áp suất hơi đẩy nắp nhấc lên một khe, hơi nước (tia mờ) bay ra. fill là màu kim loại nhôm của thân nồi."
}
*/
const makePot = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const W = 0.12;
  const H = 0.075;
  const left = -W / 2;

  group.add(new Konva.Ellipse({ x: m(0.004), y: m(-0.001), radiusX: m(W / 2 + 0.014), radiusY: m(0.0035), fill: "rgba(0,0,0,0.4)", listening: false }));
  // Hai quai nhựa đen bắt vào thành: thanh cong ngắn có bu lông.
  for (const s of [-1, 1]) {
    group.add(new Konva.Rect({ x: m(s > 0 ? W / 2 - 0.002 : -W / 2 - 0.026), y: m(-H + 0.0095), width: m(0.028), height: m(0.011), cornerRadius: m(0.004), ...lin(0, 0, 0, m(0.011), [0, "#6b7280", 0.35, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw, listening: false }));
    group.add(ln([s * (W / 2 + 0.003), -H + 0.0105, s * (W / 2 + 0.021), -H + 0.0105], "rgba(255,255,255,0.28)", lw));
    group.add(new Konva.Circle({ x: m(s * (W / 2 + 0.0005)), y: m(-H + 0.015), radius: m(0.0017), fill: "#e2e8f0", stroke: "#334155", strokeWidth: lw * 0.5, listening: false }));
  }
  // Thân nồi: hơi loe ở miệng, đáy dày có viền, gradient kim loại trụ.
  group.add(new Konva.Line({ points: [m(left), m(-H), m(left + 0.001), m(-0.006), m(left + 0.004), m(-0.001), m(-left - 0.004), m(-0.001), m(-left - 0.001), m(-0.006), m(-left), m(-H)], closed: true, tension: 0.12, ...lin(m(left), 0, m(-left), 0, [0, "#475569", 0.2, "#f8fafc", 0.5, fill, 0.85, "#64748b", 1, "#1e293b"]), stroke: "#1e293b", strokeWidth: lw * 1.2, lineJoin: "round", listening: false }));
  group.add(ln([left + 0.007, -H + 0.006, left + 0.007, -0.012], "rgba(255,255,255,0.75)", lw * 2.6));
  group.add(ln([-left - 0.008, -H + 0.01, -left - 0.008, -0.016], "rgba(0,0,0,0.25)", lw * 1.8));
  for (const y of [-0.0605, -0.0125]) group.add(ln([left + 0.0015, y, -left - 0.0015, y], "rgba(30,41,59,0.35)", lw * 0.8));
  group.add(new Konva.Rect({ x: m(left + 0.003), y: m(-0.0075), width: m(W - 0.006), height: m(0.0065), ...lin(0, 0, 0, m(0.0065), [0, "#94a3b8", 1, "#1e293b"]), listening: false }));
  group.add(new Konva.Rect({ x: m(left - 0.0015), y: m(-H - 0.0016), width: m(W + 0.003), height: m(0.0042), cornerRadius: m(0.0015), ...lin(0, 0, 0, m(0.0042), [0, "#ffffff", 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw * 0.9, listening: false }));
  group.add(new Konva.Text({ x: m(-0.025), y: m(-0.039), width: m(0.05), align: "center", text: "2,0 L", fontSize: m(0.0075), fontStyle: "bold", fill: "rgba(30,41,59,0.75)", listening: false }));

  // BỘ PHẬN TRƯỢT: nắp vòm có núm cầm; hơi nước tạo vệt mờ khi nắp nhấc lên.
  const lid = new Konva.Group({ x: 0, y: 0 });
  lid.add(new Konva.Line({ points: [m(left + 0.001), m(-H - 0.0016), m(left + 0.006), m(-H - 0.0095), m(-0.012), m(-H - 0.0155), m(0.012), m(-H - 0.0155), m(-left - 0.006), m(-H - 0.0095), m(-left - 0.001), m(-H - 0.0016)], closed: true, tension: 0.25, ...lin(m(left), 0, m(-left), 0, [0, "#475569", 0.25, "#f8fafc", 0.55, fill, 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 1.2, lineJoin: "round", listening: false }));
  lid.add(ln([left + 0.014, -H - 0.0065, -0.014, -H - 0.0138], "rgba(255,255,255,0.7)", lw * 1.8));
  lid.add(new Konva.Rect({ x: m(-0.0035), y: m(-H - 0.0235), width: m(0.007), height: m(0.0085), ...lin(0, 0, m(0.007), 0, [0, "#475569", 0.4, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 0.7, listening: false }));
  lid.add(new Konva.Circle({ y: m(-H - 0.0275), radius: m(0.0075), fillRadialGradientStartPoint: { x: m(-0.0022), y: m(-0.0022) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0075), fillRadialGradientColorStops: [0, "#6b7280", 0.5, "#1f2937", 1, "#030712"], stroke: "#000", strokeWidth: lw, listening: false }));
  lid.add(new Konva.Circle({ x: m(-0.0025), y: m(-H - 0.0295), radius: m(0.0018), fill: "rgba(255,255,255,0.4)", listening: false }));
  group.add(lid);
  // Hơi nước: ba đám mờ lượn lên phía trên bên phải; độ đậm tăng theo độ nhấc nắp.
  const lift = () => Math.max(0, -(lid.y() || 0) / ppm / 0.015);
  for (const [x, dy, r] of [[0.044, 0.014, 0.0075], [0.052, 0.03, 0.0105], [0.044, 0.05, 0.0135], [0.034, 0.072, 0.016]] as [number, number, number][]) {
    group.add(new Konva.Shape({
      fill: "#f8fafc", listening: false,
      sceneFunc: (ctx, shape) => {
        const k = lift();
        if (k <= 0.02) return;
        ctx.beginPath();
        ctx.arc(m(x), m(-H - 0.012 - dy * (0.5 + k)), m(r * (0.6 + 0.6 * k)), 0, Math.PI * 2, false);
        shape.opacity(0.14 + 0.32 * k);
        ctx.fillStrokeShape(shape);
      },
    }));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.006), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { lid: { node: lid, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.015 } },
    points: { base: { x: 0, y: 0 }, rim: { x: 0, y: m(-H) }, steam: { x: m(0.044), y: m(-H - 0.012) } },
  };
};
