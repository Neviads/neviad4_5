/* OBJECT-META
{
  "catalog": "Dây dẫn thẳng mang dòng điện",
  "title": "Đoạn dây đồng thẳng căng ngang giữa hai giá kẹp, có mũi tên chỉ chiều dòng điện I và hai chốt nối nguồn",
  "fill": "#d97706",
  "anchor": "Tâm đoạn dây, giữa hai giá kẹp.",
  "useWhen": ["Cần đoạn dây đồng thẳng dài 0,15 m căng ngang giữa hai giá kẹp, có mũi tên chiều dòng điện I.","Cần dây dẫn thẳng để xét từ trường quanh dây hoặc lực từ lên dây."],
  "avoidWhen": ["Cần dây nối linh hoạt có kẹp cá sấu: dùng day-noi.","Cần khung dây kín hay cuộn dây: dùng khung-day hoặc cuon-cam."],
  "size": { "width": 0.202, "height": 0.072 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm đoạn dây." },
    { "name": "endLeft", "description": "Đầu trái của đoạn dây, ở giá kẹp trái." },
    { "name": "endRight", "description": "Đầu phải của đoạn dây, ở giá kẹp phải." },
    { "name": "terminalPlus", "description": "Chốt nối cực + của nguồn (giá trái)." },
    { "name": "terminalMinus", "description": "Chốt nối cực − của nguồn (giá phải)." }
  ],
  "notes": "Dây đồng trần 0,15 m, đường kính 0,003 m căng thẳng giữa hai giá cách nhau 0,15 m; dòng điện I chạy từ giá trái (+) sang giá phải (−). Từ trường quanh dây là các đường tròn đồng tâm (do cảnh vẽ), lực từ lên dây đo bằng nam châm đặt gần. fill là màu dây đồng."
}
*/
const makeStraightWire = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const HX = 0.075;
  const WY = 0.0;
  const floor = 0.048;

  // Hai giá đỡ: đế gang tròn, trụ thép, đầu kẹp có ốc và chốt nối.
  for (const [s, c, cc] of [[-1, "#ef4444", "#7f1d1d"], [1, "#1f2937", "#030712"]] as [number, string, string][]) {
    const x = s * HX;
    group.add(new Konva.Ellipse({ x: m(x), y: m(floor - 0.005), radiusX: m(0.026), radiusY: m(0.0055), ...lin(m(-0.026), 0, m(0.026), 0, [0, "#475569", 0.3, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.004), y: m(WY), width: m(0.008), height: m(floor - 0.005 - WY), ...lin(0, 0, m(0.008), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.0085), y: m(WY - 0.0085), width: m(0.017), height: m(0.017), cornerRadius: m(0.003), ...lin(0, 0, m(0.017), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(WY), radius: m(0.0024), fill: "#0f172a", listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.0035), y: m(WY - 0.0145), width: m(0.007), height: m(0.006), ...lin(0, 0, m(0.007), 0, steel), listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(WY - 0.0185), radius: m(0.0046), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0046), fillRadialGradientColorStops: [0, "#fff", 0.35, c, 1, cc], stroke: cc, strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Text({ x: m(x - 0.004), y: m(WY - 0.0295), width: m(0.008), align: "center", text: s < 0 ? "+" : "−", fontSize: m(0.0085), fontStyle: "bold", fill: s < 0 ? "#fca5a5" : "#cbd5e1", listening: false }));
  }

  // Dây đồng: lõi có độ cong nhẹ do trọng lượng không đáng kể, vệt sáng ở mép trên.
  group.add(new Konva.Line({ points: [m(-HX), m(WY + 0.0012), m(HX), m(WY + 0.0012)], stroke: "rgba(0,0,0,0.35)", strokeWidth: m(0.0036), lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(-HX), m(WY), m(HX), m(WY)], stroke: "#431407", strokeWidth: m(0.0034), lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(-HX), m(WY), m(HX), m(WY)], stroke: fill, strokeWidth: m(0.0026), lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(-HX + 0.004), m(WY - 0.0007), m(HX - 0.004), m(WY - 0.0007)], stroke: "rgba(255,247,237,0.85)", strokeWidth: lw * 0.8, lineCap: "round", listening: false }));

  // Mũi tên chiều dòng điện và nhãn I phía trên.
  group.add(new Konva.Arrow({ points: [m(-0.03), m(WY - 0.0145), m(0.03), m(WY - 0.0145)], stroke: "#fbbf24", fill: "#fbbf24", strokeWidth: lw * 1.6, pointerLength: m(0.007), pointerWidth: m(0.0065), lineCap: "round", listening: false }));
  group.add(new Konva.Text({ x: m(-0.004), y: m(WY - 0.0285), text: "I", fontSize: m(0.0105), fontStyle: "italic bold", fill: "#fbbf24", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(floor + 0.004), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: m(WY) }, endLeft: { x: m(-HX), y: m(WY) }, endRight: { x: m(HX), y: m(WY) }, terminalPlus: { x: m(-HX), y: m(WY - 0.0185) }, terminalMinus: { x: m(HX), y: m(WY - 0.0185) } } };
};
