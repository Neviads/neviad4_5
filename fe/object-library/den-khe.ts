/* OBJECT-META
{
  "catalog": "Đèn có khe / hộp tạo chùm tia song song",
  "title": "Hộp tia: hộp đèn kim loại đen với ba khe hẹp ở mặt trước tạo ba tia sáng song song, bóng đèn bên trong và dây nguồn",
  "fill": "#1f2937",
  "anchor": "Giữa cửa ra (khe giữa) ở mặt trước bên phải.",
  "useWhen": ["Cần hộp đèn có ba khe song song để tạo ba tia sáng trong thí nghiệm phản xạ, khúc xạ.", "Cần các điểm khe riêng (khe trên, giữa, dưới cách nhau 0,016 m) để đặt tia sáng."],
  "avoidWhen": ["Cần chùm sáng một nguồn điểm hội tụ ở cửa ra: dùng den-chieu.", "Cần một tia laser mảnh duy nhất: dùng laser; hộp này luôn phát ba khe."],
  "size": { "width": 0.252, "height": 0.112 },
  "parts": [],
  "points": [
    { "name": "slitMid", "description": "Tâm khe giữa ở mặt trước." },
    { "name": "slitUpper", "description": "Tâm khe trên, cách khe giữa 0,016 m." },
    { "name": "slitLower", "description": "Tâm khe dưới, cách khe giữa 0,016 m." },
    { "name": "base", "description": "Giữa đáy hộp." }
  ],
  "notes": "Hộp 0,16 m × 0,09 m có tấm chắn trước với ba khe rộng 0,0015 m cách nhau 0,016 m; đèn sợi đốt và thấu kính hội tụ bên trong tạo chùm song song. Các tia sáng là hiện tượng do cảnh vẽ. fill là màu sơn đen của hộp."
}
*/
const makeRayBox = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.17;
  const H = 0.09;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const right = 0.04;
  const left = right - W;
  const top = -H - 0.01;
  const cy = top + H / 2;

  // Chân cao su và dây nguồn ra phía sau.
  for (const x of [left + 0.025, right - 0.03]) group.add(new Konva.Rect({ x: m(x - 0.012), y: m(-0.01), width: m(0.024), height: m(0.01), cornerRadius: m(0.003), fill: "#0b0f19", listening: false }));
  group.add(new Konva.Line({ points: [m(left), m(cy + 0.016), m(left - 0.03), m(cy + 0.03), m(left - 0.05), m(-0.004), m(left - 0.075), m(-0.002)], stroke: "#0b0f19", strokeWidth: m(0.0046), lineCap: "round", tension: 0.5, listening: false }));

  // Thân hộp đen bo góc có rãnh làm mát và tay xách ở phía trên.
  group.add(new Konva.Rect({ x: m(left), y: m(top - 0.012), width: m(0.07), height: m(0.012), cornerRadius: m(0.005), ...lin(0, m(top - 0.012), 0, m(top), [0, "#6b7280", 1, "#1f2937"]), stroke: "#000", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(left), y: m(top), width: m(W), height: m(H), cornerRadius: m(0.006), ...lin(0, m(top), 0, m(top + H), [0, "#6b7280", 0.1, fill, 1, "#030712"]), stroke: "#000", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.45, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  group.add(new Konva.Line({ points: [m(left + 0.008), m(top + 0.003), m(right - 0.008), m(top + 0.003)], stroke: "rgba(255,255,255,0.4)", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));
  for (let i = 0; i < 9; i += 1) group.add(new Konva.Line({ points: [m(left + 0.014 + i * 0.0072), m(top + 0.012), m(left + 0.014 + i * 0.0072), m(top + 0.038)], stroke: "rgba(255,255,255,0.13)", strokeWidth: lw * 1.2, listening: false }));
  group.add(new Konva.Circle({ x: m(left + 0.012), y: m(top + 0.075), radius: m(0.0025), fill: "#22c55e", shadowColor: "#22c55e", shadowBlur: m(0.006), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Text({ x: m(left + 0.02), y: m(top + 0.0705), text: "RAY BOX · 12 V", fontSize: m(0.0055), fontStyle: "bold", fill: "#9ca3af", listening: false }));

  // Tấm chắn trước nhẹ nhô ra: tấm đồng thau mỏng có ba khe sáng.
  group.add(new Konva.Rect({ x: m(right - 0.003), y: m(top + 0.0065), width: m(0.009), height: m(H - 0.013), cornerRadius: m(0.002), ...lin(m(right), 0, m(right + 0.006), 0, [0, "#475569", 0.5, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  for (const dy of [-0.016, 0, 0.016]) {
    group.add(new Konva.Rect({ x: m(right - 0.0035), y: m(cy + dy - 0.0013), width: m(0.0105), height: m(0.0026), fill: "#fff8cc", shadowColor: "#fde047", shadowBlur: m(0.01), shadowOpacity: 0.9, listening: false }));
    group.add(new Konva.Line({ points: [m(right - 0.0035), m(cy + dy), m(right + 0.007), m(cy + dy)], stroke: "#fffbe0", strokeWidth: lw * 1.4, lineCap: "round", listening: false }));
  }
  // Cửa sổ thấy bóng đèn nhỏ ở phía sau, qua cửa sổ viền kim loại.
  group.add(new Konva.Rect({ x: m(left + 0.006), y: m(cy - 0.017), width: m(0.012), height: m(0.034), cornerRadius: m(0.002), fill: "#030712", stroke: "#94a3b8", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Circle({ x: m(left + 0.012), y: m(cy), radius: m(0.0062), fillRadialGradientStartPoint: { x: m(left + 0.012), y: m(cy) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: m(left + 0.012), y: m(cy) }, fillRadialGradientEndRadius: m(0.0062), fillRadialGradientColorStops: [0, "#ffffff", 0.5, "rgba(253,224,71,0.8)", 1, "rgba(253,224,71,0)"], listening: false }));
  // Hai núm vặn đóng mở khe.
  for (const [x, label2] of [[right - 0.045, "A"], [right - 0.025, "B"]] as const) {
    group.add(new Konva.Circle({ x: m(x), y: m(top + 0.0725), radius: m(0.0075), ...lin(m(x - 0.0075), 0, m(x + 0.0075), 0, [0, "#6b7280", 0.4, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Text({ x: m(x - 0.006), y: m(top + 0.0705), width: m(0.012), align: "center", text: label2, fontSize: m(0.0048), fontStyle: "bold", fill: "#d1d5db", listening: false }));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(left), y: m(0.004), width: m(W), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { slitMid: { x: m(right + 0.007), y: m(cy) }, slitUpper: { x: m(right + 0.007), y: m(cy - 0.016) }, slitLower: { x: m(right + 0.007), y: m(cy + 0.016) }, base: { x: m((left + right) / 2), y: 0 } } };
};
