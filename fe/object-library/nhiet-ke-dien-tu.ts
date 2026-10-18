/* OBJECT-META
{
  "catalog": "Nhiệt kế điện tử / cảm biến nhiệt độ",
  "title": "Nhiệt kế điện tử dạng bút: đầu dò inox, thân cầm tay có màn LCD số, nút nguồn và nút HOLD",
  "fill": "#f8fafc",
  "anchor": "Đầu mút của đầu dò (chỗ nhúng vào chất cần đo).",
  "useWhen": ["Cần nhiệt kế điện tử dạng bút có đầu dò inox và màn LCD số hiện nhiệt độ.", "Cảnh cần đọc nhiệt độ bằng số, đặt chữ trên màn hình LCD (mặc định 25.0 °C)."],
  "avoidWhen": ["Cần nhiệt kế rượu có cột chất lỏng dâng và vạch chia: dùng nhiet-ke.", "Vật không có bộ phận chuyển động; số trên màn phải do cảnh đặt, không tự đổi theo nhiệt độ."],
  "size": { "width": 0.032, "height": 0.28 },
  "parts": [],
  "points": [
    { "name": "tip", "description": "Đầu mút của đầu dò." },
    { "name": "handle", "description": "Giữa thân cầm tay." },
    { "name": "display", "description": "Tâm màn hình LCD." }
  ],
  "notes": "Đầu dò dài 0,13 m cắm vào cốc hay bình; thân cầm tay dài 0,13 m. Màn hình hiện 25.0 °C mặc định, cảnh đặt chữ khác để hiện nhiệt độ thật. fill là màu vỏ nhựa của thân."
}
*/
const makeDigitalThermometer = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const PROBE = 0.13;
  const BODY = 0.13;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0011));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Đầu dò inox: ống thon dần xuống đầu mút bo tròn.
  group.add(new Konva.Line({ points: [m(-0.0036), m(-PROBE), m(0.0036), m(-PROBE), m(0.0027), m(-0.004), m(0), 0, m(-0.0027), m(-0.004)], closed: true, tension: 0.12, ...lin(m(-0.0036), 0, m(0.0036), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.3, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0017), m(-PROBE + 0.004), m(-0.0012), m(-0.012)], stroke: "rgba(255,255,255,0.8)", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));
  // Vạch đánh dấu độ sâu nhúng tối thiểu.
  group.add(new Konva.Line({ points: [m(-0.0036), m(-0.05), m(0.0036), m(-0.05)], stroke: "#0f172a", strokeWidth: lw * 1.2, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0036), m(-0.06), m(0.0036), m(-0.06)], stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  // Cổ nối nhựa đen giữa đầu dò và thân.
  group.add(new Konva.Rect({ x: m(-0.0082), y: m(-PROBE - 0.012), width: m(0.0164), height: m(0.014), cornerRadius: m(0.003), ...lin(m(-0.0082), 0, m(0.0082), 0, [0, "#0b0f19", 0.4, "#374151", 1, "#0b0f19"]), stroke: "#030712", strokeWidth: lw * 0.8, listening: false }));

  // Thân cầm tay bo tròn, hơi thon ở hai đầu.
  const top = -PROBE - 0.012 - BODY;
  group.add(new Konva.Rect({ x: m(-0.0135), y: m(top), width: m(0.027), height: m(BODY), cornerRadius: m(0.0085), ...lin(m(-0.0135), 0, m(0.0135), 0, [0, "#cbd5e1", 0.25, fill, 0.8, "#cbd5e1", 1, "#64748b"]), stroke: "#475569", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.35, shadowOffset: { x: m(0.002), y: m(0.002) }, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0105), m(top + 0.008), m(-0.0105), m(top + BODY - 0.008)], stroke: "rgba(255,255,255,0.85)", strokeWidth: lw * 1.6, lineCap: "round", listening: false }));
  // Màn hình LCD.
  group.add(new Konva.Rect({ x: m(-0.0104), y: m(top + 0.016), width: m(0.0208), height: m(0.028), cornerRadius: m(0.0025), fill: "#0b1220", stroke: "#1f2937", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0094), y: m(top + 0.0175), width: m(0.0188), height: m(0.025), cornerRadius: m(0.002), ...lin(0, m(top + 0.0175), 0, m(top + 0.0425), [0, "#c4e8c0", 1, "#9fd09a"]), listening: false }));
  group.add(new Konva.Text({ x: m(-0.0094), y: m(top + 0.0215), width: m(0.0188), align: "center", text: "25.0", fontSize: m(0.0105), fontStyle: "bold", fontFamily: "Courier New", fill: "#052e16", listening: false }));
  group.add(new Konva.Text({ x: m(-0.0094), y: m(top + 0.0328), width: m(0.0188), align: "center", text: "°C", fontSize: m(0.0058), fontStyle: "bold", fill: "#052e16", listening: false }));
  group.add(new Konva.Text({ x: m(-0.0094), y: m(top + 0.0185), text: "HOLD", fontSize: m(0.0028), fill: "#14532d", opacity: 0.5, listening: false }));
  // Nút nguồn (xanh) và nút HOLD/MAX.
  group.add(new Konva.Circle({ x: 0, y: m(top + 0.058), radius: m(0.0055), ...lin(0, m(top + 0.0525), 0, m(top + 0.0635), [0, "#86efac", 1, "#166534"]), stroke: "#14532d", strokeWidth: lw, listening: false }));
  group.add(new Konva.Text({ x: m(-0.01), y: m(top + 0.0655), width: m(0.02), align: "center", text: "ON/OFF", fontSize: m(0.0028), fill: "#475569", listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(top + 0.083), radius: m(0.0045), ...lin(0, m(top + 0.0785), 0, m(top + 0.0875), [0, "#e2e8f0", 1, "#64748b"]), stroke: "#475569", strokeWidth: lw, listening: false }));
  group.add(new Konva.Text({ x: m(-0.01), y: m(top + 0.0895), width: m(0.02), align: "center", text: "HOLD", fontSize: m(0.0028), fill: "#475569", listening: false }));
  group.add(new Konva.Text({ x: m(-0.0125), y: m(top + 0.105), width: m(0.025), align: "center", text: "TEMP", fontSize: m(0.0036), fontStyle: "bold", fill: "#1d4ed8", listening: false }));
  // Móc kẹp túi và vòng treo ở đầu trên.
  group.add(new Konva.Line({ points: [m(0.0135), m(top + 0.014), m(0.0165), m(top + 0.014), m(0.0165), m(top + 0.07), m(0.0135), m(top + 0.072)], stroke: "#94a3b8", strokeWidth: lw * 1.4, lineCap: "round", lineJoin: "round", listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(top - 0.0035), radius: m(0.004), stroke: "#94a3b8", strokeWidth: m(0.0016), listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(0.02), y: m(top + 0.05), text: label, fontSize: m(0.008), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { tip: { x: 0, y: 0 }, handle: { x: 0, y: m(top + BODY / 2) }, display: { x: 0, y: m(top + 0.03) } } };
};
