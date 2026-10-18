/* OBJECT-META
{
  "catalog": "Cuộn cảm / ống dây",
  "title": "Cuộn dây đồng tự cảm: khung nhựa hai vành, dây đồng quấn nhiều lớp theo vòng xoắn sít nhau và hai đầu dây ra có đầu cắm",
  "fill": "#d97706",
  "anchor": "Tâm cuộn dây.",
  "useWhen": ["Cần cuộn dây tự cảm 400 vòng, lõi rỗng, trục nằm ngang, hai đầu có chuối cắm.","Cần cuộn dây đồng quấn trên khung nhựa không có lõi sắt."],
  "avoidWhen": ["Cần ống dây có lõi sắt hoặc thấy từ trường trong lõi: dùng ong-day-loi-sat.","Cần khung dây quay trong từ trường: dùng khung-day; cuộn này không quay được."],
  "size": { "width": 0.176, "height": 0.067 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm cuộn dây." },
    { "name": "endA", "description": "Đầu dây ra bên trái." },
    { "name": "endB", "description": "Đầu dây ra bên phải." },
    { "name": "axisLeft", "description": "Mặt đầu trái của lõi cuộn, trên trục." },
    { "name": "axisRight", "description": "Mặt đầu phải của lõi cuộn, trên trục." }
  ],
  "notes": "Cuộn 400 vòng quấn trên khung nhựa dài 0,1 m, đường kính ngoài 0,05 m, lõi rỗng đường kính 0,02 m; trục cuộn nằm ngang. Hai đầu dây dài 0,03 m có đầu cắm chuối. Hệ số tự cảm vài mH khi không có lõi sắt. fill là màu dây đồng bọc men."
}
*/
const makeInductor = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const L = 0.1;
  const R = 0.025;
  const FL = 0.004;

  // Dây ra hai đầu: dây đồng lượn nhẹ rồi đầu cắm chuối mạ vàng.
  for (const s of [-1, 1]) {
    const x0 = s * (L / 2 - 0.004);
    const pts = [x0, -R + 0.006, s * (L / 2 + 0.016), -R - 0.008, s * (L / 2 + 0.03), 0.004];
    group.add(new Konva.Line({ points: pts.map(m), stroke: "#7c2d12", strokeWidth: m(0.0042), lineCap: "round", tension: 0.5, listening: false }));
    group.add(new Konva.Line({ points: pts.map(m), stroke: fill, strokeWidth: m(0.003), lineCap: "round", tension: 0.5, listening: false }));
    group.add(new Konva.Rect({ x: m(s > 0 ? L / 2 + 0.029 : -L / 2 - 0.043), y: m(0.0006), width: m(0.014), height: m(0.0092), cornerRadius: m(0.0018), ...lin(0, m(0.0006), 0, m(0.0098), [0, "#fff", 0.4, s > 0 ? "#b91c1c" : "#0f172a", 1, "#000"]), stroke: "#000", strokeWidth: lw * 0.7, listening: false }));
  }

  // Hai vành khung nhựa trắng đục (viền sáng, đường tròn đồng tâm nhìn nghiêng) và lõi rỗng bên trong.
  const flange = (x: number) => {
    group.add(new Konva.Rect({ x: m(x - FL / 2), y: m(-R - 0.0045), width: m(FL), height: m((R + 0.0045) * 2), cornerRadius: m(0.0015), ...lin(m(x - FL / 2), 0, m(x + FL / 2), 0, [0, "#64748b", 0.3, "#ffffff", 0.7, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, listening: false }));
    group.add(ln([x - FL / 2 + 0.0008, -R - 0.0025, x - FL / 2 + 0.0008, R + 0.0025], "rgba(255,255,255,0.7)", lw * 1.1));
  };
  // Lõi nhựa rỗng (ống) nối hai vành, thấy lòng ống ở hai đầu.
  group.add(new Konva.Rect({ x: m(-L / 2), y: m(-0.01), width: m(L), height: m(0.02), ...lin(0, m(-0.01), 0, m(0.01), [0, "#f8fafc", 0.4, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 0.8, listening: false }));
  // Dây quấn: nhiều vòng sít nhau, mỗi vòng là một lát cong đồng; lớp trên đè lớp dưới tạo độ dày.
  const turns = 32;
  const span = L - 2 * FL - 0.002;
  const pitch = span / turns;
  for (let i = 0; i < turns; i += 1) {
    const x = -L / 2 + FL + 0.001 + i * pitch;
    group.add(new Konva.Rect({ x: m(x), y: m(-R), width: m(pitch * 0.92), height: m(R * 2), cornerRadius: m(pitch * 0.4), ...lin(0, m(-R), 0, m(R), [0, "#fef3c7", 0.18, fill, 0.62, "#92400e", 1, "#2a0a02"]), stroke: "#431407", strokeWidth: lw * 0.55, listening: false }));
    group.add(ln([x + pitch * 0.18, -R + 0.002, x + pitch * 0.38, -R + 0.002], "rgba(255,255,255,0.6)", lw * 0.8));
    group.add(ln([x + pitch * 0.3, -R + 0.004, x + pitch * 0.62, R - 0.004], "rgba(67,20,7,0.28)", lw * 0.6));
  }
  flange(-L / 2);
  flange(L / 2);
  // Mặt đầu lòng ống: hình elip tối nhìn từ cạnh phải (lộ khoảng rỗng ở lõi).
  group.add(new Konva.Ellipse({ x: m(L / 2 + FL / 2), y: 0, radiusX: m(0.0024), radiusY: m(0.0105), fill: "#020617", stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Ellipse({ x: m(-L / 2 - FL / 2 + 0.0004), y: 0, radiusX: m(0.0018), radiusY: m(0.0105), fill: "rgba(2,6,23,0.55)", listening: false }));
  // Trục cuộn: đường chấm vàng đi qua lõi, và nhãn L.
  group.add(new Konva.Line({ points: [m(-L / 2 - 0.016), 0, m(L / 2 + 0.016), 0], stroke: "rgba(251,191,36,0.65)", strokeWidth: lw, dash: [m(0.004), m(0.003)], listening: false }));
  group.add(new Konva.Text({ x: m(-0.012), y: m(-R - 0.015), width: m(0.024), align: "center", text: "L", fontSize: m(0.011), fontStyle: "italic bold", fill: "#fcd34d", listening: false }));
  group.add(new Konva.Circle({ x: m(L / 2 + 0.03), y: m(0.004), radius: m(0.0016), fill: "#e2e8f0", listening: false }));
  group.add(new Konva.Rect({ x: m(L / 2 + 0.043), y: m(0.0028), width: m(0.005), height: m(0.005), ...lin(0, m(0.0028), 0, m(0.0078), steel), listening: false }));
  group.add(new Konva.Rect({ x: m(-L / 2 - 0.048), y: m(0.0028), width: m(0.005), height: m(0.005), ...lin(0, m(0.0028), 0, m(0.0078), steel), listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(R + 0.01), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, endA: { x: m(-L / 2 - 0.03), y: m(0.004) }, endB: { x: m(L / 2 + 0.03), y: m(0.004) }, axisLeft: { x: m(-L / 2 - FL / 2), y: 0 }, axisRight: { x: m(L / 2 + FL / 2), y: 0 } } };
};
