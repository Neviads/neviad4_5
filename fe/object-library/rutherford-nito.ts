/* OBJECT-META
{
  "catalog": "Bộ thí nghiệm Rutherford biến đổi nitơ",
  "title": "Bộ thí nghiệm Rutherford biến nitơ thành oxi: hộp kín chứa khí nitơ, nguồn alpha ở bên trái, màn ZnS và kính hiển vi đếm chớp bên phải, tấm chắn bằng lá bạc",
  "fill": "#94a3b8",
  "anchor": "Giữa đáy hộp, chạm mặt bàn.",
  "useWhen": ["Cần bộ thí nghiệm Rutherford biến N thành O: hộp kín khí nitơ, nguồn alpha trái, lá bạc, màn ZnS và kính đếm chớp.","Cần phản ứng ⁴₂He + ¹⁴₇N → ¹⁷₈O + ¹₁H."],
  "avoidWhen": ["Cần mô hình tán xạ alpha qua lá vàng hay nguyên tử Rutherford: dùng hat-alpha và nguyen-tu-dam-may.","Cần buồng sương hoặc ống Geiger đếm hạt: dùng buong-suong, ong-geiger."],
  "size": { "width": 0.203, "height": 0.07 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy hộp." },
    { "name": "source", "description": "Nguồn phát hạt alpha trong hộp, ở mép trái." },
    { "name": "screen", "description": "Màn ZnS ở mép phải." },
    { "name": "foil", "description": "Lá chắn bằng bạc trước màn." }
  ],
  "notes": "Hộp kim loại kín 0,12 m × 0,06 m chứa khí nitơ ở áp suất thường, nguồn alpha (ThC) bên trái, lá bạc chắn trước màn ZnS để chặn hạt alpha và chỉ cho proton xuyên qua; kính hiển vi bên phải đếm chớp. Phản ứng ⁴₂He + ¹⁴₇N → ¹⁷₈O + ¹₁H. fill là màu hộp."
}
*/
const makeRutherfordNitrogen = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const W = 0.12;
  const H = 0.06;
  const top = -0.07;
  const cy = top + H / 2;
  const vr = (x: number, y: number, w: number, h: number, stops: (number | string)[], r = 0.001) => new Konva.Rect({ x: m(x), y: m(y), width: m(w), height: m(h), cornerRadius: m(r), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(h) }, fillLinearGradientColorStops: stops, stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false });

  // Đế giá nhôm và chân đỡ.
  group.add(vr(-0.07, -0.011, 0.14, 0.011, [0, "#9ca3af", 0.4, "#374151", 1, "#030712"], 0.003));
  for (const x of [-0.05, 0.05]) group.add(vr(x - 0.0055, top + H, 0.011, -top - H - 0.011, steel, 0.0008));

  // Hộp kim loại cắt dọc: nền tối bên trong, khí nitơ xanh nhạt, nắp vặn ốc.
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(top), width: m(W), height: m(H), cornerRadius: m(0.004), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(H) }, fillLinearGradientColorStops: [0, "#e2e8f0", 0.3, fill, 1, "#334155"], stroke: "#0f172a", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.008), y: m(top + 0.008), width: m(W - 0.016), height: m(H - 0.016), cornerRadius: m(0.002), fill: "#0b1220", stroke: "#475569", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.008), y: m(top + 0.008), width: m(W - 0.016), height: m(H - 0.016), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(W), y: 0 }, fillLinearGradientColorStops: [0, "rgba(56,189,248,0.2)", 1, "rgba(56,189,248,0.07)"], listening: false }));
  for (const sx of [-1, 1]) for (const sy of [0, 1]) group.add(new Konva.Circle({ x: m(sx * (W / 2 - 0.004)), y: m(top + 0.004 + sy * (H - 0.008)), radius: m(0.0017), fill: "#e2e8f0", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Text({ x: m(-0.03), y: m(top + 0.0095), width: m(0.06), align: "center", text: "N₂", fontSize: m(0.0105), fontStyle: "bold", fill: "rgba(125,211,252,0.85)", listening: false }));
  // Nguồn alpha ở mép trái (hạt nhân hạt) và chùm tia nét đứt.
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.008), y: m(cy - 0.007), width: m(0.012), height: m(0.014), fill: "#64748b", stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Circle({ x: m(-W / 2 + 0.0145), y: m(cy), radius: m(0.0032), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0032), fillRadialGradientColorStops: [0, "#fff", 0.4, "#86efac", 1, "#15803d"], shadowColor: "#4ade80", shadowBlur: m(0.008), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Line({ points: [m(-W / 2 + 0.019), m(cy), m(0.035), m(cy)], stroke: "rgba(250,204,21,0.8)", strokeWidth: lw * 1.3, dash: [m(0.0035), m(0.0025)], listening: false }));
  // Lá bạc chắn và màn ZnS ở mép phải.
  group.add(new Konva.Rect({ x: m(0.037), y: m(top + 0.008), width: m(0.0012), height: m(H - 0.016), fill: "#e2e8f0", stroke: "#475569", strokeWidth: lw * 0.5, listening: false }));
  group.add(new Konva.Rect({ x: m(W / 2 - 0.0125), y: m(cy - 0.014), width: m(0.003), height: m(0.028), fill: "#4ade80", stroke: "#14532d", strokeWidth: lw * 0.7, shadowColor: "#4ade80", shadowBlur: m(0.008), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Rect({ x: m(W / 2 - 0.0035), y: m(cy - 0.0165), width: m(0.0035), height: m(0.033), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(0.0035), y: 0 }, fillLinearGradientColorStops: [0, "rgba(224,242,254,0.9)", 1, "rgba(14,116,144,0.6)"], stroke: "rgba(226,240,252,0.9)", strokeWidth: lw * 0.7, listening: false }));
  // Kính hiển vi đếm chớp bên ngoài, thị kính hướng sang phải.
  group.add(vr(W / 2, cy - 0.0085, 0.035, 0.017, [0, "#9ca3af", 0.3, "#1f2937", 1, "#030712"], 0.002));
  group.add(vr(W / 2 + 0.035, cy - 0.0065, 0.028, 0.013, steel, 0.001));
  group.add(vr(W / 2 + 0.063, cy - 0.0085, 0.01, 0.017, [0, "#4b5563", 0.5, "#111827", 1, "#030712"], 0.002));
  group.add(new Konva.Line({ points: [m(W / 2 + 0.005), m(cy - 0.0075), m(W / 2 + 0.03), m(cy - 0.0075)], stroke: "rgba(255,255,255,0.28)", strokeWidth: lw * 1.2, listening: false }));
  // Nhãn phản ứng nhỏ.
  group.add(new Konva.Text({ x: m(-W / 2), y: m(-0.0225), width: m(W), align: "center", text: "⁴He + ¹⁴N → ¹⁷O + ¹H", fontSize: m(0.0062), fill: "#cbd5e1", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.006), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, source: { x: m(-W / 2 + 0.0145), y: m(cy) }, screen: { x: m(W / 2 - 0.011), y: m(cy) }, foil: { x: m(0.0376), y: m(cy) } } };
};
