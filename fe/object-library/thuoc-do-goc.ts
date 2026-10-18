/* OBJECT-META
{
  "catalog": "Thước đo góc (bán nguyệt, tròn)",
  "title": "Thước đo góc bán nguyệt bằng nhựa trong, hai hàng số 0–180°, có thước thẳng 15 cm ở đáy",
  "fill": "#bae6fd",
  "anchor": "Tâm thước, giữa cạnh đáy (vạch 0 cm và tâm góc).",
  "useWhen": ["Cần thước đo góc bán nguyệt nhựa trong chia 1°, hai hàng số 0–180°, có điểm tâm, vạch 0, 90°, 180°.","Cần đặt thước vào cảnh để đọc góc tới, góc phản xạ hay góc khúc xạ."],
  "avoidWhen": ["Cần thước thẳng đo độ dài thuần: dùng thuoc-thang; thước này chỉ có thước nhỏ 15 cm ở đáy.","Cần đo độ dài bằng du xích 0,1 mm: dùng thuoc-kep.","Chỉ là thước bán nguyệt, không phải thước tròn đủ 360°."],
  "size": {
    "width": 0.15,
    "height": 0.18
  },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Tâm góc của thước."
    },
    {
      "name": "zero",
      "description": "Vạch 0° ở đầu phải của cạnh đáy."
    },
    {
      "name": "d90",
      "description": "Vạch 90° ở đỉnh cung."
    },
    {
      "name": "d180",
      "description": "Vạch 180° ở đầu trái của cạnh đáy."
    }
  ],
  "notes": "Cung chia 1°, vạch dài ở mỗi 10°. Hàng số ngoài tăng từ phải sang trái (0 ở bên phải), hàng số trong ngược lại. Cạnh đáy có thước thẳng chia mm. fill là màu nhựa trong."
}
*/
const makeProtractor = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.075;
  const STRIP = 0.012;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0012));
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const at = (r: number, deg: number): [number, number] => [r * Math.cos((deg * Math.PI) / 180), -r * Math.sin((deg * Math.PI) / 180)];

  const group = new Konva.Group({ x: p.x, y: p.y });

  // Bản nhựa: nửa hình tròn cộng dải thước ở dưới, trong suốt có ánh xanh.
  group.add(new Konva.Wedge({
    x: 0, y: 0, radius: m(R), angle: 180, rotation: 180,
    fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(R),
    fillRadialGradientColorStops: [0, "rgba(248,250,252,0.9)", 0.75, "rgba(226,240,252,0.88)", 1, "rgba(186,220,245,0.9)"],
    stroke: "#e2e8f0", strokeWidth: lw * 1.4, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.003) }, listening: false,
  }));
  group.add(new Konva.Rect({ x: m(-R), y: 0, width: m(2 * R), height: m(STRIP), cornerRadius: [0, 0, m(0.003), m(0.003)], fill: "rgba(226,240,252,0.9)", stroke: "#e2e8f0", strokeWidth: lw * 1.4, listening: false }));

  // Vạch chia: cung 1°, mỗi 5° dài vừa, mỗi 10° dài nhất kèm số ở hai hàng.
  for (let d = 0; d <= 180; d += 1) {
    const major = d % 10 === 0;
    const half = d % 5 === 0;
    const len = major ? 0.0095 : half ? 0.0068 : 0.0045;
    const [x1, y1] = at(R, d);
    const [x2, y2] = at(R - len, d);
    group.add(ln([x1, y1, x2, y2], "#0c4a6e", major ? lw * 1.1 : lw * 0.65));
  }
  for (let d = 10; d <= 170; d += 10) {
    const [ox, oy] = at(R - 0.0155, d);
    const [ix, iy] = at(R - 0.027, d);
    group.add(new Konva.Text({ x: m(ox), y: m(oy), width: m(0.014), offsetX: m(0.007), offsetY: m(0.0035), rotation: 90 - d, align: "center", text: String(d), fontSize: m(0.0068), fontStyle: "bold", fill: "#0c4a6e", listening: false }));
    group.add(new Konva.Text({ x: m(ix), y: m(iy), width: m(0.014), offsetX: m(0.007), offsetY: m(0.0035), rotation: 90 - d, align: "center", text: String(180 - d), fontSize: m(0.0062), fill: "#0369a1", listening: false }));
  }
  group.add(new Konva.Text({ x: m(R - 0.012), y: m(-0.0075), text: "0", fontSize: m(0.0068), fontStyle: "bold", fill: "#0c4a6e", listening: false }));
  group.add(new Konva.Text({ x: m(-R + 0.004), y: m(-0.0075), text: "0", fontSize: m(0.0062), fill: "#0369a1", listening: false }));

  // Tâm góc: vòng tròn nhỏ và chữ thập, cùng vạch dựng đứng ở 90°.
  group.add(new Konva.Circle({ x: 0, y: 0, radius: m(0.0042), stroke: "#0c4a6e", strokeWidth: lw, listening: false }));
  group.add(ln([-0.012, 0, 0.012, 0], "#0c4a6e", lw * 0.8));
  group.add(ln([0, -0.012, 0, 0.003], "#0c4a6e", lw * 0.8));
  // Thước thẳng chia mm ở dải đáy.
  for (let mm = 0; mm <= 150; mm += 1) {
    const x = -R + mm / 1000;
    const cm = mm % 10 === 0;
    group.add(ln([x, STRIP, x, STRIP - (cm ? 0.0058 : mm % 5 === 0 ? 0.0042 : 0.0026)], "#0c4a6e", cm ? lw : lw * 0.55));
  }
  for (let cm = 0; cm <= 15; cm += 3) group.add(new Konva.Text({ x: m(-R + cm / 100 - 0.005), y: m(0.0018), width: m(0.01), align: "center", text: String(cm), fontSize: m(0.0045), fill: "#0c4a6e", listening: false }));
  // Vệt sáng trên mặt nhựa.
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(R - 0.0035), outerRadius: m(R - 0.0015), angle: 40, rotation: 195, fill: "rgba(255,255,255,0.95)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.04), y: m(-0.03), width: m(0.08), align: "center", text: label, fontSize: m(0.009), fill: "#0c4a6e", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, zero: { x: m(R), y: 0 }, d90: { x: 0, y: m(-R) }, d180: { x: m(-R), y: 0 } } };
};
