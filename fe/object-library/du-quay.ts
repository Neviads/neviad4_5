/* OBJECT-META
{
  "catalog": "Cầu trượt / ván trượt / đu quay",
  "title": "Đu quay vòng khổng lồ: bánh xe thép với nan hoa căng và tám cabin treo màu, trụ chữ A sơn trắng đỡ trục, mặt bằng bê tông",
  "fill": "#2563eb",
  "anchor": "Giữa chân đu quay, chạm mặt đất.",
  "useWhen": ["Cần vòng đu quay bán kính 6,5 m với tám cabin treo, trục cao 7,2 m, nhìn từ phía hông.", "Bài chuyển động tròn đều, chu kì T = 2πR/v, vị trí cabin trên vòng."],
  "avoidWhen": ["Cần cầu trượt hoặc ván trượt thật sự: vật này chỉ vẽ đu quay.", "Cần bánh xe nhỏ ở cỡ bàn thí nghiệm: dùng banh-da; vật này cao 15 m."],
  "size": { "width": 15.5, "height": 15.0 },
  "parts": [
    { "name": "wheel", "label": "Vòng đu quay", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của vòng cùng các cabin quanh trục, độ theo chiều kim đồng hồ; 0° là cabin số 1 ở vị trí cao nhất." }
  ],
  "points": [
    { "name": "ground", "description": "Giữa chân đu quay, chạm mặt đất." },
    { "name": "axle", "description": "Tâm trục quay của vòng." },
    { "name": "cabinTop", "description": "Vị trí cabin số 1 khi góc quay bằng 0 (cao nhất)." },
    { "name": "rimBottom", "description": "Điểm thấp nhất của vòng." }
  ],
  "notes": "Vòng bán kính 6,5 m, trục cao 7,2 m so với mặt đất, tám cabin treo cách đều quanh vành nên chu kì quay T = 2πR/v. Cabin ở dạng bầu tròn nên không bị nghiêng khi vòng quay trong hình. Hình vẽ nhìn từ phía hông. fill là màu vành chính."
}
*/
const makeFerrisWheel = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.04));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const R = 6.5;
  const AY = -7.2;

  // Nền bê tông và hai chân đỡ chữ A, thanh giằng ngang.
  group.add(new Konva.Rect({ x: m(-4.2), y: m(-0.35), width: m(8.4), height: m(0.35), ...lin(0, 0, 0, m(0.35), [0, "#d4d4d8", 1, "#52525b"]), stroke: "#27272a", strokeWidth: lw * 0.6, listening: false }));
  for (const s of [-1, 1]) {
    group.add(new Konva.Line({ points: [m(s * 3.6), m(-0.35), m(s * 0.2), m(AY)], stroke: "#0b1220", strokeWidth: m(0.42), lineCap: "round", listening: false }));
    group.add(new Konva.Line({ points: [m(s * 3.6), m(-0.35), m(s * 0.2), m(AY)], stroke: "#e2e8f0", strokeWidth: m(0.32), lineCap: "round", listening: false }));
    group.add(new Konva.Line({ points: [m(s * 3.55 - 0.08), m(-0.4), m(s * 0.15 - 0.08), m(AY + 0.1)], stroke: "rgba(255,255,255,0.75)", strokeWidth: m(0.08), lineCap: "round", listening: false }));
    group.add(new Konva.Rect({ x: m(s * 3.6 - 0.45), y: m(-0.6), width: m(0.9), height: m(0.3), cornerRadius: m(0.06), fill: "#475569", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  }
  group.add(new Konva.Line({ points: [m(-2.6), m(-3.4), m(2.6), m(-3.4)], stroke: "#94a3b8", strokeWidth: m(0.15), listening: false }));
  group.add(new Konva.Line({ points: [m(-1.9), m(-5.3), m(1.9), m(-5.3)], stroke: "#94a3b8", strokeWidth: m(0.12), listening: false }));

  // BỘ PHẬN QUAY: vành đôi, nan hoa chính và nan căng, tám cabin treo cách đều.
  const wheel = new Konva.Group({ x: 0, y: m(AY) });
  wheel.add(new Konva.Circle({ radius: m(R), stroke: "#0b1220", strokeWidth: m(0.3), listening: false }));
  wheel.add(new Konva.Circle({ radius: m(R), stroke: fill, strokeWidth: m(0.22), listening: false }));
  wheel.add(new Konva.Circle({ radius: m(R - 0.4), stroke: "#0b1220", strokeWidth: m(0.18), listening: false }));
  wheel.add(new Konva.Circle({ radius: m(R - 0.4), stroke: "#e2e8f0", strokeWidth: m(0.1), listening: false }));
  wheel.add(new Konva.Circle({ radius: m(R), stroke: "rgba(255,255,255,0.35)", strokeWidth: m(0.05), dash: [m(0.3), m(0.4)], listening: false }));
  for (let i = 0; i < 16; i += 1) {
    const a = (i * Math.PI) / 8;
    wheel.add(new Konva.Line({ points: [0, 0, m((R - 0.4) * Math.cos(a)), m((R - 0.4) * Math.sin(a))], stroke: "#cbd5e1", strokeWidth: m(i % 2 === 0 ? 0.08 : 0.04), listening: false }));
  }
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const cx = R * Math.cos(a);
    const cy = R * Math.sin(a);
    const col = ["#ef4444", "#f59e0b", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899", "#eab308"][i];
    wheel.add(new Konva.Line({ points: [m(cx), m(cy), m(cx - 0.2), m(cy + 0.9), m(cx + 0.2), m(cy + 0.9)], closed: true, stroke: "#475569", strokeWidth: m(0.05), listening: false }));
    wheel.add(new Konva.Rect({ x: m(cx - 0.55), y: m(cy + 0.75), width: m(1.1), height: m(0.9), cornerRadius: m(0.22), ...lin(0, 0, 0, m(0.9), [0, "#ffffff", 0.3, col, 1, "#0b1220"]), stroke: "#0b1220", strokeWidth: lw * 0.7, listening: false }));
    wheel.add(new Konva.Rect({ x: m(cx - 0.38), y: m(cy + 0.9), width: m(0.76), height: m(0.35), cornerRadius: m(0.05), ...lin(0, 0, 0, m(0.35), [0, "#bae6fd", 1, "#0c4a6e"]), stroke: "#0b1220", strokeWidth: lw * 0.4, listening: false }));
    wheel.add(new Konva.Text({ x: m(cx - 0.25), y: m(cy + 1.28), width: m(0.5), align: "center", text: String(i + 1), fontSize: m(0.3), fontStyle: "bold", fill: "#fff", listening: false }));
  }
  wheel.add(new Konva.Circle({ radius: m(0.55), ...lin(m(-0.55), m(-0.55), m(0.55), m(0.55), [0, "#f8fafc", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  wheel.add(new Konva.Circle({ radius: m(0.2), fill: "#ef4444", listening: false }));
  group.add(wheel);

  if (label) {
    group.add(new Konva.Text({ x: m(-3), y: m(0.5), width: m(6), align: "center", text: label, fontSize: m(0.5), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: { wheel: { node: wheel, motion: "rotate" as const, min: 0, max: 360 } }, points: { ground: { x: 0, y: 0 }, axle: { x: 0, y: m(AY) }, cabinTop: { x: 0, y: m(AY - R + 0.2) }, rimBottom: { x: 0, y: m(AY + R) } } };
};
