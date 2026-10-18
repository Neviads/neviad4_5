/* OBJECT-META
{
  "catalog": "Đồng hồ bấm giây (cơ, hiện số)",
  "title": "Đồng hồ bấm giây cơ: mặt trắng chia 1/10 s, kim giây đỏ, đồng hồ phụ 30 phút, núm và nút bấm",
  "fill": "#e2e8f0",
  "anchor": "Tâm mặt đồng hồ (trục kim giây).",
  "useWhen": ["Cần đồng hồ bấm giây cơ có kim giây quay 60 s một vòng, mặt chia 0,2 s.", "Cảnh đo thời gian bằng tay, cần kim giây xoay được và núm bấm phía trên."],
  "avoidWhen": ["Cần đồng hồ có hiện số thời gian: dùng dong-ho-da-nang, bảng hiện số riêng hoặc cam-bien-chuyen-dong.", "Đồng hồ phụ đếm phút chỉ trang trí, đứng yên; không dùng khi cần đo thời gian trên 60 s."],
  "size": {
    "width": 0.08,
    "height": 0.128
  },
  "parts": [
    {
      "name": "hand",
      "label": "Kim giây",
      "motion": "rotate",
      "min": 0,
      "max": 360,
      "description": "Góc của kim giây, độ theo chiều kim đồng hồ từ vạch 0 ở đỉnh; 360° ứng với 60 s."
    }
  ],
  "points": [
    {
      "name": "center",
      "description": "Tâm mặt đồng hồ."
    },
    {
      "name": "crown",
      "description": "Đỉnh núm bấm ở phía trên."
    },
    {
      "name": "ring",
      "description": "Vòng treo dây ở trên cùng."
    }
  ],
  "notes": "Kim giây chạy 1 vòng / 60 s; mặt chia 0,2 s. Đồng hồ phụ ở nửa trên đếm phút nhưng đứng yên (chỉ để trang trí). fill là màu viền ngoài sáng của vỏ."
}
*/
const makeStopwatch = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.04;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0012));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const polar = (r: number, deg: number): [number, number] => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];

  const group = new Konva.Group({ x: p.x, y: p.y });

  // Vòng treo, thân núm bấm và nút bấm bên (vẽ trước vỏ để vỏ đè lên chân).
  group.add(new Konva.Circle({ x: 0, y: m(-R - 0.034), radius: m(0.0115), stroke: "#cbd5e1", strokeWidth: m(0.0032), shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.3, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.006), y: m(-R - 0.017), width: m(0.012), height: m(0.02), ...lin(m(-0.006), 0, m(0.006), 0, [0, "#64748b", 0.4, "#f8fafc", 1, "#475569"]), stroke: "#334155", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0105), y: m(-R - 0.0275), width: m(0.021), height: m(0.011), cornerRadius: m(0.003), ...lin(m(-0.0105), 0, m(0.0105), 0, [0, "#64748b", 0.35, "#f8fafc", 1, "#475569"]), stroke: "#334155", strokeWidth: lw, listening: false }));
  for (let i = -3; i <= 3; i += 1) group.add(ln([i * 0.0028, -R - 0.0268, i * 0.0028, -R - 0.0182], "rgba(15,23,42,0.35)", lw * 0.7));
  const [bx, by] = polar(R + 0.004, 45);
  group.add(new Konva.Rect({ x: m(bx - 0.004), y: m(by - 0.0045), width: m(0.011), height: m(0.009), cornerRadius: m(0.002), rotation: 45, offsetX: 0, offsetY: 0, ...lin(0, 0, m(0.011), 0, [0, "#475569", 0.5, "#f1f5f9", 1, "#475569"]), stroke: "#334155", strokeWidth: lw, listening: false }));

  // Vỏ kim loại mạ: vành ngoài sáng, vành trong tối, mặt kính.
  group.add(new Konva.Circle({ radius: m(R), ...lin(m(-R), m(-R), m(R), m(R), [0, "#f8fafc", 0.35, fill, 0.7, "#64748b", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.45, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  group.add(new Konva.Circle({ radius: m(R - 0.0042), ...lin(m(R), m(R), m(-R), m(-R), [0, "#cbd5e1", 0.5, "#64748b", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  // Mặt số trắng ngà.
  group.add(new Konva.Circle({ radius: m(R - 0.0075), fillRadialGradientStartPoint: { x: m(-0.01), y: m(-0.012) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R - 0.0075), fillRadialGradientColorStops: [0, "#ffffff", 0.7, "#f8fafc", 1, "#cbd5e1"], stroke: "#64748b", strokeWidth: lw * 0.7, listening: false }));

  // Vạch giây: 300 vạch 0,2 s; vạch giây dài, vạch 5 s đậm kèm số.
  const face = R - 0.0075;
  for (let i = 0; i < 300; i += 1) {
    const deg = i * 1.2;
    const sec = i % 5 === 0;
    const five = i % 25 === 0;
    const [x1, y1] = polar(face - 0.0012, deg);
    const [x2, y2] = polar(face - (five ? 0.0085 : sec ? 0.0058 : 0.0034), deg);
    group.add(ln([x1, y1, x2, y2], "#0f172a", five ? lw * 1.4 : sec ? lw * 0.9 : lw * 0.5));
  }
  for (let s = 5; s <= 60; s += 5) {
    const [tx, ty] = polar(face - 0.0128, s * 6);
    group.add(new Konva.Text({ x: m(tx), y: m(ty), width: m(0.012), offsetX: m(0.006), offsetY: m(0.0033), align: "center", text: String(s), fontSize: m(0.0058), fontStyle: "bold", fill: "#0f172a", listening: false }));
  }
  // Đồng hồ phụ đếm phút (đứng yên) ở nửa trên, và chữ hãng.
  group.add(new Konva.Circle({ x: 0, y: m(-0.0085), radius: m(0.0072), stroke: "#475569", strokeWidth: lw * 0.8, fill: "rgba(226,232,240,0.55)", listening: false }));
  for (let i = 0; i < 30; i += 1) {
    const a = i * 12;
    group.add(ln([0.0072 * Math.sin((a * Math.PI) / 180), -0.0085 - 0.0072 * Math.cos((a * Math.PI) / 180), 0.0062 * Math.sin((a * Math.PI) / 180), -0.0085 - 0.0062 * Math.cos((a * Math.PI) / 180)], "#334155", lw * 0.6));
  }
  group.add(ln([0, -0.0085, 0.003, -0.0125], "#1e293b", lw));
  group.add(new Konva.Text({ x: m(-0.012), y: m(0.012), width: m(0.024), align: "center", text: "1/5 s", fontSize: m(0.0048), fill: "#475569", listening: false }));
  group.add(new Konva.Text({ x: m(-0.012), y: m(0.0185), width: m(0.024), align: "center", text: "STOP", fontSize: m(0.0042), fontStyle: "bold", fill: "#64748b", listening: false }));

  // BỘ PHẬN QUAY: kim giây đỏ có đuôi đối trọng, gốc nhóm đúng tâm trục.
  const hand = new Konva.Group({ x: 0, y: 0 });
  hand.add(new Konva.Line({ points: [m(-0.0011), m(0.009), m(-0.0007), m(-face + 0.0035), 0, m(-face + 0.0015), m(0.0007), m(-face + 0.0035), m(0.0011), m(0.009)], closed: true, fill: "#dc2626", stroke: "#7f1d1d", strokeWidth: lw * 0.5, shadowColor: "#000", shadowBlur: m(0.003), shadowOpacity: 0.35, shadowOffset: { x: m(0.0008), y: m(0.0012) }, listening: false }));
  hand.add(new Konva.Circle({ x: 0, y: m(0.0095), radius: m(0.0022), fill: "#dc2626", stroke: "#7f1d1d", strokeWidth: lw * 0.5, listening: false }));
  hand.add(new Konva.Circle({ radius: m(0.0034), ...lin(m(-0.0034), m(-0.0034), m(0.0034), m(0.0034), [0, "#fee2e2", 0.5, "#dc2626", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.6, listening: false }));
  group.add(hand);
  // Kính phủ: vệt sáng cong ở phần trên bên trái.
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(R - 0.0125), outerRadius: m(R - 0.0095), angle: 70, rotation: 215, fill: "rgba(255,255,255,0.55)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-R), y: m(R + 0.006), width: m(2 * R), align: "center", text: label, fontSize: m(0.009), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { hand: { node: hand, motion: "rotate" as const, min: 0, max: 360 } },
    points: { center: { x: 0, y: 0 }, crown: { x: 0, y: m(-R - 0.0275) }, ring: { x: 0, y: m(-R - 0.0455) } },
  };
};
