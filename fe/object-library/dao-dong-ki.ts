/* OBJECT-META
{
  "catalog": "Dao động kí (oscilloscope)",
  "title": "Dao động kí hai kênh 20 MHz: màn hình lưới 10×8 ô, núm TIME/DIV và VOLT/DIV, hai đầu vào BNC",
  "fill": "#d1d5db",
  "anchor": "Giữa đáy máy, chạm mặt bàn.",
  "useWhen": ["Cần dao động kí hai kênh 20 MHz có màn lưới 10×8 ô và đầu vào BNC để hiển thị đường sóng.","Cần màn hình 0,17 m × 0,135 m để cảnh vẽ đường sóng lên trên."],
  "avoidWhen": ["Cần đồng hồ đo giá trị điện áp bằng số: dùng dong-ho-da-nang.","Cần máy tạo tín hiệu: dùng may-phat-tan-so; núm của dao động kí chỉ trang trí, không xoay được."],
  "size": { "width": 0.34, "height": 0.2 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy máy." },
    { "name": "screenCenter", "description": "Tâm màn hình; đường sóng (hiện tượng) vẽ lên đây." },
    { "name": "ch1", "description": "Đầu vào BNC kênh 1." },
    { "name": "ch2", "description": "Đầu vào BNC kênh 2." }
  ],
  "notes": "Màn hình 0,17 m × 0,135 m có lưới 10 × 8 ô, ô vuông 0,017 m; đường sóng không phải một phần của vật mà do cảnh vẽ lên màn (metrics.items). Núm, nút bấm chỉ để trang trí. fill là màu mặt máy."
}
*/
const makeOscilloscope = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.34;
  const H = 0.19;
  const SX = -0.14;
  const SY = -0.17;
  const SW = 0.17;
  const SH = 0.136;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Chân đỡ và quai xách.
  for (const x of [-0.14, 0.14]) group.add(new Konva.Rect({ x: m(x - 0.018), y: m(-0.008), width: m(0.036), height: m(0.008), cornerRadius: m(0.003), fill: "#111827", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.07), y: m(-H - 0.014), width: m(0.14), height: m(0.016), cornerRadius: m(0.006), ...lin(0, m(-H - 0.014), 0, m(-H + 0.002), [0, "#6b7280", 1, "#1f2937"]), stroke: "#030712", strokeWidth: lw, listening: false }));

  // Thân máy.
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(-H - 0.008), width: m(W), height: m(H), cornerRadius: m(0.008), ...lin(0, m(-H - 0.008), 0, m(-0.008), [0, "#f3f4f6", 0.1, fill, 0.9, "#6b7280", 1, "#374151"]), stroke: "#1f2937", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.018), shadowOpacity: 0.5, shadowOffset: { x: 0, y: m(0.007) }, listening: false }));
  group.add(ln([-W / 2 + 0.008, -H - 0.0055, W / 2 - 0.008, -H - 0.0055], "rgba(255,255,255,0.7)", lw * 1.4));

  // Màn hình: khung viền đen, lưới 10×8 xanh lục, quầng sáng phosphor.
  group.add(new Konva.Rect({ x: m(SX - 0.008), y: m(SY - 0.008), width: m(SW + 0.016), height: m(SH + 0.016), cornerRadius: m(0.008), ...lin(0, m(SY), 0, m(SY + SH), [0, "#111827", 1, "#030712"]), stroke: "#000", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(SX), y: m(SY), width: m(SW), height: m(SH), cornerRadius: m(0.004), fillRadialGradientStartPoint: { x: m(SX + SW / 2), y: m(SY + SH / 2) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: m(SX + SW / 2), y: m(SY + SH / 2) }, fillRadialGradientEndRadius: m(0.11), fillRadialGradientColorStops: [0, "#0f2a1a", 0.7, "#06150c", 1, "#020a05"], stroke: "#052e16", strokeWidth: lw, listening: false }));
  for (let i = 1; i < 10; i += 1) {
    const x = SX + (i * SW) / 10;
    group.add(ln([x, SY + 0.003, x, SY + SH - 0.003], i === 5 ? "rgba(74,222,128,0.55)" : "rgba(74,222,128,0.22)", i === 5 ? lw : lw * 0.7));
  }
  for (let j = 1; j < 8; j += 1) {
    const y = SY + (j * SH) / 8;
    group.add(ln([SX + 0.003, y, SX + SW - 0.003, y], j === 4 ? "rgba(74,222,128,0.55)" : "rgba(74,222,128,0.22)", j === 4 ? lw : lw * 0.7));
  }
  // Vạch chia nhỏ trên hai trục giữa.
  for (let i = 0; i <= 50; i += 1) {
    const x = SX + (i * SW) / 50;
    group.add(ln([x, SY + SH / 2 - 0.0016, x, SY + SH / 2 + 0.0016], "rgba(74,222,128,0.6)", lw * 0.6));
  }
  for (let j = 0; j <= 40; j += 1) {
    const y = SY + (j * SH) / 40;
    group.add(ln([SX + SW / 2 - 0.0016, y, SX + SW / 2 + 0.0016, y], "rgba(74,222,128,0.6)", lw * 0.6));
  }
  group.add(new Konva.Line({ points: [m(SX + 0.004), m(SY + 0.003), m(SX + 0.07), m(SY + 0.003), m(SX + 0.004), m(SY + 0.04)], closed: true, fill: "rgba(255,255,255,0.05)", listening: false }));
  group.add(new Konva.Text({ x: m(SX + 0.006), y: m(SY + SH + 0.0135), text: "CH1  1 V/div     CH2  1 V/div     0,5 ms/div", fontSize: m(0.0068), fill: "#374151", listening: false }));

  // Bảng điều khiển bên phải: hai hàng núm xoay và nút bấm.
  const px = 0.095;
  group.add(new Konva.Rect({ x: m(px - 0.032), y: m(-0.178), width: m(0.098), height: m(0.15), cornerRadius: m(0.004), fill: "rgba(15,23,42,0.1)", stroke: "rgba(15,23,42,0.35)", strokeWidth: lw * 0.7, listening: false }));
  const knobs: [number, number, number, string][] = [[0.007, -0.15, 0.0125, "POSITION"], [0.058, -0.15, 0.0125, "TIME/DIV"], [0.007, -0.1, 0.0105, "VOLT/DIV"], [0.058, -0.1, 0.0105, "LEVEL"]];
  for (const [dx, y, r, text] of knobs) {
    const x = px + dx - 0.0095;
    group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r + 0.0025), fill: "#111827", listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), ...lin(m(x - r), m(y - r), m(x + r), m(y + r), [0, "#6b7280", 0.4, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.8, shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.4, listening: false }));
    group.add(ln([x, y - r * 0.15, x + r * 0.55, y - r * 0.88], "#f8fafc", lw * 1.5));
    group.add(new Konva.Text({ x: m(x - 0.02), y: m(y + r + 0.0045), width: m(0.04), align: "center", text, fontSize: m(0.0042), fontStyle: "bold", fill: "#111827", listening: false }));
  }
  const btnCols: [string, string][] = [["CH1", "#16a34a"], ["CH2", "#2563eb"], ["XY", "#475569"], ["AUTO", "#475569"]];
  btnCols.forEach(([text, color], i) => {
    const x = px - 0.0275 + i * 0.0225;
    group.add(new Konva.Rect({ x: m(x), y: m(-0.0605), width: m(0.0185), height: m(0.011), cornerRadius: m(0.002), ...lin(0, m(-0.0605), 0, m(-0.0495), [0, "#e5e7eb", 0.2, color, 1, "#111827"]), stroke: "#030712", strokeWidth: lw * 0.7, listening: false }));
    group.add(new Konva.Text({ x: m(x - 0.002), y: m(-0.0485), width: m(0.0225), align: "center", text, fontSize: m(0.0042), fill: "#111827", listening: false }));
  });
  // Nút nguồn có đèn báo.
  group.add(new Konva.Circle({ x: m(0.139), y: m(-0.034), radius: m(0.0072), ...lin(0, m(-0.04), 0, m(-0.028), [0, "#e5e7eb", 1, "#6b7280"]), stroke: "#111827", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: m(0.139), y: m(-0.0455), radius: m(0.0022), fill: "#ef4444", shadowColor: "#ef4444", shadowBlur: m(0.006), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Text({ x: m(0.124), y: m(-0.0265), width: m(0.03), align: "center", text: "POWER", fontSize: m(0.0038), fill: "#111827", listening: false }));

  // Hai đầu vào BNC ở hàng dưới bên trái.
  const bnc: [string, number][] = [["CH1", -0.1], ["CH2", -0.06]];
  for (const [text, x] of bnc) {
    group.add(new Konva.Circle({ x: m(x), y: m(-0.034), radius: m(0.0092), ...lin(m(x - 0.0092), 0, m(x + 0.0092), 0, [0, "#64748b", 0.4, "#f8fafc", 1, "#475569"]), stroke: "#1f2937", strokeWidth: lw, listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(-0.034), radius: m(0.0058), fill: "#0b0f19", stroke: "#9ca3af", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(-0.034), radius: m(0.0021), fill: "#fbbf24", listening: false }));
    group.add(new Konva.Text({ x: m(x - 0.013), y: m(-0.0235), width: m(0.026), align: "center", text, fontSize: m(0.0055), fontStyle: "bold", fill: "#111827", listening: false }));
  }
  group.add(new Konva.Text({ x: m(-0.14), y: m(-0.0235), width: m(0.03), align: "center", text: "1 MΩ  30 pF", fontSize: m(0.0036), fill: "#4b5563", listening: false }));
  group.add(new Konva.Text({ x: m(-0.02), y: m(-0.0285), width: m(0.1), align: "left", text: "OSCILLOSCOPE   20 MHz", fontSize: m(0.0092), fontStyle: "bold", fill: "#1f2937", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.14), y: m(0.008), width: m(0.28), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: { base: { x: 0, y: 0 }, screenCenter: { x: m(SX + SW / 2), y: m(SY + SH / 2) }, ch1: { x: m(-0.1), y: m(-0.034) }, ch2: { x: m(-0.06), y: m(-0.034) } },
  };
};
