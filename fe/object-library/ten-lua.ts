/* OBJECT-META
{
  "catalog": "Tên lửa",
  "title": "Tên lửa mô hình: thân trụ trắng, mũi nón đỏ, ba cánh ổn định, cửa sổ tròn, đai màu và loa phun",
  "fill": "#f1f5f9",
  "anchor": "Giữa miệng loa phun ở đuôi.",
  "useWhen": ["Cần tên lửa mô hình thẳng đứng, đầu nón, ba cánh, cho bài phản lực, động lượng hoặc chuyển động lên cao.","Cần mốc tâm khối cách đuôi 0,22 m và điểm đuôi để gắn ngọn lửa phụt."],
  "avoidWhen": ["Cần máy bay hay khinh khí cầu bay trong khí quyển: dùng may-bay hoặc khinh-khi-cau.","Cần tàu vũ trụ có khoang lái hoặc vệ tinh quay quanh Trái Đất: dùng tau-vu-tru hoặc ve-tinh-nhan-tao.","Lửa và khói không có sẵn trong vật, phải do cảnh vẽ thêm."],
  "size": { "width": 0.186, "height": 0.508 },
  "parts": [],
  "points": [
    { "name": "tail", "description": "Giữa miệng loa phun ở đuôi: nơi lửa phụt ra." },
    { "name": "nose", "description": "Đỉnh mũi tên lửa." },
    { "name": "center", "description": "Tâm khối của tên lửa, cách đuôi 0,22 m." }
  ],
  "notes": "Cao 0,5 m, thân rộng 0,07 m, hướng lên trên. Ngọn lửa và khói phụt từ miệng loa là hiện tượng do cảnh vẽ (metrics.items), không thuộc vật. fill là màu thân."
}
*/
const makeRocket = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.07;
  const NOZZLE_H = 0.045;
  const BODY_H = 0.3;
  const NOSE_H = 0.15;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0015));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const bodyBottom = -NOZZLE_H;
  const bodyTop = bodyBottom - BODY_H;

  // Ba cánh đuôi: hai cánh bên và một cánh giữa nhìn nghiêng; sơn đỏ, mép sáng.
  const fin = (side: number) => new Konva.Line({ points: [m(side * W / 2), m(bodyBottom - 0.15), m(side * (W / 2 + 0.058)), m(bodyBottom + 0.02), m(side * (W / 2 + 0.058)), m(bodyBottom + 0.045 - 0.0), m(side * W / 2), m(bodyBottom)], closed: true, lineJoin: "round", ...lin(m(side * W / 2), 0, m(side * (W / 2 + 0.058)), 0, side < 0 ? [0, "#7f1d1d", 1, "#ef4444"] : [0, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.35, listening: false });
  group.add(fin(-1), fin(1));
  group.add(new Konva.Line({ points: [m(-0.004), m(bodyBottom - 0.12), m(-0.004), m(bodyBottom + 0.058), m(0.004), m(bodyBottom + 0.058), m(0.004), m(bodyBottom - 0.12)], closed: true, fill: "#b91c1c", stroke: "#450a0a", strokeWidth: lw, lineJoin: "round", listening: false }));

  // Loa phun: hình chuông kim loại tối với vành sáng.
  group.add(new Konva.Line({ points: [m(-0.018), m(bodyBottom), m(-0.03), m(-0.012), m(-0.034), 0, m(0.034), 0, m(0.03), m(-0.012), m(0.018), m(bodyBottom)], closed: true, tension: 0.2, lineJoin: "round", ...lin(m(-0.034), 0, m(0.034), 0, [0, "#1f2937", 0.3, "#9ca3af", 0.6, "#4b5563", 1, "#030712"]), stroke: "#030712", strokeWidth: lw * 1.2, listening: false }));
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.0012), radiusX: m(0.031), radiusY: m(0.0045), fill: "#030712", stroke: "#6b7280", strokeWidth: lw, listening: false }));

  // Thân trụ: trắng bóng có hai đai màu, đường nối và cửa sổ tròn.
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(bodyTop), width: m(W), height: m(BODY_H), ...lin(m(-W / 2), 0, m(W / 2), 0, [0, "#94a3b8", 0.18, "#ffffff", 0.55, fill, 1, "#64748b"]), stroke: "#475569", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(bodyBottom - 0.052), width: m(W), height: m(0.028), ...lin(m(-W / 2), 0, m(W / 2), 0, [0, "#7f1d1d", 0.3, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(bodyTop + 0.02), width: m(W), height: m(0.012), ...lin(m(-W / 2), 0, m(W / 2), 0, [0, "#1e3a8a", 0.3, "#3b82f6", 1, "#1e3a8a"]), stroke: "#0b1e63", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Line({ points: [m(-W / 2 + 0.006), m(bodyTop + 0.004), m(-W / 2 + 0.006), m(bodyBottom - 0.004)], stroke: "rgba(255,255,255,0.8)", strokeWidth: lw * 2.4, lineCap: "round", listening: false }));
  for (const y of [bodyBottom - 0.14, bodyTop + 0.06]) group.add(new Konva.Line({ points: [m(-W / 2), m(y), m(W / 2), m(y)], stroke: "rgba(71,85,105,0.55)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(bodyTop + 0.12), radius: m(0.0175), fill: "#334155", stroke: "#94a3b8", strokeWidth: m(0.0042), listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(bodyTop + 0.12), radius: m(0.0125), ...lin(m(-0.012), m(bodyTop + 0.108), m(0.012), m(bodyTop + 0.132), [0, "#7dd3fc", 0.5, "#0369a1", 1, "#082f49"]), listening: false }));
  group.add(new Konva.Ellipse({ x: m(-0.0042), y: m(bodyTop + 0.1135), radiusX: m(0.0045), radiusY: m(0.0028), rotation: -35, fill: "rgba(255,255,255,0.75)", listening: false }));
  group.add(new Konva.Text({ x: m(-W / 2), y: m(bodyTop + 0.165), width: m(W), align: "center", text: "ROCKET", fontSize: m(0.0105), fontStyle: "bold", fill: "#1e293b", listening: false }));

  // Mũi nón đỏ với đường cong tạo mặt khum.
  group.add(new Konva.Line({ points: [m(-W / 2), m(bodyTop), m(-W / 2 + 0.003), m(bodyTop - 0.035), m(-0.017), m(bodyTop - 0.09), m(0), m(bodyTop - NOSE_H), m(0.017), m(bodyTop - 0.09), m(W / 2 - 0.003), m(bodyTop - 0.035), m(W / 2), m(bodyTop)], closed: true, tension: 0.35, ...lin(m(-W / 2), 0, m(W / 2), 0, [0, "#7f1d1d", 0.18, "#fca5a5", 0.45, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.35, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.026), m(bodyTop - 0.02), m(-0.016), m(bodyTop - 0.07)], stroke: "rgba(255,255,255,0.7)", strokeWidth: lw * 2.2, lineCap: "round", tension: 0.4, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(0.045), y: m(bodyTop + 0.1), text: label, fontSize: m(0.014), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { tail: { x: 0, y: 0 }, nose: { x: 0, y: m(bodyTop - NOSE_H) }, center: { x: 0, y: m(-0.22) } } };
};
