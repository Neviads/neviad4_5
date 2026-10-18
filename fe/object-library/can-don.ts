/* OBJECT-META
{
  "catalog": "Cân đòn / cân Roberval",
  "title": "Cân đòn hai đĩa: đế gang, trụ đứng, đòn cân có kim chỉ trên thang, hai đĩa treo dưới hai đầu đòn",
  "fill": "#b0832e",
  "anchor": "Giữa đáy chân cân, chạm mặt bàn.",
  "useWhen": ["Cần cân đòn hai đĩa kiểu Roberval có kim chỉ để so sánh khối lượng hai vật.","Cần đòn cân nghiêng quanh dao cân và hai đĩa bám theo hai đầu đòn."],
  "avoidWhen": ["Cần cân điện tử có số đọc: dùng can-dien-tu.","Cần đặt quả cân chuẩn lên đĩa: kèm hop-qua-can, vật này không có sẵn quả cân.","Cần đòn bẩy thanh cứng đơn giản có điểm tựa tuỳ ý: dùng don-bay."],
  "size": {
    "width": 0.332,
    "height": 0.386
  },
  "parts": [
    {
      "name": "beam",
      "label": "Đòn cân",
      "motion": "rotate",
      "min": -10,
      "max": 10,
      "description": "Góc nghiêng của đòn quanh dao cân, độ; dương là đầu phải đi xuống. Kim chỉ gắn vào đòn nên lệch theo."
    },
    {
      "name": "panLeft",
      "label": "Đĩa trái",
      "motion": "slide",
      "axis": "up",
      "min": -0.03,
      "max": 0.03,
      "description": "Độ nâng của đĩa trái (mét); engine đặt = −0,12·sin(góc đòn) để đĩa bám đầu đòn."
    },
    {
      "name": "panRight",
      "label": "Đĩa phải",
      "motion": "slide",
      "axis": "up",
      "min": -0.03,
      "max": 0.03,
      "description": "Độ nâng của đĩa phải (mét); engine đặt = +0,12·sin(góc đòn)."
    }
  ],
  "points": [
    {
      "name": "pivot",
      "description": "Dao cân, tâm quay của đòn."
    },
    {
      "name": "panLeftCenter",
      "description": "Tâm đáy đĩa trái ở tư thế cân bằng."
    },
    {
      "name": "panRightCenter",
      "description": "Tâm đáy đĩa phải ở tư thế cân bằng."
    }
  ],
  "notes": "Đòn dài 0,24 m, dao cân cao 0,24 m trên mặt bàn. Đĩa không quay theo đòn: chúng chỉ được nâng hạ, dây treo nối đầu đòn với móc đĩa được vẽ lại mỗi lần theo góc đòn. fill là màu đồng thau của đòn và đĩa."
}
*/
const makeBeamBalance = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const ARM = 0.12;
  const PIVOT_Y = -0.245;
  const PAN_HOOK_DY = 0.02;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const brass = [0, "#7c5a1a", 0.3, "#f6e3a4", 0.6, fill, 1, "#5e4210"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });

  const group = new Konva.Group({ x: p.x, y: p.y });

  // Đế gang đen có ba vít chỉnh phẳng, và bọt thuỷ chuẩn.
  group.add(new Konva.Rect({ x: m(-0.15), y: m(-0.022), width: m(0.3), height: m(0.022), cornerRadius: m(0.006), ...lin(0, m(-0.022), 0, 0, [0, "#52525b", 0.2, "#27272a", 1, "#09090b"]), stroke: "#000", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, listening: false }));
  group.add(ln([-0.14, -0.0205, 0.14, -0.0205], "rgba(255,255,255,0.28)", lw));
  for (const x of [-0.12, 0.12]) group.add(new Konva.Circle({ x: m(x), y: m(-0.003), radius: m(0.0042), fill: "#a1a1aa", stroke: "#18181b", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Circle({ x: m(0.085), y: m(-0.011), radius: m(0.0058), fill: "#bbf7d0", stroke: "#166534", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Circle({ x: m(0.0855), y: m(-0.0105), radius: m(0.0015), fill: "#14532d", listening: false }));
  // Trụ đỡ bằng đồng thau và tấm thang chia ở đỉnh.
  group.add(new Konva.Rect({ x: m(-0.011), y: m(PIVOT_Y + 0.012), width: m(0.022), height: m(-PIVOT_Y - 0.034), ...lin(m(-0.011), 0, m(0.011), 0, brass), stroke: "#4a3510", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.02), y: m(-0.034), width: m(0.04), height: m(0.014), cornerRadius: m(0.004), ...lin(m(-0.02), 0, m(0.02), 0, brass), stroke: "#4a3510", strokeWidth: lw * 0.8, listening: false }));
  // Thang chia dưới đòn: vạch 0 ở giữa, mỗi vạch 2°.
  const scaleY = PIVOT_Y + 0.105;
  group.add(new Konva.Arc({ x: 0, y: m(PIVOT_Y), innerRadius: m(0.098), outerRadius: m(0.112), angle: 34, rotation: 73, fill: "#fefce8", stroke: "#4a3510", strokeWidth: lw * 0.8, listening: false }));
  for (let i = -8; i <= 8; i += 1) {
    const a = ((90 + i * 2) * Math.PI) / 180;
    const len = i % 4 === 0 ? 0.0085 : 0.005;
    group.add(ln([0.112 * Math.cos(a), PIVOT_Y + 0.112 * Math.sin(a), (0.112 - len) * Math.cos(a), PIVOT_Y + (0.112 - len) * Math.sin(a)], "#0f172a", i === 0 ? lw * 1.6 : lw * 0.8));
  }
  group.add(new Konva.Text({ x: m(-0.004), y: m(scaleY + 0.014), text: "0", fontSize: m(0.0075), fontStyle: "bold", fill: "#e2e8f0", listening: false }));

  // BỘ PHẬN QUAY: đòn cân đồng thau, ba dao cân, kim chỉ buông xuống. Gốc nhóm ở dao giữa.
  const beam = new Konva.Group({ x: 0, y: m(PIVOT_Y) });
  beam.add(new Konva.Line({ points: [m(-ARM - 0.006), m(0.0), m(-ARM * 0.55), m(-0.0075), m(0), m(-0.0105), m(ARM * 0.55), m(-0.0075), m(ARM + 0.006), m(0.0), m(ARM * 0.55), m(0.0058), m(0), m(0.0075), m(-ARM * 0.55), m(0.0058)], closed: true, tension: 0.18, ...lin(0, m(-0.0105), 0, m(0.0075), brass), stroke: "#4a3510", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.35, listening: false }));
  for (const x of [-ARM, 0, ARM]) {
    beam.add(new Konva.Circle({ x: m(x), y: 0, radius: m(0.0042), fill: "#e4e4e7", stroke: "#3f3f46", strokeWidth: lw * 0.8, listening: false }));
  }
  for (const x of [-0.07, -0.035, 0.035, 0.07]) beam.add(new Konva.Circle({ x: m(x), y: m(-0.0005), radius: m(0.0017), fill: "#2b1d0a", listening: false }));
  // Kim chỉ rủ xuống thang, chạy theo đòn.
  beam.add(new Konva.Line({ points: [m(-0.0015), m(0.007), m(0), m(0.108), m(0.0015), m(0.007)], closed: true, fill: "#dc2626", stroke: "#7f1d1d", strokeWidth: lw * 0.5, listening: false }));
  group.add(beam);
  // Các đầu đòn có chốt móc: dây treo nối chốt với móc của đĩa, vẽ theo góc đòn hiện tại.
  const endPoint = (side: number) => {
    const a = ((beam.rotation() || 0) * Math.PI) / 180;
    return { x: side * m(ARM) * Math.cos(a), y: m(PIVOT_Y) + side * m(ARM) * Math.sin(a) };
  };

  // Hai đĩa cân: gốc nhóm là móc treo ở tư thế cân bằng.
  const pans: Record<string, Konva.Group> = {};
  for (const [name, side] of [["panLeft", -1], ["panRight", 1]] as const) {
    const pan = new Konva.Group({ x: m(side * ARM), y: m(PIVOT_Y + PAN_HOOK_DY) });
    pan.add(new Konva.Circle({ x: 0, y: 0, radius: m(0.0042), stroke: "#e4e4e7", strokeWidth: m(0.0026), listening: false }));
    pan.add(new Konva.Line({ points: [0, m(0.004), m(-0.036), m(0.088)], stroke: "#cbd5e1", strokeWidth: m(0.0014), listening: false }));
    pan.add(new Konva.Line({ points: [0, m(0.004), m(0.036), m(0.088)], stroke: "#cbd5e1", strokeWidth: m(0.0014), listening: false }));
    pan.add(new Konva.Ellipse({ x: 0, y: m(0.0885), radiusX: m(0.046), radiusY: m(0.007), ...lin(m(-0.046), 0, m(0.046), 0, brass), stroke: "#4a3510", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.35, listening: false }));
    pan.add(new Konva.Ellipse({ x: 0, y: m(0.0865), radiusX: m(0.04), radiusY: m(0.0048), fill: "rgba(255,247,200,0.55)", listening: false }));
    group.add(pan);
    pans[name] = pan;
  }
  // Dây treo: từ chốt đầu đòn tới móc đĩa.
  for (const [name, side] of [["panLeft", -1], ["panRight", 1]] as const) {
    group.add(new Konva.Shape({
      stroke: "#a1a1aa", strokeWidth: m(0.0016), lineCap: "round", listening: false,
      sceneFunc: (ctx, shape) => {
        const e = endPoint(side);
        const pan = pans[name];
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(pan.x(), pan.y());
        ctx.fillStrokeShape(shape);
      },
    }));
  }
  group.add(new Konva.Circle({ x: 0, y: m(PIVOT_Y), radius: m(0.0075), ...lin(m(-0.0075), 0, m(0.0075), 0, brass), stroke: "#4a3510", strokeWidth: lw, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(0.008), width: m(0.2), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      beam: { node: beam, motion: "rotate" as const, min: -10, max: 10 },
      panLeft: { node: pans.panLeft, motion: "slide" as const, axis: "up" as const, min: -0.03, max: 0.03 },
      panRight: { node: pans.panRight, motion: "slide" as const, axis: "up" as const, min: -0.03, max: 0.03 },
    },
    points: { pivot: { x: 0, y: m(PIVOT_Y) }, panLeftCenter: { x: m(-ARM), y: m(PIVOT_Y + PAN_HOOK_DY + 0.0885) }, panRightCenter: { x: m(ARM), y: m(PIVOT_Y + PAN_HOOK_DY + 0.0885) } },
  };
};
