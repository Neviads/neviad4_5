/* OBJECT-META
{
  "catalog": "Bình nhiệt lượng kế có dây đốt",
  "title": "Nhiệt lượng kế điện mặt cắt: cốc nhôm đựng nước trong vỏ cách nhiệt, nắp có hai chốt nối điện, dây đốt xoắn ngập trong nước và que khuấy kéo lên xuống",
  "fill": "#38bdf8",
  "anchor": "Giữa đáy bình, chạm mặt bàn.",
  "useWhen": ["Cần nhiệt lượng kế điện có dây đốt ngập trong nước, hai chốt nối + và − để đo nhiệt toả ra Q = I²Rt.", "Cảnh cần nối nguồn vào dây đốt, vừa đun vừa kéo que khuấy lên xuống."],
  "avoidWhen": ["Cần nhiệt lượng kế thường đo nhiệt dung riêng bằng trộn chất: dùng nhiet-luong-ke.", "Vật không có lỗ cắm nhiệt kế trên nắp; nhiệt kế phải đặt riêng."],
  "size": { "width": 0.096, "height": 0.146 },
  "parts": [
    { "name": "stirrer", "label": "Que khuấy", "motion": "slide", "axis": "up", "min": 0, "max": 0.04, "description": "Độ nâng que khuấy khỏi vị trí thấp nhất, mét; kéo lên xuống để khuấy đều nước." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy bình." },
    { "name": "terminalPlus", "description": "Chốt nối cực + của dây đốt trên nắp." },
    { "name": "terminalMinus", "description": "Chốt nối cực − của dây đốt trên nắp." },
    { "name": "heater", "description": "Giữa cuộn dây đốt trong nước." }
  ],
  "notes": "Bình ngoài bằng xốp cách nhiệt cao 0,1 m, đường kính 0,09 m; cốc nhôm bên trong chứa nước tới mực 0,07 m, dây đốt niken-crôm xoắn ở đáy, hai đầu nối lên hai chốt trên nắp nhựa. Que khuấy xuyên qua nắp, có vòng khuấy ở đáy và núm nhựa trên đầu. fill là màu nước."
}
*/
const makeElectricCalorimeter = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const OW = 0.09;
  const OH = 0.1;
  const IW = 0.07;
  const WATER = 0.07;
  const topY = -OH;
  const iTop = topY + 0.006;

  group.add(new Konva.Rect({ x: m(-OW / 2), y: m(topY), width: m(OW), height: m(OH), cornerRadius: m(0.004), ...lin(0, 0, m(OW), 0, [0, "#e5e7eb", 0.3, "#fafaf9", 1, "#a8a29e"]), stroke: "#57534e", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-IW / 2 - 0.0035), y: m(iTop - 0.001), width: m(IW + 0.007), height: m(OH - 0.012), cornerRadius: m(0.002), fill: "#0b1220", stroke: "#44403c", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(-IW / 2), y: m(iTop), width: m(IW), height: m(OH - 0.012), cornerRadius: m(0.002), ...lin(0, 0, m(IW), 0, [0, "#475569", 0.2, "#f1f5f9", 0.5, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-IW / 2 + 0.0035), y: m(iTop + 0.002), width: m(IW - 0.007), height: m(OH - 0.016), fill: "#0f172a", listening: false }));
  const wy = -0.007 - WATER;
  group.add(new Konva.Rect({ x: m(-IW / 2 + 0.0035), y: m(wy), width: m(IW - 0.007), height: m(WATER - 0.001), ...lin(0, 0, 0, m(WATER), [0, "rgba(125,211,252,0.72)", 1, "rgba(14,116,144,0.85)"]), listening: false }));
  group.add(new Konva.Rect({ x: m(-IW / 2 + 0.0035), y: m(wy - 0.0008), width: m(IW - 0.007), height: m(0.0022), fill: "rgba(224,242,254,0.9)", listening: false }));
  group.add(ln([-IW / 2 + 0.0055, wy + 0.004, -IW / 2 + 0.0055, -0.011], "rgba(255,255,255,0.4)", lw * 1.4));
  for (let i = 0; i <= 7; i += 1) {
    const y = -0.007 - i * 0.01;
    group.add(ln([IW / 2 - 0.0035, y, IW / 2 - (i % 5 === 0 ? 0.012 : 0.0075), y], "rgba(226,232,240,0.7)", lw * 0.7));
  }
  const hy = -0.017;
  const coil: number[] = [];
  for (let i = 0; i <= 12; i += 1) coil.push(-0.022 + (i * 0.044) / 12, hy + (i % 2 === 0 ? -0.0042 : 0.0042));
  group.add(ln(coil, "#e2e8f0", m(0.0017)));
  group.add(ln(coil.map((v, i) => (i % 2 === 1 ? v - 0.0006 : v)), "#fb923c", lw * 0.8));
  for (const s of [-1, 1]) group.add(ln([s * 0.022, hy, s * 0.027, hy, s * 0.027, iTop - 0.004], "#e2e8f0", m(0.0017)));

  group.add(new Konva.Rect({ x: m(-OW / 2 - 0.003), y: m(topY - 0.007), width: m(OW + 0.006), height: m(0.01), cornerRadius: m(0.003), ...lin(0, 0, 0, m(0.01), [0, "#ffffff", 0.5, "#e2e8f0", 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw, listening: false }));
  group.add(ln([-OW / 2, topY - 0.0055, OW / 2, topY - 0.0055], "rgba(255,255,255,0.9)", lw * 1.2));
  for (const [x, c, cc] of [[-0.03, "#ef4444", "#7f1d1d"], [0.03, "#1f2937", "#030712"]] as [number, string, string][]) {
    group.add(new Konva.Rect({ x: m(x - 0.0035), y: m(topY - 0.013), width: m(0.007), height: m(0.007), ...lin(0, 0, m(0.007), 0, steel), stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(topY - 0.0155), radius: m(0.0048), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0048), fillRadialGradientColorStops: [0, "#fff", 0.35, c, 1, cc], stroke: cc, strokeWidth: lw * 0.6, listening: false }));
  }

  const stirrer = new Konva.Group();
  stirrer.add(new Konva.Rect({ x: m(-0.0014), y: m(topY - 0.036), width: m(0.0028), height: m(0.036 - 0.026 - topY), ...lin(0, 0, m(0.0028), 0, steel), stroke: "#334155", strokeWidth: lw * 0.5, listening: false }));
  stirrer.add(new Konva.Ellipse({ x: 0, y: m(-0.026), radiusX: m(0.0185), radiusY: m(0.0042), stroke: "#e2e8f0", strokeWidth: m(0.0017), listening: false }));
  stirrer.add(new Konva.Ellipse({ x: 0, y: m(-0.026), radiusX: m(0.0185), radiusY: m(0.0042), stroke: "#475569", strokeWidth: lw * 0.5, listening: false }));
  stirrer.add(new Konva.Rect({ x: m(-0.0055), y: m(topY - 0.0455), width: m(0.011), height: m(0.011), cornerRadius: m(0.0035), ...lin(0, 0, m(0.011), 0, [0, "#fecaca", 0.35, "#dc2626", 1, "#450a0a"]), stroke: "#450a0a", strokeWidth: lw * 0.8, listening: false }));
  group.add(stirrer);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.006), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { stirrer: { node: stirrer, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.04 } },
    points: { base: { x: 0, y: 0 }, terminalPlus: { x: m(-0.03), y: m(topY - 0.0155) }, terminalMinus: { x: m(0.03), y: m(topY - 0.0155) }, heater: { x: 0, y: m(hy) } },
  };
};
