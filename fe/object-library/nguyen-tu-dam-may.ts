/* OBJECT-META
{
  "catalog": "Nguyên tử, mô hình đám mây electron",
  "title": "Nguyên tử mô hình đám mây electron: hạt nhân nhỏ đỏ ở tâm, đám mây xác suất xanh loang dần và các chấm electron rải theo mật độ",
  "fill": "#38bdf8",
  "anchor": "Hạt nhân (tâm đám mây).",
  "useWhen": ["Cần nguyên tử theo cơ học lượng tử: hạt nhân nhỏ ở tâm và đám mây xác suất electron loang dần.", "Cảnh nói electron không có quỹ đạo xác định, chỉ có mật độ xác suất."],
  "avoidWhen": ["Cần electron chuyển động trên quỹ đạo và các lớp K, L, M: dùng nguyen-tu-bohr.", "Cần mẫu khối cầu dương nhúng electron: dùng nguyen-tu-thomson; vật này không có bộ phận chuyển động."],
  "size": { "width": 0.1, "height": 0.1 },
  "parts": [],
  "points": [
    {
      "name": "nucleus",
      "description": "Tâm hạt nhân."
    }
  ],
  "notes": "Theo cơ học lượng tử electron không có quỹ đạo xác định mà có đám mây xác suất; vẽ phóng to khoảng 10¹⁰ lần: đám mây bán kính 0,05 m, hạt nhân nổi bật (thực tế nhỏ hơn 10⁵ lần). Chấm xanh là những vị trí electron có thể tìm thấy, dày hơn ở gần hạt nhân. fill là màu đám mây."
}
*/
const makeElectronCloudAtom = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0006));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const ball = (x: number, y: number, r: number, c1: string, c2: string, c3: string) => group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fillRadialGradientStartPoint: { x: -m(r) * 0.35, y: -m(r) * 0.35 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#ffffff", 0.3, c1, 1, c2], stroke: c3, strokeWidth: lw, shadowColor: c1, shadowBlur: m(r) * 0.5, shadowOpacity: 0.45, listening: false }));
  const tx = (x: number, y: number, s: number, text: string, color: string) => group.add(new Konva.Text({ x: m(x - s * 2.5), y: m(y - s * 0.6), width: m(s * 5), align: "center", text, fontSize: m(s), fontStyle: "bold", fill: color, listening: false }));
  for (const [r, a] of [[0.05, 0.12], [0.04, 0.16], [0.03, 0.22], [0.02, 0.3], [0.012, 0.4]] as [number, number][]) group.add(new Konva.Circle({ radius: m(r), fill, opacity: a, listening: false }));
  group.add(new Konva.Circle({ radius: m(0.05), stroke: "rgba(186,230,253,0.6)", strokeWidth: lw, dash: [m(0.003), m(0.002)], listening: false }));
  for (let i = 0; i < 70; i += 1) {
    const rr = 0.05 * (((i * 0.6180339) % 1) ** 1.6);
    const ang = (Math.sin(i * 12.9898) * 43758.5453 % 1) * Math.PI * 2;
    group.add(new Konva.Circle({ x: m(rr * Math.cos(ang)), y: m(rr * Math.sin(ang)), radius: m(0.0016), fill: "#e0f2fe", opacity: 0.85, listening: false }));
  }
  ball(0, 0, 0.0075, "#ef4444", "#7f1d1d", "#450a0a");
  tx(0, -0.0645, 0.0065, "đám mây electron", "#bae6fd");

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.06), width: m(0.14), align: "center", text: label, fontSize: m(0.0065), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { nucleus: { x: 0, y: 0 } } };
};
