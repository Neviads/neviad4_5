/* OBJECT-META
{
  "catalog": "Cách tử nhiễu xạ",
  "title": "Cách tử nhiễu xạ truyền qua 600 vạch/mm gắn trong khung slide trên giá: tấm kính có vạch dày và ánh cầu vồng",
  "fill": "#e2e8f0",
  "anchor": "Tâm cách tử, trên trục chính.",
  "useWhen": ["Cần cách tử truyền qua 600 vạch/mm (d ≈ 1,67 µm) gắn khung slide trên giá.","Thí nghiệm nhiễu xạ ánh sáng, chùm tới từ bên trái, vạch đặt thẳng đứng."],
  "avoidWhen": ["Cần nguồn tia sáng song song nhiều tia: dùng den-khe, cách tử không tự phát sáng.","Các cực đại nhiễu xạ không có sẵn trong vật, phải do cảnh vẽ thêm.","Số vạch cố định 600/mm, không đổi chu kì được."],
  "size": { "width": 0.104, "height": 0.149 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm cách tử, trên trục chính." },
    { "name": "holder", "description": "Chân giá đỡ ở mặt bàn." }
  ],
  "notes": "Cách tử dài 0,03 m với 600 vạch/mm; chu kì d = 1/600 mm ≈ 1,67 µm. Mặt kính có ánh cầu vồng do nhiễu xạ, vạch quá dày nên chỉ hiện thành vân sọc mịn trong hình vẽ. Vạch đặt thẳng đứng; chùm sáng tới từ bên trái. Các cực đại nhiễu xạ là hiện tượng do cảnh vẽ. fill là màu khung."
}
*/
const makeDiffractionGrating = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const cy = -0.115;

  // Đế gang, trụ thép và kẹp.
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.006), radiusX: m(0.05), radiusY: m(0.0065), ...lin(m(-0.05), 0, m(0.05), 0, [0, "#475569", 0.3, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.004), y: m(cy + 0.04), width: m(0.008), height: m(-cy - 0.046), ...lin(m(-0.004), 0, m(0.004), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.016), y: m(cy + 0.034), width: m(0.032), height: m(0.012), cornerRadius: m(0.003), ...lin(m(-0.016), 0, m(0.016), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));

  // Khung slide mỏng: viền nhôm anod xám và cửa sổ vuông 3 cm.
  group.add(new Konva.Rect({ x: m(-0.0335), y: m(cy - 0.0335), width: m(0.067), height: m(0.067), cornerRadius: m(0.003), ...lin(m(-0.0335), m(cy - 0.0335), m(0.0335), m(cy + 0.0335), [0, "#f1f5f9", 0.5, fill, 1, "#64748b"]), stroke: "#475569", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0155), y: m(cy - 0.0155), width: m(0.031), height: m(0.031), cornerRadius: m(0.001), fill: "#020617", stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  // Mặt cách tử: nền kính trong và các vạch dày xếp thẳng đứng (đủ dày để hiện vân), ánh cầu vồng chạy chéo.
  group.add(new Konva.Rect({ x: m(-0.0145), y: m(cy - 0.0145), width: m(0.029), height: m(0.029), fill: "rgba(224,242,254,0.5)", listening: false }));
  for (let i = 0; i < 87; i += 1) group.add(new Konva.Line({ points: [m(-0.0145 + (i * 0.029) / 86), m(cy - 0.0145), m(-0.0145 + (i * 0.029) / 86), m(cy + 0.0145)], stroke: "rgba(15,23,42,0.5)", strokeWidth: lw * 0.55, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0145), y: m(cy - 0.0145), width: m(0.029), height: m(0.029), ...lin(m(-0.0145), m(cy - 0.0145), m(0.0145), m(cy + 0.0145), [0, "rgba(239,68,68,0.5)", 0.2, "rgba(250,204,21,0.45)", 0.4, "rgba(34,197,94,0.42)", 0.6, "rgba(56,189,248,0.45)", 0.8, "rgba(129,140,248,0.45)", 1, "rgba(217,70,239,0.45)"]), listening: false }));
  group.add(new Konva.Line({ points: [m(-0.0145), m(cy - 0.0145), m(-0.0005), m(cy - 0.0145), m(-0.0145), m(cy - 0.002)], closed: true, fill: "rgba(255,255,255,0.28)", listening: false }));
  // Nhãn và trục chính.
  group.add(new Konva.Text({ x: m(-0.0335), y: m(cy + 0.0195), width: m(0.067), align: "center", text: "600 /mm", fontSize: m(0.0072), fontStyle: "bold", fill: "#334155", listening: false }));
  group.add(new Konva.Text({ x: m(-0.0335), y: m(cy - 0.0305), width: m(0.067), align: "center", text: "GRATING", fontSize: m(0.0055), fill: "#64748b", listening: false }));
  group.add(new Konva.Line({ points: [m(-0.052), m(cy), m(0.052), m(cy)], stroke: "rgba(251,191,36,0.55)", strokeWidth: lw, dash: [m(0.004), m(0.003)], listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.008), width: m(0.12), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: m(cy) }, holder: { x: 0, y: 0 } } };
};
