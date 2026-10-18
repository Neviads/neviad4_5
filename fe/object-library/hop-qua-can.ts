/* OBJECT-META
{
  "catalog": "Hộp quả cân",
  "title": "Hộp quả cân bằng gỗ: bộ quả cân đồng 1 g – 100 g xếp trong ổ nhung và cái nhíp gắp",
  "fill": "#7c4a1e",
  "anchor": "Giữa đáy hộp, chạm mặt bàn.",
  "useWhen": ["Cần bộ quả cân chuẩn 1–100 g kèm nhíp gắp đặt trong hộp gỗ, ví dụ cạnh cân đòn.", "Cảnh chỉ cần minh hoạ cả bộ quả cân sắp trong ổ nhung."],
  "avoidWhen": ["Cần quả cân rời nhấc ra đặt lên đĩa cân: vật này cố định trong ổ, chỉ dùng hộp rỗng.", "Cần cân có số đọc: dùng can-dien-tu; cần quả nặng móc treo: dùng qua-nang-moc."],
  "size": { "width": 0.26, "height": 0.11 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy hộp." },
    { "name": "weight100", "description": "Đỉnh núm của quả cân 100 g." },
    { "name": "weight1", "description": "Đỉnh núm của quả cân 1 g (nhỏ nhất)." },
    { "name": "tweezers", "description": "Đầu nhíp gắp quả cân." }
  ],
  "notes": "Bộ gồm 100, 50, 20, 20, 10, 5, 2, 2, 1 g; kích thước nhỏ dần từ trái sang phải, giá trị ghi trên nắp ổ. Quả cân là vật cố định trong ổ: nếu cảnh cần nhấc từng quả ra thì vẽ riêng quả cân và chỉ dùng hộp rỗng. fill là màu gỗ của hộp."
}
*/
const makeWeightBox = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.25;
  const TRAY_H = 0.05;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const brass = [0, "#7c5a1a", 0.3, "#fde8a0", 0.6, "#d4a73a", 1, "#6b4a10"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Nắp hộp mở dựng phía sau: mặt trong bọc nhung đỏ thẫm.
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.004), y: m(-0.108), width: m(W - 0.008), height: m(0.06), cornerRadius: m(0.004), ...lin(0, m(-0.108), 0, m(-0.048), [0, "#4a2a0e", 1, fill]), stroke: "#2a1606", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.012), y: m(-0.1), width: m(W - 0.024), height: m(0.044), cornerRadius: m(0.003), ...lin(0, m(-0.1), 0, m(-0.056), [0, "#7f1d1d", 1, "#450a0a"]), listening: false }));
  group.add(new Konva.Text({ x: m(-0.07), y: m(-0.0875), width: m(0.14), align: "center", text: "QUẢ CÂN · 1 g – 100 g", fontSize: m(0.0085), fontStyle: "bold", fill: "#fcd34d", listening: false }));
  group.add(new Konva.Line({ points: [m(-0.05), m(-0.0735), m(0.05), m(-0.0735)], stroke: "rgba(252,211,77,0.6)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: m(0), y: m(-0.1015), radius: m(0.0025), fill: "#d4a73a", listening: false }));

  // Khay: thành gỗ trước thấp, lòng khay nhung xanh đậm có các ổ tròn.
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(-TRAY_H), width: m(W), height: m(TRAY_H), cornerRadius: m(0.004), ...lin(0, m(-TRAY_H), 0, 0, [0, "#a8703a", 0.2, fill, 1, "#3b1f09"]), stroke: "#2a1606", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  for (let i = 0; i < 6; i += 1) group.add(new Konva.Line({ points: [m(-W / 2 + 0.006), m(-0.039 + i * 0.0065), m(-0.02), m(-0.038 + i * 0.0065), m(W / 2 - 0.006), m(-0.039 + i * 0.0065)], stroke: i % 2 ? "rgba(42,22,6,0.4)" : "rgba(255,225,180,0.2)", strokeWidth: lw * 0.6, tension: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.006), y: m(-TRAY_H - 0.0085), width: m(W - 0.012), height: m(0.034), cornerRadius: m(0.003), ...lin(0, m(-TRAY_H - 0.0085), 0, m(-0.0245), [0, "#1e3a5f", 1, "#0f2540"]), stroke: "#0b1b30", strokeWidth: lw, listening: false }));

  // Chín quả cân: thân trụ đồng có núm, cỡ giảm dần; chữ giá trị trên mép khay.
  const set: [number, number, number][] = [[100, 0.026, 0.034], [50, 0.021, 0.028], [20, 0.0165, 0.023], [20, 0.0165, 0.023], [10, 0.0135, 0.019], [5, 0.011, 0.016], [2, 0.0085, 0.0125], [2, 0.0085, 0.0125], [1, 0.0068, 0.01]];
  const widthSum = set.reduce((acc, [, d]) => acc + d, 0) + 0.006 * (set.length - 1);
  let x = -widthSum / 2;
  const tops: number[] = [];
  const base = -TRAY_H - 0.0085 + 0.034 - 0.006;
  set.forEach(([g, d, h], i) => {
    const cx = x + d / 2;
    const top = base - h;
    tops.push(cx, top);
    group.add(new Konva.Ellipse({ x: m(cx), y: m(base + 0.0012), radiusX: m(d / 2 + 0.002), radiusY: m(0.0025), fill: "rgba(0,0,0,0.55)", listening: false }));
    group.add(new Konva.Rect({ x: m(cx - d / 2), y: m(top + h * 0.2), width: m(d), height: m(h * 0.8), cornerRadius: m(0.0018), ...lin(m(cx - d / 2), 0, m(cx + d / 2), 0, brass), stroke: "#5e4210", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Rect({ x: m(cx - d * 0.36), y: m(top + h * 0.04), width: m(d * 0.72), height: m(h * 0.2), cornerRadius: m(0.0016), ...lin(m(cx - d * 0.36), 0, m(cx + d * 0.36), 0, brass), stroke: "#5e4210", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Circle({ x: m(cx), y: m(top + 0.0006), radius: m(Math.max(0.0018, d * 0.18)), ...lin(m(cx - d * 0.18), 0, m(cx + d * 0.18), 0, brass), stroke: "#5e4210", strokeWidth: lw * 0.7, listening: false }));
    group.add(new Konva.Text({ x: m(cx - d / 2), y: m(top + h * 0.42), width: m(d), align: "center", text: String(g), fontSize: m(Math.max(0.0042, d * 0.34)), fontStyle: "bold", fill: "#4a3510", listening: false }));
    group.add(new Konva.Text({ x: m(cx - 0.012), y: m(-0.019 + (i % 2) * 0.0105 - 0.0135), width: m(0.024), align: "center", text: `${g} g`, fontSize: m(0.0058), fill: "rgba(254,243,199,0.9)", listening: false }));
    x += d + 0.006;
  });

  // Nhíp gắp bằng thép nằm trước khay.
  const ty = -0.006;
  group.add(new Konva.Line({ points: [m(0.056), m(ty - 0.0025), m(0.12), m(ty - 0.0008)], stroke: "#e2e8f0", strokeWidth: m(0.0042), lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(0.056), m(ty + 0.0015), m(0.12), m(ty + 0.0016)], stroke: "#94a3b8", strokeWidth: m(0.0038), lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(0.12), m(ty - 0.0008), m(0.1245), m(ty + 0.0004)], stroke: "#e2e8f0", strokeWidth: m(0.0042), lineCap: "round", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.12), y: m(0.006), width: m(0.24), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: { base: { x: 0, y: 0 }, weight100: { x: m(tops[0]), y: m(tops[1]) }, weight1: { x: m(tops[tops.length - 2]), y: m(tops[tops.length - 1]) }, tweezers: { x: m(0.1245), y: m(ty) } },
  };
};
