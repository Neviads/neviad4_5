/* OBJECT-META
{
  "catalog": "Xe lăn / xe đẩy thí nghiệm",
  "title": "Xe lăn thí nghiệm: thân nhôm, hai cặp bánh có ổ bi, đầu đệm lò xo, nam châm giữ và cọc gắn tấm chắn",
  "fill": "#2563eb",
  "anchor": "Giữa hai trục bánh, chạm mặt ray.",
  "useWhen": ["Cần xe lăn thí nghiệm dài 0,18 m có hai cặp bánh quay, đệm lò xo, nam châm giữ và cọc gắn tấm chắn.","Cần xe chạy trên ray để đo gia tốc, động lượng hay va chạm với bánh quay đúng φ = x/0,0125."],
  "avoidWhen": ["Cần xe không ma sát trên đệm khí: dùng xe-dem-khi.","Cần xe đạp hay ô tô cỡ thật: dùng xe-dap hoặc o-to.","Thân nhỏ 0,22 × 0,07 m, không có cảm biến hay tấm chắn gắn sẵn."],
  "size": { "width": 0.22, "height": 0.07 },
  "parts": [
    { "name": "wheelFront", "label": "Cặp bánh trước", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của cặp bánh bên phải (đầu xe), độ theo chiều kim đồng hồ: xe chạy sang phải thì bánh quay thuận." },
    { "name": "wheelRear", "label": "Cặp bánh sau", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của cặp bánh bên trái (đuôi xe), cùng quy ước. Hai cặp bánh cùng bán kính 0,0125 m nên quay cùng góc: φ = x / 0,0125 (rad)." }
  ],
  "points": [
    { "name": "base", "description": "Giữa hai trục bánh, chạm ray." },
    { "name": "front", "description": "Mép trước (bên phải) của đầu đệm lò xo." },
    { "name": "rear", "description": "Mép sau (bên trái) của móc kéo." },
    { "name": "mountPost", "description": "Chân cọc gắn tấm chắn sáng trên mặt xe." }
  ],
  "notes": "Thân dài 0,18 m, cao 0,05 m; bánh đường kính 0,025 m. Đầu phải có lò xo va chạm, đầu trái có móc buộc dây. Hai bánh vẽ kiểu chấu để nhìn thấy khi quay. fill là màu thân sơn."
}
*/
const makeLabCart = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const BODY_W = 0.17;
  const BODY_H = 0.034;
  const WHEEL_R = 0.0125;
  const AXLE_X = 0.055;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0012));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const bodyBottom = -(WHEEL_R * 2 - 0.006);

  // Hai cặp bánh: bánh sau vẽ trước, vỏ xe che nửa trên. Mỗi bánh là nhóm quay quanh trục.
  const wheels: Record<string, Konva.Group> = {};
  for (const [name, x] of [["wheelRear", -AXLE_X], ["wheelFront", AXLE_X]] as const) {
    const wheel = new Konva.Group({ x: m(x), y: m(-WHEEL_R) });
    wheel.add(new Konva.Circle({ radius: m(WHEEL_R), fillRadialGradientStartPoint: { x: m(-0.004), y: m(-0.004) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(WHEEL_R), fillRadialGradientColorStops: [0, "#4b5563", 0.7, "#111827", 1, "#030712"], stroke: "#000", strokeWidth: lw, listening: false }));
    wheel.add(new Konva.Circle({ radius: m(WHEEL_R * 0.72), ...lin(m(-0.009), m(-0.009), m(0.009), m(0.009), steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
    for (let i = 0; i < 5; i += 1) {
      const a = (i * 72 * Math.PI) / 180;
      wheel.add(new Konva.Line({ points: [m(0.0026 * Math.cos(a)), m(0.0026 * Math.sin(a)), m(0.0085 * Math.cos(a)), m(0.0085 * Math.sin(a))], stroke: "#0f172a", strokeWidth: m(0.0022), lineCap: "round", listening: false }));
    }
    wheel.add(new Konva.Circle({ x: m(0.0068), y: 0, radius: m(0.0012), fill: "#dc2626", listening: false }));
    wheel.add(new Konva.Circle({ radius: m(0.0024), fill: "#e2e8f0", stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));
    group.add(wheel);
    wheels[name] = wheel;
  }

  // Thân xe: thanh nhôm định hình có rãnh dọc và vỏ sơn màu.
  group.add(new Konva.Rect({ x: m(-BODY_W / 2), y: m(bodyBottom - BODY_H), width: m(BODY_W), height: m(BODY_H), cornerRadius: m(0.003), ...lin(0, m(bodyBottom - BODY_H), 0, m(bodyBottom), [0, "#bfdbfe", 0.2, fill, 0.85, "#1d4ed8", 1, "#1e3a8a"]), stroke: "#0b1226", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.003) }, listening: false }));
  group.add(new Konva.Line({ points: [m(-BODY_W / 2 + 0.005), m(bodyBottom - BODY_H + 0.0025), m(BODY_W / 2 - 0.005), m(bodyBottom - BODY_H + 0.0025)], stroke: "rgba(255,255,255,0.65)", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(-BODY_W / 2 + 0.006), y: m(bodyBottom - BODY_H / 2 - 0.0028), width: m(BODY_W - 0.012), height: m(0.0056), cornerRadius: m(0.0016), fill: "#0b1226", stroke: "#1e3a8a", strokeWidth: lw * 0.6, listening: false }));
  // Vòng che bánh (chắn bùn) phía trên hai bánh.
  for (const x of [-AXLE_X, AXLE_X]) group.add(new Konva.Arc({ x: m(x), y: m(-WHEEL_R), innerRadius: m(WHEEL_R + 0.0008), outerRadius: m(WHEEL_R + 0.0028), angle: 180, rotation: 180, fill: "#0b1e63", stroke: "#0b1226", strokeWidth: lw * 0.6, listening: false }));
  // Hai thanh gắn trục xuống thân.
  for (const x of [-AXLE_X, AXLE_X]) group.add(new Konva.Rect({ x: m(x - 0.0034), y: m(-WHEEL_R - 0.0025), width: m(0.0068), height: m(0.005), fill: "#94a3b8", listening: false }));

  // Đầu đệm lò xo ở bên phải: xi lanh nhỏ với lò xo và núm cao su.
  const frontX = BODY_W / 2;
  const by = bodyBottom - BODY_H / 2;
  group.add(new Konva.Rect({ x: m(frontX - 0.001), y: m(by - 0.0045), width: m(0.012), height: m(0.009), cornerRadius: m(0.0012), ...lin(0, m(by - 0.0045), 0, m(by + 0.0045), steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  for (let i = 0; i < 5; i += 1) group.add(new Konva.Line({ points: [m(frontX + 0.0095 + i * 0.0028), m(by - 0.0036), m(frontX + 0.0095 + i * 0.0028 + 0.0014), m(by + 0.0036)], stroke: "#94a3b8", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(frontX + 0.0235), y: m(by - 0.0062), width: m(0.0065), height: m(0.0124), cornerRadius: m(0.003), ...lin(m(frontX + 0.0235), 0, m(frontX + 0.03), 0, [0, "#7f1d1d", 0.5, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.7, listening: false }));
  // Móc buộc dây ở đuôi (bên trái).
  group.add(new Konva.Line({ points: [m(-BODY_W / 2), m(by), m(-BODY_W / 2 - 0.006), m(by), m(-BODY_W / 2 - 0.0095), m(by - 0.004), m(-BODY_W / 2 - 0.0095), m(by + 0.0035), m(-BODY_W / 2 - 0.0055), m(by + 0.0055)], stroke: "#e2e8f0", strokeWidth: m(0.0032), lineCap: "round", lineJoin: "round", tension: 0.25, listening: false }));
  // Cọc gắn tấm chắn sáng trên mặt xe, và nam châm giữ ở đầu trước.
  const postX = -0.02;
  group.add(new Konva.Rect({ x: m(postX - 0.004), y: m(bodyBottom - BODY_H - 0.012), width: m(0.008), height: m(0.012), cornerRadius: m(0.0012), ...lin(m(postX - 0.004), 0, m(postX + 0.004), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Circle({ x: m(postX), y: m(bodyBottom - BODY_H - 0.012), radius: m(0.0042), fill: "#94a3b8", stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(0.035), y: m(bodyBottom - BODY_H - 0.0045), width: m(0.026), height: m(0.0045), cornerRadius: m(0.001), ...lin(m(0.035), 0, m(0.061), 0, [0, "#ef4444", 0.5, "#ef4444", 0.5001, "#2563eb", 1, "#2563eb"]), stroke: "#0b1226", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Text({ x: m(-0.07), y: m(bodyBottom - BODY_H + 0.004), width: m(0.09), align: "left", text: "DYNAMICS CART", fontSize: m(0.0058), fontStyle: "bold", fill: "#dbeafe", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.006), width: m(0.12), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      wheelFront: { node: wheels.wheelFront, motion: "rotate" as const, min: 0, max: 360 },
      wheelRear: { node: wheels.wheelRear, motion: "rotate" as const, min: 0, max: 360 },
    },
    points: { base: { x: 0, y: 0 }, front: { x: m(frontX + 0.03), y: m(by) }, rear: { x: m(-BODY_W / 2 - 0.0095), y: m(by) }, mountPost: { x: m(postX), y: m(bodyBottom - BODY_H) } },
  };
};
