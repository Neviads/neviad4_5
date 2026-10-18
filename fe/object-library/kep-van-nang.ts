/* OBJECT-META
{
  "catalog": "Kẹp vạn năng / kẹp ống nghiệm",
  "title": "Kẹp vạn năng có vòng kẹp lót nút bần, gắn vào trụ bằng khớp nối",
  "fill": "#94a3b8",
  "anchor": "Tâm khớp nối ôm trụ đứng (điểm kẹp vào trụ).",
  "useWhen": ["Cần kẹp giữ ống nghiệm hoặc nhiệt kế vào trụ đứng, nhìn từ trước, vòng kẹp lót bần.", "Cảnh có giá thí nghiệm và cần điểm mount gắn vào trụ, ringCenter cho vật đi qua."],
  "avoidWhen": ["Cần cả giá đỡ có trụ và chân đế: dùng gia-thi-nghiem; vật này chỉ là cái kẹp.", "Cần kẹp cố định vật nặng hay dây: vòng kẹp chỉ đủ ôm ống nghiệm, nhiệt kế."],
  "size": {
    "width": 0.215,
    "height": 0.09
  },
  "parts": [],
  "points": [
    {
      "name": "mount",
      "description": "Tâm khớp nối ôm trụ đứng."
    },
    {
      "name": "ringCenter",
      "description": "Tâm vòng kẹp, nơi ống nghiệm hay nhiệt kế đi qua."
    }
  ],
  "notes": "Nhìn từ trước: khớp nối ở bên trái, cánh tay thẳng sang phải, vòng kẹp hở ở phía dưới với vít bướm siết hai má. fill là màu kim loại của cánh tay và vòng."
}
*/
const makeUniversalClamp = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const ARM = 0.1;
  const RING_R = 0.03;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0022));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });

  const group = new Konva.Group({ x: p.x, y: p.y });
  const cx = m(ARM + RING_R + 0.012);

  // Cánh tay tròn từ khớp nối ra vòng kẹp.
  group.add(new Konva.Rect({ x: 0, y: m(-0.006), width: cx, height: m(0.012), cornerRadius: m(0.006), ...lin(0, m(-0.006), 0, m(0.006), [0, "#475569", 0.3, "#f8fafc", 0.65, fill, 1, "#334155"]), stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));

  // Vòng kẹp: nửa trong lót bần nâu, nửa ngoài bằng thép; hở một khe phía dưới bên phải.
  group.add(new Konva.Arc({ x: cx, y: 0, innerRadius: m(RING_R - 0.004), outerRadius: m(RING_R + 0.0035), angle: 300, rotation: 110, fill: fill, stroke: "#334155", strokeWidth: lw * 0.6, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.3, listening: false }));
  group.add(new Konva.Arc({ x: cx, y: 0, innerRadius: m(RING_R - 0.0105), outerRadius: m(RING_R - 0.0042), angle: 292, rotation: 114, fill: "#b9814a", stroke: "#7c4a1e", strokeWidth: lw * 0.5, listening: false }));
  for (let i = 0; i < 24; i += 1) {
    const a = ((114 + (i * 292) / 23) * Math.PI) / 180;
    group.add(new Konva.Circle({ x: cx + m(RING_R - 0.0075) * Math.cos(a), y: m(RING_R - 0.0075) * Math.sin(a), radius: m(0.0009), fill: "#7c4a1e", opacity: 0.7, listening: false }));
  }

  // Hai má kẹp với vít bướm xuyên ngang khe hở.
  const gx = cx + m(RING_R * 0.78);
  const gy = m(RING_R * 0.78);
  for (const side of [-1, 1]) {
    group.add(new Konva.Rect({ x: gx - m(0.008) + side * m(0.008), y: gy - m(0.006) + side * m(0.0055), width: m(0.014), height: m(0.011), cornerRadius: m(0.002), fill: fill, stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
  }
  group.add(new Konva.Line({ points: [gx - m(0.02), gy - m(0.0085), gx + m(0.02), gy + m(0.0085)], stroke: "#cbd5e1", strokeWidth: m(0.0035), lineCap: "round", listening: false }));
  group.add(new Konva.Ellipse({ x: gx + m(0.026), y: gy + m(0.0115), radiusX: m(0.0075), radiusY: m(0.0085), rotation: 25, ...lin(gx + m(0.018), 0, gx + m(0.034), 0, [0, "#7f1d1d", 0.5, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.6, listening: false }));

  // Khớp nối ôm trụ: khối thép, vít hãm và núm vặn.
  group.add(new Konva.Rect({ x: m(-0.02), y: m(-0.02), width: m(0.04), height: m(0.04), cornerRadius: m(0.006), ...lin(m(-0.02), 0, m(0.02), 0, [0, "#475569", 0.25, "#e2e8f0", 0.55, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.35, listening: false }));
  group.add(new Konva.Circle({ radius: m(0.0075), fill: "#0f172a", stroke: "#cbd5e1", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.016), m(-0.0165), m(0.016), m(-0.0165)], stroke: "rgba(255,255,255,0.55)", strokeWidth: lw, lineCap: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0035), y: m(-0.034), width: m(0.007), height: m(0.014), fill: "#cbd5e1", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.011), y: m(-0.044), width: m(0.022), height: m(0.011), cornerRadius: m(0.004), ...lin(m(-0.011), 0, m(0.011), 0, [0, "#7f1d1d", 0.4, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.6, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(0.02), y: m(0.045), text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: { mount: { x: 0, y: 0 }, ringCenter: { x: cx, y: 0 } },
  };
};
