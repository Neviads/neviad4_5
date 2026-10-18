/* OBJECT-META
{
  "catalog": "Pin nhiệt điện (cặp nhiệt)",
  "title": "Cặp nhiệt điện: hai dây kim loại khác nhau (đồng và constantan) hàn ở mối nóng, hai đầu lạnh nối với milivôn kế kim, mối nóng đặt trên ngọn lửa",
  "fill": "#fb923c",
  "anchor": "Mối hàn nóng.",
  "useWhen": ["Cần cặp nhiệt đồng–constantan có mối nóng trên ngọn lửa và milivôn kế kim 0–10 mV.","Cần thể hiện suất điện động nhiệt điện ξ = α(T₁ − T₂)."],
  "avoidWhen": ["Cần nguồn điện hoá học thông thường: dùng pin.","Cần nhiệt kế điện tử đo nhiệt độ: dùng nhiet-ke-dien-tu."],
  "size": { "width": 0.193, "height": 0.193 },
  "parts": [],
  "points": [
    { "name": "hotJunction", "description": "Mối hàn nóng, nơi hai dây giao nhau." },
    { "name": "coldA", "description": "Đầu lạnh của dây đồng nối vào milivôn kế." },
    { "name": "coldB", "description": "Đầu lạnh của dây constantan nối vào milivôn kế." },
    { "name": "meter", "description": "Tâm mặt milivôn kế." }
  ],
  "notes": "Hai dây dài 0,15 m: một đồng (đỏ cam), một constantan (bạc) hàn ở mối nóng, hai đầu kia giữ ở nhiệt độ phòng nối với milivôn kế thang 0–10 mV; ngọn lửa đèn cồn đốt nóng mối hàn. Suất điện động ξ = α(T₁ − T₂), α cỡ 40 µV/K với cặp đồng – constantan. fill là màu ngọn lửa."
}
*/
const makeThermocouple = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const mx = 0.09;
  const my = -0.085;
  const MR = 0.034;

  // Đèn cồn nhỏ phía dưới: chân thuỷ tinh, bấc và ngọn lửa chạm mối hàn.
  group.add(new Konva.Ellipse({ x: 0, y: m(0.058), radiusX: m(0.025), radiusY: m(0.005), fill: "rgba(0,0,0,0.3)", listening: false }));
  group.add(new Konva.Line({ points: [m(-0.016), m(0.056), m(-0.022), m(0.044), m(-0.016), m(0.034), m(-0.006), m(0.028), m(0.006), m(0.028), m(0.016), m(0.034), m(0.022), m(0.044), m(0.016), m(0.056)], closed: true, tension: 0.3, fill: "rgba(186,230,253,0.35)", stroke: "rgba(226,240,252,0.95)", strokeWidth: lw * 1.2, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.017), y: m(0.037), width: m(0.034), height: m(0.016), cornerRadius: m(0.004), fill: "rgba(125,211,252,0.45)", listening: false }));
  group.add(ln([-0.012, 0.03, -0.014, 0.05], "rgba(255,255,255,0.8)", lw * 1.5));
  group.add(new Konva.Rect({ x: m(-0.0042), y: m(0.02), width: m(0.0084), height: m(0.009), cornerRadius: m(0.0014), ...lin(0, 0, m(0.0084), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0016), m(0.02), m(-0.0012), m(0.014), m(0.0012), m(0.014), m(0.0016), m(0.02)], closed: true, fill: "#f5f5f4", stroke: "#a8a29e", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Line({ points: [m(0), m(0.0145), m(-0.0075), m(0.004), m(-0.0048), m(-0.012), m(0), m(-0.024), m(0.0048), m(-0.012), m(0.0075), m(0.004)], closed: true, tension: 0.4, ...lin(0, m(-0.024), 0, m(0.0145), [0, "rgba(251,146,60,0)", 0.25, "rgba(251,146,60,0.7)", 0.7, "rgba(254,240,138,0.95)", 1, "rgba(96,165,250,0.85)"]), shadowColor: fill, shadowBlur: m(0.014), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Line({ points: [m(0), m(0.0145), m(-0.0036), m(0.006), m(0), m(-0.014), m(0.0036), m(0.006)], closed: true, tension: 0.4, fill: "rgba(255,255,255,0.88)", listening: false }));

  // Hai dây kim loại: đồng (cam) và constantan (bạc), hàn gặp nhau ở mối nóng ngay trên ngọn lửa, kéo tới milivôn kế.
  const hotY = -0.026;
  group.add(ln([0, hotY, 0.03, hotY - 0.032, 0.06, my + 0.018, mx - 0.012, my + 0.01], "#451a03", m(0.0034)));
  group.add(ln([0, hotY, 0.03, hotY - 0.032, 0.06, my + 0.018, mx - 0.012, my + 0.01], "#ea580c", m(0.0024)));
  group.add(ln([0, hotY, 0.02, hotY - 0.015, 0.05, my + 0.05, mx - 0.012, my + 0.032], "#334155", m(0.0034)));
  group.add(ln([0, hotY, 0.02, hotY - 0.015, 0.05, my + 0.05, mx - 0.012, my + 0.032], "#e2e8f0", m(0.0024)));
  group.add(new Konva.Circle({ x: 0, y: m(hotY), radius: m(0.0042), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0042), fillRadialGradientColorStops: [0, "#fff", 0.4, "#fdba74", 1, "#b45309"], stroke: "#451a03", strokeWidth: lw * 0.7, shadowColor: fill, shadowBlur: m(0.012), shadowOpacity: 0.95, listening: false }));
  group.add(new Konva.Text({ x: m(-0.062), y: m(hotY - 0.012), text: "mối nóng T₁", fontSize: m(0.011), fontStyle: "bold", fill: "#fed7aa", listening: false }));
  group.add(new Konva.Text({ x: m(0.052), y: m(my + 0.058), text: "đầu lạnh T₂", fontSize: m(0.011), fontStyle: "bold", fill: "#bfdbfe", listening: false }));

  // Milivôn kế: hộp nhựa đen, mặt trắng nửa vòng thang 0–10 mV, kim đỏ lệch vừa phải, hai chốt ở sát đáy trái.
  group.add(new Konva.Rect({ x: m(mx - 0.014), y: m(my - 0.0395), width: m(0.092), height: m(0.092), cornerRadius: m(0.006), ...lin(0, 0, 0, m(0.092), [0, "#6b7280", 0.2, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.5, shadowOffset: { x: m(0.003), y: m(0.005) }, listening: false }));
  group.add(new Konva.Circle({ x: m(mx + 0.032), y: m(my), radius: m(MR), fill: "#fefce8", stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Arc({ x: m(mx + 0.032), y: m(my), innerRadius: m(MR - 0.004), outerRadius: m(MR - 0.002), angle: 100, rotation: 220, fill: "#1f2937", listening: false }));
  for (let i = 0; i <= 10; i += 1) {
    const a = ((220 + i * 10) * Math.PI) / 180;
    const r1 = MR - 0.004;
    const r2 = r1 - (i % 5 === 0 ? 0.0065 : 0.0035);
    group.add(ln([mx + 0.032 + r1 * Math.cos(a), my + r1 * Math.sin(a), mx + 0.032 + r2 * Math.cos(a), my + r2 * Math.sin(a)], "#1f2937", i % 5 === 0 ? lw * 1.1 : lw * 0.6));
    if (i % 5 === 0) group.add(new Konva.Text({ x: m(mx + 0.032 + (r2 - 0.005) * Math.cos(a) - 0.004), y: m(my + (r2 - 0.005) * Math.sin(a) - 0.003), width: m(0.008), align: "center", text: String(i), fontSize: m(0.0052), fill: "#1f2937", listening: false }));
  }
  const na = ((220 + 6.3 * 10) * Math.PI) / 180;
  group.add(ln([mx + 0.032, my + 0.01, mx + 0.032 + 0.026 * Math.cos(na), my + 0.01 + 0.026 * Math.sin(na) - 0.01], "#dc2626", lw * 1.3));
  group.add(new Konva.Circle({ x: m(mx + 0.032), y: m(my + 0.01), radius: m(0.0034), fill: "#1f2937", listening: false }));
  group.add(new Konva.Text({ x: m(mx + 0.032 - 0.012), y: m(my - 0.0045), width: m(0.024), align: "center", text: "mV", fontSize: m(0.009), fontStyle: "bold", fill: "#1f2937", listening: false }));
  group.add(new Konva.Line({ points: [m(mx - 0.002), m(my - 0.034), m(mx + 0.028), m(my - 0.034), m(mx - 0.002), m(my - 0.004)], closed: true, fill: "rgba(255,255,255,0.22)", listening: false }));
  for (const [dy, c, cc] of [[0.01, "#ea580c", "#7c2d12"], [0.032, "#cbd5e1", "#334155"]] as [number, string, string][]) {
    group.add(new Konva.Circle({ x: m(mx - 0.012), y: m(my + dy), radius: m(0.0042), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0042), fillRadialGradientColorStops: [0, "#fff", 0.35, c, 1, cc], stroke: cc, strokeWidth: lw * 0.6, listening: false }));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.062), width: m(0.12), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { hotJunction: { x: 0, y: m(hotY) }, coldA: { x: m(mx - 0.012), y: m(my + 0.01) }, coldB: { x: m(mx - 0.012), y: m(my + 0.032) }, meter: { x: m(mx + 0.032), y: m(my) } } };
};
