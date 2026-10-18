/* OBJECT-META
{
  "catalog": "Hạt nhân nặng (U-235, U-238)",
  "title": "Hạt nhân nặng urani-235 vẽ phóng to: chùm 44 hạt proton đỏ và neutron xám xếp xoắn ốc vàng, vầng sáng vàng và nhãn ²³⁵U",
  "fill": "#ef4444",
  "anchor": "Tâm hạt nhân.",
  "useWhen": ["Cần hạt nhân nặng ²³⁵U gộp thành chùm 44 hạt đại diện, cho phản ứng phân hạch.", "Cảnh neutron chậm bắn vào hạt nhân uranium; đổi nhãn nếu dùng ²³⁸U."],
  "avoidWhen": ["Cần hạt nhân nhẹ như ¹²C hay He: dùng hat-nhan-nhe hoặc hat-alpha.", "Không dùng khi cần đúng 92 proton và 143 neutron: hình chỉ đại diện 44 hạt."],
  "size": { "width": 0.164, "height": 0.164 },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Tâm hạt nhân."
    }
  ],
  "notes": "Hạt nhân ²³⁵U có 92 proton và 143 neutron, bán kính ≈ 7,4·10⁻¹⁵ m; hình vẽ gộp thành một chùm đại diện 44 hạt, phóng to khoảng 10¹³ lần (≈ 0,07 m). Khi neutron chậm bắn vào, hạt nhân phân hạch. Với ²³⁸U chỉ đổi nhãn. fill là màu proton."
}
*/
const makeHeavyNucleus = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0006));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const ball = (x: number, y: number, r: number, c1: string, c2: string, c3: string) => group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fillRadialGradientStartPoint: { x: -m(r) * 0.35, y: -m(r) * 0.35 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#ffffff", 0.3, c1, 1, c2], stroke: c3, strokeWidth: lw, shadowColor: c1, shadowBlur: m(r) * 0.5, shadowOpacity: 0.45, listening: false }));
  const tx = (x: number, y: number, s: number, text: string, color: string) => group.add(new Konva.Text({ x: m(x - s * 2.5), y: m(y - s * 0.6), width: m(s * 5), align: "center", text, fontSize: m(s), fontStyle: "bold", fill: color, listening: false }));
  const golden = Math.PI * (3 - Math.sqrt(5));
  group.add(new Konva.Circle({ radius: m(0.082), fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.082), fillRadialGradientColorStops: [0, "rgba(251,191,36,0.35)", 1, "rgba(251,191,36,0)"], listening: false }));
  for (let i = 0; i < 44; i += 1) {
    const rr = 0.056 * Math.sqrt((i + 0.5) / 44);
    const x = rr * Math.cos(i * golden);
    const y = rr * Math.sin(i * golden);
    if (i % 5 < 2) ball(x, y, 0.0105, fill, "#7f1d1d", "#450a0a");
    else ball(x, y, 0.0105, "#cbd5e1", "#475569", "#1e293b");
  }
  tx(0, -0.0775, 0.016, "²³⁵U", "#fef3c7");

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.09), width: m(0.14), align: "center", text: label, fontSize: m(0.0065), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 } } };
};
