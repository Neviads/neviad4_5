/* OBJECT-META
{
  "catalog": "Cân điện tử",
  "title": "Cân điện tử phòng thí nghiệm 0,01 g: đĩa cân inox, màn LCD, phím TARE và bọt thuỷ chỉnh phẳng",
  "fill": "#e5e7eb",
  "anchor": "Giữa đáy cân, chạm mặt bàn.",
  "useWhen": ["Cần cân điện tử phòng thí nghiệm 0,01 g có đĩa inox, màn LCD, phím TARE và bọt thuỷ.","Cần màn hình hiện số khối lượng (display), vật đặt lên đĩa (panTop)."],
  "avoidWhen": ["Cần cân đòn hai đĩa dùng quả cân: dùng can-don.","Cần đo lực bằng cảm biến: dùng cam-bien-luc.","Màn hình mặc định 0.00 g, cảnh phải đặt chữ số đúng thì số cân mới đúng."],
  "size": {
    "width": 0.19,
    "height": 0.072
  },
  "parts": [],
  "points": [
    {
      "name": "base",
      "description": "Giữa đáy cân."
    },
    {
      "name": "panTop",
      "description": "Giữa mặt đĩa cân; vật cần cân đặt ở đây."
    },
    {
      "name": "display",
      "description": "Tâm màn hình số."
    }
  ],
  "notes": "Màn hình hiện 0.00 g mặc định; cảnh đặt chữ khác cho đúng số cân được. Đĩa cân nằm trên trục nâng nhỏ nên mặt đĩa cao hơn thân 0,018 m. fill là màu sơn thân."
}
*/
const makeDigitalScale = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.19;
  const H = 0.045;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Bốn chân cao su (hai chân thấy được ở mặt trước).
  for (const x of [-0.075, 0.075]) group.add(new Konva.Rect({ x: m(x - 0.011), y: m(-0.004), width: m(0.022), height: m(0.004), cornerRadius: m(0.002), fill: "#0b0f19", listening: false }));
  // Thân cân: khối nhựa cứng vát mặt trước.
  group.add(new Konva.Line({ points: [m(-W / 2), m(-0.004), m(W / 2), m(-0.004), m(W / 2 - 0.004), m(-0.004 - H), m(-W / 2 + 0.004), m(-0.004 - H)], closed: true, lineJoin: "round", ...lin(0, m(-0.004 - H), 0, m(-0.004), [0, "#ffffff", 0.2, fill, 0.8, "#94a3b8", 1, "#475569"]), stroke: "#334155", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.004) }, listening: false }));
  group.add(new Konva.Line({ points: [m(-W / 2 + 0.006), m(-0.004 - H + 0.002), m(W / 2 - 0.006), m(-0.004 - H + 0.002)], stroke: "rgba(255,255,255,0.8)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  // Mặt trước tối có cửa sổ LCD, phím và bọt thuỷ.
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.01), y: m(-0.004 - H + 0.007), width: m(W - 0.02), height: m(H - 0.013), cornerRadius: m(0.004), ...lin(0, m(-0.004 - H + 0.007), 0, m(-0.011), [0, "#1f2937", 1, "#0b0f19"]), stroke: "#030712", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.058), y: m(-0.0455), width: m(0.078), height: m(0.026), cornerRadius: m(0.003), fill: "#a5d6a0", stroke: "#052e16", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.058), y: m(-0.0455), width: m(0.078), height: m(0.012), cornerRadius: m(0.003), fill: "rgba(255,255,255,0.28)", listening: false }));
  group.add(new Konva.Text({ x: m(-0.056), y: m(-0.0445), width: m(0.062), align: "right", text: "0.00", fontSize: m(0.019), fontStyle: "bold", fontFamily: "Courier New", fill: "#052e16", listening: false }));
  group.add(new Konva.Text({ x: m(0.0085), y: m(-0.0345), text: "g", fontSize: m(0.0085), fontStyle: "bold", fill: "#052e16", listening: false }));
  group.add(new Konva.Text({ x: m(-0.0555), y: m(-0.0225), text: "ST  NET", fontSize: m(0.0042), fontStyle: "bold", fill: "#14532d", listening: false }));
  const keys: [string, string][] = [["TARE", "#2563eb"], ["UNIT", "#475569"], ["ON/OFF", "#dc2626"]];
  keys.forEach(([text, color], i) => {
    const x = 0.027 + i * 0.0185;
    group.add(new Konva.Rect({ x: m(x), y: m(-0.0415), width: m(0.015), height: m(0.011), cornerRadius: m(0.0025), ...lin(0, m(-0.0415), 0, m(-0.0305), [0, "#e5e7eb", 0.25, color, 1, "#111827"]), stroke: "#030712", strokeWidth: lw * 0.7, listening: false }));
    group.add(new Konva.Text({ x: m(x - 0.002), y: m(-0.0285), width: m(0.019), align: "center", text, fontSize: m(0.0036), fill: "#cbd5e1", listening: false }));
  });
  group.add(new Konva.Circle({ x: m(-0.074), y: m(-0.0285), radius: m(0.0048), fill: "#bbf7d0", stroke: "#166534", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Circle({ x: m(-0.0735), y: m(-0.0282), radius: m(0.0013), fill: "#14532d", listening: false }));
  group.add(new Konva.Text({ x: m(-0.0765), y: m(-0.0225), text: "g", fontSize: m(0.0036), fill: "#9ca3af", listening: false }));

  // Trục nâng và đĩa cân inox hình tròn nhìn hơi chếch.
  const panY = -0.004 - H - 0.014;
  group.add(new Konva.Rect({ x: m(-0.006), y: m(panY), width: m(0.012), height: m(0.016), ...lin(m(-0.006), 0, m(0.006), 0, [0, "#64748b", 0.4, "#f8fafc", 1, "#475569"]), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Ellipse({ x: 0, y: m(panY), radiusX: m(0.067), radiusY: m(0.0085), ...lin(m(-0.067), 0, m(0.067), 0, [0, "#64748b", 0.3, "#f8fafc", 0.55, "#cbd5e1", 1, "#475569"]), stroke: "#334155", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.004) }, listening: false }));
  group.add(new Konva.Ellipse({ x: 0, y: m(panY - 0.0012), radiusX: m(0.058), radiusY: m(0.0066), fill: "rgba(255,255,255,0.35)", listening: false }));
  for (let i = 1; i <= 3; i += 1) group.add(new Konva.Ellipse({ x: 0, y: m(panY - 0.0012), radiusX: m(0.019 * i), radiusY: m(0.0022 * i), stroke: "rgba(71,85,105,0.3)", strokeWidth: lw * 0.6, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.095), y: m(0.006), width: m(0.19), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { base: { x: 0, y: 0 }, panTop: { x: 0, y: m(panY - 0.0086) }, display: { x: m(-0.012), y: m(-0.0325) } } };
};
