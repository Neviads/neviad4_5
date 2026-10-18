/* OBJECT-META
{
  "catalog": "Thanh cứng / đòn bẩy",
  "title": "Đòn bẩy: thanh thép dài 0,8 m có lỗ treo cách đều 5 cm, quay quanh trục trên chân đỡ tam giác",
  "fill": "#94a3b8",
  "anchor": "Trục quay ở giữa thanh.",
  "useWhen": ["Cần thanh đòn nghiêng quanh trục giữa, có 8 lỗ treo mỗi bên cách nhau 5 cm.", "Cảnh về momen lực hoặc điều kiện cân bằng đòn bẩy, góc nghiêng trong khoảng ±25°."],
  "avoidWhen": ["Cần cân đòn có hai đĩa cân: dùng can-don.", "Cần đĩa tròn có lỗ treo xung quanh: dùng dia-moment; thanh này chỉ có lỗ trên một đường thẳng."],
  "size": { "width": 0.84, "height": 0.3 },
  "parts": [
    { "name": "bar", "label": "Thanh đòn", "motion": "rotate", "min": -25, "max": 25, "description": "Góc nghiêng của thanh quanh trục, độ; dương là đầu phải đi xuống." }
  ],
  "points": [
    { "name": "pivot", "description": "Trục quay giữa thanh." },
    { "name": "holeLeft1", "description": "Lỗ treo thứ nhất bên trái, cách trục 5 cm (tính khi thanh nằm ngang)." },
    { "name": "holeRight1", "description": "Lỗ treo thứ nhất bên phải, cách trục 5 cm (tính khi thanh nằm ngang)." },
    { "name": "base", "description": "Giữa đế." }
  ],
  "notes": "Có 8 lỗ mỗi bên, đánh số 1–8 (mỗi lỗ cách nhau 5 cm), lỗ 8 cách trục 40 cm. Móc quả nặng treo vào lỗ nào thì cánh tay đòn bằng 5 cm × số lỗ. fill là màu thép của thanh."
}
*/
const makeLever = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const HALF = 0.4;
  const STEP = 0.05;
  const PIVOT_Y = 0.0;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Đế gỗ và chân đỡ hình thang cân; ổ trục là hai má thép kẹp lấy chốt.
  group.add(new Konva.Rect({ x: m(-0.12), y: m(0.255), width: m(0.24), height: m(0.026), cornerRadius: m(0.005), ...lin(0, m(0.255), 0, m(0.281), [0, "#c8a06c", 0.2, "#8a5a2b", 1, "#3b2209"]), stroke: "#2a1606", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.03), m(0.255), m(-0.011), m(0.03), m(0.011), m(0.03), m(0.03), m(0.255)], closed: true, lineJoin: "round", ...lin(m(-0.03), 0, m(0.03), 0, [0, "#475569", 0.35, "#e2e8f0", 0.7, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 1.2, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0085), m(0.045), m(-0.021), m(0.24)], stroke: "rgba(255,255,255,0.5)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.016), y: m(0.022), width: m(0.032), height: m(0.02), cornerRadius: m(0.003), ...lin(m(-0.016), 0, m(0.016), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));

  // BỘ PHẬN QUAY: thanh thép dẹt có hai hàng vạch và lỗ treo tròn; gốc nhóm là trục.
  const bar = new Konva.Group({ x: 0, y: m(PIVOT_Y) });
  bar.add(new Konva.Rect({ x: m(-HALF - 0.012), y: m(-0.012), width: m(2 * HALF + 0.024), height: m(0.024), cornerRadius: m(0.008), ...lin(0, m(-0.012), 0, m(0.012), [0, "#f8fafc", 0.15, fill, 0.8, "#64748b", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.004) }, listening: false }));
  bar.add(new Konva.Line({ points: [m(-HALF), m(-0.0085), m(HALF), m(-0.0085)], stroke: "rgba(255,255,255,0.75)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  for (let i = 1; i <= 8; i += 1) {
    for (const s of [-1, 1]) {
      const x = s * i * STEP;
      bar.add(new Konva.Circle({ x: m(x), y: m(0.0008), radius: m(0.0052), fill: "#0b1220", stroke: "#cbd5e1", strokeWidth: lw * 0.9, listening: false }));
      bar.add(new Konva.Text({ x: m(x - 0.01), y: m(-0.0105), width: m(0.02), align: "center", text: String(i), fontSize: m(0.0058), fontStyle: "bold", fill: "#0f172a", listening: false }));
    }
  }
  bar.add(new Konva.Line({ points: [m(-HALF - 0.004), m(0.0), m(HALF + 0.004), m(0.0)], stroke: "rgba(15,23,42,0.3)", strokeWidth: lw * 0.6, dash: [m(0.004), m(0.006)], listening: false }));
  group.add(bar);
  // Chốt trục lớn nằm đè lên thanh.
  group.add(new Konva.Circle({ x: 0, y: m(PIVOT_Y), radius: m(0.0125), ...lin(m(-0.0125), m(-0.0125), m(0.0125), m(0.0125), [0, "#f8fafc", 0.5, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw * 1.2, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(PIVOT_Y), radius: m(0.0045), fill: "#0f172a", listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0035), m(PIVOT_Y), m(0.0035), m(PIVOT_Y)], stroke: "#cbd5e1", strokeWidth: lw, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.15), y: m(0.289), width: m(0.3), align: "center", text: label, fontSize: m(0.016), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { bar: { node: bar, motion: "rotate" as const, min: -25, max: 25 } },
    points: { pivot: { x: 0, y: m(PIVOT_Y) }, holeLeft1: { x: m(-STEP), y: m(PIVOT_Y) }, holeRight1: { x: m(STEP), y: m(PIVOT_Y) }, base: { x: 0, y: m(0.281) } },
  };
};
