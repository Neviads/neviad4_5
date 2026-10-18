/* OBJECT-META
{
  "catalog": "Bàn thí nghiệm / mặt sàn",
  "title": "Bàn thí nghiệm mặt đá đen, khung thép, hai ngăn kéo và kệ dưới",
  "fill": "#1f2937",
  "anchor": "Giữa mép trên mặt bàn (vật đặt lên bàn có điểm neo ở đây).",
  "useWhen": ["Cần mặt bàn làm nền đặt dụng cụ, vật đặt lên có điểm neo tại topCenter.","Cần bàn thí nghiệm rộng 1,2 m cao 0,8 m có ngăn kéo và kệ dưới nhìn chính diện."],
  "avoidWhen": ["Cần giá có trụ đứng và thanh ngang để treo vật: dùng gia-thi-nghiem, bàn này chỉ là mặt phẳng.","Cần mặt phẳng nghiêng hay đường ray: bàn này nằm ngang."],
  "size": { "width": 1.2, "height": 0.8 },
  "parts": [],
  "points": [
    { "name": "topCenter", "description": "Giữa mặt bàn, nơi đặt vật." },
    { "name": "topLeft", "description": "Mép trái mặt bàn." },
    { "name": "topRight", "description": "Mép phải mặt bàn." },
    { "name": "floor", "description": "Giữa nền nhà dưới chân bàn." }
  ],
  "notes": "Bàn cao 0,80 m: mặt bàn ở y = 0, thân bàn đi xuống (y dương). fill là màu mặt đá. Vật đặt lên bàn dựng điểm neo (đáy vật) tại topCenter."
}
*/
const makeLabBench = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 1.2;
  const H = 0.8;
  const TOP = 0.034;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.003));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });

  const group = new Konva.Group({ x: p.x, y: p.y });

  // Chân thép hộp và thanh giằng.
  for (const side of [-1, 1]) {
    const x = side * (W / 2 - 0.05);
    group.add(new Konva.Rect({ x: m(x - 0.022), y: m(TOP), width: m(0.044), height: m(H - TOP - 0.012), ...lin(m(x - 0.022), 0, m(x + 0.022), 0, [0, "#334155", 0.3, "#94a3b8", 0.6, "#64748b", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.03), y: m(H - 0.012), width: m(0.06), height: m(0.012), cornerRadius: m(0.003), fill: "#111827", stroke: "#374151", strokeWidth: lw * 0.6, listening: false }));
  }
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.07), y: m(0.58), width: m(W - 0.14), height: m(0.025), ...lin(0, m(0.58), 0, m(0.605), [0, "#94a3b8", 1, "#475569"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  // Kệ dưới bằng gỗ ép.
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.07), y: m(0.605), width: m(W - 0.14), height: m(0.02), cornerRadius: m(0.002), ...lin(0, m(0.605), 0, m(0.625), [0, "#c8a06c", 1, "#8a5f2e"]), stroke: "#4a2f12", strokeWidth: lw, listening: false }));
  // Hộc dưới mặt bàn: tấm chắn và hai ngăn kéo bên phải.
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.07), y: m(TOP), width: m(W - 0.14), height: m(0.16), ...lin(0, m(TOP), 0, m(TOP + 0.16), [0, "#cbd5e1", 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 2; i += 1) {
    const y = TOP + 0.012 + i * 0.07;
    group.add(new Konva.Rect({ x: m(0.1), y: m(y), width: m(0.4), height: m(0.062), cornerRadius: m(0.004), ...lin(0, m(y), 0, m(y + 0.062), [0, "#e2e8f0", 1, "#a8b5c6"]), stroke: "#475569", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Rect({ x: m(0.27), y: m(y + 0.024), width: m(0.06), height: m(0.012), cornerRadius: m(0.006), ...lin(0, m(y + 0.024), 0, m(y + 0.036), [0, "#f8fafc", 1, "#64748b"]), stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Circle({ x: m(0.12), y: m(y + 0.031), radius: m(0.004), fill: "#64748b", listening: false }));
  }

  // Mặt bàn: gỗ viền dưới và tấm đá nhân tạo đen bóng phía trên.
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(0.012), width: m(W), height: m(TOP - 0.012), cornerRadius: m(0.004), ...lin(0, m(0.012), 0, m(TOP), [0, "#d6b080", 1, "#9a6b34"]), stroke: "#5a3a16", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.02), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.012) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2 - 0.006), y: 0, width: m(W + 0.012), height: m(0.016), cornerRadius: m(0.004), ...lin(0, 0, 0, m(0.016), [0, "#475569", 0.3, fill, 1, "#020617"]), stroke: "#0b1220", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: [m(-W / 2 + 0.03), m(0.0025), m(W / 2 - 0.03), m(0.0025)], stroke: "rgba(255,255,255,0.45)", strokeWidth: lw, lineCap: "round", listening: false }));
  // Vân gỗ ở cạnh bàn.
  for (let i = 0; i < 9; i += 1) {
    const x = -W / 2 + 0.06 + i * 0.14;
    group.add(new Konva.Line({ points: [m(x), m(0.024), m(x + 0.05), m(0.026), m(x + 0.1), m(0.024)], stroke: "rgba(90,58,22,0.35)", strokeWidth: lw * 0.6, tension: 0.4, listening: false }));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-0.4), y: m(0.42), width: m(0.8), align: "center", text: label, fontSize: m(0.035), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: { topCenter: { x: 0, y: 0 }, topLeft: { x: m(-W / 2), y: 0 }, topRight: { x: m(W / 2), y: 0 }, floor: { x: 0, y: m(H) } },
  };
};
