/* OBJECT-META
{
  "catalog": "Con lắc lò xo",
  "title": "Con lắc lò xo treo thẳng đứng: giá đỡ có xà ngang, lò xo xoắn, vật nặng 200 g và thước đo li độ bên cạnh",
  "fill": "#334155",
  "anchor": "Điểm treo của lò xo ở xà ngang.",
  "useWhen": ["Cần con lắc lò xo treo thẳng đứng, vật nặng 200 g và thước đo li độ chia mm.","Cần lò xo co giãn theo li độ x từ -0,1 đến 0,12 m quanh vị trí cân bằng."],
  "avoidWhen": ["Cần lò xo nằm ngang hoặc lò xo rời không có giá: dùng lo-xo.","Cần lực kế đọc số khi treo vật: dùng luc-ke-lo-xo; vật này không có thang đo lực."],
  "size": { "width": 0.4, "height": 0.669 },
  "parts": [
    { "name": "mass", "label": "Vật nặng", "motion": "slide", "axis": "down", "min": -0.1, "max": 0.12, "description": "Li độ của vật nặng so với vị trí cân bằng (mét), dương là xuống dưới. Lò xo co giãn theo: chiều dài = 0,2 + 0,06 + x." }
  ],
  "points": [
    { "name": "pivot", "description": "Điểm treo của lò xo." },
    { "name": "equilibrium", "description": "Tâm vật nặng ở vị trí cân bằng (0,28 m dưới điểm treo)." },
    { "name": "rulerZero", "description": "Vạch 0 của thước, ngang vị trí cân bằng." }
  ],
  "notes": "Lò xo tự nhiên dài 0,20 m; vật nặng 0,06 m × 0,05 m, treo vào làm lò xo giãn tới 0,26 m. Thước chia mm đặt cạnh, vạch 0 ngang vị trí cân bằng, chia hai phía ±12 cm. fill là màu sơn của khung giá."
}
*/
const makeSpringPendulum = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const REST_TOP = 0.26;
  const MASS_W = 0.056;
  const MASS_H = 0.05;
  const COIL_R = 0.0155;
  const POLE_X = -0.13;
  const BASE_Y = 0.62;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Giá: đế, trụ đứng bên trái, xà ngang đưa ra tới điểm treo.
  group.add(new Konva.Rect({ x: m(-0.2), y: m(BASE_Y), width: m(0.4), height: m(0.026), cornerRadius: m(0.005), ...lin(0, m(BASE_Y), 0, m(BASE_Y + 0.026), [0, "#94a3b8", 0.15, fill, 1, "#0f172a"]), stroke: "#0b1220", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  group.add(new Konva.Rect({ x: m(POLE_X - 0.007), y: m(-0.02), width: m(0.014), height: m(BASE_Y + 0.02), cornerRadius: m(0.004), ...lin(m(POLE_X - 0.007), 0, m(POLE_X + 0.007), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(POLE_X - 0.007), y: m(-0.018), width: m(0.12), height: m(0.012), cornerRadius: m(0.004), ...lin(0, m(-0.018), 0, m(-0.006), [0, "#f8fafc", 0.2, "#cbd5e1", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(POLE_X - 0.0145), y: m(-0.0225), width: m(0.029), height: m(0.02), cornerRadius: m(0.003), ...lin(m(POLE_X - 0.0145), 0, m(POLE_X + 0.0145), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0075), y: m(-0.006), width: m(0.015), height: m(0.009), cornerRadius: m(0.002), fill: "#94a3b8", stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(0.003), radius: m(0.003), fill: "#e2e8f0", stroke: "#0b1220", strokeWidth: lw * 0.6, listening: false }));

  // Thước chia mm ở bên phải, vạch 0 ngang vị trí cân bằng.
  const eq = REST_TOP + MASS_H / 2;
  const rx = 0.115;
  group.add(new Konva.Rect({ x: m(rx), y: m(eq - 0.12), width: m(0.026), height: m(0.24), cornerRadius: m(0.003), ...lin(m(rx), 0, m(rx + 0.026), 0, [0, "#fdf0cf", 1, "#e5c88a"]), stroke: "#6b4a1e", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.3, listening: false }));
  for (let mm = -120; mm <= 120; mm += 2) {
    const y = eq + mm / 1000;
    const cm = mm % 10 === 0;
    group.add(ln([rx, y, rx + (cm ? 0.0105 : mm % 5 === 0 ? 0.0075 : 0.0045), y], mm === 0 ? "#dc2626" : "#1f1305", mm === 0 ? lw * 1.6 : cm ? lw : lw * 0.6));
    if (cm && mm % 20 === 0 && mm !== 0) group.add(new Konva.Text({ x: m(rx + 0.0115), y: m(y - 0.0036), text: String(Math.abs(mm / 10)), fontSize: m(0.0072), fontStyle: "bold", fill: "#1f1305", listening: false }));
  }

  // BỘ PHẬN TRƯỢT: vật nặng và đầu dưới của lò xo. Gốc nhóm là mép trên của vật nặng ở vị trí cân bằng.
  const mass = new Konva.Group({ x: 0, y: m(REST_TOP) });
  const topY = () => ((mass.y() || 0) / ppm);
  /** Lò xo từ điểm treo xuống tới mép trên vật nặng, số vòng cố định. */
  const coil = (ctx: Konva.Context, front: boolean) => {
    const top = 0.012;
    const end = topY() - 0.008;
    const turns = 13;
    const tilt = COIL_R * 0.3;
    const steps = turns * 22;
    let pen = false;
    ctx.beginPath();
    for (let i = 0; i <= steps; i += 1) {
      const t = (i / steps) * turns * 2 * Math.PI;
      const x = COIL_R * Math.cos(t);
      const y = top + ((end - top) * i) / steps + tilt * Math.sin(t);
      if ((Math.sin(t) >= 0) === front) {
        if (!pen) ctx.moveTo(m(x), m(y));
        else ctx.lineTo(m(x), m(y));
        pen = true;
      } else pen = false;
    }
  };
  group.add(new Konva.Shape({ stroke: "#475569", strokeWidth: m(0.0017), lineCap: "round", listening: false, sceneFunc: (ctx, shape) => { coil(ctx, false); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Shape({
    strokeLinearGradientStartPoint: { x: m(-COIL_R), y: 0 }, strokeLinearGradientEndPoint: { x: m(COIL_R), y: 0 }, strokeLinearGradientColorStops: [0, "#64748b", 0.35, "#f1f5f9", 0.65, "#cbd5e1", 1, "#475569"],
    strokeWidth: m(0.0022), lineCap: "round", listening: false, sceneFunc: (ctx, shape) => { coil(ctx, true); ctx.fillStrokeShape(shape); },
  }));
  mass.add(new Konva.Rect({ x: m(-0.0035), y: m(-0.012), width: m(0.007), height: m(0.016), fill: "#cbd5e1", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  mass.add(new Konva.Circle({ x: 0, y: m(-0.012), radius: m(0.0042), stroke: "#e2e8f0", strokeWidth: m(0.0022), listening: false }));
  mass.add(new Konva.Rect({ x: m(-MASS_W / 2), y: m(0.004), width: m(MASS_W), height: m(MASS_H - 0.004), cornerRadius: m(0.004), ...lin(m(-MASS_W / 2), 0, m(MASS_W / 2), 0, [0, "#1f2937", 0.2, "#6b7280", 0.55, "#374151", 1, "#0b0f19"]), stroke: "#030712", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.003) }, listening: false }));
  mass.add(new Konva.Line({ points: [m(-MASS_W / 2 + 0.005), m(0.008), m(MASS_W / 2 - 0.005), m(0.008)], stroke: "rgba(255,255,255,0.45)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  mass.add(new Konva.Text({ x: m(-MASS_W / 2), y: m(0.022), width: m(MASS_W), align: "center", text: "200 g", fontSize: m(0.0105), fontStyle: "bold", fill: "#e5e7eb", listening: false }));
  mass.add(new Konva.Line({ points: [m(-MASS_W / 2 - 0.004), m(MASS_H / 2 + 0.002), m(-MASS_W / 2 + 0.0), m(MASS_H / 2 + 0.002)], stroke: "#dc2626", strokeWidth: lw * 1.4, lineCap: "round", listening: false }));
  group.add(mass);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.2), y: m(BASE_Y + 0.034), width: m(0.4), align: "center", text: label, fontSize: m(0.02), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { mass: { node: mass, motion: "slide" as const, axis: "down" as const, min: -0.1, max: 0.12 } },
    points: { pivot: { x: 0, y: 0 }, equilibrium: { x: 0, y: m(eq) }, rulerZero: { x: m(rx), y: m(eq) } },
  };
};
