/* OBJECT-META
{
  "catalog": "Máy biến áp (lõi + hai cuộn)",
  "title": "Máy biến áp học sinh: lõi thép kĩ thuật điện ghép lá khép kín, cuộn sơ cấp nhiều vòng bên trái và cuộn thứ cấp ít vòng bên phải, đế nhựa có bốn chốt",
  "fill": "#d97706",
  "anchor": "Giữa đáy đế, chạm mặt bàn.",
  "useWhen": ["Cần máy biến áp học sinh có lõi thép ghép lá, sơ cấp nhiều vòng bên trái, thứ cấp ít vòng bên phải.","Cần bốn chốt nối dây ở đế cho bài toán tỉ số điện áp và số vòng."],
  "avoidWhen": ["Cần nguồn điện áp xoay chiều có đồng hồ: dùng nguon-xoay-chieu.","Cần cuộn dây đơn có lõi sắt: dùng ong-day-loi-sat.","Là máy hạ áp (sơ cấp nhiều vòng hơn), không phải máy tăng áp."],
  "size": { "width": 0.176, "height": 0.151 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy đế." },
    { "name": "primaryA", "description": "Chốt đầu vào thứ nhất của cuộn sơ cấp." },
    { "name": "primaryB", "description": "Chốt đầu vào thứ hai của cuộn sơ cấp." },
    { "name": "secondaryA", "description": "Chốt đầu ra thứ nhất của cuộn thứ cấp." },
    { "name": "secondaryB", "description": "Chốt đầu ra thứ hai của cuộn thứ cấp." }
  ],
  "notes": "Lõi thép cao 0,1 m, rộng 0,13 m, dày 0,03 m gồm nhiều lá thép mỏng ghép cách điện; sơ cấp N₁ = 400 vòng ở trụ trái (dây mảnh), thứ cấp N₂ = 100 vòng ở trụ phải (dây to hơn). Hiệu điện thế ra U₂ = U₁·N₂/N₁. Bốn chốt ở đế nối hai đầu mỗi cuộn. fill là màu dây đồng bọc men."
}
*/
const makeTransformer = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const BASEH = 0.018;
  const top = -0.148;
  const bot = -BASEH;
  const OW = 0.13;
  const LEGW = 0.036;
  const x0 = -OW / 2;

  // Đế nhựa đen và bốn chốt cắm đồng: hai chốt bên trái cho sơ cấp, hai chốt bên phải cho thứ cấp.
  group.add(new Konva.Rect({ x: m(-0.086), y: m(-BASEH), width: m(0.172), height: m(BASEH), cornerRadius: m(0.004), ...lin(0, m(-BASEH), 0, 0, [0, "#6b7280", 0.25, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(ln([-0.08, -BASEH + 0.002, 0.08, -BASEH + 0.002], "rgba(255,255,255,0.3)", lw * 1.3));
  const term = [[-0.07, "#ef4444", "#7f1d1d", "~1"], [-0.052, "#1f2937", "#030712", "~1"], [0.052, "#ef4444", "#7f1d1d", "~2"], [0.07, "#1f2937", "#030712", "~2"]] as [number, string, string, string][];
  for (const [x, c, cc, t] of term) {
    group.add(new Konva.Circle({ x: m(x), y: m(-BASEH / 2), radius: m(0.0058), ...lin(m(x - 0.0058), 0, m(x + 0.0058), 0, [0, "#f8fafc", 1, "#334155"]), stroke: "#020617", strokeWidth: lw * 0.9, listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(-BASEH / 2), radius: m(0.0042), fillRadialGradientStartPoint: { x: m(-0.0012), y: m(-0.0012) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0042), fillRadialGradientColorStops: [0, "#fff", 0.35, c, 1, cc], stroke: cc, strokeWidth: lw * 0.5, listening: false }));
    group.add(new Konva.Text({ x: m(x - 0.0065), y: m(-0.004), width: m(0.013), align: "center", text: t, fontSize: m(0.0036), fill: "rgba(226,232,240,0.9)", listening: false }));
  }

  // Lõi thép: khung chữ nhật có hai cửa sổ, sơn đen nhạt, vạch lá thép thành từng lớp.
  group.add(new Konva.Rect({ x: m(x0), y: m(top), width: m(OW), height: m(bot - top), cornerRadius: m(0.002), ...lin(0, 0, m(OW), 0, [0, "#475569", 0.3, "#cbd5e1", 0.7, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, listening: false }));
  const winL = x0 + LEGW;
  const winR = x0 + OW - LEGW;
  const winTop = top + 0.03;
  const winBot = bot - 0.03;
  // Cửa sổ giữa hai trụ: thấy nền tối giữa hai cuộn dây.
  group.add(new Konva.Rect({ x: m(winL), y: m(winTop), width: m(winR - winL), height: m(winBot - winTop), fill: "#0b1220", stroke: "#1e293b", strokeWidth: lw, listening: false }));
  for (let y = top + 0.003; y < bot; y += 0.0042) group.add(ln([x0 + 0.002, y, winL, y], "rgba(15,23,42,0.35)", lw * 0.6));
  for (let y = top + 0.003; y < bot; y += 0.0042) group.add(ln([winR, y, x0 + OW - 0.002, y], "rgba(15,23,42,0.35)", lw * 0.6));
  for (let x = x0 + 0.003; x < x0 + OW; x += 0.0042) group.add(ln([x, top + 0.002, x, winTop], "rgba(15,23,42,0.35)", lw * 0.6));
  group.add(ln([x0 + 0.004, top + 0.0025, x0 + OW - 0.004, top + 0.0025], "rgba(255,255,255,0.55)", lw * 1.2));
  // Kẹp sắt giữ lõi: bốn bulông ở góc.
  for (const sx of [x0 + 0.006, x0 + OW - 0.006]) for (const sy of [top + 0.006, bot - 0.006]) group.add(new Konva.Circle({ x: m(sx), y: m(sy), radius: m(0.0024), fill: "#e2e8f0", stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));

  // Cuộn dây quanh mỗi trụ: lớp ống nhựa, dây đồng quấn dọc và nhãn số vòng. Sơ cấp (trái) nhỏ dây dày đặc, thứ cấp (phải) dây to ít vòng.
  const coil = (cx: number, turns: number, w: number, label: string) => {
    const cy0 = winTop + 0.0015;
    const ch = winBot - winTop - 0.003;
    group.add(new Konva.Rect({ x: m(cx - w / 2 - 0.0025), y: m(cy0 - 0.0015), width: m(w + 0.005), height: m(ch + 0.003), cornerRadius: m(0.003), ...lin(0, 0, m(w + 0.005), 0, [0, "#f8fafc", 0.3, "#cbd5e1", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Rect({ x: m(cx - w / 2), y: m(cy0), width: m(w), height: m(ch), ...lin(0, 0, m(w), 0, [0, "#fef3c7", 0.2, fill, 0.7, "#92400e", 1, "#2a0a02"]), stroke: "#431407", strokeWidth: lw * 0.7, listening: false }));
    const pitch = ch / turns;
    for (let i = 0; i < turns; i += 1) group.add(ln([cx - w / 2, cy0 + i * pitch + pitch * 0.55, cx + w / 2, cy0 + i * pitch + pitch * 0.15], "rgba(67,20,7,0.5)", lw * 0.55));
    group.add(ln([cx - w / 2 + 0.002, cy0 + 0.002, cx - w / 2 + 0.002, cy0 + ch - 0.002], "rgba(255,255,255,0.4)", lw * 1.3));
    group.add(new Konva.Text({ x: m(cx - w / 2), y: m(cy0 + ch / 2 - 0.003), width: m(w), align: "center", text: label, fontSize: m(0.0058), fontStyle: "bold", fill: "#fff7ed", listening: false }));
  };
  coil(x0 + LEGW / 2, 28, 0.03, "N₁=400");
  coil(x0 + OW - LEGW / 2, 14, 0.03, "N₂=100");
  // Dây nối ra đế: từ mỗi cuộn xuống hai chốt.
  group.add(ln([x0 + LEGW / 2 - 0.009, bot - 0.03, -0.07, -0.014], "#9a3412", lw * 1.4));
  group.add(ln([x0 + LEGW / 2 + 0.009, bot - 0.03, -0.052, -0.014], "#9a3412", lw * 1.4));
  group.add(ln([x0 + OW - LEGW / 2 - 0.009, bot - 0.03, 0.052, -0.014], "#9a3412", lw * 1.4));
  group.add(ln([x0 + OW - LEGW / 2 + 0.009, bot - 0.03, 0.07, -0.014], "#9a3412", lw * 1.4));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.006), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: { base: { x: 0, y: 0 }, primaryA: { x: m(-0.07), y: m(-BASEH / 2) }, primaryB: { x: m(-0.052), y: m(-BASEH / 2) }, secondaryA: { x: m(0.052), y: m(-BASEH / 2) }, secondaryB: { x: m(0.07), y: m(-BASEH / 2) } },
  };
};
