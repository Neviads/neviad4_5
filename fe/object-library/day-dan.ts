/* OBJECT-META
{
  "catalog": "Dây đàn / sợi dây căng qua ròng rọc",
  "title": "Đàn đơn dây (sonometer): hộp gỗ cộng hưởng dài 1 m, dây thép căng qua hai cầu cố định và một cầu di động, ròng rọc treo quả cân và thước chia mm",
  "fill": "#c8873f",
  "anchor": "Giữa đáy hộp đàn.",
  "useWhen": ["Cần đàn đơn dây (sonometer) hộp gỗ dài 1 m, cầu di động, ròng rọc treo quả cân và thước mm.","Cần thay đổi chiều dài đoạn dây dao động bằng cầu trượt từ 0 đến 0,62 m."],
  "avoidWhen": ["Cần bộ sóng dừng có cần rung điện từ kích thích: dùng can-rung-day.","Cần một sợi dây trơn không hộp: dùng day; đây là hộp cộng hưởng đầy đủ nên cồng kềnh."],
  "size": { "width": 1.079, "height": 0.114 },
  "parts": [
    { "name": "bridge", "label": "Cầu di động", "motion": "slide", "axis": "right", "min": 0, "max": 0.62, "description": "Vị trí cầu di động tính từ cầu cố định trái (mét); độ dài đoạn dây dao động = 1,0 − bridge ... hoặc bridge, tuỳ cách cảnh chọn đoạn." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy hộp đàn." },
    { "name": "leftBridge", "description": "Đỉnh cầu cố định bên trái." },
    { "name": "rightBridge", "description": "Đỉnh cầu cố định bên phải (cạnh ròng rọc)." },
    { "name": "pan", "description": "Tâm đĩa treo quả cân." }
  ],
  "notes": "Hộp cộng hưởng dài 1,0 m, cao 0,08 m; dây thép 0,0004 m căng ở độ cao 0,0095 m trên mặt hộp. Dây buộc vào chốt bên trái, đi qua hai cầu cố định và cầu di động, qua ròng rọc bên phải rồi treo quả cân. Dịch cầu di động đổi chiều dài đoạn dây dao động, tần số f = (1/2L)·√(T/μ). fill là màu gỗ của hộp."
}
*/
const makeSonometer = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const BOX_L = 1.0;
  const BOX_H = 0.08;
  const STR_H = 0.0095;
  const LEFT_X = 0.04;
  const RIGHT_X = 0.96;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const left = -BOX_L / 2;
  const top = -BOX_H - 0.01;
  const stringY = top - STR_H;

  // Chân đế cao su và hộp gỗ cộng hưởng có lỗ thoát âm hình tròn.
  for (const x of [-0.42, 0.42]) group.add(new Konva.Rect({ x: m(x - 0.03), y: m(-0.01), width: m(0.06), height: m(0.01), cornerRadius: m(0.003), fill: "#0b0f19", listening: false }));
  group.add(new Konva.Rect({ x: m(left), y: m(top), width: m(BOX_L), height: m(BOX_H), cornerRadius: m(0.005), ...lin(0, m(top), 0, m(top + BOX_H), [0, "#e7b274", 0.12, fill, 0.8, "#8a5524", 1, "#5a3512"]), stroke: "#3b220c", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.016), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.007) }, listening: false }));
  for (let i = 0; i < 9; i += 1) group.add(ln([left + 0.01, top + 0.0075 + i * 0.0085, left + 0.3, top + 0.0085 + i * 0.0085, left + 0.7, top + 0.0072 + i * 0.0085, left + BOX_L - 0.01, top + 0.008 + i * 0.0085], i % 2 ? "rgba(90,53,18,0.35)" : "rgba(255,230,190,0.28)", lw * 0.6));
  for (const x of [-0.25, 0.0, 0.25]) {
    group.add(new Konva.Ellipse({ x: m(x), y: m(top + BOX_H * 0.5), radiusX: m(0.012), radiusY: m(0.012), fill: "#0b0f19", stroke: "#3b220c", strokeWidth: lw, listening: false }));
    group.add(new Konva.Arc({ x: m(x), y: m(top + BOX_H * 0.5), innerRadius: m(0.0092), outerRadius: m(0.011), angle: 90, rotation: 200, fill: "rgba(255,230,190,0.4)", listening: false }));
  }
  // Mặt hộp có thước mm cho vị trí cầu di động.
  group.add(new Konva.Rect({ x: m(left + LEFT_X), y: m(top - 0.0006), width: m(RIGHT_X - LEFT_X), height: m(0.0092), fill: "#fefce8", stroke: "#a16207", strokeWidth: lw * 0.6, listening: false }));
  for (let cm = 0; cm <= 92; cm += 1) {
    const x = left + LEFT_X + cm / 100;
    const ten = cm % 10 === 0;
    group.add(ln([x, top - 0.0006, x, top - 0.0006 + (ten ? 0.0052 : cm % 5 === 0 ? 0.0036 : 0.0022)], "#0f172a", ten ? lw : lw * 0.55));
    if (ten) group.add(new Konva.Text({ x: m(x - 0.008), y: m(top + 0.0045), width: m(0.016), align: "center", text: String(cm), fontSize: m(0.0036), fontStyle: "bold", fill: "#0f172a", listening: false }));
  }
  // Chốt buộc dây ở đầu trái và hai cầu cố định (chốt gỗ đỡ dây).
  group.add(new Konva.Rect({ x: m(left + 0.012), y: m(top - 0.008), width: m(0.01), height: m(0.016), cornerRadius: m(0.002), ...lin(m(left + 0.012), 0, m(left + 0.022), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Circle({ x: m(left + 0.017), y: m(stringY), radius: m(0.0024), fill: "#e2e8f0", stroke: "#0f172a", strokeWidth: lw * 0.6, listening: false }));
  for (const bx of [left + LEFT_X, left + RIGHT_X]) {
    group.add(new Konva.Line({ points: [m(bx - 0.01), m(top), m(bx - 0.003), m(stringY + 0.001), m(bx + 0.003), m(stringY + 0.001), m(bx + 0.01), m(top)], closed: true, ...lin(m(bx - 0.01), 0, m(bx + 0.01), 0, [0, "#475569", 0.3, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 0.9, lineJoin: "round", listening: false }));
  }
  // Dây thép: thẳng từ chốt trái tới ròng rọc, qua đỉnh hai cầu cố định.
  const px = left + BOX_L + 0.032;
  group.add(ln([left + 0.017, stringY, left + RIGHT_X + 0.0, stringY, px - 0.0135, stringY - 0.0004], "#f1f5f9", lw * 1.3));
  group.add(ln([left + 0.017, stringY + 0.0006, left + RIGHT_X, stringY + 0.0006], "rgba(15,23,42,0.4)", lw * 0.6));

  // BỘ PHẬN TRƯỢT: cầu di động ôm hai bên hộp. Gốc nhóm là đỉnh cầu, tại vạch 0 của thước cố định.
  const bridge = new Konva.Group({ x: m(left + LEFT_X), y: m(stringY) });
  bridge.add(new Konva.Rect({ x: m(-0.012), y: m(0.0006), width: m(0.024), height: m(BOX_H + STR_H - 0.0006 - 0.006), cornerRadius: m(0.003), ...lin(m(-0.012), 0, m(0.012), 0, [0, "#d4a96a", 0.4, "#f5deb3", 1, "#8a5a2b"]), stroke: "#4a2f12", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.35, listening: false }));
  bridge.add(new Konva.Line({ points: [m(-0.0095), m(0.0006), m(-0.0034), m(-0.0006), m(0.0034), m(-0.0006), m(0.0095), m(0.0006)], closed: true, fill: "#e2e8f0", stroke: "#334155", strokeWidth: lw * 0.8, lineJoin: "round", listening: false }));
  bridge.add(new Konva.Rect({ x: m(-0.0015), y: m(0.012), width: m(0.003), height: m(0.04), fill: "rgba(90,53,18,0.35)", listening: false }));
  bridge.add(new Konva.Line({ points: [m(0.0), m(0.0), m(0.0), m(-0.002)], stroke: "#f1f5f9", strokeWidth: lw * 1.3, listening: false }));
  group.add(bridge);

  // Ròng rọc ở bên phải, dây buông thẳng xuống đĩa treo quả cân.
  group.add(new Konva.Rect({ x: m(left + BOX_L - 0.004), y: m(top - 0.014), width: m(0.044), height: m(0.014), cornerRadius: m(0.003), ...lin(0, m(top - 0.014), 0, m(top), [0, "#e2e8f0", 1, "#64748b"]), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Circle({ x: m(px), y: m(stringY - 0.001), radius: m(0.0135), ...lin(m(px - 0.0135), 0, m(px + 0.0135), 0, [0, "#f8fafc", 0.4, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: m(px), y: m(stringY - 0.001), radius: m(0.0042), fill: "#334155", listening: false }));
  group.add(ln([px - 0.0135, stringY - 0.0004, px, stringY - 0.0145, px + 0.0135, stringY - 0.001, px + 0.0135, -0.04], "#f1f5f9", lw * 1.3));
  group.add(new Konva.Rect({ x: m(px + 0.0105), y: m(-0.05), width: m(0.006), height: m(0.014), fill: "#cbd5e1", stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(px - 0.02), y: m(-0.0365), width: m(0.067), height: m(0.007), cornerRadius: m(0.003), ...lin(m(px - 0.02), 0, m(px + 0.047), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(px - 0.0035), y: m(-0.0585), width: m(0.02), height: m(0.022), cornerRadius: m(0.002), ...lin(m(px - 0.0035), 0, m(px + 0.0165), 0, [0, "#7c5a1a", 0.35, "#fde68a", 1, "#7c5a1a"]), stroke: "#4a3510", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Text({ x: m(px - 0.0035), y: m(-0.0525), width: m(0.02), align: "center", text: "1 kg", fontSize: m(0.0058), fontStyle: "bold", fill: "#4a3510", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.3), y: m(0.01), width: m(0.6), align: "center", text: label, fontSize: m(0.016), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { bridge: { node: bridge, motion: "slide" as const, axis: "right" as const, min: 0, max: 0.62 } },
    points: { base: { x: 0, y: 0 }, leftBridge: { x: m(left + LEFT_X), y: m(stringY) }, rightBridge: { x: m(left + RIGHT_X), y: m(stringY) }, pan: { x: m(px + 0.0135), y: m(-0.0475) } },
  };
};
