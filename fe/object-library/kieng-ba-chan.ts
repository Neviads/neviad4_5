/* OBJECT-META
{
  "catalog": "Kiềng ba chân + lưới tản nhiệt",
  "title": "Kiềng sắt ba chân có vòng tròn đỡ và lưới thép tản nhiệt có tâm bằng amiăng đặt lên trên",
  "fill": "#374151",
  "anchor": "Giữa chân kiềng, chạm mặt bàn.",
  "useWhen": ["Cần kiềng sắt ba chân có lưới tản nhiệt để đặt bình đun trên đèn cồn.", "Cảnh đun nóng chất lỏng, cần điểm gauze đặt bình và khoảng trống dưới cho đèn."],
  "avoidWhen": ["Cần bếp điện đã có mặt đun sẵn: dùng bep-dien.", "Cần đèn cồn có ngọn lửa: dùng den-con; kiềng này không kèm đèn, bình hay nhiệt kế."],
  "size": { "width": 0.115, "height": 0.123 },
  "parts": [],
  "points": [
    { "name": "foot", "description": "Giữa chân kiềng ở mặt bàn." },
    { "name": "gauze", "description": "Tâm lưới tản nhiệt, nơi đặt bình đun." },
    { "name": "ring", "description": "Giữa vòng đỡ phía trên." }
  ],
  "notes": "Kiềng cao 0,1 m, vòng tròn đường kính 0,1 m đỡ trên ba chân thép (hai chân trước, một chân sau); lưới thép 0,1 m × 0,1 m có miếng amiăng tròn ở tâm đặt trên vòng. Đặt đèn cồn dưới kiềng, bình ở trên lưới. fill là màu sơn kiềng."
}
*/
const makeTripodStand = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const ringY = -0.1;
  const R = 0.05;

  // Ba chân: chân sau (tối, mảnh) vẽ trước, hai chân trước sáng hơn có bàn chân bo.
  group.add(ln([0.012, ringY + 0.002, 0.018, -0.002], "#111827", m(0.0066)));
  for (const s of [-1, 1]) {
    const top = [s * 0.04, ringY + 0.0045];
    const bot = [s * 0.054, -0.002];
    group.add(ln([...top, ...bot], "#000", m(0.0098)));
    group.add(ln([...top, ...bot], fill, m(0.0075)));
    group.add(ln([top[0] - 0.0022 * s, top[1] + 0.002, bot[0] - 0.0022 * s, bot[1] - 0.003], "rgba(255,255,255,0.35)", lw * 1.2));
    group.add(new Konva.Ellipse({ x: m(bot[0]), y: m(-0.0015), radiusX: m(0.0065), radiusY: m(0.0015), fill: "#030712", listening: false }));
  }
  group.add(ln([-0.0452, -0.052, 0.0452, -0.052], "#1f2937", m(0.0034)));
  group.add(ln([-0.0452, -0.0535, 0.0452, -0.0535], "rgba(255,255,255,0.3)", lw));

  // Vòng đỡ: vòng tròn sắt nhìn nghiêng, mặt trên sáng, mặt trước tối; hai chấu nối xuống chân.
  group.add(new Konva.Ellipse({ x: 0, y: m(ringY), radiusX: m(R), radiusY: m(0.0075), stroke: "#030712", strokeWidth: m(0.0058), listening: false }));
  group.add(new Konva.Ellipse({ x: 0, y: m(ringY), radiusX: m(R), radiusY: m(0.0075), stroke: fill, strokeWidth: m(0.0042), listening: false }));
  group.add(new Konva.Ellipse({ x: 0, y: m(ringY - 0.0012), radiusX: m(R - 0.0012), radiusY: m(0.0068), stroke: "rgba(255,255,255,0.35)", strokeWidth: lw * 0.9, listening: false }));
  for (const s of [-1, 1]) group.add(new Konva.Rect({ x: m(s * 0.04 - 0.0035), y: m(ringY - 0.0015), width: m(0.007), height: m(0.01), cornerRadius: m(0.0015), fill: "#0b1220", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));

  // Lưới tản nhiệt hình vuông (nhìn ngang là dải mỏng) với miếng amiăng tròn ở tâm.
  group.add(new Konva.Rect({ x: m(-R - 0.0025), y: m(ringY - 0.0125), width: m(R * 2 + 0.005), height: m(0.0045), cornerRadius: m(0.0012), fill: "#9ca3af", stroke: "#374151", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 40; i += 1) group.add(ln([-R + 0.0015 + i * ((R * 2 - 0.003) / 39), ringY - 0.0125, -R + 0.0015 + i * ((R * 2 - 0.003) / 39), ringY - 0.008], "rgba(15,23,42,0.5)", lw * 0.55));
  group.add(ln([-R, ringY - 0.012, R, ringY - 0.012], "rgba(255,255,255,0.6)", lw));
  group.add(new Konva.Rect({ x: m(-0.025), y: m(ringY - 0.0155), width: m(0.05), height: m(0.0035), cornerRadius: m(0.0015), fill: "#e7e5e4", stroke: "#78716c", strokeWidth: lw * 0.8, listening: false }));
  group.add(ln([-0.022, ringY - 0.0148, 0.022, ringY - 0.0148], "rgba(255,255,255,0.8)", lw * 0.9));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.006), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { foot: { x: 0, y: 0 }, gauze: { x: 0, y: m(ringY - 0.0155) }, ring: { x: 0, y: m(ringY) } } };
};
