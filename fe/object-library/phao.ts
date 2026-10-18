/* OBJECT-META
{
  "catalog": "Phao / vật nổi trên mặt nước",
  "title": "Phao câu đỏ trắng nổi thẳng đứng trên mặt nước, sợi dây buộc chì ở phía dưới",
  "fill": "#dc2626",
  "anchor": "Tâm phao ở vị trí cân bằng, ngang mặt nước tĩnh.",
  "useWhen": ["Cần phao câu nổi thẳng đứng trên mặt nước, có dây và chì, để chỉ dao động tại chỗ của phần tử sóng.","Cần mặt nước tĩnh có điểm cân bằng và đường nước sẵn."],
  "avoidWhen": ["Cần vật nổi lớn như thuyền, tàu cho lực đẩy Archimedes: dùng tau-thuy.","Phao chỉ dao động theo phương thẳng đứng; không có phần mô tả sóng lan truyền."],
  "size": { "width": 0.16, "height": 0.2 },
  "parts": [
    { "name": "bob", "label": "Phao", "motion": "slide", "axis": "up", "min": -0.015, "max": 0.015, "description": "Li độ thẳng đứng của phao so với vị trí cân bằng (mét), dương là lên trên. Mặt nước tĩnh đứng yên, phao nhô lên chìm xuống quanh nó." }
  ],
  "points": [
    { "name": "equilibrium", "description": "Tâm phao ở vị trí cân bằng." },
    { "name": "waterline", "description": "Mặt nước tĩnh." },
    { "name": "sinker", "description": "Quả chì ở cuối dây." }
  ],
  "notes": "Phao cao 0,09 m, một nửa phao chìm khi cân bằng; đuôi phao buộc dây và quả chì giữ cho phao đứng. Mặt nước phía trước vẽ nửa trong suốt, phao chìm sẽ hiện mờ phía sau. Dùng để thể hiện phần tử sóng dao động tại chỗ theo phương thẳng đứng. fill là màu thân phao."
}
*/
const makeFloat = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // BỘ PHẬN TRƯỢT: phao và dây, gốc nhóm ở tâm phao khi cân bằng (ngang mặt nước).
  const bob = new Konva.Group({ x: 0, y: 0 });
  // Dây và quả chì phía dưới.
  bob.add(new Konva.Line({ points: [0, m(0.036), 0, m(0.082)], stroke: "#e5e7eb", strokeWidth: Math.max(1, m(0.0011)), lineCap: "round", listening: false }));
  bob.add(new Konva.Ellipse({ x: 0, y: m(0.088), radiusX: m(0.0065), radiusY: m(0.0072), ...lin(m(-0.0065), 0, m(0.0065), 0, [0, "#e5e7eb", 0.4, "#6b7280", 1, "#1f2937"]), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  // Thân phao: phần dưới trắng hình giọt nước, phần trên đỏ dạng thoi; ăngten ở đỉnh.
  bob.add(new Konva.Line({ points: [m(0), m(0.04), m(-0.0105), m(0.022), m(-0.0148), m(0), m(-0.0125), m(-0.02), m(-0.006), m(-0.036), m(0), m(-0.044), m(0.006), m(-0.036), m(0.0125), m(-0.02), m(0.0148), m(0), m(0.0105), m(0.022)], closed: true, tension: 0.4, ...lin(m(-0.0148), 0, m(0.0148), 0, [0, "#475569", 0.25, "#ffffff", 0.7, "#e2e8f0", 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.35, listening: false }));
  bob.add(new Konva.Line({ points: [m(-0.0125), m(-0.02), m(-0.006), m(-0.036), m(0), m(-0.044), m(0.006), m(-0.036), m(0.0125), m(-0.02), m(0.0075), m(-0.0215), m(0), m(-0.0225), m(-0.0075), m(-0.0215)], closed: true, tension: 0.4, ...lin(m(-0.0125), 0, m(0.0125), 0, [0, "#7f1d1d", 0.35, fill, 0.7, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw, listening: false }));
  bob.add(new Konva.Rect({ x: m(-0.0015), y: m(-0.097), width: m(0.003), height: m(0.054), ...lin(m(-0.0015), 0, m(0.0015), 0, [0, "#fcd34d", 0.5, "#fde68a", 1, "#b45309"]), stroke: "#78350f", strokeWidth: lw * 0.6, listening: false }));
  bob.add(new Konva.Rect({ x: m(-0.0016), y: m(-0.097), width: m(0.0032), height: m(0.01), fill: "#ef4444", listening: false }));
  bob.add(new Konva.Line({ points: [m(-0.0088), m(0.015), m(-0.0098), m(-0.002), m(-0.0075), m(-0.02)], stroke: "rgba(255,255,255,0.85)", strokeWidth: lw * 1.8, lineCap: "round", tension: 0.4, listening: false }));
  bob.add(new Konva.Line({ points: [m(-0.0145), m(0.001), m(0.0145), m(0.001)], stroke: "rgba(15,23,42,0.35)", strokeWidth: lw * 0.8, listening: false }));
  group.add(bob);

  // Mặt nước phía trước (nửa trong suốt) và vài vòng gợn quanh điểm phao chạm nước.
  group.add(new Konva.Rect({ x: m(-0.08), y: 0, width: m(0.16), height: m(0.1), ...lin(0, 0, 0, m(0.1), [0, "rgba(125,211,252,0.5)", 1, "rgba(14,116,144,0.62)"]), listening: false }));
  group.add(new Konva.Line({ points: [m(-0.08), 0, m(-0.04), m(-0.0012), m(0), 0, m(0.04), m(0.0012), m(0.08), 0], stroke: "rgba(224,242,254,0.95)", strokeWidth: lw * 1.5, lineCap: "round", tension: 0.4, listening: false }));
  for (const r of [0.022, 0.036, 0.052]) group.add(new Konva.Ellipse({ x: 0, y: 0, radiusX: m(r), radiusY: m(r * 0.12), stroke: "rgba(255,255,255,0.4)", strokeWidth: lw, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(0.02), y: m(-0.06), text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { bob: { node: bob, motion: "slide" as const, axis: "up" as const, min: -0.015, max: 0.015 } },
    points: { equilibrium: { x: 0, y: 0 }, waterline: { x: 0, y: 0 }, sinker: { x: 0, y: m(0.088) } },
  };
};
