/* OBJECT-META
{
  "catalog": "Đĩa moment (đĩa tròn có lỗ treo)",
  "title": "Đĩa moment: đĩa nhôm tròn có các lỗ treo trên bốn đường tròn đồng tâm, vành chia độ 0–360°, quay quanh trục trên giá",
  "fill": "#f1f5f9",
  "anchor": "Tâm trục quay của đĩa.",
  "useWhen": ["Cần đĩa tròn quay quanh tâm có lỗ treo ở các bán kính 0,04–0,16 m, để treo lực.", "Cảnh về momen lực hay cân bằng vật rắn có trục quay cố định và đọc góc quay bằng mũi tên."],
  "avoidWhen": ["Cần thanh đòn có lỗ treo thẳng hàng hai bên trục: dùng don-bay.", "Cần bánh xe hoặc đĩa quay tốc độ có chu kì: dùng banh-da; đĩa này chỉ xoay theo góc đặt."],
  "size": { "width": 0.36, "height": 0.52 },
  "parts": [
    { "name": "disk", "label": "Đĩa quay", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của đĩa quanh trục, độ theo chiều kim đồng hồ; vành chia độ và các lỗ treo quay theo." }
  ],
  "points": [
    { "name": "center", "description": "Tâm trục quay." },
    { "name": "pointer", "description": "Mũi tên chỉ ở đỉnh đĩa, đứng yên, trỏ vạch 0° khi đĩa chưa quay." },
    { "name": "baseCenter", "description": "Giữa đế dưới." }
  ],
  "notes": "Đĩa bán kính 0,17 m, các lỗ cách tâm 0,04; 0,08; 0,12; 0,16 m, mỗi đường tròn có 12 lỗ cách nhau 30°. Mũi tên chỉ cố định ở trên để đọc góc xoay. fill là màu mặt đĩa."
}
*/
const makeMomentDisk = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.17;
  const BASE_Y = 0.32;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Chân đế gang và trụ đứng đỡ trục, vẽ phía sau đĩa.
  group.add(new Konva.Rect({ x: m(-0.14), y: m(BASE_Y), width: m(0.28), height: m(0.026), cornerRadius: m(0.006), ...lin(0, m(BASE_Y), 0, m(BASE_Y + 0.026), [0, "#94a3b8", 0.15, "#334155", 1, "#0f172a"]), stroke: "#0b1220", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0085), y: m(0.02), width: m(0.017), height: m(BASE_Y - 0.02), ...lin(m(-0.0085), 0, m(0.0085), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.019), y: m(BASE_Y - 0.014), width: m(0.038), height: m(0.014), cornerRadius: m(0.003), fill: "#1e293b", listening: false }));

  // Bóng đổ và viền đĩa (đứng yên).
  group.add(new Konva.Circle({ radius: m(R + 0.006), ...lin(m(-R), m(-R), m(R), m(R), [0, "#e2e8f0", 0.4, "#64748b", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.016), shadowOpacity: 0.45, shadowOffset: { x: m(0.004), y: m(0.008) }, listening: false }));

  // BỘ PHẬN QUAY: mặt đĩa, vành chia độ, các lỗ treo và nhãn; gốc nhóm là tâm trục.
  const disk = new Konva.Group({ x: 0, y: 0 });
  disk.add(new Konva.Circle({ radius: m(R), fillRadialGradientStartPoint: { x: m(-0.05), y: m(-0.06) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R), fillRadialGradientColorStops: [0, "#ffffff", 0.7, fill, 1, "#cbd5e1"], stroke: "#475569", strokeWidth: lw, listening: false }));
  disk.add(new Konva.Ring({ innerRadius: m(R - 0.015), outerRadius: m(R - 0.0006), fill: "#e2e8f0", stroke: "#94a3b8", strokeWidth: lw * 0.7, listening: false }));
  for (let d = 0; d < 360; d += 2) {
    const a = (d * Math.PI) / 180;
    const major = d % 30 === 0;
    const len = major ? 0.0105 : d % 10 === 0 ? 0.0072 : 0.0042;
    disk.add(ln([R * Math.sin(a), -R * Math.cos(a), (R - len) * Math.sin(a), -(R - len) * Math.cos(a)], "#0f172a", major ? lw * 1.4 : lw * 0.6));
  }
  for (let d = 0; d < 360; d += 30) {
    const a = (d * Math.PI) / 180;
    disk.add(new Konva.Text({ x: m((R - 0.0205) * Math.sin(a)), y: m(-(R - 0.0205) * Math.cos(a)), width: m(0.02), offsetX: m(0.01), offsetY: m(0.0035), rotation: d, align: "center", text: String(d), fontSize: m(0.0066), fontStyle: "bold", fill: "#0f172a", listening: false }));
  }
  // Bốn đường tròn đồng tâm và hai trục vuông góc khắc trên mặt đĩa.
  for (const r of [0.04, 0.08, 0.12, 0.16]) disk.add(new Konva.Circle({ radius: m(r), stroke: "rgba(71,85,105,0.55)", strokeWidth: lw * 0.8, dash: [m(0.004), m(0.003)], listening: false }));
  disk.add(ln([-R + 0.016, 0, R - 0.016, 0], "rgba(71,85,105,0.5)", lw * 0.8));
  disk.add(ln([0, -R + 0.016, 0, R - 0.016], "rgba(71,85,105,0.5)", lw * 0.8));
  // Các lỗ treo: 12 lỗ trên mỗi đường tròn, có viền kim loại; lỗ trục lớn ở giữa.
  for (const r of [0.04, 0.08, 0.12, 0.16]) {
    for (let k = 0; k < 12; k += 1) {
      const a = (k * Math.PI) / 6;
      disk.add(new Konva.Circle({ x: m(r * Math.sin(a)), y: m(-r * Math.cos(a)), radius: m(0.0032), fill: "#0b1220", stroke: "#94a3b8", strokeWidth: lw * 0.9, listening: false }));
    }
  }
  disk.add(new Konva.Circle({ radius: m(0.0125), ...lin(m(-0.0125), m(-0.0125), m(0.0125), m(0.0125), steel), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  disk.add(new Konva.Circle({ radius: m(0.005), fill: "#0f172a", listening: false }));
  disk.add(new Konva.Circle({ x: 0, y: m(-0.14), radius: m(0.0045), fill: "#dc2626", stroke: "#450a0a", strokeWidth: lw * 0.7, listening: false }));
  group.add(disk);

  // Mũi tên chỉ cố định ở đỉnh đĩa và vòng đệm giữ trục ở mặt trước.
  group.add(new Konva.Line({ points: [m(-0.0095), m(-R - 0.026), m(0.0095), m(-R - 0.026), 0, m(-R + 0.001)], closed: true, fill: "#dc2626", stroke: "#7f1d1d", strokeWidth: lw, lineJoin: "round", shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Circle({ radius: m(0.0075), ...lin(m(-0.0075), m(-0.0075), m(0.0075), m(0.0075), [0, "#f8fafc", 1, "#475569"]), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.14), y: m(BASE_Y + 0.034), width: m(0.28), align: "center", text: label, fontSize: m(0.016), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { disk: { node: disk, motion: "rotate" as const, min: 0, max: 360 } },
    points: { center: { x: 0, y: 0 }, pointer: { x: 0, y: m(-R - 0.026) }, baseCenter: { x: 0, y: m(BASE_Y + 0.013) } },
  };
};
