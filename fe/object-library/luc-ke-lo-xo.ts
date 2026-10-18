/* OBJECT-META
{
  "catalog": "Lực kế lò xo",
  "title": "Lực kế lò xo 0–5 N: vỏ ống trong suốt, lò xo xoắn, vạch chia 0,1 N, kim chỉ và móc kéo",
  "fill": "#cbd5e1",
  "anchor": "Tâm khuyên treo ở đỉnh lực kế.",
  "useWhen": ["Cần đo lực kéo hoặc trọng lượng 0–5 N bằng lò xo có vạch chia 0,1 N và kim chỉ.","Cần vật treo từ khuyên trên cùng, đo độ giãn lò xo hoặc kiểm chứng định luật Hooke."],
  "avoidWhen": ["Cần cân điện tử có số đọc: dùng can-dien-tu.","Cần lò xo trần không vỏ, không thang chia: dùng lo-xo.","Cần đo lực lớn hơn 5 N: lực kế này hết thang."],
  "size": {
    "width": 0.029,
    "height": 0.273
  },
  "parts": [
    {
      "name": "hook",
      "label": "Móc kéo và kim chỉ",
      "motion": "slide",
      "axis": "down",
      "min": 0,
      "max": 0.08,
      "description": "Độ giãn của lò xo (mét): móc, thanh kéo, kim chỉ tụt xuống, các vòng lò xo giãn theo. 0,08 m ứng với 5 N."
    }
  ],
  "points": [
    {
      "name": "topRing",
      "description": "Tâm khuyên treo trên cùng."
    },
    {
      "name": "hookRest",
      "description": "Đỉnh móc kéo khi lò xo chưa giãn; vị trí thật = hookRest + hook xuống."
    },
    {
      "name": "zeroMark",
      "description": "Vạch 0 N trên thang."
    }
  ],
  "notes": "Thang chia 0,1 N, số ghi mỗi 1 N; kim chỉ là vạch đỏ bám vào đầu lò xo nên lò xo giãn bao nhiêu thì kim trượt bấy nhiêu. Lực = (độ giãn / 0,08 m) × 5 N. fill là màu nắp kim loại hai đầu."
}
*/
const makeSpringScale = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.026;
  const TOP = 0.026;
  const BODY_H = 0.17;
  const SLIDER_REST = 0.052;
  const STRETCH = 0.08;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0012));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const bottom = TOP + BODY_H;

  const group = new Konva.Group({ x: p.x, y: p.y });

  // Khuyên treo và nắp trên.
  group.add(new Konva.Circle({ x: 0, y: m(0.0035), radius: m(0.0085), stroke: "#e2e8f0", strokeWidth: m(0.0032), shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.3, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0035), y: m(0.01), width: m(0.007), height: m(0.016), ...lin(m(-0.0035), 0, m(0.0035), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));

  // Vỏ ống nhựa trong suốt có hai vành kim loại.
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(TOP), width: m(W), height: m(BODY_H), cornerRadius: m(0.003), ...lin(m(-W / 2), 0, m(W / 2), 0, [0, "rgba(186,230,253,0.35)", 0.35, "rgba(241,245,249,0.14)", 0.75, "rgba(186,230,253,0.18)", 1, "rgba(100,150,200,0.4)"]), stroke: "rgba(226,232,240,0.9)", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.3, listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2 - 0.0015), y: m(TOP - 0.006), width: m(W + 0.003), height: m(0.014), cornerRadius: m(0.003), ...lin(m(-W / 2), 0, m(W / 2), 0, [0, "#475569", 0.3, "#f1f5f9", 0.7, fill, 1, "#334155"]), stroke: "#334155", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2 - 0.0015), y: m(bottom - 0.008), width: m(W + 0.003), height: m(0.014), cornerRadius: m(0.003), ...lin(m(-W / 2), 0, m(W / 2), 0, [0, "#475569", 0.3, "#f1f5f9", 0.7, fill, 1, "#334155"]), stroke: "#334155", strokeWidth: lw, listening: false }));

  // Thang chia bên trái: tấm kim loại có vạch 0,1 N; số 0..5 N.
  const scaleX = -W / 2 + 0.0015;
  group.add(new Konva.Rect({ x: m(scaleX - 0.0004), y: m(SLIDER_REST - 0.004), width: m(0.0098), height: m(STRETCH + 0.014), fill: "#fefce8", stroke: "#a16207", strokeWidth: lw * 0.6, listening: false }));
  for (let i = 0; i <= 50; i += 1) {
    const y = SLIDER_REST + (i / 50) * STRETCH;
    group.add(ln([scaleX, y, scaleX + (i % 10 === 0 ? 0.0075 : i % 5 === 0 ? 0.0055 : 0.0034), y], "#0f172a", i % 10 === 0 ? lw : lw * 0.6));
  }
  for (let n = 0; n <= 5; n += 1) {
    group.add(new Konva.Text({ x: m(scaleX + 0.0078), y: m(SLIDER_REST + (n / 5) * STRETCH - 0.0034), text: String(n), fontSize: m(0.0062), fontStyle: "bold", fill: "#0f172a", listening: false }));
  }
  group.add(new Konva.Text({ x: m(W / 2 + 0.003), y: m(SLIDER_REST + STRETCH / 2 - 0.004), text: "N", fontSize: m(0.0078), fontStyle: "bold", fill: "#e2e8f0", listening: false }));

  // BỘ PHẬN TRƯỢT: móc kéo + thanh + đầu lò xo + kim chỉ. Gốc nhóm ở đầu dưới lò xo khi chưa giãn.
  const hook = new Konva.Group({ x: 0, y: m(SLIDER_REST) });
  const stretch = () => Math.max(0, ((hook.y() || 0) - m(SLIDER_REST)) / ppm);
  // Lò xo: các vòng nối từ nắp trên tới đầu trượt; số vòng không đổi nên khoảng cách vòng tăng khi giãn.
  const coil = (ctx: Konva.Context, front: boolean) => {
    const top = TOP + 0.01;
    const end = SLIDER_REST + stretch();
    const R = 0.0072;
    const turns = 16;
    const tilt = R * 0.3;
    const steps = turns * 22;
    let pen = false;
    ctx.beginPath();
    for (let i = 0; i <= steps; i += 1) {
      const t = (i / steps) * turns * 2 * Math.PI;
      const x = R * Math.cos(t);
      const y = top + ((end - top) * i) / steps + tilt * Math.sin(t);
      if ((Math.sin(t) >= 0) === front) {
        if (!pen) ctx.moveTo(m(x), m(y));
        else ctx.lineTo(m(x), m(y));
        pen = true;
      } else pen = false;
    }
  };
  group.add(new Konva.Shape({ stroke: "#475569", strokeWidth: m(0.0012), lineCap: "round", listening: false, sceneFunc: (ctx, shape) => { coil(ctx, false); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Shape({
    strokeLinearGradientStartPoint: { x: m(-0.0072), y: 0 }, strokeLinearGradientEndPoint: { x: m(0.0072), y: 0 }, strokeLinearGradientColorStops: [0, "#64748b", 0.35, "#f1f5f9", 0.65, "#cbd5e1", 1, "#475569"],
    strokeWidth: m(0.0016), lineCap: "round", listening: false, sceneFunc: (ctx, shape) => { coil(ctx, true); ctx.fillStrokeShape(shape); },
  }));
  hook.add(new Konva.Rect({ x: m(-0.0105), y: m(-0.003), width: m(0.021), height: m(0.007), cornerRadius: m(0.002), ...lin(m(-0.0105), 0, m(0.0105), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  // Thanh kéo xuyên xuống dưới vỏ rồi tới móc.
  hook.add(new Konva.Rect({ x: m(-0.0028), y: m(0.004), width: m(0.0056), height: m(bottom - SLIDER_REST + 0.036), ...lin(m(-0.0028), 0, m(0.0028), 0, steel), stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
  const hookTop = bottom + 0.036 - SLIDER_REST;
  hook.add(new Konva.Line({ points: [0, m(hookTop), 0, m(hookTop + 0.012), m(0.007), m(hookTop + 0.02), m(0.007), m(hookTop + 0.03), m(0), m(hookTop + 0.036), m(-0.007), m(hookTop + 0.03)], stroke: "#e2e8f0", strokeWidth: m(0.0034), lineCap: "round", lineJoin: "round", tension: 0.3, shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.3, listening: false }));
  // Kim chỉ đỏ ngang qua cửa sổ thang, bám đầu trượt.
  hook.add(new Konva.Rect({ x: m(-W / 2 + 0.001), y: m(-0.0011), width: m(W - 0.002), height: m(0.0022), fill: "#dc2626", shadowColor: "#7f1d1d", shadowBlur: m(0.003), shadowOpacity: 0.6, listening: false }));
  group.add(hook);

  if (label) {
    group.add(new Konva.Text({ x: m(0.02), y: m(bottom - 0.02), text: label, fontSize: m(0.009), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { hook: { node: hook, motion: "slide" as const, axis: "down" as const, min: 0, max: STRETCH } },
    points: { topRing: { x: 0, y: m(0.0035) }, hookRest: { x: 0, y: m(bottom + 0.036) }, zeroMark: { x: m(scaleX), y: m(SLIDER_REST) } },
  };
};
