/* OBJECT-META
{
  "catalog": "Buồng sương Wilson / Blackett",
  "title": "Buồng sương Wilson: hộp thuỷ tinh tròn chứa hơi bão hoà, vài vệt sương thẳng và cong của hạt, pít tông giãn nở bằng cao su ở đáy và đèn rọi",
  "fill": "#bae6fd",
  "anchor": "Giữa đáy buồng, chạm mặt bàn.",
  "useWhen": ["Cần buồng sương Wilson có hơi cồn bão hoà, vệt sương hạt và pít tông giãn nở cao su.","Cần minh hoạ phát hiện hạt alpha, beta qua vệt sương trong buồng thuỷ tinh tròn."],
  "avoidWhen": ["Cần mô hình hạt riêng lẻ: dùng hat-alpha hoặc hat-beta.","Chỉ vẽ vài vệt minh hoạ, không mô phỏng quỹ đạo đầy đủ trong từ trường.","Không phải ống đếm Geiger, không có số đếm."],
  "size": { "width": 0.09, "height": 0.116 },
  "parts": [
    { "name": "piston", "label": "Pít tông giãn nở", "motion": "slide", "axis": "down", "min": 0, "max": 0.03, "description": "Độ kéo pít tông xuống dưới, mét; kéo nhanh làm hơi giãn nở đoạn nhiệt, bão hoà quá mức và hiện vệt sương dọc đường hạt." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy buồng." },
    { "name": "chamber", "description": "Tâm khoảng không gian quan sát." },
    { "name": "source", "description": "Đầu kim mang nguồn phóng xạ ở mép buồng." }
  ],
  "notes": "Buồng trụ thuỷ tinh đường kính 0,08 m, cao 0,05 m chứa hơi cồn bão hoà trên mặt đen; các vệt sương (đường tia hạt alpha thẳng ngắn đậm, tia beta mảnh cong) do cảnh vẽ, hình vẽ chỉ minh hoạ vài vệt. Nguồn phóng xạ nằm ở đầu kim bên trái. fill là màu thuỷ tinh."
}
*/
const makeCloudChamber = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const R = 0.04;
  const top = -0.098;
  const bot = -0.044;
  const cy = (top + bot) / 2;

  // Chân đế tròn và vành kim loại phía dưới buồng.
  group.add(new Konva.Rect({ x: m(-0.043), y: m(-0.014), width: m(0.086), height: m(0.014), cornerRadius: m(0.003), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(0.014) }, fillLinearGradientColorStops: [0, "#9ca3af", 0.4, "#1f2937", 1, "#030712"], stroke: "#000", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.45, listening: false }));
  group.add(new Konva.Rect({ x: m(-R - 0.003), y: m(bot - 0.004), width: m(R * 2 + 0.006), height: m(0.01), cornerRadius: m(0.002), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(R * 2 + 0.006), y: 0 }, fillLinearGradientColorStops: [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"], stroke: "#334155", strokeWidth: lw, listening: false }));

  // BỘ PHẬN TRƯỢT: pít tông ở dưới buồng gồm màng cao su đen và cần kéo.
  const piston = new Konva.Group();
  piston.add(new Konva.Rect({ x: m(-0.004), y: m(bot + 0.006), width: m(0.008), height: m(0.03 - 0.0), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(0.008), y: 0 }, fillLinearGradientColorStops: [0, "#64748b", 0.4, "#f8fafc", 1, "#475569"], stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  piston.add(new Konva.Rect({ x: m(-R + 0.002), y: m(bot - 0.003), width: m((R - 0.002) * 2), height: m(0.006), cornerRadius: m(0.002), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(0.006) }, fillLinearGradientColorStops: [0, "#374151", 1, "#030712"], stroke: "#000", strokeWidth: lw * 0.7, listening: false }));
  piston.add(new Konva.Rect({ x: m(-0.012), y: m(bot + 0.024), width: m(0.024), height: m(0.005), cornerRadius: m(0.0015), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(0.024), y: 0 }, fillLinearGradientColorStops: [0, "#475569", 0.4, "#e2e8f0", 1, "#334155"], stroke: "#1e293b", strokeWidth: lw * 0.7, listening: false }));
  group.add(piston);

  // Thân buồng: trụ thuỷ tinh dày, lòng tối, mặt đáy đen, nắp thuỷ tinh phía trên.
  group.add(new Konva.Rect({ x: m(-R), y: m(top), width: m(R * 2), height: m(bot - top), cornerRadius: m(0.003), fill: "#0b1220", stroke: "rgba(226,240,252,0.95)", strokeWidth: m(0.0028), shadowColor: "#7dd3fc", shadowBlur: m(0.01), shadowOpacity: 0.35, listening: false }));
  group.add(new Konva.Rect({ x: m(-R + 0.0028), y: m(top + 0.0028), width: m((R - 0.0028) * 2), height: m(bot - top - 0.0056), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: 0, y: m(bot - top) }, fillLinearGradientColorStops: [0, "rgba(125,211,252,0.1)", 1, "rgba(186,230,253,0.28)"], listening: false }));
  group.add(new Konva.Rect({ x: m(-R + 0.0028), y: m(bot - 0.004), width: m((R - 0.0028) * 2), height: m(0.0035), fill: "#020617", listening: false }));

  // Kim mang nguồn phóng xạ cắm vào buồng từ bên trái.
  group.add(new Konva.Line({ points: [m(-R - 0.012), m(cy + 0.004), m(-R + 0.0035), m(cy + 0.004)], stroke: "#94a3b8", strokeWidth: m(0.0022), lineCap: "round", listening: false }));
  group.add(new Konva.Circle({ x: m(-R + 0.0035), y: m(cy + 0.004), radius: m(0.0022), fill: "#86efac", shadowColor: "#4ade80", shadowBlur: m(0.006), shadowOpacity: 0.9, listening: false }));
  // Vệt sương: tia alpha thẳng, dày, hai tia beta cong mảnh, một tán xạ gập khúc.
  const track = (pts: number[], w: number, a: number) => group.add(new Konva.Line({ points: pts.map(m), stroke: `rgba(241,245,249,${a})`, strokeWidth: w, lineCap: "round", lineJoin: "round", tension: 0.4, shadowColor: "#e0f2fe", shadowBlur: m(0.004), shadowOpacity: 0.9, listening: false }));
  track([-R + 0.0035, cy + 0.004, -0.008, cy + 0.0035, 0.008, cy + 0.002, 0.02, cy + 0.0005], m(0.0016), 0.95);
  track([-R + 0.0035, cy + 0.004, -0.012, cy - 0.001, -0.006, cy - 0.011, -0.003, cy - 0.02], m(0.0009), 0.75);
  track([-R + 0.0035, cy + 0.004, -0.015, cy + 0.012, -0.012, cy + 0.02, -0.004, cy + 0.024], m(0.0009), 0.7);
  track([0.02, cy + 0.0005, 0.026, cy - 0.006, 0.03, cy - 0.016], m(0.0012), 0.8);
  track([0.02, cy + 0.0005, 0.03, cy + 0.003, 0.034, cy + 0.008], m(0.0012), 0.55);
  // Phản chiếu thuỷ tinh.
  group.add(new Konva.Line({ points: [m(-R + 0.005), m(top + 0.004), m(-R + 0.005), m(bot - 0.008)], stroke: "rgba(255,255,255,0.5)", strokeWidth: lw * 2, lineCap: "round", listening: false }));
  group.add(new Konva.Ellipse({ x: 0, y: m(top), radiusX: m(R), radiusY: m(0.0045), fill: "rgba(186,230,253,0.35)", stroke: "rgba(226,240,252,0.9)", strokeWidth: lw, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.006), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { piston: { node: piston, motion: "slide" as const, axis: "down" as const, min: 0, max: 0.03 } },
    points: { base: { x: 0, y: 0 }, chamber: { x: 0, y: m(cy) }, source: { x: m(-R + 0.0035), y: m(cy + 0.004) } },
  };
};
