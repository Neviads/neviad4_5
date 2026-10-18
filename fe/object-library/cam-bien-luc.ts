/* OBJECT-META
{
  "catalog": "Cảm biến lực",
  "title": "Cảm biến lực điện tử ±50 N: vỏ nhựa, đầu ren bắt giá, nút nguồn, đèn báo và móc đo",
  "fill": "#1d4ed8",
  "anchor": "Tâm khuyên móc đo ở đáy cảm biến (mặt đo): vật treo móc vào đây.",
  "useWhen": ["Cần cảm biến lực điện tử ±50 N, độ phân giải 0,01 N, treo thẳng đứng bằng đầu ren.","Cần móc đo ở đáy để treo vật, neo tại hookEye."],
  "avoidWhen": ["Cần cân đo khối lượng có số g: dùng can-dien-tu.","Cần cảm biến đo chuyển động: dùng cam-bien-chuyen-dong.","Không hiển thị số, giá trị đọc phải do cảnh vẽ thêm."],
  "size": {
    "width": 0.044,
    "height": 0.184
  },
  "parts": [],
  "points": [
    {
      "name": "hookEye",
      "description": "Tâm khuyên móc đo; lực tác dụng đặt ở đây."
    },
    {
      "name": "mount",
      "description": "Đầu ren trên cùng để bắt vào giá thí nghiệm."
    },
    {
      "name": "led",
      "description": "Đèn báo trạng thái."
    }
  ],
  "notes": "Cảm biến treo thẳng đứng: đầu ren ở trên, móc đo ở dưới. Thân ghi dải đo ±50 N và độ phân giải 0,01 N. fill là màu vỏ nhựa."
}
*/
const makeForceSensor = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.044;
  const BODY_H = 0.105;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0012));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const bodyBottom = -0.052;
  const bodyTop = bodyBottom - BODY_H;

  const group = new Konva.Group({ x: p.x, y: p.y });

  // Móc đo: thanh nhôm nhô ra dưới vỏ, đầu uốn thành móc và khuyên.
  group.add(new Konva.Rect({ x: m(-0.0045), y: m(bodyBottom - 0.002), width: m(0.009), height: m(0.036), ...lin(m(-0.0045), 0, m(0.0045), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(-0.008), radius: m(0.0085), stroke: "#e2e8f0", strokeWidth: m(0.0035), shadowColor: "#000", shadowBlur: m(0.005), shadowOpacity: 0.3, listening: false }));
  group.add(new Konva.Line({ points: [0, m(bodyBottom + 0.03), 0, m(-0.0165)], stroke: "#cbd5e1", strokeWidth: m(0.0048), lineCap: "round", listening: false }));

  // Đầu ren trên cùng: ống ren và đai ốc lục giác.
  group.add(new Konva.Rect({ x: m(-0.0042), y: m(bodyTop - 0.026), width: m(0.0084), height: m(0.028), ...lin(m(-0.0042), 0, m(0.0042), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  for (let i = 0; i < 6; i += 1) group.add(new Konva.Line({ points: [m(-0.0042), m(bodyTop - 0.024 + i * 0.0042), m(0.0042), m(bodyTop - 0.0225 + i * 0.0042)], stroke: "rgba(15,23,42,0.45)", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0105), y: m(bodyTop - 0.004), width: m(0.021), height: m(0.007), cornerRadius: m(0.0015), ...lin(m(-0.0105), 0, m(0.0105), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));

  // Vỏ cảm biến: nhựa ABS sơn sần, hai gờ nổi bên cạnh, cổng micro-USB.
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(bodyTop), width: m(W), height: m(BODY_H), cornerRadius: m(0.007), ...lin(m(-W / 2), 0, m(W / 2), 0, [0, "#0b1226", 0.18, fill, 0.55, "#2563eb", 1, "#0b1226"]), stroke: "#020617", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: 0, y: m(0.004) }, listening: false }));
  group.add(new Konva.Line({ points: [m(-W / 2 + 0.006), m(bodyTop + 0.005), m(-W / 2 + 0.006), m(bodyBottom - 0.005)], stroke: "rgba(255,255,255,0.35)", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.008), y: m(bodyBottom - 0.006), width: m(0.016), height: m(0.004), cornerRadius: m(0.001), fill: "#020617", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  // Mặt trước: nhãn trắng, nút nguồn tròn và đèn báo.
  group.add(new Konva.Rect({ x: m(-0.0165), y: m(bodyTop + 0.012), width: m(0.033), height: m(0.032), cornerRadius: m(0.003), fill: "#f8fafc", stroke: "#94a3b8", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Text({ x: m(-0.0165), y: m(bodyTop + 0.0145), width: m(0.033), align: "center", text: "FORCE", fontSize: m(0.0062), fontStyle: "bold", fill: "#0f172a", listening: false }));
  group.add(new Konva.Text({ x: m(-0.0165), y: m(bodyTop + 0.0225), width: m(0.033), align: "center", text: "± 50 N", fontSize: m(0.0072), fontStyle: "bold", fill: "#1d4ed8", listening: false }));
  group.add(new Konva.Text({ x: m(-0.0165), y: m(bodyTop + 0.0335), width: m(0.033), align: "center", text: "0,01 N", fontSize: m(0.0048), fill: "#475569", listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(bodyTop + 0.062), radius: m(0.0085), ...lin(0, m(bodyTop + 0.0535), 0, m(bodyTop + 0.0705), [0, "#e2e8f0", 1, "#475569"]), stroke: "#020617", strokeWidth: lw, listening: false }));
  group.add(new Konva.Arc({ x: 0, y: m(bodyTop + 0.062), innerRadius: m(0.0032), outerRadius: m(0.0042), angle: 280, rotation: 130, fill: "#0f172a", listening: false }));
  group.add(new Konva.Line({ points: [0, m(bodyTop + 0.0555), 0, m(bodyTop + 0.0618)], stroke: "#0f172a", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));
  group.add(new Konva.Circle({ x: m(0.0125), y: m(bodyTop + 0.048), radius: m(0.0025), fill: "#22c55e", shadowColor: "#22c55e", shadowBlur: m(0.006), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Text({ x: m(-0.0165), y: m(bodyBottom - 0.0185), width: m(0.033), align: "center", text: "ZERO", fontSize: m(0.0045), fill: "#bfdbfe", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(0.026), y: m(bodyTop + 0.04), text: label, fontSize: m(0.009), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { hookEye: { x: 0, y: m(-0.008) }, mount: { x: 0, y: m(bodyTop - 0.026) }, led: { x: m(0.0125), y: m(bodyTop + 0.048) } } };
};
