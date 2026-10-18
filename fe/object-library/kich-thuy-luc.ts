/* OBJECT-META
{
  "catalog": "Máy nén / kích thuỷ lực",
  "title": "Mô hình máy nén thuỷ lực: xi lanh nhỏ và xi lanh lớn trong suốt nối nhau ở đáy, đựng dầu màu, hai pít tông có cần",
  "fill": "#facc15",
  "anchor": "Giữa đáy bệ thép, chạm mặt bàn.",
  "useWhen": ["Cần máy nén thuỷ lực hai xi lanh, tỉ lệ diện tích 1 : 12,5, minh hoạ định luật Pascal.", "Cảnh cần hai pít tông trượt: ấn nhỏ 0,08 m thì pít tông lớn dâng 0,0064 m."],
  "avoidWhen": ["Cần xi lanh đơn có khí nén hay chu trình: dùng xi-lanh-pit-tong.", "Cần bơm tay hay bơm nước hút đẩy: dùng bom-tay; mô hình này không có van, tay bơm."],
  "size": { "width": 0.4, "height": 0.338 },
  "parts": [
    { "name": "smallPiston", "label": "Pít tông nhỏ", "motion": "slide", "axis": "down", "min": 0, "max": 0.08, "description": "Độ ấn xuống của pít tông nhỏ (mét). Dầu bị đẩy sang xi lanh lớn." },
    { "name": "largePiston", "label": "Pít tông lớn", "motion": "slide", "axis": "up", "min": 0, "max": 0.0064, "description": "Độ dâng của pít tông lớn (mét): dầu không nén được nên S1·s1 = S2·s2; diện tích hai pít tông tỉ lệ 1 : 12,5 nên s2 = s1 / 12,5 (ấn pít tông nhỏ 0,08 m thì pít tông lớn dâng 0,0064 m)." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy bệ." },
    { "name": "smallTop", "description": "Mặt trên của pít tông nhỏ ở tư thế nghỉ (nơi đặt lực đẩy)." },
    { "name": "largeTop", "description": "Mặt trên của pít tông lớn ở tư thế nghỉ (bệ đặt tải)." }
  ],
  "notes": "Xi lanh nhỏ lòng rộng 0,034 m, xi lanh lớn lòng rộng 0,12 m (diện tích tỉ lệ 1 : 12,5). Mực dầu trong mỗi xi lanh bám theo mặt dưới pít tông tương ứng. fill là màu dầu."
}
*/
const makeHydraulicPress = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const SMALL_X = -0.125;
  const LARGE_X = 0.085;
  const SMALL_R = 0.017;
  const LARGE_R = 0.06;
  const CYL_H = 0.22;
  const BASE_H = 0.046;
  const SMALL_REST = 0.12;
  const LARGE_REST = 0.07;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const yBottom = -BASE_H;

  // Bệ thép chứa đường ống nối hai xi lanh ở bên trong.
  group.add(new Konva.Rect({ x: m(-0.2), y: m(-BASE_H), width: m(0.4), height: m(BASE_H), cornerRadius: m(0.006), ...lin(0, m(-BASE_H), 0, 0, [0, "#94a3b8", 0.2, "#334155", 1, "#0f172a"]), stroke: "#0b1220", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.016), shadowOpacity: 0.45, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.18), y: m(-0.034), width: m(0.36), height: m(0.016), cornerRadius: m(0.008), fill: "#0b1220", stroke: "#475569", strokeWidth: lw * 0.8, listening: false }));
  // Ống dầu nối: luôn đầy dầu.
  group.add(new Konva.Rect({ x: m(-0.168), y: m(-0.0325), width: m(0.336), height: m(0.013), cornerRadius: m(0.0065), fill, opacity: 0.88, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.15), m(-0.0295), m(0.15), m(-0.0295)], stroke: "rgba(255,255,255,0.45)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  group.add(new Konva.Text({ x: m(-0.2), y: m(-0.0165), width: m(0.4), align: "center", text: "HYDRAULIC PRESS", fontSize: m(0.0072), fontStyle: "bold", fill: "#e2e8f0", listening: false }));

  // BỘ PHẬN TRƯỢT: hai pít tông. Gốc nhóm là mặt dưới của pít tông; cần và bệ nằm phía trên.
  const small = new Konva.Group({ x: m(SMALL_X), y: m(yBottom - SMALL_REST) });
  const large = new Konva.Group({ x: m(LARGE_X), y: m(yBottom - LARGE_REST) });
  const oilTop = (g: Konva.Group) => (g.y() || 0) / ppm; // mét, âm: cao hơn mặt đất

  // Dầu trong hai xi lanh: từ đáy tới mặt dưới pít tông.
  for (const [g, x, r] of [[small, SMALL_X, SMALL_R], [large, LARGE_X, LARGE_R]] as const) {
    group.add(new Konva.Shape({
      ...lin(0, 0, 0, m(-0.2), [0, "rgba(234,179,8,0.95)", 1, "rgba(250,204,21,0.85)"]), fill, opacity: 0.9, listening: false,
      sceneFunc: (ctx, shape) => {
        const top = oilTop(g);
        ctx.beginPath();
        ctx.moveTo(m(x - r + 0.0025), m(yBottom));
        ctx.lineTo(m(x - r + 0.0025), m(top));
        ctx.lineTo(m(x + r - 0.0025), m(top));
        ctx.lineTo(m(x + r - 0.0025), m(yBottom));
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      },
    }));
  }
  // Hai xi lanh thuỷ tinh: thành dày trong suốt, vành kim loại hai đầu.
  for (const [x, r] of [[SMALL_X, SMALL_R], [LARGE_X, LARGE_R]] as const) {
    group.add(new Konva.Rect({ x: m(x - r - 0.0035), y: m(yBottom - CYL_H), width: m(2 * r + 0.007), height: m(CYL_H), ...lin(m(x - r), 0, m(x + r), 0, [0, "rgba(186,230,253,0.5)", 0.2, "rgba(248,250,252,0.1)", 0.8, "rgba(224,242,254,0.08)", 1, "rgba(100,170,210,0.5)"]), stroke: "rgba(226,240,252,0.95)", strokeWidth: lw * 1.4, listening: false }));
    group.add(new Konva.Line({ points: [m(x - r + 0.002), m(yBottom - CYL_H + 0.01), m(x - r + 0.002), m(yBottom - 0.01)], stroke: "rgba(255,255,255,0.65)", strokeWidth: lw * 2, lineCap: "round", listening: false }));
    group.add(new Konva.Rect({ x: m(x - r - 0.0065), y: m(yBottom - 0.008), width: m(2 * r + 0.013), height: m(0.01), cornerRadius: m(0.002), ...lin(m(x - r), 0, m(x + r), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Rect({ x: m(x - r - 0.0065), y: m(yBottom - CYL_H - 0.004), width: m(2 * r + 0.013), height: m(0.012), cornerRadius: m(0.002), ...lin(m(x - r), 0, m(x + r), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
    // Vạch chia mm bên cạnh xi lanh.
    for (let h = 0; h <= 20; h += 1) group.add(new Konva.Line({ points: [m(x + r + 0.004), m(yBottom - h * 0.01), m(x + r + (h % 5 === 0 ? 0.012 : 0.008)), m(yBottom - h * 0.01)], stroke: "rgba(226,232,240,0.6)", strokeWidth: lw * 0.7, listening: false }));
  }

  // Pít tông nhỏ: đầu pít tông đen có gioăng, cần thép và núm bấm.
  small.add(new Konva.Rect({ x: m(-SMALL_R + 0.0015), y: m(-0.016), width: m(2 * SMALL_R - 0.003), height: m(0.016), cornerRadius: m(0.002), ...lin(m(-SMALL_R), 0, m(SMALL_R), 0, [0, "#1f2937", 0.4, "#6b7280", 1, "#030712"]), stroke: "#030712", strokeWidth: lw, listening: false }));
  small.add(new Konva.Rect({ x: m(-0.0034), y: m(-0.16), width: m(0.0068), height: m(0.144), ...lin(m(-0.0034), 0, m(0.0034), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  small.add(new Konva.Rect({ x: m(-0.022), y: m(-0.172), width: m(0.044), height: m(0.012), cornerRadius: m(0.005), ...lin(0, m(-0.172), 0, m(-0.16), [0, "#fca5a5", 0.4, "#dc2626", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw, listening: false }));
  group.add(small);
  // Pít tông lớn: đầu pít tông, cần và bệ đặt tải hình chữ nhật.
  large.add(new Konva.Rect({ x: m(-LARGE_R + 0.0015), y: m(-0.022), width: m(2 * LARGE_R - 0.003), height: m(0.022), cornerRadius: m(0.003), ...lin(m(-LARGE_R), 0, m(LARGE_R), 0, [0, "#1f2937", 0.4, "#6b7280", 1, "#030712"]), stroke: "#030712", strokeWidth: lw, listening: false }));
  large.add(new Konva.Rect({ x: m(-0.007), y: m(-0.082), width: m(0.014), height: m(0.06), ...lin(m(-0.007), 0, m(0.007), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  large.add(new Konva.Rect({ x: m(-0.07), y: m(-0.095), width: m(0.14), height: m(0.014), cornerRadius: m(0.003), ...lin(m(-0.07), 0, m(0.07), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.35, listening: false }));
  large.add(new Konva.Line({ points: [m(-0.066), m(-0.0935), m(0.066), m(-0.0935)], stroke: "rgba(255,255,255,0.65)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  group.add(large);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.2), y: m(0.006), width: m(0.4), align: "center", text: label, fontSize: m(0.014), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      smallPiston: { node: small, motion: "slide" as const, axis: "down" as const, min: 0, max: 0.08 },
      largePiston: { node: large, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.0064 },
    },
    points: { base: { x: 0, y: 0 }, smallTop: { x: m(SMALL_X), y: m(yBottom - SMALL_REST - CYL_H + 0.02) }, largeTop: { x: m(LARGE_X), y: m(yBottom - LARGE_REST - 0.095) } },
  };
};
