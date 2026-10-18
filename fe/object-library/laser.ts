/* OBJECT-META
{
  "catalog": "Bút laser / đèn laser",
  "title": "Bút laser đỏ 650 nm kẹp trên giá nghiêng được: thân nhôm đen, núm bấm, cửa ra phát tia ở đầu bên phải",
  "fill": "#1f2937",
  "anchor": "Tâm cửa ra của tia laser ở đầu bên phải.",
  "useWhen": ["Cần bút laser đỏ 650 nm kẹp trên giá, nghiêng được ±35° quanh cửa ra, tia luôn xuất phát từ một điểm.", "Cảnh cần chùm tia hẹp sáng đơn sắc cho khúc xạ, phản xạ, giao thoa."],
  "avoidWhen": ["Cần nguồn sáng toả rộng hay đèn chiếu: dùng den-chieu, vat-sang.", "Cần đèn có khe tạo chùm song song: dùng den-khe; bút laser không có khe và không tạo chùm rộng."],
  "size": { "width": 0.188, "height": 0.117 },
  "parts": [
    { "name": "body", "label": "Thân bút laser", "motion": "rotate", "min": -35, "max": 35, "description": "Góc nghiêng của bút quanh cửa ra, độ; dương là quay cùng chiều kim đồng hồ (đầu bút phía sau đi xuống, tia hướng lên khỏi phương ngang)." }
  ],
  "points": [
    { "name": "aperture", "description": "Tâm cửa ra, nơi tia laser bắt đầu." },
    { "name": "stand", "description": "Chân giá đỡ ở mặt bàn." },
    { "name": "button", "description": "Núm bật tắt ở thân bút." }
  ],
  "notes": "Bút dài 0,15 m, đường kính 0,014 m, công suất < 1 mW. Giá kẹp và thân bút quay quanh cửa ra nên tia luôn xuất phát từ cùng một điểm khi đổi góc. Tia sáng là hiện tượng do cảnh vẽ. fill là màu thân bút."
}
*/
const makeLaserPointer = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const LEN = 0.15;
  const R = 0.007;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Giá đỡ: đế tròn, trụ thép và vòng ôm thân bút ngay sau cửa ra.
  group.add(new Konva.Ellipse({ x: m(-0.012), y: m(0.1), radiusX: m(0.05), radiusY: m(0.006), ...lin(m(-0.05), 0, m(0.05), 0, [0, "#475569", 0.3, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0165), y: m(0.012), width: m(0.009), height: m(0.088), ...lin(m(-0.0165), 0, m(-0.0075), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.02), y: m(0.088), width: m(0.016), height: m(0.012), cornerRadius: m(0.003), fill: "#1e293b", listening: false }));

  // BỘ PHẬN QUAY: thân bút nằm bên trái cửa ra; gốc nhóm đúng tâm cửa ra.
  const body = new Konva.Group({ x: 0, y: 0 });
  body.add(new Konva.Rect({ x: m(-LEN), y: m(-R), width: m(LEN), height: m(2 * R), cornerRadius: m(0.004), ...lin(0, m(-R), 0, m(R), [0, "#6b7280", 0.2, fill, 0.7, "#030712", 1, "#000"]), stroke: "#000", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.4, listening: false }));
  body.add(new Konva.Line({ points: [m(-LEN + 0.004), m(-R + 0.0018), m(-0.012), m(-R + 0.0018)], stroke: "rgba(255,255,255,0.55)", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));
  // Đầu phát: đai bạc và cửa sổ kính tròn đỏ thẫm.
  body.add(new Konva.Rect({ x: m(-0.022), y: m(-R - 0.001), width: m(0.022), height: m(2 * R + 0.002), cornerRadius: m(0.002), ...lin(0, m(-R), 0, m(R), steel), stroke: "#334155", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 4; i += 1) body.add(new Konva.Line({ points: [m(-0.0195 + i * 0.0048), m(-R - 0.001), m(-0.0195 + i * 0.0048), m(R + 0.001)], stroke: "rgba(15,23,42,0.4)", strokeWidth: lw * 0.8, listening: false }));
  body.add(new Konva.Ellipse({ x: m(0.0005), y: 0, radiusX: m(0.0013), radiusY: m(R * 0.62), fill: "#7f1d1d", stroke: "#fecaca", strokeWidth: lw * 0.6, shadowColor: "#ef4444", shadowBlur: m(0.01), shadowOpacity: 0.9, listening: false }));
  // Núm bấm đỏ, vòng chữ và vạch cảnh báo.
  body.add(new Konva.Rect({ x: m(-0.108), y: m(-R - 0.0034), width: m(0.014), height: m(0.0042), cornerRadius: m(0.002), ...lin(m(-0.108), 0, m(-0.094), 0, [0, "#7f1d1d", 0.5, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.7, listening: false }));
  body.add(new Konva.Text({ x: m(-0.09), y: m(-0.0035), text: "LASER · 650 nm · <1 mW", fontSize: m(0.0043), fontStyle: "bold", fill: "#fca5a5", listening: false }));
  body.add(new Konva.Rect({ x: m(-LEN), y: m(-R - 0.001), width: m(0.006), height: m(2 * R + 0.002), cornerRadius: m(0.002), ...lin(0, 0, m(0.006), 0, [0, "#475569", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  group.add(body);
  // Vòng ôm trên giá, vẽ đè phía trước thân bút.
  group.add(new Konva.Rect({ x: m(-0.0215), y: m(-R - 0.004), width: m(0.014), height: m(2 * R + 0.008), cornerRadius: m(0.003), ...lin(m(-0.0215), 0, m(-0.0075), 0, [0, "#475569", 0.4, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: m(-0.0145), y: m(R + 0.007), radius: m(0.0042), fill: "#dc2626", stroke: "#450a0a", strokeWidth: lw * 0.7, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.12), y: m(0.112), width: m(0.2), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { body: { node: body, motion: "rotate" as const, min: -35, max: 35 } },
    points: { aperture: { x: m(0.0005), y: 0 }, stand: { x: m(-0.012), y: m(0.106) }, button: { x: m(-0.101), y: m(-R - 0.0034) } },
  };
};
