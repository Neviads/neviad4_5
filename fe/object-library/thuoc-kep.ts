/* OBJECT-META
{
  "catalog": "Thước kẹp (thước cặp)",
  "title": "Thước kẹp du xích 1/10 mm: hàm cố định, hàm động có du xích, vít hãm và núm lăn",
  "fill": "#cbd5e1",
  "anchor": "Mặt đo của hàm cố định, ở mép dưới thân thước (hàm đo ngoài chĩa xuống).",
  "useWhen": ["Cần thước kẹp du xích 1/10 mm đo đường kính ngoài, đường kính trong hay chiều sâu vật nhỏ.","Cần thước chính chia mm tới 180 mm và du xích 10 vạch dài 9 mm để tập đọc sai số 0,1 mm."],
  "avoidWhen": ["Cần panme (độ chính xác 0,01 mm, có tang quay): dùng panme.","Cần thước thẳng 30 cm đo độ dài thông thường: dùng thuoc-thang.","Hai hàm đo ngoài chĩa xuống, chưa có hiển thị số điện tử."],
  "size": {
    "width": 0.208,
    "height": 0.098
  },
  "parts": [
    {
      "name": "jaw",
      "label": "Hàm động",
      "motion": "slide",
      "axis": "right",
      "min": 0,
      "max": 0.06,
      "description": "Độ mở của hai hàm đo ngoài (mét); du xích, vít hãm, núm lăn và thanh đo sâu đi theo."
    }
  ],
  "points": [
    {
      "name": "fixedFace",
      "description": "Mặt đo của hàm cố định (ngoài)."
    },
    {
      "name": "movingFace",
      "description": "Mặt đo của hàm động khi khép (cùng x với fixedFace); đọc độ mở = jaw."
    },
    {
      "name": "scaleZero",
      "description": "Vạch 0 của thước chính."
    }
  ],
  "notes": "Thước chính chia mm tới 180 mm, du xích 10 vạch dài 9 mm nên đọc được 0,1 mm. Hai hàm đo ngoài chĩa xuống, hai hàm nhỏ đo trong chĩa lên ở đầu trái. fill là màu thép của thân."
}
*/
const makeVernierCaliper = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const BEAM_LEN = 0.2;
  const BEAM_H = 0.022;
  const JAW_LEN = 0.05;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0012));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#f8fafc", 0.15, fill, 0.6, "#94a3b8", 1, "#64748b"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });

  const group = new Konva.Group({ x: p.x, y: p.y });

  // Thân thước chính nằm ngang trên mặt đo; hàm cố định chĩa xuống ở đầu trái, hàm đo trong chĩa lên.
  group.add(new Konva.Rect({ x: 0, y: m(-BEAM_H), width: m(BEAM_LEN), height: m(BEAM_H), ...lin(0, m(-BEAM_H), 0, 0, steel), stroke: "#334155", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.35, shadowOffset: { x: 0, y: m(0.003) }, listening: false }));
  group.add(new Konva.Line({ points: [0, 0, 0, m(JAW_LEN), m(0.011), m(JAW_LEN), m(0.011), m(0.012), m(0.014), 0].map((v) => v), closed: true, ...lin(0, 0, m(0.014), 0, steel), stroke: "#334155", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: [0, m(-BEAM_H), m(-0.002), m(-BEAM_H - 0.026), m(0.005), m(-BEAM_H - 0.026), m(0.009), m(-BEAM_H)], closed: true, ...lin(0, 0, m(0.009), 0, steel), stroke: "#334155", strokeWidth: lw, listening: false }));
  // Thước chính chia mm: số mỗi cm.
  for (let mm = 0; mm <= 180; mm += 1) {
    const x = mm / 1000 + 0.012;
    const major = mm % 10 === 0;
    const half = mm % 5 === 0;
    group.add(ln([x, -BEAM_H, x, -BEAM_H + (major ? 0.0095 : half ? 0.0068 : 0.0045)], "#0f172a", major ? lw * 1.1 : lw * 0.6));
    if (major && mm % 20 === 0) group.add(new Konva.Text({ x: m(x - 0.007), y: m(-BEAM_H + 0.011), width: m(0.014), align: "center", text: String(mm / 10), fontSize: m(0.0058), fontStyle: "bold", fill: "#0f172a", listening: false }));
  }

  // BỘ PHẬN TRƯỢT: hàm động và đầu trượt. Gốc nhóm là mặt đo khi hai hàm khép.
  const jaw = new Konva.Group({ x: 0, y: 0 });
  // Hàm động đo ngoài.
  jaw.add(new Konva.Line({ points: [0, 0, 0, m(JAW_LEN), m(0.011), m(JAW_LEN), m(0.011), m(0.012), m(0.014), 0].map((v) => v), closed: true, ...lin(0, 0, m(0.014), 0, steel), stroke: "#334155", strokeWidth: lw, listening: false }));
  jaw.add(new Konva.Rect({ x: m(0.0085), y: m(-0.024), width: m(0.011), height: m(0.014), ...lin(0, 0, m(0.011), 0, steel), stroke: "#334155", strokeWidth: lw, listening: false }));
  // Thân đầu trượt ôm lấy thước chính, có cửa sổ du xích.
  jaw.add(new Konva.Rect({ x: m(0.002), y: m(-0.031), width: m(0.062), height: m(0.04), cornerRadius: m(0.003), ...lin(0, m(-0.031), 0, m(0.009), steel), stroke: "#334155", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.3, listening: false }));
  jaw.add(new Konva.Rect({ x: m(0.006), y: m(-0.0225), width: m(0.047), height: m(0.011), fill: "#fefce8", stroke: "#a16207", strokeWidth: lw * 0.6, listening: false }));
  // Du xích: 10 vạch cách nhau 0,9 mm, vạch 0 trùng điểm neo.
  for (let i = 0; i <= 10; i += 1) {
    const x = 0.006 + i * 0.0009 * 5;
    jaw.add(ln([x, -0.0225, x, -0.0225 + (i % 5 === 0 ? 0.0075 : 0.0052)], "#0f172a", lw * (i % 5 === 0 ? 1 : 0.7)));
  }
  jaw.add(new Konva.Text({ x: m(0.0035), y: m(-0.0135), text: "0", fontSize: m(0.0048), fontStyle: "bold", fill: "#0f172a", listening: false }));
  jaw.add(new Konva.Text({ x: m(0.0505), y: m(-0.0135), text: "10", fontSize: m(0.0048), fontStyle: "bold", fill: "#0f172a", listening: false }));
  // Vít hãm và núm lăn ngón cái.
  jaw.add(new Konva.Rect({ x: m(0.046), y: m(-0.044), width: m(0.012), height: m(0.012), cornerRadius: m(0.002), ...lin(m(0.046), 0, m(0.058), 0, [0, "#475569", 0.5, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  jaw.add(new Konva.Circle({ x: m(0.026), y: m(-0.039), radius: m(0.0085), ...lin(m(0.0175), 0, m(0.0345), 0, [0, "#334155", 0.45, "#f1f5f9", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 12; i += 1) {
    const a = (i * Math.PI * 2) / 12;
    jaw.add(ln([0.026 + 0.0072 * Math.cos(a), -0.039 + 0.0072 * Math.sin(a), 0.026 + 0.0088 * Math.cos(a), -0.039 + 0.0088 * Math.sin(a)], "#0f172a", lw * 0.7));
  }
  // Thanh đo sâu nhô ra bên phải thân thước.
  jaw.add(new Konva.Rect({ x: m(0.064), y: m(-0.011), width: m(BEAM_LEN - 0.064 + 0.006), height: m(0.0036), fill: "#94a3b8", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  group.add(jaw);

  if (label) {
    group.add(new Konva.Text({ x: m(0.016), y: m(0.058), text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { jaw: { node: jaw, motion: "slide" as const, axis: "right" as const, min: 0, max: 0.06 } },
    points: { fixedFace: { x: 0, y: m(JAW_LEN / 2) }, movingFace: { x: 0, y: m(JAW_LEN / 2) }, scaleZero: { x: m(0.012), y: m(-BEAM_H) } },
  };
};
