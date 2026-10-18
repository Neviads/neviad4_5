/* OBJECT-META
{
  "catalog": "Pin (đơn, bộ pin trong hộp)",
  "title": "Bộ hai pin AA mắc nối tiếp trong hộp pin nhựa: lò xo tiếp xúc, cực + cực −, hai dây ra có đầu cắm đỏ và đen",
  "fill": "#fbbf24",
  "anchor": "Tâm hộp pin.",
  "useWhen": ["Cần bộ hai pin AA nối tiếp 3 V trong hộp nhựa, có dây đỏ (+) và dây đen (−) ra hai đầu.","Cần nguồn một chiều đơn giản cấp cho mạch có dây cắm."],
  "avoidWhen": ["Cần nguồn một chiều có núm chỉnh điện áp: dùng nguon-mot-chieu.","Cần cặp nhiệt sinh suất điện động: dùng pin-nhiet-dien; vật này luôn gồm hai pin, không phải pin đơn."],
  "size": { "width": 0.194, "height": 0.047 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm hộp pin." },
    { "name": "plus", "description": "Đầu cắm của dây đỏ (cực +)." },
    { "name": "minus", "description": "Đầu cắm của dây đen (cực −)." }
  ],
  "notes": "Hai pin AA 1,5 V (dài 0,05 m, đường kính 0,0145 m) nối tiếp trong hộp dài 0,116 m, suất điện động tổng 3 V; hai dây dẫn dài 0,025 m ra hai đầu. Cực + ở dây đỏ bên phải, cực − ở dây đen bên trái. fill là màu vỏ pin."
}
*/
const makeBatteryHolder = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const HW = 0.058;
  const HH = 0.0235;

  // Dây ra: sợi đồng bọc nhựa lượn nhẹ, đầu cắm chuối kim loại.
  group.add(ln([-HW, 0.004, -HW - 0.012, 0.012, -HW - 0.022, 0.006], "#030712", m(0.0044)));
  group.add(ln([-HW, 0.004, -HW - 0.012, 0.012, -HW - 0.022, 0.006], "#475569", m(0.003)));
  group.add(ln([HW, 0.004, HW + 0.012, 0.012, HW + 0.022, 0.006], "#7f1d1d", m(0.0044)));
  group.add(ln([HW, 0.004, HW + 0.012, 0.012, HW + 0.022, 0.006], "#ef4444", m(0.003)));
  for (const [s, c] of [[-1, "#0f172a"], [1, "#b91c1c"]] as [number, string][]) {
    const x = s * (HW + 0.022);
    group.add(new Konva.Rect({ x: m(s > 0 ? x : x - 0.012), y: m(0.0006), width: m(0.012), height: m(0.0095), cornerRadius: m(0.002), ...lin(0, m(0.0006), 0, m(0.0101), [0, "#fff", 0.4, c, 1, "#000"]), stroke: "#000", strokeWidth: lw * 0.7, listening: false }));
    group.add(new Konva.Rect({ x: m(s > 0 ? x + 0.012 : x - 0.017), y: m(0.0028), width: m(0.005), height: m(0.005), ...lin(0, m(0.0028), 0, m(0.0078), steel), listening: false }));
  }

  // Hộp pin nhựa đen có thành, nắp hở nhìn thấy khay.
  group.add(new Konva.Rect({ x: m(-HW), y: m(-HH), width: m(HW * 2), height: m(HH * 2), cornerRadius: m(0.004), ...lin(0, m(-HH), 0, m(HH), [0, "#6b7280", 0.2, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.5, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-HW + 0.004), y: m(-HH + 0.004), width: m(HW * 2 - 0.008), height: m(HH * 2 - 0.008), cornerRadius: m(0.002), fill: "#0b1220", stroke: "#374151", strokeWidth: lw * 0.8, listening: false }));
  group.add(ln([-HW + 0.006, -HH + 0.0015, HW - 0.006, -HH + 0.0015], "rgba(255,255,255,0.3)", lw * 1.3));
  // Lò xo tiếp xúc bên cực − (trái) và tấm kim loại bên cực + (phải).
  for (let i = 0; i < 4; i += 1) group.add(ln([-HW + 0.0045, -0.011 + i * 0.0045, -HW + 0.0105, -0.0088 + i * 0.0045], "#cbd5e1", lw * 1.3));
  group.add(new Konva.Rect({ x: m(HW - 0.0085), y: m(-0.0115), width: m(0.0035), height: m(0.023), fill: "#e2e8f0", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));

  // Hai pin AA: thân vàng có vạch đen, chỏm + có núm, đáy − phẳng bằng thép.
  const cell = (x0: number) => {
    group.add(new Konva.Rect({ x: m(x0 - 0.026), y: m(-0.0075), width: m(0.0035), height: m(0.015), ...lin(0, m(-0.0075), 0, m(0.0075), steel), listening: false }));
    group.add(new Konva.Rect({ x: m(x0 - 0.0235), y: m(-0.0073), width: m(0.0467), height: m(0.0146), cornerRadius: m(0.0015), ...lin(0, m(-0.0073), 0, m(0.0073), [0, "#fef3c7", 0.25, fill, 0.7, "#b45309", 1, "#451a03"]), stroke: "#451a03", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Rect({ x: m(x0 - 0.0235), y: m(-0.0073), width: m(0.012), height: m(0.0146), fill: "#111827", listening: false }));
    group.add(new Konva.Rect({ x: m(x0 + 0.0215), y: m(-0.0045), width: m(0.0035), height: m(0.009), cornerRadius: m(0.001), ...lin(0, m(-0.0045), 0, m(0.0045), steel), stroke: "#475569", strokeWidth: lw * 0.5, listening: false }));
    group.add(ln([x0 - 0.0235, -0.0049, x0 + 0.0232, -0.0049], "rgba(255,255,255,0.5)", lw * 1.1));
    group.add(new Konva.Text({ x: m(x0 - 0.0105), y: m(-0.0034), text: "AA  1,5 V", fontSize: m(0.0056), fontStyle: "bold", fill: "#451a03", listening: false }));
    group.add(new Konva.Text({ x: m(x0 + 0.0152), y: m(-0.0031), text: "+", fontSize: m(0.006), fontStyle: "bold", fill: "#f8fafc", listening: false }));
  };
  cell(-0.0285);
  cell(0.0285);
  group.add(new Konva.Text({ x: m(-HW + 0.0045), y: m(-HH + 0.0045), text: "−", fontSize: m(0.0075), fontStyle: "bold", fill: "#60a5fa", listening: false }));
  group.add(new Konva.Text({ x: m(HW - 0.0105), y: m(-HH + 0.0045), text: "+", fontSize: m(0.0075), fontStyle: "bold", fill: "#f87171", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.03), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, plus: { x: m(HW + 0.034), y: m(0.0054) }, minus: { x: m(-HW - 0.034), y: m(0.0054) } } };
};
