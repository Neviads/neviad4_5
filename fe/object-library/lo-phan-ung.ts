/* OBJECT-META
{
  "catalog": "Lò phản ứng (thanh nhiên liệu, thanh điều khiển)",
  "title": "Mô hình lò phản ứng hạt nhân mặt cắt: bể chất làm chậm trong vỏ bê tông, các thanh nhiên liệu uranium, thanh điều khiển cadmi hạ từ trên xuống và ống dẫn nước làm mát",
  "fill": "#38bdf8",
  "anchor": "Giữa đáy lò, chạm mặt bàn.",
  "useWhen": ["Cần mô hình lò phản ứng hạt nhân mặt cắt với 5 thanh nhiên liệu UO₂ và 4 thanh điều khiển rút được 0,05 m.", "Cảnh cần nước làm mát vào trái, ra phải và điều chỉnh công suất bằng thanh điều khiển."],
  "avoidWhen": ["Cần mô hình hạt nhân hay phản ứng phân hạch từng hạt: dùng hat-nhan-nang, neutron.", "Cần nhà máy điện có tuabin, máy phát: vật này chỉ vẽ lò, không có tuabin."],
  "size": { "width": 0.196, "height": 0.15 },
  "parts": [
    { "name": "rod", "label": "Thanh điều khiển", "motion": "slide", "axis": "up", "min": 0, "max": 0.05, "description": "Độ rút các thanh điều khiển lên khỏi vùng nhiên liệu, mét; 0 là cắm sâu hết (hấp thụ nhiều nơtron, phản ứng yếu), lớn là rút ra (nhiều nơtron hơn, phản ứng mạnh)." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy lò." },
    { "name": "core", "description": "Tâm vùng hoạt (nhiên liệu)." },
    { "name": "coolantIn", "description": "Ống nước làm mát vào, bên trái." },
    { "name": "coolantOut", "description": "Ống nước làm mát ra, bên phải." }
  ],
  "notes": "Vỏ bê tông dày 0,012 m bao thùng thép 0,1 m × 0,1 m chứa nước làm chậm nơtron; vùng hoạt có 5 thanh nhiên liệu UO₂ (vàng) xen 4 thanh điều khiển cadmi/bo (xám sẫm) có thể rút lên 0,05 m để điều chỉnh công suất. Nước làm mát vào bên trái, ra bên phải. fill là màu nước làm mát."
}
*/
const makeReactor = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const OW = 0.13;
  const OH = 0.12;
  const IW = 0.1;
  const top = -OH - 0.012;
  const cx0 = -IW / 2;
  const iTop = top + 0.012;
  const IH = OH - 0.012;
  const vr = (x: number, y: number, w: number, h: number, stops: (number | string)[], r = 0.001, st = "#0f172a") => new Konva.Rect({ x: m(x), y: m(y), width: m(w), height: m(h), cornerRadius: m(r), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(w), y: 0 }, fillLinearGradientColorStops: stops, stroke: st, strokeWidth: lw * 0.8, listening: false });

  // Vỏ bê tông có vân đá và dải cảnh báo ở chân.
  group.add(new Konva.Rect({ x: m(-OW / 2), y: m(top), width: m(OW), height: m(OH), cornerRadius: m(0.004), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(OW), y: m(OH) }, fillLinearGradientColorStops: [0, "#d6d3d1", 0.5, "#a8a29e", 1, "#57534e"], stroke: "#292524", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.5, shadowOffset: { x: m(0.002), y: m(0.005) }, listening: false }));
  for (let i = 0; i < 14; i += 1) group.add(new Konva.Circle({ x: m(-OW / 2 + 0.006 + (i * 0.0173) % (OW - 0.012)), y: m(top + 0.005 + ((i * 7) % 11) * 0.0095), radius: m(0.0012), fill: "rgba(68,64,60,0.35)", listening: false }));
  for (let i = 0; i < 10; i += 1) group.add(new Konva.Rect({ x: m(-OW / 2 + i * 0.013), y: m(-0.008), width: m(0.0065), height: m(0.008), fill: i % 2 ? "#facc15" : "#111827", listening: false }));
  // Thùng thép bên trong, nước làm chậm.
  group.add(new Konva.Rect({ x: m(cx0 - 0.003), y: m(iTop - 0.003), width: m(IW + 0.006), height: m(IH - 0.007), cornerRadius: m(0.002), fill: "#334155", stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(cx0), y: m(iTop), width: m(IW), height: m(IH - 0.013), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(IH) }, fillLinearGradientColorStops: [0, "rgba(125,211,252,0.6)", 1, "rgba(3,105,161,0.88)"], listening: false }));
  group.add(new Konva.Rect({ x: m(cx0), y: m(iTop - 0.0006), width: m(IW), height: m(0.0022), fill: "rgba(224,242,254,0.95)", listening: false }));
  for (const [x, y] of [[-0.03, -0.05], [0.026, -0.065], [-0.012, -0.095], [0.035, -0.09]] as [number, number][]) group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(0.0014), fill: "rgba(255,255,255,0.4)", stroke: "rgba(255,255,255,0.7)", strokeWidth: lw * 0.5, listening: false }));
  // Thanh nhiên liệu: năm thanh UO2 vàng có vành ở hai đầu.
  const fx = [-0.036, -0.018, 0, 0.018, 0.036];
  for (const x of fx) {
    group.add(vr(x - 0.004, -0.0925, 0.008, 0.077, [0, "#a16207", 0.35, "#facc15", 0.6, "#ca8a04", 1, "#713f12"], 0.002, "#713f12"));
    group.add(new Konva.Line({ points: [m(x - 0.0027), m(-0.09), m(x - 0.0027), m(-0.018)], stroke: "rgba(255,255,255,0.55)", strokeWidth: lw * 1.1, lineCap: "round", listening: false }));
    group.add(vr(x - 0.0048, -0.0955, 0.0096, 0.004, steel, 0.0008, "#334155"));
    group.add(vr(x - 0.0048, -0.0215, 0.0096, 0.004, steel, 0.0008, "#334155"));
  }
  // Biểu tượng hạt nhân U trên thanh giữa.
  group.add(new Konva.Text({ x: m(-0.0075), y: m(-0.058), width: m(0.015), align: "center", text: "U", fontSize: m(0.0072), fontStyle: "bold", fill: "#451a03", listening: false }));
  // Ống làm mát vào bên trái và ra bên phải, mặt trước có mũi tên.
  for (const s of [-1, 1]) {
    group.add(vr(s * (OW / 2) + (s > 0 ? 0 : -0.026), -0.034, 0.026, 0.01, [0, "#cbd5e1", 0.4, "#475569", 1, "#1e293b"], 0.002, "#0f172a"));
    group.add(vr(s * (OW / 2) + (s > 0 ? 0.026 : -0.032), -0.036, 0.006, 0.014, steel, 0.001, "#334155"));
    group.add(new Konva.Arrow({ points: [m(s * (OW / 2 + (s > 0 ? 0.022 : -0.022)) - s * 0.012), m(-0.0295), m(s * (OW / 2 + (s > 0 ? 0.022 : -0.022)) + s * 0.012), m(-0.0295)], stroke: s < 0 ? "#38bdf8" : "#fb923c", fill: s < 0 ? "#38bdf8" : "#fb923c", strokeWidth: lw * 1.3, pointerLength: m(0.004), pointerWidth: m(0.0035), listening: false }));
  }

  // BỘ PHẬN TRƯỢT: bốn thanh điều khiển xám sẫm có dải sọc vàng–đen, treo từ thanh ngang phía trên.
  const rod = new Konva.Group();
  for (const x of [-0.027, -0.009, 0.009, 0.027]) {
    rod.add(vr(x - 0.0033, -0.0935, 0.0066, 0.07, [0, "#1e293b", 0.4, "#64748b", 1, "#0b1220"], 0.0015, "#020617"));
    for (let k = 0; k < 4; k += 1) rod.add(new Konva.Rect({ x: m(x - 0.0033), y: m(-0.0905 + k * 0.016), width: m(0.0066), height: m(0.003), fill: "#facc15", opacity: 0.85, listening: false }));
    rod.add(vr(x - 0.0007, top - 0.0035, 0.0014, -0.0935 - top + 0.0035, steel, 0, "#334155"));
  }
  rod.add(vr(-0.034, top - 0.012, 0.068, 0.009, [0, "#475569", 0.4, "#e2e8f0", 1, "#334155"], 0.002, "#0f172a"));
  group.add(rod);
  group.add(new Konva.Rect({ x: m(-0.012), y: m(top - 0.018), width: m(0.024), height: m(0.006), cornerRadius: m(0.002), fill: "#374151", stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.006), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { rod: { node: rod, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.05 } },
    points: { base: { x: 0, y: 0 }, core: { x: 0, y: m(-0.055) }, coolantIn: { x: m(-OW / 2 - 0.026), y: m(-0.029) }, coolantOut: { x: m(OW / 2 + 0.026), y: m(-0.029) } },
  };
};
