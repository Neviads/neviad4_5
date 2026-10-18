/* OBJECT-META
{
  "catalog": "Hạt alpha (2p + 2n)",
  "title": "Hạt alpha: hai proton đỏ và hai neutron xám xếp chặt, nhãn α (+2e)",
  "fill": "#ef4444",
  "anchor": "Tâm hạt alpha.",
  "useWhen": ["Cần hạt alpha (⁴He, 2 proton + 2 neutron), điện tích +2e, trong cảnh tán xạ Rutherford.", "Bài hạt bị lệch mạnh trong điện từ trường hoặc tán xạ trên hạt nhân vàng."],
  "avoidWhen": ["Cần một proton hoặc neutron đơn lẻ: dùng proton hoặc neutron.", "Cần hạt nhân nhiều hạt như ¹²C hay U: dùng hat-nhan-nhe hoặc hat-nhan-nang."],
  "size": { "width": 0.05, "height": 0.051 },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Tâm hạt alpha."
    }
  ],
  "notes": "Hạt α là hạt nhân ⁴He gồm 2 proton và 2 neutron, điện tích +2e, bán kính ≈ 1,7·10⁻¹⁵ m; vẽ phóng to khoảng 10¹³ lần (≈ 0,035 m). Bị lệch mạnh trong điện từ trường, tán xạ trên hạt nhân vàng. fill là màu proton."
}
*/
const makeAlphaParticle = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0006));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const ball = (x: number, y: number, r: number, c1: string, c2: string, c3: string) => group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fillRadialGradientStartPoint: { x: -m(r) * 0.35, y: -m(r) * 0.35 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#ffffff", 0.3, c1, 1, c2], stroke: c3, strokeWidth: lw, shadowColor: c1, shadowBlur: m(r) * 0.5, shadowOpacity: 0.45, listening: false }));
  const tx = (x: number, y: number, s: number, text: string, color: string) => group.add(new Konva.Text({ x: m(x - s * 2.5), y: m(y - s * 0.6), width: m(s * 5), align: "center", text, fontSize: m(s), fontStyle: "bold", fill: color, listening: false }));
  ball(-0.0105, 0.0115, 0.0145, fill, "#7f1d1d", "#450a0a");
  ball(0.0105, 0.0095, 0.0145, "#cbd5e1", "#475569", "#1e293b");
  ball(0.0105, -0.0105, 0.0145, fill, "#7f1d1d", "#450a0a");
  ball(-0.0095, -0.0085, 0.0145, "#cbd5e1", "#475569", "#1e293b");
  tx(0, -0.0345, 0.0068, "α  (+2e)", "#fef3c7");

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.045), width: m(0.14), align: "center", text: label, fontSize: m(0.0065), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 } } };
};
