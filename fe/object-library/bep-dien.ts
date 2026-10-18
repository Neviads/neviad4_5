/* OBJECT-META
{
  "catalog": "Bếp điện / bếp ga",
  "title": "Bếp điện từ nhìn xiên từ trên xuống: mặt kính đen có hai vòng nung đồng tâm nóng đỏ, thân hộp kim loại có khe thông gió, núm chỉnh công suất có thang chia, đèn báo nóng và bốn chân cao su",
  "fill": "#1f2937",
  "anchor": "Giữa đáy bếp, chạm mặt bàn.",
  "useWhen": ["Cần bếp điện từ 2000 W có hai vòng nung nóng đỏ, núm công suất thang 0–6 và đèn báo.","Cần nguồn nhiệt để đun nồi hoặc cốc đặt lên mặt kính."],
  "avoidWhen": ["Cần ngọn lửa hay đèn cồn: dùng den-con, bếp này không có lửa.","Vẽ nhìn xiên từ trên xuống, khác vật nhìn ngang, dễ lệch khi đặt cạnh vật nhìn ngang.","Cần nồi có sẵn nắp: dùng am-dun, bếp không kèm nồi."],
  "size": { "width": 0.28, "height": 0.096 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy bếp." },
    { "name": "surface", "description": "Giữa mặt bếp, nơi đặt bình." },
    { "name": "knob", "description": "Tâm núm chỉnh công suất ở mặt trước." }
  ],
  "notes": "Bếp rộng 0,26 m, sâu 0,16 m, cao 0,05 m, công suất 2000 W; mặt kính ceramic đen có hai vùng nung (vòng ngoài và vòng trong) hiện cam khi nóng. Núm chỉnh ở mặt trước bên phải với thang 0–6, đèn báo đỏ bên trái, ngọn lửa không có vì là bếp điện. fill là màu vỏ bếp."
}
*/
const makeHotplate = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const W = 0.26;
  const FH = 0.034;
  const TOP = -0.092;
  const TD = 0.05;
  const hx = W / 2;

  // Bóng đổ và bốn chân cao su.
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.002), radiusX: m(hx + 0.01), radiusY: m(0.006), fill: "rgba(0,0,0,0.4)", listening: false }));
  for (const x of [-0.105, 0.105]) group.add(new Konva.Rect({ x: m(x - 0.012), y: m(-0.008), width: m(0.024), height: m(0.008), cornerRadius: m(0.003), ...lin(0, 0, 0, m(0.008), [0, "#374151", 1, "#030712"]), listening: false }));

  // Thân phía trước: tấm mặt trước sơn đen có gờ, khe thông gió bên trái và bảng điều khiển bên phải.
  group.add(new Konva.Rect({ x: m(-hx), y: m(-FH - 0.008), width: m(W), height: m(FH), cornerRadius: m(0.004), ...lin(0, 0, 0, m(FH), [0, "#6b7280", 0.18, fill, 1, "#030712"]), stroke: "#000", strokeWidth: lw * 1.2, listening: false }));
  group.add(ln([-hx + 0.005, -FH - 0.0055, hx - 0.005, -FH - 0.0055], "rgba(255,255,255,0.35)", lw * 1.3));
  for (let i = 0; i < 9; i += 1) group.add(ln([-0.115 + i * 0.0055, -0.027, -0.115 + i * 0.0055, -0.017], "rgba(0,0,0,0.7)", lw * 1.5));
  group.add(new Konva.Text({ x: m(-0.062), y: m(-0.0275), width: m(0.1), align: "center", text: "INDUCTION  2000W", fontSize: m(0.0058), fontStyle: "bold", fill: "rgba(226,232,240,0.85)", listening: false }));

  // Mặt trên: hình bình hành nghiêng, kính ceramic đen có phản chiếu và viền kim loại.
  const tf = [-hx, TOP + TD, hx, TOP + TD, hx - 0.012, TOP, -hx + 0.012, TOP];
  group.add(new Konva.Line({ points: tf.map(m), closed: true, ...lin(0, m(TOP), 0, m(TOP + TD), [0, "#334155", 0.5, "#020617", 1, "#0b1220"]), stroke: "#94a3b8", strokeWidth: lw * 1.2, lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: [-hx + 0.006, TOP + TD - 0.004, hx - 0.006, TOP + TD - 0.004, hx - 0.016, TOP + 0.004, -hx + 0.016, TOP + 0.004].map(m), closed: true, stroke: "rgba(2,6,23,0.9)", strokeWidth: lw * 2, lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: [-hx + 0.016, TOP + 0.006, -0.02, TOP + 0.006, -0.09, TOP + TD - 0.006, -hx + 0.01, TOP + TD - 0.006].map(m), closed: true, fill: "rgba(255,255,255,0.1)", listening: false }));

  // Hai vòng nung (vòng đồng tâm cam nóng đỏ có quầng sáng): bên trái lớn, bên phải nhỏ.
  const ring = (cx: number, cy: number, rx: number, ry: number, hot: boolean) => {
    group.add(new Konva.Ellipse({ x: m(cx), y: m(cy), radiusX: m(rx + 0.008), radiusY: m((ry + 0.008) * 0.8), fill: hot ? "rgba(251,146,60,0.2)" : "rgba(148,163,184,0.06)", listening: false }));
    for (const k of [1, 0.78, 0.56, 0.34]) group.add(new Konva.Ellipse({ x: m(cx), y: m(cy), radiusX: m(rx * k), radiusY: m(ry * k), stroke: hot ? (k > 0.7 ? "#ea580c" : "#fdba74") : "#475569", strokeWidth: lw * 1.5, shadowColor: "#fb923c", shadowBlur: hot ? m(0.006) : 0, shadowOpacity: 0.9, listening: false }));
    group.add(new Konva.Ellipse({ x: m(cx), y: m(cy), radiusX: m(rx * 0.14), radiusY: m(ry * 0.14), fill: hot ? "#fef3c7" : "#334155", listening: false }));
  };
  ring(-0.055, TOP + TD / 2 + 0.002, 0.052, 0.018, true);
  ring(0.07, TOP + TD / 2 + 0.002, 0.036, 0.0125, true);
  group.add(ln([-0.04, TOP + TD - 0.008, 0.1, TOP + TD - 0.008], "rgba(255,255,255,0.18)", lw));

  // Núm xoay có thang 0–6, kim chỉ báo đỏ; đèn báo nóng và nhãn H.
  const kx = 0.1;
  const ky = -0.0245;
  for (let i = 0; i <= 6; i += 1) {
    const a = ((-135 + i * 45) * Math.PI) / 180;
    group.add(ln([kx + 0.0125 * Math.sin(a), ky - 0.0125 * Math.cos(a), kx + 0.0155 * Math.sin(a), ky - 0.0155 * Math.cos(a)], "#e2e8f0", lw));
  }
  group.add(new Konva.Circle({ x: m(kx), y: m(ky), radius: m(0.0112), ...lin(m(-0.0112), m(-0.0112), m(0.0112), m(0.0112), [0, "#f8fafc", 0.4, "#94a3b8", 1, "#1f2937"]), stroke: "#030712", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.6, listening: false }));
  group.add(ln([kx, ky, kx + 0.0085 * Math.sin(0.7), ky - 0.0085 * Math.cos(0.7)], "#dc2626", lw * 2));
  group.add(new Konva.Circle({ x: m(kx), y: m(ky), radius: m(0.0022), fill: "#1f2937", listening: false }));
  group.add(new Konva.Circle({ x: m(-0.118), y: m(-0.0295), radius: m(0.0032), fill: "#ef4444", stroke: "#7f1d1d", strokeWidth: lw * 0.6, shadowColor: "#f87171", shadowBlur: m(0.007), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Text({ x: m(-0.113), y: m(-0.0325), text: "HOT", fontSize: m(0.0058), fontStyle: "bold", fill: "#fca5a5", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(0.006), width: m(0.2), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, surface: { x: 0, y: m(TOP + TD / 2) }, knob: { x: m(kx), y: m(ky) } } };
};
