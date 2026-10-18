/* OBJECT-META
{
  "catalog": "Lò xo (treo, nằm ngang)",
  "title": "Lò xo xoắn treo thẳng đứng",
  "fill": "#60758b",
  "anchor": "Khuyên móc trên (điểm treo).",
  "useWhen": ["Cần lò xo xoắn treo thẳng đứng, dài tự nhiên 0,30 m, đầu dưới trượt để giãn hay nén.", "Cảnh về định luật Hooke, điểm top treo cố định, bottom + end là vị trí đầu dưới."],
  "avoidWhen": ["Cần lò xo gắn vật nặng dao động hoàn chỉnh: dùng con-lac-lo-xo.", "Cần lực kế lò xo có thang chia: dùng luc-ke-lo-xo; lò xo này không có vật, thang hay vỏ."],
  "size": { "width": 0.05, "height": 0.3 },
  "parts": [
    { "name": "end", "label": "Đầu dưới", "motion": "slide", "axis": "down", "min": -0.12, "max": 0.2, "description": "Độ giãn (dương) hay độ nén (âm) của lò xo so với chiều dài tự nhiên 0,30 m. Thân lò xo tự co giãn theo." }
  ],
  "points": [
    { "name": "top", "description": "Khuyên móc trên, điểm treo." },
    { "name": "bottom", "description": "Khuyên móc dưới ở chiều dài tự nhiên; vị trí thật = bottom + end." }
  ],
  "notes": "Thân lò xo vẽ bằng Konva.Shape đọc vị trí của bộ phận end mỗi lần vẽ, nên chỉ cần trượt một bộ phận mà các vòng vẫn giãn đều. Màu thép cố định, không dùng fill."
}
*/
const makeSpring = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const COIL_DIAMETER = 0.05;
  const REST_LENGTH = 0.3;
  const LEAD = 0.025; // đoạn dây thẳng từ khuyên tới vòng đầu tiên
  const COILS = 12;
  const WIRE = 0.0055;
  const EYE = 0.009;

  const group = new Konva.Group({ x: p.x, y: p.y });
  const R = (COIL_DIAMETER / 2) * ppm;
  const lead = LEAD * ppm;
  const wire = Math.max(1, WIRE * ppm);
  const eye = EYE * ppm;

  // Khung bao ở chiều dài tự nhiên (trong suốt), để đo kích thước của vật.
  group.add(new Konva.Rect({ x: -R, y: 0, width: 2 * R, height: REST_LENGTH * ppm, fill: "rgba(0,0,0,0)", listening: false }));

  // Khuyên móc trên.
  group.add(new Konva.Circle({ x: 0, y: -eye * 0.2, radius: eye, stroke: "#cbd5e1", strokeWidth: wire, listening: false }));
  group.add(new Konva.Line({ points: [0, eye * 0.8, 0, lead], stroke: "#cbd5e1", strokeWidth: wire, lineCap: "round", listening: false }));

  // Đầu dưới: khuyên móc dưới, trượt theo độ giãn. Gốc nhóm là tâm khuyên ở chiều dài tự nhiên.
  const end = new Konva.Group({ x: 0, y: REST_LENGTH * ppm });
  end.add(new Konva.Line({ points: [0, -lead, 0, -eye * 0.8], stroke: "#cbd5e1", strokeWidth: wire, lineCap: "round", listening: false }));
  end.add(new Konva.Circle({ x: 0, y: eye * 0.2, radius: eye, stroke: "#cbd5e1", strokeWidth: wire, listening: false }));

  /** Các đoạn của đường xoắn giữa đầu vòng trên và đầu vòng dưới; `front` chọn nửa vòng phía trước hay phía sau. */
  const helix = (ctx: Konva.Context, front: boolean) => {
    const top = lead;
    const bottom = (end.y() || 0) - lead;
    const span = Math.max(bottom - top, COILS * wire * 0.9);
    const tilt = R * 0.28; // nhìn hơi chếch xuống nên mỗi vòng là một elip dẹt
    const steps = COILS * 24;
    let drawing = false;
    ctx.beginPath();
    for (let i = 0; i <= steps; i += 1) {
      const t = (i / steps) * COILS * 2 * Math.PI;
      const x = R * Math.cos(t);
      const y = top + (span * i) / steps + tilt * Math.sin(t);
      const isFront = Math.sin(t) >= 0;
      if (isFront === front) {
        if (!drawing) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        drawing = true;
      } else {
        drawing = false;
      }
    }
    // Hai đoạn nối từ dây thẳng ở giữa ra vòng đầu và vòng cuối (luôn ở phía trước).
    if (front) {
      ctx.moveTo(0, top);
      ctx.lineTo(R, top);
      ctx.moveTo(0, top + span);
      ctx.lineTo(R * Math.cos(COILS * 2 * Math.PI), top + span);
    }
  };

  // Nửa sau của các vòng: tối và mảnh hơn, vẽ trước.
  group.add(new Konva.Shape({
    stroke: "#475569",
    strokeWidth: wire * 0.85,
    lineCap: "round",
    lineJoin: "round",
    listening: false,
    sceneFunc: (ctx, shape) => { helix(ctx, false); ctx.fillStrokeShape(shape); },
  }));
  // Nửa trước: ánh thép sáng ở giữa.
  group.add(new Konva.Shape({
    strokeLinearGradientStartPoint: { x: -R, y: 0 },
    strokeLinearGradientEndPoint: { x: R, y: 0 },
    strokeLinearGradientColorStops: [0, "#64748b", 0.35, "#f1f5f9", 0.6, "#cbd5e1", 1, "#475569"],
    strokeWidth: wire,
    lineCap: "round",
    lineJoin: "round",
    listening: false,
    sceneFunc: (ctx, shape) => { helix(ctx, true); ctx.fillStrokeShape(shape); },
  }));
  group.add(end);

  if (label) {
    group.add(new Konva.Text({ x: R + 0.012 * ppm, y: (REST_LENGTH / 2) * ppm - 0.012 * ppm, text: label, fontSize: 0.024 * ppm, fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { end: { node: end, motion: "slide" as const, axis: "down" as const, min: -0.12, max: 0.2 } },
    points: { top: { x: 0, y: 0 }, bottom: { x: 0, y: REST_LENGTH * ppm } },
  };
};
