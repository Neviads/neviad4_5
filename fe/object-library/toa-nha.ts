/* OBJECT-META
{
  "catalog": "Toà nhà / cột / tháp (điểm ném từ trên cao)",
  "title": "Toà nhà cao tầng 12 tầng với cửa sổ sáng và tối, sân thượng có ăng-ten đỏ, bên cạnh là cột điện thép có hai xà ngang và đèn cảnh báo",
  "fill": "#94a3b8",
  "anchor": "Giữa chân toà nhà, chạm mặt đất.",
  "useWhen": ["Cần toà nhà 12 tầng cao 42 m làm điểm ném ngang hoặc thả vật rơi tự do từ mái.","Cần cột điện thép cao 30 m bên cạnh toà nhà làm mốc thứ hai."],
  "avoidWhen": ["Cần cây tháp hay vách thấp để ném ở độ cao vài mét: dùng vật khác nhỏ hơn, vật này cao 42 m.","Cần mặt phẳng nghiêng hay vách cứng cho va chạm: dùng mat-nghieng hoặc tuong.","Kích thước 20 × 51 m rất lớn, cần cảnh thu nhỏ thì phải kiểm tra tỉ lệ."],
  "size": { "width": 20.0, "height": 51.0 },
  "parts": [],
  "points": [
    { "name": "foot", "description": "Giữa chân toà nhà, chạm mặt đất." },
    { "name": "roof", "description": "Giữa mái toà nhà (điểm ném từ trên cao)." },
    { "name": "antennaTop", "description": "Đỉnh ăng-ten trên mái." },
    { "name": "towerTop", "description": "Đỉnh cột điện bên cạnh." }
  ],
  "notes": "Toà nhà rộng 12 m, cao 42 m (12 tầng × 3,5 m), ăng-ten cao thêm 8 m; mái ở độ cao 42 m là điểm ném vật rơi tự do hay ném ngang. Cột điện thép cao 30 m đặt bên phải toà nhà. fill là màu bê tông mặt tiền."
}
*/
const makeBuilding = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.08));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const W = 12;
  const H = 42;
  const x0 = -W / 2 - 2;

  // Toà nhà: khối chính, mặt bên phải tối hơn để tạo khối, sân thượng và gờ mái.
  group.add(new Konva.Rect({ x: m(x0 + 0.5), y: m(-H + 0.5), width: m(W), height: m(H), ...lin(0, 0, m(W), 0, [0, "rgba(0,0,0,0.35)", 1, "rgba(0,0,0,0.35)"]), listening: false }));
  group.add(new Konva.Rect({ x: m(x0), y: m(-H), width: m(W), height: m(H), ...lin(0, 0, m(W), m(H), [0, "#f8fafc", 0.35, fill, 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(x0 + W - 1.8), y: m(-H), width: m(1.8), height: m(H), fill: "rgba(15,23,42,0.28)", listening: false }));
  group.add(new Konva.Rect({ x: m(x0 - 0.3), y: m(-H - 0.8), width: m(W + 0.6), height: m(0.8), ...lin(0, 0, 0, m(0.8), [0, "#e2e8f0", 1, "#64748b"]), stroke: "#1e293b", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(x0 + 2), y: m(-H - 2.4), width: m(4.4), height: m(1.6), ...lin(0, 0, m(4.4), 0, [0, "#94a3b8", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw * 0.7, listening: false }));
  // Ăng-ten đỏ có đèn nhấp nháy.
  group.add(new Konva.Line({ points: [m(x0 + 4.2), m(-H - 2.4), m(x0 + 4.2), m(-H - 10)], stroke: "#cbd5e1", strokeWidth: m(0.18), listening: false }));
  group.add(new Konva.Line({ points: [m(x0 + 3.2), m(-H - 5.5), m(x0 + 5.2), m(-H - 5.5)], stroke: "#cbd5e1", strokeWidth: m(0.1), listening: false }));
  group.add(new Konva.Circle({ x: m(x0 + 4.2), y: m(-H - 10), radius: m(0.28), fill: "#ef4444", shadowColor: "#f87171", shadowBlur: m(0.9), shadowOpacity: 1, listening: false }));
  // Cửa sổ: lưới 12 tầng × 5 cột, một số ô sáng đèn vàng, các ô khác tối.
  const lit = (r: number, c: number) => (r * 7 + c * 3 + (r % 3)) % 5 < 2;
  for (let r = 0; r < 12; r += 1) {
    const y = -H + 1.4 + r * 3.45;
    for (let c = 0; c < 5; c += 1) {
      const x = x0 + 0.9 + c * 2.0;
      const on = lit(r, c);
      group.add(new Konva.Rect({ x: m(x), y: m(y), width: m(1.4), height: m(2.0), ...lin(0, 0, 0, m(2.0), on ? [0, "#fef9c3", 1, "#f59e0b"] : [0, "#475569", 1, "#0b1220"]), stroke: "#0f172a", strokeWidth: lw * 0.6, shadowColor: on ? "#fde047" : undefined, shadowBlur: on ? m(0.4) : 0, shadowOpacity: on ? 0.7 : 0, listening: false }));
      group.add(new Konva.Line({ points: [m(x), m(y + 1.0), m(x + 1.4), m(y + 1.0)], stroke: "rgba(15,23,42,0.5)", strokeWidth: lw * 0.4, listening: false }));
      group.add(new Konva.Line({ points: [m(x + 0.1), m(y + 0.1), m(x + 0.1), m(y + 1.0)], stroke: "rgba(255,255,255,0.5)", strokeWidth: lw * 0.6, listening: false }));
    }
  }
  group.add(new Konva.Rect({ x: m(x0), y: m(-3.2), width: m(W), height: m(3.2), fill: "#1f2937", stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(x0 + W / 2 - 1.6), y: m(-2.8), width: m(3.2), height: m(2.8), fill: "#0b1220", stroke: "#94a3b8", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Line({ points: [m(x0 + W / 2), m(-2.8), m(x0 + W / 2), 0], stroke: "#94a3b8", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Text({ x: m(x0 + 2), y: m(-3.1), width: m(W - 4), align: "center", text: "NEVIAD TOWER", fontSize: m(0.5), fontStyle: "bold", fill: "#fde68a", listening: false }));

  // Cột điện thép bên phải: hai thanh chính xiên, thanh giằng hình chữ X, hai xà ngang, đèn cảnh báo.
  const tx = x0 + W + 4.5;
  const TH = 30;
  group.add(new Konva.Line({ points: [m(tx - 1.5), 0, m(tx - 0.3), m(-TH), m(tx + 0.3), m(-TH), m(tx + 1.5), 0], stroke: "#cbd5e1", strokeWidth: m(0.2), lineJoin: "round", listening: false }));
  for (let i = 0; i < 6; i += 1) {
    const y0 = -(i * TH) / 6;
    const y1 = -((i + 1) * TH) / 6;
    const w0 = 1.5 - (1.2 * (i * 1)) / 6;
    const w1 = 1.5 - (1.2 * (i + 1)) / 6;
    group.add(new Konva.Line({ points: [m(tx - w0), m(y0), m(tx + w1), m(y1)], stroke: "#94a3b8", strokeWidth: m(0.1), listening: false }));
    group.add(new Konva.Line({ points: [m(tx + w0), m(y0), m(tx - w1), m(y1)], stroke: "#94a3b8", strokeWidth: m(0.1), listening: false }));
    group.add(new Konva.Line({ points: [m(tx - w1), m(y1), m(tx + w1), m(y1)], stroke: "#cbd5e1", strokeWidth: m(0.12), listening: false }));
  }
  for (const [y, w] of [[-TH + 3, 3.4], [-TH + 7, 2.8]] as [number, number][]) {
    group.add(new Konva.Line({ points: [m(tx - w), m(y), m(tx + w), m(y)], stroke: "#e2e8f0", strokeWidth: m(0.22), lineCap: "round", listening: false }));
    for (const s of [-1, 1]) group.add(new Konva.Rect({ x: m(tx + s * w - 0.15), y: m(y), width: m(0.3), height: m(0.5), fill: "#cbd5e1", stroke: "#475569", strokeWidth: lw * 0.4, listening: false }));
    group.add(new Konva.Line({ points: [m(tx - w), m(y + 0.5), m(tx - w - 6), m(y + 2.2)], stroke: "rgba(15,23,42,0.6)", strokeWidth: m(0.05), tension: 0.4, listening: false }));
  }
  group.add(new Konva.Circle({ x: m(tx), y: m(-TH - 0.4), radius: m(0.3), fill: "#ef4444", shadowColor: "#f87171", shadowBlur: m(0.8), shadowOpacity: 1, listening: false }));
  group.add(new Konva.Rect({ x: m(tx - 2.2), y: m(-0.3), width: m(4.4), height: m(0.3), fill: "#52525b", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-6), y: m(0.5), width: m(12), align: "center", text: label, fontSize: m(0.9), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { foot: { x: m(x0 + W / 2), y: 0 }, roof: { x: m(x0 + W / 2), y: m(-H - 0.8) }, antennaTop: { x: m(x0 + 4.2), y: m(-H - 10) }, towerTop: { x: m(tx), y: m(-TH - 0.4) } } };
};
