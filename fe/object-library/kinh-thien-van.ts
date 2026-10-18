/* OBJECT-META
{
  "catalog": "Kính thiên văn",
  "title": "Kính thiên văn khúc xạ nhìn ngang trên giá ba chân: ống chính có che sương, ống ngắm, ống trượt mang thị kính, núm lấy nét",
  "fill": "#e5e7eb",
  "anchor": "Giữa chân giá, chạm mặt bàn.",
  "useWhen": ["Cần kính thiên văn khúc xạ nhìn ngang trên giá ba chân, vật kính bên phải, thị kính bên trái.", "Cảnh cần ống trượt kéo 0,04 m để lấy nét, ống chính dài 0,39 m."],
  "avoidWhen": ["Cần kính hiển vi quan sát vật nhỏ: dùng kinh-hien-vi.", "Cần kính lúp hay thấu kính đơn: dùng kinh-lup, thau-kinh-hoi-tu; kính này chỉ là loại khúc xạ, không có gương."],
  "size": { "width": 0.493, "height": 0.26 },
  "parts": [
    { "name": "drawtube", "label": "Ống trượt", "motion": "slide", "axis": "left", "min": 0, "max": 0.04, "description": "Độ kéo ống trượt mang thị kính ra khỏi thân kính, mét, theo hướng về phía mắt (sang trái); dùng để lấy nét." }
  ],
  "points": [
    { "name": "mount", "description": "Trục xoay đầu giá ba chân." },
    { "name": "objective", "description": "Giữa vật kính ở đầu phía phải của ống chính." },
    { "name": "eyepiece", "description": "Giữa thị kính ở đầu trái, ống trượt đang thu hết." },
    { "name": "foot", "description": "Giữa chân giá ở mặt bàn." }
  ],
  "notes": "Ống chính dài 0,39 m, đường kính 0,034 m, tiêu cự vật kính khoảng 0,4 m; ống trượt kéo được 0,04 m để lấy nét. Vật kính ở bên phải, mắt đặt ở thị kính bên trái. fill là màu sơn ống chính."
}
*/
const makeTelescope = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const rod = (x: number, y: number, w: number, h: number, stops: (number | string)[], r = 0.0015) => new Konva.Rect({ x: m(x), y: m(y), width: m(w), height: m(h), cornerRadius: m(r), ...lin(0, m(y), 0, m(y + h), stops), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cy = -0.215;
  const wood = [0, "#b45309", 0.4, "#d97706", 1, "#78350f"];

  // Giá ba chân: chân sau tối, hai chân trước sáng, khay giữ ở giữa, bàn chân đen.
  group.add(ln([0.004, -0.19, 0.016, -0.001], "#451a03", m(0.009)));
  for (const s of [-1, 1]) {
    group.add(ln([0, -0.19, s * 0.085, -0.001], "#1c1917", m(0.0125)));
    group.add(ln([0, -0.19, s * 0.085, -0.001], "#b45309", m(0.0095)));
    group.add(ln([s * 0.0045, -0.186, s * 0.0885, -0.004], "rgba(255,255,255,0.28)", lw * 1.2));
    group.add(new Konva.Rect({ x: m(s * 0.085 - 0.007), y: m(-0.004), width: m(0.014), height: m(0.004), cornerRadius: m(0.001), fill: "#0f172a", listening: false }));
  }
  group.add(new Konva.Rect({ x: m(-0.05), y: m(-0.076), width: m(0.1), height: m(0.006), cornerRadius: m(0.0015), ...lin(0, m(-0.076), 0, m(-0.07), wood), stroke: "#451a03", strokeWidth: lw, listening: false }));
  group.add(ln([-0.02, -0.0755, 0.02, -0.0755], "rgba(255,255,255,0.3)", lw));

  // Đầu giá: khối thép, trục xoay và vòng ôm ống.
  group.add(rod(-0.016, -0.2, 0.032, 0.022, [0, "#334155", 0.4, "#e2e8f0", 1, "#1e293b"], 0.004));
  group.add(new Konva.Circle({ x: 0, y: m(-0.19), radius: m(0.0125), ...lin(m(-0.0125), m(-0.2025), m(0.0125), m(-0.1775), steel), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(-0.19), radius: m(0.004), fill: "#1e293b", listening: false }));
  group.add(rod(-0.014, cy + 0.017, 0.028, 0.012, [0, "#475569", 0.4, "#e2e8f0", 1, "#334155"], 0.002));

  // Ống ngắm nhỏ gắn bên trên bằng hai giá đỡ.
  for (const x of [-0.12, -0.07]) group.add(rod(x - 0.0035, cy - 0.032, 0.007, 0.015, [0, "#475569", 0.4, "#e2e8f0", 1, "#334155"], 0.001));
  group.add(rod(-0.14, cy - 0.0405, 0.1, 0.0105, [0, "#f8fafc", 0.4, "#94a3b8", 1, "#0f172a"], 0.003));
  group.add(rod(-0.152, cy - 0.037, 0.014, 0.0045, [0, "#f1f5f9", 0.5, "#64748b", 1, "#0f172a"], 0.001));
  group.add(rod(-0.043, cy - 0.043, 0.006, 0.0145, steel, 0.001));

  // Ống chính sơn trắng: thân, vòng thép, che sương phía vật kính và ổ lấy nét phía mắt.
  group.add(rod(-0.15, cy - 0.017, 0.3, 0.034, [0, "#ffffff", 0.3, fill, 0.7, "#94a3b8", 1, "#334155"], 0.003));
  group.add(ln([-0.14, cy - 0.0125, 0.14, cy - 0.0125], "rgba(255,255,255,0.65)", lw * 1.4));
  for (const x of [-0.1, 0.02]) group.add(rod(x, cy - 0.0185, 0.005, 0.037, steel, 0.001));
  group.add(rod(0.15, cy - 0.021, 0.06, 0.042, [0, "#ffffff", 0.3, fill, 0.7, "#94a3b8", 1, "#1e293b"], 0.003));
  group.add(rod(0.207, cy - 0.0225, 0.01, 0.045, [0, "#1f2937", 0.4, "#6b7280", 1, "#030712"], 0.002));
  group.add(new Konva.Rect({ x: m(0.2165), y: m(cy - 0.018), width: m(0.0022), height: m(0.036), fill: "rgba(125,211,252,0.85)", shadowColor: "#7dd3fc", shadowBlur: m(0.006), shadowOpacity: 0.7, listening: false }));
  group.add(rod(-0.2, cy - 0.025, 0.052, 0.05, [0, "#374151", 0.35, "#9ca3af", 1, "#030712"], 0.004));
  // Núm lấy nét bên dưới ổ.
  group.add(new Konva.Circle({ x: m(-0.172), y: m(cy + 0.0345), radius: m(0.0095), ...lin(m(-0.18), m(cy + 0.025), m(-0.164), m(cy + 0.044), [0, "#9ca3af", 0.4, "#f1f5f9", 1, "#374151"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(ln([-0.172, cy + 0.0345, -0.172, cy + 0.0345], "#0f172a", m(0.003)));

  // BỘ PHẬN TRƯỢT: ống trượt thép chui vào ổ lấy nét, nối thị kính có chụp cao su.
  const drawtube = new Konva.Group();
  drawtube.add(rod(-0.225, cy - 0.0125, 0.06, 0.025, steel, 0.0015));
  drawtube.add(rod(-0.2, cy - 0.0125, 0.003, 0.025, [0, "#334155", 0.5, "#94a3b8", 1, "#0f172a"], 0));
  drawtube.add(rod(-0.2595, cy - 0.0155, 0.037, 0.031, [0, "#111827", 0.35, "#4b5563", 1, "#030712"], 0.003));
  drawtube.add(rod(-0.2675, cy - 0.0125, 0.01, 0.025, [0, "#0b1220", 0.4, "#374151", 1, "#020617"], 0.004));
  drawtube.add(new Konva.Rect({ x: m(-0.2692), y: m(cy - 0.0085), width: m(0.0022), height: m(0.017), fill: "rgba(56,189,248,0.7)", listening: false }));
  group.add(drawtube);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(0.008), width: m(0.2), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { drawtube: { node: drawtube, motion: "slide" as const, axis: "left" as const, min: 0, max: 0.04 } },
    points: { mount: { x: 0, y: m(-0.19) }, objective: { x: m(0.2165), y: m(cy) }, eyepiece: { x: m(-0.2692), y: m(cy) }, foot: { x: 0, y: 0 } },
  };
};
