/* OBJECT-META
{
  "catalog": "Hạt nhân nhẹ (chùm proton–neutron)",
  "title": "Hạt nhân nhẹ cacbon-12 vẽ phóng to: 6 proton đỏ và 6 neutron xám xếp chặt thành chùm, có vầng sáng và nhãn ¹²C",
  "fill": "#ef4444",
  "anchor": "Tâm chùm hạt nhân.",
  "useWhen": ["Cần hạt nhân nhẹ ¹²C gồm 6 proton đỏ và 6 neutron xám xếp chặt.", "Cảnh phản ứng hạt nhân hoặc thí nghiệm Rutherford với mục tiêu hạt nhân nhẹ."],
  "avoidWhen": ["Cần hạt nhân nặng U-235 hoặc U-238: dùng hat-nhan-nang.", "Cần chỉ hạt α He-4: dùng hat-alpha; hạt nhân này luôn gồm 12 hạt."],
  "size": { "width": 0.116, "height": 0.116 },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Tâm hạt nhân."
    }
  ],
  "notes": "Hạt nhân ¹²C gồm 6 proton (đỏ) và 6 neutron (xám) xếp chặt; bán kính khoảng 2,7·10⁻¹⁵ m, vẽ phóng to khoảng 10¹³ lần (≈ 0,05 m). Dùng cho phản ứng hạt nhân, thí nghiệm Rutherford. fill là màu proton."
}
*/
const makeLightNucleus = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0006));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const ball = (x: number, y: number, r: number, c1: string, c2: string, c3: string) => group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fillRadialGradientStartPoint: { x: -m(r) * 0.35, y: -m(r) * 0.35 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#ffffff", 0.3, c1, 1, c2], stroke: c3, strokeWidth: lw, shadowColor: c1, shadowBlur: m(r) * 0.5, shadowOpacity: 0.45, listening: false }));
  const tx = (x: number, y: number, s: number, text: string, color: string) => group.add(new Konva.Text({ x: m(x - s * 2.5), y: m(y - s * 0.6), width: m(s * 5), align: "center", text, fontSize: m(s), fontStyle: "bold", fill: color, listening: false }));
  group.add(new Konva.Circle({ radius: m(0.058), fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.058), fillRadialGradientColorStops: [0, "rgba(251,191,36,0.3)", 1, "rgba(251,191,36,0)"], listening: false }));
  const items: [number, number, boolean][] = [[-0.016, -0.02, true], [0.012, -0.024, false], [0.032, -0.008, true], [-0.036, -0.004, false], [-0.008, 0.004, true], [0.016, 0.008, false], [-0.028, 0.02, true], [0.004, 0.026, false], [0.03, 0.022, true], [-0.012, -0.002, false], [0.018, -0.006, true], [-0.002, 0.018, false]];
  for (const [x, y, isP] of items) {
    if (isP) ball(x, y, 0.0135, fill, "#7f1d1d", "#450a0a");
    else ball(x, y, 0.0135, "#cbd5e1", "#475569", "#1e293b");
  }
  tx(0, -0.0535, 0.013, "¹²C", "#fef3c7");

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.062), width: m(0.14), align: "center", text: label, fontSize: m(0.0065), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 } } };
};
