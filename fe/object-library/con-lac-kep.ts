/* OBJECT-META
{
  "catalog": "Con lắc vật lý / con lắc kép",
  "title": "Con lắc kép: hai thanh nhôm nối tiếp bằng ổ bi, đầu thanh thứ hai có quả nặng, trục treo gắn tấm đế tròn",
  "fill": "#94a3b8",
  "anchor": "Trục treo của thanh thứ nhất.",
  "useWhen": ["Cần con lắc kép gồm hai thanh nhôm dài 0,18 m nối bằng ổ bi, quay tự do ±180 độ.","Cần mô phỏng chuyển động hỗn loạn hoặc con lắc vật lý hai khớp."],
  "avoidWhen": ["Cần con lắc đơn một dây và quả nặng: dùng con-lac-don.","Cần lò xo đàn hồi dao động thẳng đứng: dùng con-lac-lo-xo; vật này chỉ có thanh cứng, không có lò xo."],
  "size": { "width": 0.8, "height": 0.8 },
  "parts": [
    { "name": "arm1", "label": "Thanh thứ nhất", "motion": "rotate", "min": -180, "max": 180, "description": "Góc của thanh 1 so với phương thẳng đứng hướng xuống, độ; dương là lệch sang trái màn hình (chiều kim đồng hồ khi nhìn từ trước)." },
    { "name": "arm2", "label": "Thanh thứ hai", "motion": "rotate", "min": -180, "max": 180, "description": "Góc của thanh 2 so với thanh 1, độ; thanh 2 nằm trong nhóm thanh 1 nên quay theo nó. Góc tuyệt đối của thanh 2 = arm1 + arm2." }
  ],
  "points": [
    { "name": "pivot", "description": "Trục treo thứ nhất." },
    { "name": "elbow", "description": "Khớp nối hai thanh khi cả hai thẳng đứng, cách trục 0,18 m." },
    { "name": "bob", "description": "Tâm quả nặng ở đầu thanh 2 khi cả hai thẳng đứng (0,36 m dưới trục)." }
  ],
  "notes": "Thanh 1 dài 0,18 m, thanh 2 dài 0,18 m; quả nặng thanh 2 nặng hơn quả nối. Vòng tròn mờ quanh trục chỉ vùng quét tối đa, không phải một phần của vật. fill là màu nhôm của thanh."
}
*/
const makeDoublePendulum = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const L1 = 0.18;
  const L2 = 0.18;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, fill, 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Khung bao vùng quét tối đa (trong suốt), giúp cảnh canh giữa đúng cả khi các thanh quay.
  group.add(new Konva.Rect({ x: m(-(L1 + L2 + 0.04)), y: m(-(L1 + L2 + 0.04)), width: m(2 * (L1 + L2 + 0.04)), height: m(2 * (L1 + L2 + 0.04)), fill: "rgba(0,0,0,0)", listening: false }));
  group.add(new Konva.Circle({ radius: m(L1 + L2 + 0.02), stroke: "rgba(148,163,184,0.25)", strokeWidth: lw, dash: [m(0.01), m(0.01)], listening: false }));

  // Tấm đế tròn gắn vào tường, trục treo ở tâm.
  group.add(new Konva.Circle({ radius: m(0.036), ...lin(m(-0.036), m(-0.036), m(0.036), m(0.036), [0, "#e2e8f0", 0.4, "#64748b", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  for (let i = 0; i < 4; i += 1) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    group.add(new Konva.Circle({ x: m(0.027 * Math.cos(a)), y: m(0.027 * Math.sin(a)), radius: m(0.0034), fill: "#cbd5e1", stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));
  }
  group.add(new Konva.Circle({ radius: m(0.0185), fill: "#0f172a", stroke: "#94a3b8", strokeWidth: lw, listening: false }));

  /** Một thanh nhôm dẹt dài `len` có hai lỗ ở hai đầu, rãnh dọc ở giữa. Gốc ở lỗ trên, thanh chĩa xuống. */
  const bar = (parent: Konva.Group, len: number) => {
    parent.add(new Konva.Rect({ x: m(-0.0105), y: m(-0.0105), width: m(0.021), height: m(len + 0.021), cornerRadius: m(0.0105), ...lin(m(-0.0105), 0, m(0.0105), 0, steel), stroke: "#334155", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.35, shadowOffset: { x: m(0.0015), y: m(0.002) }, listening: false }));
    parent.add(new Konva.Rect({ x: m(-0.003), y: m(0.013), width: m(0.006), height: m(len - 0.026), cornerRadius: m(0.003), fill: "#0f172a", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
    parent.add(new Konva.Line({ points: [m(-0.0075), m(0.0), m(-0.0075), m(len)], stroke: "rgba(255,255,255,0.65)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  };

  // BỘ PHẬN QUAY 1: thanh 1 quanh trục treo; thanh 2 là nhóm con đặt ở khớp nối.
  const arm1 = new Konva.Group({ x: 0, y: 0 });
  bar(arm1, L1);
  const arm2 = new Konva.Group({ x: 0, y: m(L1) });
  bar(arm2, L2);
  // Quả nặng ở đầu thanh 2: khối thép có nhãn.
  arm2.add(new Konva.Circle({ x: 0, y: m(L2 + 0.014), radius: m(0.0245), fillRadialGradientStartPoint: { x: m(-0.008), y: m(L2 + 0.004) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: m(L2 + 0.014) }, fillRadialGradientEndRadius: m(0.0245), fillRadialGradientColorStops: [0, "#f8fafc", 0.35, "#94a3b8", 1, "#1e293b"], stroke: "#0f172a", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.003) }, listening: false }));
  arm2.add(new Konva.Ellipse({ x: m(-0.0085), y: m(L2 + 0.0045), radiusX: m(0.0055), radiusY: m(0.0035), rotation: -35, fill: "rgba(255,255,255,0.85)", listening: false }));
  arm2.add(new Konva.Text({ x: m(-0.02), y: m(L2 + 0.007), width: m(0.04), align: "center", text: "m₂", fontSize: m(0.0125), fontStyle: "bold", fill: "#0f172a", listening: false }));
  arm1.add(arm2);
  // Ổ bi ở khớp nối: nắp tròn sáng trên thanh 1 và ổ trục của thanh 2.
  arm2.add(new Konva.Circle({ radius: m(0.0135), ...lin(m(-0.0135), m(-0.0135), m(0.0135), m(0.0135), [0, "#f8fafc", 0.5, "#94a3b8", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  arm2.add(new Konva.Circle({ radius: m(0.0048), fill: "#0f172a", listening: false }));
  group.add(arm1);
  // Quả nối ở khớp (khối lượng m₁) và nắp trục treo vẽ lại phía trên.
  group.add(new Konva.Circle({ radius: m(0.0125), ...lin(m(-0.0125), m(-0.0125), m(0.0125), m(0.0125), [0, "#f8fafc", 0.5, "#94a3b8", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ radius: m(0.0045), fill: "#dc2626", stroke: "#450a0a", strokeWidth: lw * 0.7, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.3), y: m(L1 + L2 + 0.05), width: m(0.6), align: "center", text: label, fontSize: m(0.02), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      arm1: { node: arm1, motion: "rotate" as const, min: -180, max: 180 },
      arm2: { node: arm2, motion: "rotate" as const, min: -180, max: 180 },
    },
    points: { pivot: { x: 0, y: 0 }, elbow: { x: 0, y: m(L1) }, bob: { x: 0, y: m(L1 + L2 + 0.014) } },
  };
};
