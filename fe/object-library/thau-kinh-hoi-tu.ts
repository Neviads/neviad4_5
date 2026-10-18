/* OBJECT-META
{
  "catalog": "Thấu kính hội tụ / phân kì",
  "title": "Thấu kính hội tụ hai mặt lồi (mặt cắt) trên kẹp giá quang học",
  "fill": "#60758b",
  "anchor": "Quang tâm O.",
  "useWhen": ["Cần thấu kính hội tụ hai mặt lồi dạng mặt cắt, kẹp trên giá quang học, quang tâm O ở giữa.","Cần khẩu độ 0,20 m, dày 0,04 m để tia sáng vẽ qua thấu kính."],
  "avoidWhen": ["Cần thấu kính phân kì (rìa dày hơn giữa): vật này là hai mặt lồi, không phải kính phân kì.","Cần kính lúp cầm tay có tay cầm: dùng kinh-lup.","Tiêu cự, F, F' và tia sáng không có trong vật, phải do cảnh thêm."],
  "size": {
    "width": 0.03,
    "height": 0.266
  },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Quang tâm O, nằm trên trục chính."
    },
    {
      "name": "top",
      "description": "Mép trên của thấu kính."
    },
    {
      "name": "bottom",
      "description": "Mép dưới của thấu kính."
    }
  ],
  "notes": "Khẩu độ 0,20 m, dày 0,04 m ở giữa. Tiêu cự không thuộc hình vẽ: engine đặt F và F' trên trục chính, tia sáng vẽ bằng metrics.items. Không dùng fill (thuỷ tinh luôn trong suốt)."
}
*/
const makeConvergingLens = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const APERTURE = 0.2;
  const THICK = 0.04;
  const EDGE = 0.006;
  const m = (v: number) => v * ppm;

  const group = new Konva.Group({ x: p.x, y: p.y });
  const half = m(APERTURE / 2);
  const e = m(EDGE / 2);
  const sag = m((THICK - EDGE) / 2);
  const lensPath = (h: number, edge: number, bulge: number) => {
    const r = (h * h + bulge * bulge) / (2 * bulge);
    return `M ${edge} ${-h} A ${r} ${r} 0 0 1 ${edge} ${h} L ${-edge} ${h} A ${r} ${r} 0 0 1 ${-edge} ${-h} Z`;
  };

  // Kẹp trên và chân kẹp dưới (giá quang học).
  const metal = "#64748b";
  const edgeStroke = "#cbd5e1";
  const thin = Math.max(1, m(0.0015));
  group.add(new Konva.Rect({ x: m(-0.012), y: -half - m(0.022), width: m(0.024), height: m(0.026), cornerRadius: m(0.003), fill: metal, stroke: edgeStroke, strokeWidth: thin, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: -half - m(0.028), radius: m(0.006), fill: "#94a3b8", stroke: edgeStroke, strokeWidth: thin, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.012), y: half - m(0.004), width: m(0.024), height: m(0.03), cornerRadius: m(0.003), fill: metal, stroke: edgeStroke, strokeWidth: thin, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.004), y: half + m(0.026), width: m(0.008), height: m(0.006), fill: "#475569", listening: false }));

  // Thấu kính: thuỷ tinh trong, đậm hơn ở mép, sáng ở giữa.
  group.add(new Konva.Path({
    data: lensPath(half, e, sag),
    fillLinearGradientStartPoint: { x: -m(THICK / 2), y: 0 }, fillLinearGradientEndPoint: { x: m(THICK / 2), y: 0 },
    fillLinearGradientColorStops: [0, "rgba(125,211,252,0.42)", 0.35, "rgba(224,242,254,0.3)", 0.65, "rgba(186,230,253,0.22)", 1, "rgba(56,189,248,0.4)"],
    stroke: "rgba(224,242,254,0.95)", strokeWidth: Math.max(1, m(0.002)),
    shadowColor: "#38bdf8", shadowBlur: m(0.012), shadowOpacity: 0.35, listening: false,
  }));
  // Phản chiếu: một vệt cong sáng gần mặt trái và một vệt mờ gần mặt phải.
  group.add(new Konva.Path({ data: lensPath(half * 0.82, e, sag * 0.55), fill: "rgba(255,255,255,0.1)", listening: false }));
  group.add(new Konva.Line({ points: [-m(0.009), -half * 0.62, -m(0.014), -half * 0.1], stroke: "rgba(255,255,255,0.7)", strokeWidth: Math.max(1, m(0.0025)), lineCap: "round", tension: 0.3, listening: false }));
  group.add(new Konva.Line({ points: [m(0.012), half * 0.15, m(0.01), half * 0.55], stroke: "rgba(255,255,255,0.3)", strokeWidth: Math.max(1, m(0.002)), lineCap: "round", listening: false }));
  // Quang tâm.
  group.add(new Konva.Circle({ radius: Math.max(1.5, m(0.0025)), fill: "#f8fafc", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(0.03), y: -half - m(0.03), text: label, fontSize: m(0.02), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: { center: { x: 0, y: 0 }, top: { x: 0, y: -half }, bottom: { x: 0, y: half } },
  };
};
