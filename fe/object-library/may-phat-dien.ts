/* OBJECT-META
{
  "catalog": "Máy phát điện xoay chiều (khung dây quay trong nam châm)",
  "title": "Mô hình máy phát điện xoay chiều nhìn dọc trục: khung dây quay giữa hai cực nam châm N và S, tay quay, hai vòng trượt và hai chổi than",
  "fill": "#e5e7eb",
  "anchor": "Trục quay của khung dây.",
  "useWhen": ["Cần mô hình máy phát điện xoay chiều nhìn dọc trục: khung quay giữa cực N và S, có tay quay, vòng trượt, chổi than.","Cần giải thích cảm ứng điện từ khi khung dây quay trong từ trường."],
  "avoidWhen": ["Cần động cơ điện một chiều có vành khuyên đổi chiều: dùng dong-co-dien.","Cần khung dây đơn trong từ trường mà không cần tay quay hoàn chỉnh: dùng khung-day.","Cần nguồn xoay chiều để bàn: dùng nguon-xoay-chieu."],
  "size": { "width": 0.15, "height": 0.1 },
  "parts": [
    { "name": "frame", "label": "Khung dây", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của khung dây cùng tay quay quanh trục, độ theo chiều kim đồng hồ khi nhìn từ phía trước; 0° là mặt phẳng khung nằm thẳng đứng, vuông góc với đường sức (từ thông cực đại)." }
  ],
  "points": [
    { "name": "axis", "description": "Trục quay của khung dây." },
    { "name": "base", "description": "Giữa đáy đế, ngay dưới trục." },
    { "name": "brushA", "description": "Chổi than thứ nhất (đầu ra)." },
    { "name": "brushB", "description": "Chổi than thứ hai (đầu ra)." }
  ],
  "notes": "Nam châm chữ C tạo từ trường đều theo phương ngang từ N (trái, đỏ) sang S (phải, xanh) có độ lớn 0,3 T; khung dây hình chữ nhật 0,07 m × 0,05 m có 100 vòng quay quanh trục thẳng đứng vuông góc với từ trường. Khi 0° mặt phẳng khung vuông góc với đường sức (e = 0), khi 90° nó song song (e cực đại). Hai vòng trượt ở đầu trục nối ra ngoài qua hai chổi than. fill là màu thép của khung."
}
*/
const makeAcGenerator = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cy = -0.058;
  const PX = 0.04;

  // Đế gỗ, hai trụ giữ nam châm và thanh thép nối nam châm phía sau (nhìn từ đầu).
  group.add(new Konva.Rect({ x: m(-0.075), y: m(-0.016), width: m(0.15), height: m(0.016), cornerRadius: m(0.003), ...lin(0, m(-0.016), 0, 0, [0, "#d6a15a", 0.5, "#a16207", 1, "#5a2d0c"]), stroke: "#3b1d08", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0085), y: m(cy + 0.03), width: m(0.017), height: m(-0.016 - cy - 0.03), ...lin(m(-0.0085), 0, m(0.0085), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));

  // Hai cực nam châm: khối đỏ N bên trái, khối xanh S bên phải, mặt cực đối diện nhau có gradient sáng.
  group.add(new Konva.Rect({ x: m(-PX - 0.028), y: m(cy - 0.036), width: m(0.028), height: m(0.072), cornerRadius: m(0.004), ...lin(m(-PX - 0.028), 0, m(-PX), 0, [0, "#991b1b", 0.5, "#ef4444", 1, "#fecaca"]), stroke: "#450a0a", strokeWidth: lw * 1.1, listening: false }));
  group.add(new Konva.Rect({ x: m(PX), y: m(cy - 0.036), width: m(0.028), height: m(0.072), cornerRadius: m(0.004), ...lin(m(PX), 0, m(PX + 0.028), 0, [0, "#bfdbfe", 0.5, "#3b82f6", 1, "#1e3a8a"]), stroke: "#172554", strokeWidth: lw * 1.1, listening: false }));
  group.add(new Konva.Text({ x: m(-PX - 0.028), y: m(cy - 0.007), width: m(0.028), align: "center", text: "N", fontSize: m(0.0145), fontStyle: "bold", fill: "#fff", listening: false }));
  group.add(new Konva.Text({ x: m(PX), y: m(cy - 0.007), width: m(0.028), align: "center", text: "S", fontSize: m(0.0145), fontStyle: "bold", fill: "#fff", listening: false }));
  // Từ trường: các đường sức ngang, mũi tên chỉ từ N sang S (vẽ mờ phía sau khung).
  for (const dy of [-0.024, -0.012, 0.012, 0.024]) group.add(new Konva.Arrow({ points: [m(-PX + 0.002), m(cy + dy), m(PX - 0.002), m(cy + dy)], stroke: "rgba(250,204,21,0.45)", fill: "rgba(250,204,21,0.45)", strokeWidth: lw * 0.9, pointerLength: m(0.004), pointerWidth: m(0.0035), dash: [m(0.004), m(0.0025)], listening: false }));
  group.add(ln([-PX - 0.028, cy - 0.04, PX + 0.028, cy - 0.04], "#94a3b8", m(0.004)));
  group.add(ln([-PX - 0.028, cy - 0.0415, PX + 0.028, cy - 0.0415], "rgba(255,255,255,0.4)", lw));

  // BỘ PHẬN QUAY: khung dây hình chữ nhật nhìn từ cạnh (một đoạn dày có hai cạnh dẫn ở hai đầu), trục, tay quay.
  const frame = new Konva.Group({ x: 0, y: m(cy) });
  frame.add(new Konva.Line({ points: [0, m(-0.026), 0, m(0.026)], stroke: "#0f172a", strokeWidth: m(0.0095), lineCap: "round", listening: false }));
  frame.add(new Konva.Line({ points: [0, m(-0.026), 0, m(0.026)], stroke: fill, strokeWidth: m(0.007), lineCap: "round", listening: false }));
  frame.add(new Konva.Line({ points: [m(-0.0012), m(-0.025), m(-0.0012), m(0.025)], stroke: "rgba(255,255,255,0.7)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  // Hai cạnh dây dẫn: một chấm (dòng điện ra khỏi hình), một dấu × (vào hình).
  frame.add(new Konva.Circle({ y: m(-0.026), radius: m(0.0058), fill: "#b45309", stroke: "#431407", strokeWidth: lw, listening: false }));
  frame.add(new Konva.Circle({ y: m(-0.026), radius: m(0.0016), fill: "#fef3c7", listening: false }));
  frame.add(new Konva.Circle({ y: m(0.026), radius: m(0.0058), fill: "#b45309", stroke: "#431407", strokeWidth: lw, listening: false }));
  frame.add(new Konva.Line({ points: [m(-0.0026), m(0.0234), m(0.0026), m(0.0286)], stroke: "#fef3c7", strokeWidth: lw * 1.1, listening: false }));
  frame.add(new Konva.Line({ points: [m(0.0026), m(0.0234), m(-0.0026), m(0.0286)], stroke: "#fef3c7", strokeWidth: lw * 1.1, listening: false }));
  // Tay quay: thanh thép lệch từ trục, núm cầm nhựa đỏ nhìn từ đầu.
  frame.add(new Konva.Line({ points: [0, 0, m(0.036), 0], stroke: "#0f172a", strokeWidth: m(0.0075), lineCap: "round", listening: false }));
  frame.add(new Konva.Line({ points: [0, 0, m(0.036), 0], stroke: "#cbd5e1", strokeWidth: m(0.0055), lineCap: "round", listening: false }));
  frame.add(new Konva.Circle({ x: m(0.036), radius: m(0.0072), fillRadialGradientStartPoint: { x: m(-0.002), y: m(-0.002) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0072), fillRadialGradientColorStops: [0, "#fecaca", 0.5, "#dc2626", 1, "#450a0a"], stroke: "#450a0a", strokeWidth: lw, listening: false }));
  frame.add(new Konva.Circle({ radius: m(0.0085), ...lin(m(-0.0085), m(-0.0085), m(0.0085), m(0.0085), steel), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  frame.add(new Konva.Circle({ radius: m(0.0038), fill: "#1e293b", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  group.add(frame);

  // Hai chổi than thép lò xo ở phía dưới cùng, nối ra hai chốt đỏ/đen trên đế.
  for (const [dx, c] of [[-0.012, "#ef4444"], [0.012, "#1f2937"]] as [number, string][]) {
    group.add(ln([dx, cy + 0.0085, dx, cy + 0.02, dx * 2.6, cy + 0.027, dx * 4.5, -0.0095], c, lw * 1.7));
    group.add(new Konva.Circle({ x: m(dx * 4.5), y: m(-0.0075), radius: m(0.0045), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0045), fillRadialGradientColorStops: [0, "#fff", 0.35, c, 1, "#000"], stroke: "#000", strokeWidth: lw * 0.6, listening: false }));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.006), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { frame: { node: frame, motion: "rotate" as const, min: 0, max: 360 } },
    points: { axis: { x: 0, y: m(cy) }, base: { x: 0, y: 0 }, brushA: { x: m(-0.054), y: m(-0.0075) }, brushB: { x: m(0.054), y: m(-0.0075) } },
  };
};
