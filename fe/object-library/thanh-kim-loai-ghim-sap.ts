/* OBJECT-META
{
  "catalog": "Thanh kim loại có ghim sáp",
  "title": "Thanh đồng nằm ngang kẹp ở một đầu, đầu kia được hơ trên ngọn lửa; các ghim sắt dính bằng giọt sáp dọc thanh, có ghim đã rơi xuống bàn",
  "fill": "#f4a261",
  "anchor": "Đầu được đun (đầu trái của thanh).",
  "useWhen": ["Cần thí nghiệm dẫn nhiệt: thanh đồng nằm ngang hơ một đầu, ghim sắt dính sáp rơi dần.","Cần cảnh đã có sẵn ngọn lửa dưới đầu trái và hai ghim đã rơi."],
  "avoidWhen": ["Cần so sánh dẫn nhiệt của nhiều thanh vật liệu khác nhau: vật này chỉ có một thanh đồng.","Cần thanh có nhiệt kế đo nhiệt độ từng điểm: dùng nhiet-ke; vật này chỉ cho thấy ghim rơi.","Cần chất lỏng hay chất khí đối lưu: dùng vật khác, vật này chỉ minh họa dẫn nhiệt trong chất rắn."],
  "size": { "width": 0.368, "height": 0.169 },
  "parts": [],
  "points": [
    { "name": "heatedEnd", "description": "Đầu thanh được đun trên ngọn lửa." },
    { "name": "clamp", "description": "Chỗ kẹp thanh vào giá." },
    { "name": "pin1", "description": "Ghim gần đầu nóng nhất (đã rơi)." },
    { "name": "pinLast", "description": "Ghim xa nhất, sát giá." }
  ],
  "notes": "Thanh đồng dài 0,3 m, đường kính 0,008 m, kẹp ở đầu phải; năm ghim dán bằng sáp ở các điểm cách nhau 0,05 m kể từ đầu đun, hai ghim gần lửa đã rơi vì sáp chảy trước. Cho thấy nhiệt truyền dọc theo thanh. Màu thanh chuyển đỏ ở đầu nóng. fill là màu đồng của thanh."
}
*/
const makeWaxPinRod = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const L = 0.3;
  const RY = -0.075;

  // Giá đỡ ở bên phải: đế gang, trụ đứng, kẹp vạn năng ôm đầu thanh.
  const gx = L + 0.015;
  group.add(new Konva.Ellipse({ x: m(gx), y: m(0.058), radiusX: m(0.035), radiusY: m(0.0055), ...lin(m(-0.035), 0, m(0.035), 0, [0, "#475569", 0.3, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(gx - 0.0035), y: m(RY - 0.03), width: m(0.007), height: m(0.058 - RY + 0.03 - 0.0045), ...lin(0, 0, m(0.007), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(gx - 0.014), y: m(RY - 0.011), width: m(0.028), height: m(0.022), cornerRadius: m(0.003), ...lin(0, 0, m(0.028), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: m(gx + 0.008), y: m(RY), radius: m(0.0042), fill: "#1f2937", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));

  // Ngọn lửa đèn cồn dưới đầu trái thanh và thân đèn.
  group.add(new Konva.Ellipse({ x: m(0.012), y: m(RY + 0.034), radiusX: m(0.03), radiusY: m(0.035), fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.035), fillRadialGradientColorStops: [0, "rgba(251,146,60,0.35)", 1, "rgba(251,146,60,0)"], listening: false }));
  for (const [hk, wk, c] of [[1, 1, "#f97316"], [0.7, 0.6, "#fbbf24"], [0.4, 0.32, "#fef9c3"]] as [number, number, string][]) {
    group.add(new Konva.Line({ points: [m(0.012), m(RY + 0.029 + 0.0), m(0.012 + 0.009 * wk), m(RY + 0.029 - 0.008 * hk), m(0.012 + 0.004 * wk), m(RY + 0.029 - 0.019 * hk), m(0.012), m(RY + 0.029 - 0.03 * hk), m(0.012 - 0.004 * wk), m(RY + 0.029 - 0.019 * hk), m(0.012 - 0.009 * wk), m(RY + 0.029 - 0.008 * hk)], closed: true, tension: 0.45, fill: c, opacity: 0.9, listening: false }));
  }
  group.add(new Konva.Rect({ x: m(0.0045), y: m(RY + 0.03), width: m(0.015), height: m(0.014), cornerRadius: m(0.002), ...lin(0, 0, m(0.015), 0, [0, "#a16207", 0.3, "#fde68a", 1, "#451a03"]), stroke: "#451a03", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.006), m(RY + 0.058), m(-0.012), m(RY + 0.046), m(0.0045), m(RY + 0.038), m(0.0195), m(RY + 0.038), m(0.036), m(RY + 0.046), m(0.03), m(RY + 0.058)], closed: true, tension: 0.25, ...lin(m(-0.012), 0, m(0.036), 0, [0, "rgba(255,255,255,0.5)", 0.4, "rgba(186,230,253,0.25)", 1, "rgba(71,85,105,0.5)"]), stroke: "rgba(226,240,252,0.9)", strokeWidth: lw * 1.4, lineJoin: "round", listening: false }));

  // Thanh đồng: màu nguội ở phải chuyển cam – đỏ nhạt ở đầu trái, bóng kim loại.
  group.add(new Konva.Rect({ x: 0, y: m(RY - 0.004), width: m(L), height: m(0.008), cornerRadius: m(0.004), ...lin(0, 0, m(L), 0, [0, "#fb923c", 0.12, "#f97316", 0.35, "#fdba74", 0.7, fill, 1, "#c2410c"]), stroke: "#7c2d12", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.35, shadowOffset: { x: m(0.001), y: m(0.003) }, listening: false }));
  group.add(new Konva.Rect({ x: 0, y: m(RY - 0.004), width: m(L), height: m(0.008), cornerRadius: m(0.004), ...lin(0, 0, 0, m(0.008), [0, "rgba(255,255,255,0.65)", 0.4, "rgba(255,255,255,0)", 1, "rgba(0,0,0,0.35)"]), listening: false }));
  group.add(new Konva.Ellipse({ x: m(0.012), y: m(RY), radiusX: m(0.016), radiusY: m(0.0055), fill: "rgba(254,226,226,0.45)", listening: false }));

  // Các ghim: ba ghim vẫn dính (đầu sáp trắng ở trên thanh, thân ghim buông xuống), hai ghim đã rơi nằm nghiêng trên bàn.
  const pin = (x: number, fallen: boolean) => {
    if (!fallen) {
      group.add(ln([x, RY + 0.004, x, RY + 0.024], "#cbd5e1", m(0.0022)));
      group.add(ln([x - 0.0004, RY + 0.005, x - 0.0004, RY + 0.023], "rgba(255,255,255,0.8)", lw * 0.7));
      group.add(new Konva.Circle({ x: m(x), y: m(RY + 0.0255), radius: m(0.0024), fill: "#94a3b8", stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
      group.add(new Konva.Ellipse({ x: m(x), y: m(RY + 0.0055), radiusX: m(0.0044), radiusY: m(0.0033), fill: "#fef3c7", stroke: "#d97706", strokeWidth: lw * 0.7, listening: false }));
      group.add(new Konva.Ellipse({ x: m(x - 0.0012), y: m(RY + 0.0048), radiusX: m(0.0014), radiusY: m(0.0008), fill: "rgba(255,255,255,0.8)", listening: false }));
    } else {
      group.add(new Konva.Ellipse({ x: m(x + 0.002), y: m(0.0575), radiusX: m(0.012), radiusY: m(0.0016), fill: "rgba(0,0,0,0.3)", listening: false }));
      group.add(ln([x - 0.01, 0.054, x + 0.01, 0.0575], "#cbd5e1", m(0.0022)));
      group.add(new Konva.Circle({ x: m(x - 0.011), y: m(0.0535), radius: m(0.0024), fill: "#94a3b8", stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
      group.add(new Konva.Ellipse({ x: m(x + 0.0115), y: m(0.0572), radiusX: m(0.0036), radiusY: m(0.0022), fill: "#fef3c7", stroke: "#d97706", strokeWidth: lw * 0.6, listening: false }));
    }
  };
  pin(0.07, true);
  pin(0.11, true);
  pin(0.15, false);
  pin(0.2, false);
  pin(0.25, false);
  group.add(ln([0.012, RY - 0.02, 0.012, RY - 0.012], "rgba(239,68,68,0.6)", lw * 0.8));
  group.add(new Konva.Text({ x: m(-0.005), y: m(RY - 0.036), text: "nóng", fontSize: m(0.0065), fill: "#fca5a5", listening: false }));
  group.add(new Konva.Text({ x: m(0.215), y: m(RY - 0.036), text: "nguội", fontSize: m(0.0065), fill: "#93c5fd", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(0.08), y: m(0.066), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { heatedEnd: { x: 0, y: m(RY) }, clamp: { x: m(L), y: m(RY) }, pin1: { x: m(0.07), y: m(0.057) }, pinLast: { x: m(0.25), y: m(RY + 0.0255) } } };
};
