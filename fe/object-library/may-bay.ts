/* OBJECT-META
{
  "catalog": "Máy bay",
  "title": "Máy bay cánh quạt nhìn ngang: thân thuôn sơn trắng và xanh, cánh và đuôi thẳng, buồng lái kính, bánh đáp và cánh quạt hai lá ở mũi",
  "fill": "#1d4ed8",
  "anchor": "Tâm thân máy bay, nơi cánh gắn vào.",
  "useWhen": ["Cần máy bay cánh quạt nhìn ngang, thân thuôn, cánh và đuôi thẳng, bánh đáp, cho bài chuyển động hoặc lực nâng.","Cần phương tiện bay cỡ thật dài khoảng 9,5 m."],
  "avoidWhen": ["Cần khinh khí cầu: dùng khinh-khi-cau.","Cần tên lửa hoặc tàu vũ trụ: dùng ten-lua hoặc tau-vu-tru.","Cánh quạt hai lá, không phải máy bay phản lực hay trực thăng."],
  "size": { "width": 9.51, "height": 4.23 },
  "parts": [
    { "name": "propeller", "label": "Cánh quạt", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của cánh quạt ở mũi, độ theo chiều kim đồng hồ khi nhìn từ phía trước; 0° là hai cánh thẳng đứng, ở góc 90° hai cánh nằm ngang." }
  ],
  "points": [
    { "name": "center", "description": "Tâm thân máy bay, nơi cánh gắn vào." },
    { "name": "nose", "description": "Trục cánh quạt ở mũi." },
    { "name": "tail", "description": "Đuôi máy bay." },
    { "name": "wheel", "description": "Tâm bánh đáp chính." }
  ],
  "notes": "Máy bay dài 9 m, sải cánh 12 m (cánh trong mặt phẳng vuông góc hình), cao 3 m; mũi máy bay quay sang phải. Cánh quạt hai lá đường kính 1,9 m. Dùng cho bài toán ném vật từ máy bay (chuyển động ném ngang) và lực nâng. fill là màu sơn dải thân và đuôi."
}
*/
const makeAirplane = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.025));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const pts = (a: number[]) => a.map(m);

  // Đuôi đứng và cánh lái độ cao (vẽ trước thân để phần gốc bị thân che).
  group.add(new Konva.Line({ points: pts([-4.4, -0.3, -4.5, -2.2, -3.8, -2.4, -3.0, -0.6]), closed: true, ...lin(0, m(-2.4), 0, m(-0.3), [0, "#93c5fd", 0.4, fill, 1, "#1e3a8a"]), stroke: "#0a1033", strokeWidth: lw, lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: pts([-4.5, -0.55, -5.3, -0.9, -5.2, -0.45, -3.7, -0.3]), closed: true, fill: "#94a3b8", stroke: "#0f172a", strokeWidth: lw, lineJoin: "round", listening: false }));
  // Cánh chính (nhìn từ cạnh nên chỉ thấy mép dày), bánh đáp gắn dưới.
  group.add(new Konva.Line({ points: pts([0.4, -0.15, -1.8, -0.2, -1.7, 0.02, 0.5, 0.0]), closed: true, fill: "#cbd5e1", stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Line({ points: pts([0.4, 0.75, 0.4, 1.35]), stroke: "#475569", strokeWidth: m(0.09), lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: pts([-0.9, 0.7, 0.4, 1.3]), stroke: "#64748b", strokeWidth: m(0.06), lineCap: "round", listening: false }));
  group.add(new Konva.Circle({ x: m(0.4), y: m(1.55), radius: m(0.28), fill: "#111827", stroke: "#000", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Circle({ x: m(0.4), y: m(1.55), radius: m(0.14), fill: "#cbd5e1", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Circle({ x: m(-4.3), y: m(0.3), radius: m(0.12), fill: "#111827", listening: false }));

  // Thân: dáng thuôn từ mũi tới đuôi, kính buồng lái, dải sọc xanh, cửa sổ.
  group.add(new Konva.Line({ points: pts([-4.5, -0.45, -4.2, -0.8, -2.4, -1.1, -0.2, -1.25, 1.2, -1.2, 2.4, -0.95, 3.4, -0.45, 3.5, 0.2, 2.6, 0.75, 1.0, 1.0, -1.0, 0.85, -3.0, 0.45, -4.4, -0.05]), closed: true, tension: 0.4, ...lin(0, m(-1.25), 0, m(1.0), [0, "#ffffff", 0.45, "#e5e7eb", 1, "#64748b"]), stroke: "#1f2937", strokeWidth: lw, lineJoin: "round", shadowColor: "#000", shadowBlur: m(0.12), shadowOpacity: 0.3, listening: false }));
  group.add(new Konva.Line({ points: pts([-4.4, -0.15, -2.4, 0.2, 0.5, 0.35, 3.4, 0.1]), stroke: fill, strokeWidth: m(0.2), lineCap: "round", tension: 0.4, listening: false }));
  group.add(new Konva.Line({ points: pts([0.6, -1.17, 1.4, -1.12, 2.3, -0.92, 2.6, -0.5, 1.3, -0.46, 0.3, -0.5]), closed: true, tension: 0.2, ...lin(0, m(-1.17), 0, m(-0.46), [0, "#bae6fd", 1, "#0c4a6e"]), stroke: "#0f172a", strokeWidth: lw * 0.9, lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: pts([0.75, -1.06, 1.3, -1.02, 1.9, -0.9]), stroke: "rgba(255,255,255,0.7)", strokeWidth: lw, lineCap: "round", listening: false }));
  for (let i = 0; i < 4; i += 1) group.add(new Konva.Rect({ x: m(-2.8 + i * 0.7), y: m(-0.7), width: m(0.35), height: m(0.28), cornerRadius: m(0.08), ...lin(0, 0, 0, m(0.28), [0, "#bae6fd", 1, "#0c4a6e"]), stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Line({ points: pts([-0.2, -1.2, -0.2, 0.8]), stroke: "rgba(15,23,42,0.35)", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-4.2), y: m(-0.95), width: m(0.9), height: m(0.18), fill: "#0b1220", listening: false }));
  group.add(new Konva.Text({ x: m(-4.2), y: m(-0.95), width: m(0.9), align: "center", text: "N-NEVIAD", fontSize: m(0.14), fontStyle: "bold", fill: "#fde047", listening: false }));
  // Mũi động cơ (nắp máy), nón quạt.
  group.add(new Konva.Line({ points: pts([3.3, -0.55, 3.8, -0.5, 4.0, -0.2, 3.8, 0.1, 3.3, 0.2]), closed: true, tension: 0.3, ...lin(0, m(-0.55), 0, m(0.2), [0, "#ffffff", 0.5, "#cbd5e1", 1, "#475569"]), stroke: "#0f172a", strokeWidth: lw * 0.9, lineJoin: "round", listening: false }));
  group.add(new Konva.Ellipse({ x: m(4.0), y: m(-0.2), radiusX: m(0.1), radiusY: m(0.22), fill: "#dc2626", stroke: "#450a0a", strokeWidth: lw * 0.7, listening: false }));

  // BỘ PHẬN QUAY: cánh quạt hai lá nhìn thẳng từ mũi; gốc ở trục cánh quạt.
  const propeller = new Konva.Group({ x: m(4.1), y: m(-0.2) });
  for (const s of [-1, 1]) {
    propeller.add(new Konva.Line({ points: [0, 0, m(0.05), m(s * 0.1), m(0.01), m(s * 0.95), m(-0.07), m(s * 0.98), m(-0.05), m(s * 0.1)], closed: true, tension: 0.2, ...lin(m(-0.07), 0, m(0.05), 0, [0, "#475569", 0.5, "#e2e8f0", 1, "#1f2937"]), stroke: "#0f172a", strokeWidth: lw * 0.8, lineJoin: "round", listening: false }));
    propeller.add(new Konva.Line({ points: [m(-0.02), m(s * 0.8), m(0.0), m(s * 0.96)], stroke: "#fde047", strokeWidth: m(0.05), lineCap: "round", listening: false }));
  }
  propeller.add(new Konva.Circle({ radius: m(0.11), ...lin(m(-0.11), m(-0.11), m(0.11), m(0.11), [0, "#f1f5f9", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  group.add(propeller);

  if (label) {
    group.add(new Konva.Text({ x: m(-2.5), y: m(2.0), width: m(5), align: "center", text: label, fontSize: m(0.3), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: { propeller: { node: propeller, motion: "rotate" as const, min: 0, max: 360 } }, points: { center: { x: 0, y: 0 }, nose: { x: m(4.1), y: m(-0.2) }, tail: { x: m(-5.3), y: m(-0.7) }, wheel: { x: m(0.4), y: m(1.55) } } };
};
