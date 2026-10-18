/* OBJECT-META
{
  "catalog": "Gương cầu lõm / lồi",
  "title": "Gương cầu lõm bán kính cong 0,24 m trên giá: kính tráng bạc có mặt sau sơn, vành khung kim loại và thanh chỉ trục chính",
  "fill": "#cbd5e1",
  "anchor": "Đỉnh gương (giao điểm của gương với trục chính).",
  "useWhen": ["Cần gương cầu lõm R = 0,24 m, tiêu cự 0,12 m, có sẵn các điểm F, C, đỉnh O trên trục chính.", "Bài tạo ảnh qua gương lõm, mặt phản xạ hướng sang phải, khẩu độ 0,2 m."],
  "avoidWhen": ["Cần gương lồi: vẽ cũng chỉ là gương lõm, phải lật ngang scaleX = −1 trong nhóm.", "Cần gương phẳng xoay được để đổi góc tới: dùng guong-phang."],
  "size": { "width": 0.37, "height": 0.278 },
  "parts": [],
  "points": [
    { "name": "vertex", "description": "Đỉnh gương O, trên trục chính." },
    { "name": "focus", "description": "Tiêu điểm F, cách đỉnh 0,12 m về bên phải." },
    { "name": "center", "description": "Tâm cong C, cách đỉnh 0,24 m về bên phải." },
    { "name": "top", "description": "Mép trên của gương." },
    { "name": "bottom", "description": "Mép dưới của gương." }
  ],
  "notes": "Gương lõm bán kính cong R = 0,24 m, tiêu cự f = R/2 = 0,12 m, mặt phản xạ hướng sang phải; khẩu độ 0,2 m. Cho gương lồi thì lật ngang vật bằng cách đặt vào nhóm có scaleX = −1 ở phía cảnh (vật chỉ vẽ gương lõm). Các điểm F và C có chấm nhỏ trên trục chính. fill là màu kính tráng bạc."
}
*/
const makeConcaveMirror = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.24;
  const HALF = 0.1;
  const THICK = 0.012;
  const CY = -0.17;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  /** Độ lệch x của mặt cầu lõm tại độ cao y so với đỉnh (đỉnh ở x = 0, mặt lõm hướng +x). */
  const sag = (y: number) => R - Math.sqrt(Math.max(0, R * R - y * y));

  // Trục chính (nét đứt mảnh) kéo dài về phía phải qua F và C.
  group.add(new Konva.Line({ points: [m(-0.02), m(CY), m(R + 0.04), m(CY)], stroke: "rgba(148,163,184,0.5)", strokeWidth: lw, dash: [m(0.008), m(0.005)], listening: false }));
  for (const [x, text] of [[R / 2, "F"], [R, "C"]] as const) {
    group.add(new Konva.Circle({ x: m(x), y: m(CY), radius: m(0.0032), fill: "#fbbf24", stroke: "#78350f", strokeWidth: lw * 0.7, listening: false }));
    group.add(new Konva.Text({ x: m(x - 0.006), y: m(CY + 0.006), width: m(0.012), align: "center", text, fontSize: m(0.0105), fontStyle: "bold", fill: "#fbbf24", listening: false }));
  }

  // Giá: đế tròn, trụ và kẹp ôm sau lưng gương.
  group.add(new Konva.Ellipse({ x: m(-0.03), y: m(-0.006), radiusX: m(0.06), radiusY: m(0.0065), ...lin(m(-0.09), 0, m(0.03), 0, [0, "#475569", 0.3, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0345), y: m(CY + 0.07), width: m(0.009), height: m(-CY - 0.076), ...lin(m(-0.0345), 0, m(-0.0255), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.04), y: m(CY - 0.0125), width: m(0.03), height: m(0.025), cornerRadius: m(0.003), ...lin(m(-0.04), 0, m(-0.01), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  group.add(ln([-0.0345, CY + 0.0125, -0.0345, CY + 0.07], "#94a3b8", lw * 2));

  // Mặt sau: lớp sơn nâu dày THICK, đường bao theo mặt cầu cộng THICK bên trái.
  const back: number[] = [];
  const front: number[] = [];
  const steps = 32;
  for (let i = 0; i <= steps; i += 1) {
    const y = -HALF + (i / steps) * 2 * HALF;
    front.push(m(sag(y)), m(CY + y));
  }
  for (let i = steps; i >= 0; i -= 1) {
    const y = -HALF + (i / steps) * 2 * HALF;
    back.push(m(sag(y) - THICK), m(CY + y));
  }
  group.add(new Konva.Line({ points: [...front, ...back], closed: true, lineJoin: "round", ...lin(m(-THICK), 0, m(0.01), 0, [0, "#7c4a14", 0.45, "#b8741a", 0.6, "#5a3512", 1, fill]), stroke: "#2a1606", strokeWidth: lw * 1.1, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  // Lớp bạc phản xạ: dải sáng chạy theo mặt lõm, rộng hơn ở đỉnh để có chiều sâu.
  const silver: number[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const y = -HALF + (i / steps) * 2 * HALF;
    silver.push(m(sag(y) - 0.0004), m(CY + y));
  }
  group.add(new Konva.Line({ points: silver, stroke: "#f8fafc", strokeWidth: m(0.0028), lineCap: "round", lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: silver, stroke: "rgba(186,230,253,0.85)", strokeWidth: m(0.0012), lineCap: "round", lineJoin: "round", listening: false }));
  // Vệt phản chiếu đèn trong lòng gương: cung trắng mờ.
  const gloss: number[] = [];
  for (let i = 4; i <= 14; i += 1) {
    const y = -HALF + (i / steps) * 2 * HALF;
    gloss.push(m(sag(y) + 0.0036), m(CY + y));
  }
  group.add(new Konva.Line({ points: gloss, stroke: "rgba(255,255,255,0.55)", strokeWidth: m(0.0022), lineCap: "round", lineJoin: "round", listening: false }));
  // Vành kẹp mép trên và mép dưới.
  for (const s of [-1, 1]) group.add(new Konva.Rect({ x: m(sag(HALF) - THICK - 0.003), y: m(CY + s * HALF - (s > 0 ? 0.0 : 0.007)), width: m(THICK + 0.012), height: m(0.007), cornerRadius: m(0.002), ...lin(0, 0, 0, m(0.007), steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.09), y: m(0.01), width: m(0.18), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: { vertex: { x: 0, y: m(CY) }, focus: { x: m(R / 2), y: m(CY) }, center: { x: m(R), y: m(CY) }, top: { x: m(sag(HALF)), y: m(CY - HALF) }, bottom: { x: m(sag(HALF)), y: m(CY + HALF) } },
  };
};
