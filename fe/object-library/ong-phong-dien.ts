/* OBJECT-META
{
  "catalog": "Ống phóng điện chứa khí (đèn quang phổ)",
  "title": "Đèn quang phổ ống phóng điện chứa khí: ống thuỷ tinh hẹp ở giữa phát sáng hồng cam, hai điện cực kim loại ở hai đầu có đầu cắm và đế đỡ",
  "fill": "#fb7185",
  "anchor": "Giữa đáy đế, chạm mặt bàn.",
  "useWhen": ["Cần đèn quang phổ ống phóng điện chứa khí loãng, đoạn ống hẹp phát sáng hồng cam, hai điện cực ở hai đầu.", "Cảnh quan sát quang phổ vạch phát xạ của khí hiđro hay neon."],
  "avoidWhen": ["Cần ống tia catot hay ống phát tia X: dùng ong-crookes hoặc ong-coolidge.", "Vật không có kính quang phổ hay lăng kính; ánh sáng phát ra phải do cảnh vẽ."],
  "size": { "width": 0.216, "height": 0.085 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy đế." },
    { "name": "capillary", "description": "Giữa đoạn ống hẹp phát sáng." },
    { "name": "electrodeLeft", "description": "Điện cực bên trái." },
    { "name": "electrodeRight", "description": "Điện cực bên phải." }
  ],
  "notes": "Ống thuỷ tinh dài 0,2 m, hai bầu đường kính 0,034 m nối đoạn ống hẹp 0,008 m dài 0,1 m; chứa khí loãng (hiđro, neon…) ở áp suất ~1 mmHg, đặt hiệu điện thế vài kV thì khí phát sáng đúng màu vạch quang phổ của nó (đỏ cam với neon). Tia sáng phát ra là hiện tượng do cảnh vẽ. fill là màu ánh sáng khí khi sáng."
}
*/
const makeDischargeTube = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cy = -0.065;
  const L = 0.1;
  const BR = 0.017;
  const CR = 0.004;
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];

  // Đế nhựa đen với hai giá kẹp cổ ống ở hai đầu.
  group.add(new Konva.Rect({ x: m(-0.108), y: m(-0.014), width: m(0.216), height: m(0.014), cornerRadius: m(0.003), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(0.014) }, fillLinearGradientColorStops: [0, "#6b7280", 0.3, "#1f2937", 1, "#030712"], stroke: "#000", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, listening: false }));
  for (const s of [-1, 1]) group.add(new Konva.Rect({ x: m(s * 0.082 - 0.005), y: m(cy + BR + 0.002), width: m(0.01), height: m(-0.014 - cy - BR - 0.002), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(0.01), y: 0 }, fillLinearGradientColorStops: steel, stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));

  // Ống thuỷ tinh: hai bầu cầu + đoạn ống hẹp, vẽ một đường bao bằng các điểm.
  for (const s of [-1, 1]) {
    group.add(new Konva.Circle({ x: m(s * (L / 2 + 0.01)), y: m(cy), radius: m(BR), fill: "#0b0710", stroke: "rgba(226,240,252,0.95)", strokeWidth: m(0.0026), shadowColor: "#7dd3fc", shadowBlur: m(0.008), shadowOpacity: 0.35, listening: false }));
    group.add(new Konva.Rect({ x: m(s > 0 ? L / 2 - 0.004 : -L / 2 - 0.016), y: m(cy - 0.0055), width: m(0.02), height: m(0.011), fill: "#0b0710", listening: false }));
  }
  group.add(new Konva.Rect({ x: m(-L / 2 - 0.004), y: m(cy - CR - 0.0015), width: m(L + 0.008), height: m((CR + 0.0015) * 2), fill: "#0b0710", stroke: "rgba(226,240,252,0.95)", strokeWidth: m(0.0022), listening: false }));
  // Khí phát sáng trong lòng ống: lõi sáng trắng viền cam, quầng sáng bên ngoài; mờ dần ở hai bầu.
  group.add(new Konva.Rect({ x: m(-L / 2), y: m(cy - 0.012), width: m(L), height: m(0.024), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(0.024) }, fillLinearGradientColorStops: [0, "rgba(251,113,133,0)", 0.5, "rgba(251,113,133,0.35)", 1, "rgba(251,113,133,0)"], listening: false }));
  group.add(new Konva.Rect({ x: m(-L / 2), y: m(cy - CR + 0.0008), width: m(L), height: m((CR - 0.0008) * 2), fill: fill, shadowColor: fill, shadowBlur: m(0.014), shadowOpacity: 1, listening: false }));
  group.add(new Konva.Rect({ x: m(-L / 2 + 0.004), y: m(cy - 0.0013), width: m(L - 0.008), height: m(0.0026), cornerRadius: m(0.0013), fill: "#fff7ed", listening: false }));
  for (const s of [-1, 1]) {
    group.add(new Konva.Circle({ x: m(s * (L / 2 + 0.01)), y: m(cy), radius: m(BR - 0.003), fillRadialGradientStartPoint: { x: m(-s * 0.012), y: 0 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: m(-s * 0.012), y: 0 }, fillRadialGradientEndRadius: m(BR), fillRadialGradientColorStops: [0, "rgba(251,113,133,0.55)", 1, "rgba(251,113,133,0.04)"], listening: false }));
    // Điện cực: chén trụ kim loại ở trong bầu, cần nối ra ngoài qua đầu bịt.
    group.add(new Konva.Rect({ x: m(s > 0 ? L / 2 + 0.0165 : -L / 2 - 0.0325), y: m(cy - 0.008), width: m(0.016), height: m(0.016), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(0.016) }, fillLinearGradientColorStops: steel, stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Line({ points: [m(s * (L / 2 + BR + 0.008)), m(cy), m(s * (L / 2 + BR + 0.026)), m(cy)], stroke: "#e2e8f0", strokeWidth: lw * 1.6, lineCap: "round", listening: false }));
    group.add(new Konva.Circle({ x: m(s * (L / 2 + BR + 0.03)), y: m(cy), radius: m(0.0046), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0046), fillRadialGradientColorStops: [0, "#fff", 0.35, s < 0 ? "#1f2937" : "#ef4444", 1, "#000"], stroke: "#000", strokeWidth: lw * 0.6, listening: false }));
  }
  // Phản chiếu thuỷ tinh trên hai bầu.
  for (const s of [-1, 1]) group.add(new Konva.Arc({ x: m(s * (L / 2 + 0.01)), y: m(cy), innerRadius: m(BR - 0.0045), outerRadius: m(BR - 0.0022), angle: 52, rotation: 212, fill: "rgba(255,255,255,0.6)", listening: false }));
  group.add(new Konva.Text({ x: m(-0.06), y: m(cy + CR + 0.0045), width: m(0.12), align: "center", text: "Ne  1 mmHg", fontSize: m(0.0068), fill: "rgba(254,215,170,0.9)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.006), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, capillary: { x: 0, y: m(cy) }, electrodeLeft: { x: m(-L / 2 - 0.0245), y: m(cy) }, electrodeRight: { x: m(L / 2 + 0.0245), y: m(cy) } } };
};
