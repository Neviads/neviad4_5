/* OBJECT-META
{
  "catalog": "Kính ảnh / phim ảnh",
  "title": "Tấm kính ảnh trong khung và cuộn phim ảnh: lớp nhũ tương sẫm màu có vài chấm đen và vệt tia sáng cùng một đoạn phim có lỗ kéo ở hai mép",
  "fill": "#1f2937",
  "anchor": "Tâm tấm kính ảnh.",
  "useWhen": ["Cần tấm kính ảnh và đoạn phim 35 mm có vết đen để nói về phát hiện phóng xạ (Becquerel).", "Cảnh cần vật ghi bức xạ bằng nhũ tương bạc bromua, vẽ cạnh nhau."],
  "avoidWhen": ["Cần máy ảnh hoàn chỉnh có vật kính: dùng may-anh.", "Cần máy đếm bức xạ có tín hiệu số: dùng ong-geiger; kính ảnh chỉ ghi vết, không đọc số."],
  "size": { "width": 0.14, "height": 0.1 },
  "parts": [],
  "points": [
    { "name": "plate", "description": "Tâm tấm kính ảnh." },
    { "name": "film", "description": "Tâm đoạn phim bên phải." }
  ],
  "notes": "Kính ảnh 0,08 m × 0,06 m phủ nhũ tương bạc bromua trong khung gỗ; phim ảnh 35 mm bên phải dài 0,05 m. Hạt hoặc tia sáng làm đen nhũ tương sau khi hiện hình, nên vết đen cho biết nơi bức xạ tới (Becquerel phát hiện phóng xạ). fill là màu nền nhũ tương."
}
*/
const makePhotographicPlate = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const px = -0.026;
  const PW = 0.08;
  const PH = 0.06;

  // Kính ảnh trong khung gỗ: bóng đổ, viền gỗ vân, kính tối với nhũ tương.
  group.add(new Konva.Rect({ x: m(px - PW / 2 - 0.006), y: m(-PH / 2 - 0.006), width: m(PW + 0.012), height: m(PH + 0.012), cornerRadius: m(0.003), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(PW + 0.012), y: m(PH + 0.012) }, fillLinearGradientColorStops: [0, "#d6a15a", 0.5, "#a16207", 1, "#5a2d0c"], stroke: "#3b1d08", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.5, shadowOffset: { x: m(0.003), y: m(0.005) }, listening: false }));
  group.add(new Konva.Rect({ x: m(px - PW / 2), y: m(-PH / 2), width: m(PW), height: m(PH), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(PW), y: m(PH) }, fillLinearGradientColorStops: [0, "#374151", 0.5, fill, 1, "#030712"], stroke: "#0f172a", strokeWidth: lw, listening: false }));
  // Vết hạt: vài vệt thẳng đậm và chấm, vết lớn màu xám sáng khi hiện hình.
  const trace = (x1: number, y1: number, x2: number, y2: number, w: number, a: number) => group.add(new Konva.Line({ points: [m(px + x1), m(y1), m(px + x2), m(y2)], stroke: `rgba(226,232,240,${a})`, strokeWidth: m(w), lineCap: "round", listening: false }));
  trace(-0.028, -0.018, -0.006, -0.006, 0.0016, 0.7);
  trace(-0.01, 0.02, 0.02, 0.0, 0.001, 0.5);
  trace(0.006, -0.024, 0.026, -0.01, 0.0013, 0.65);
  for (const [dx, dy, r] of [[-0.02, 0.01, 0.0013], [0.012, 0.012, 0.0018], [0.028, -0.002, 0.0011], [-0.006, -0.016, 0.0015], [0.002, 0.0, 0.0022]] as [number, number, number][]) group.add(new Konva.Circle({ x: m(px + dx), y: m(dy), radius: m(r), fill: "#f1f5f9", opacity: 0.85, listening: false }));
  group.add(new Konva.Rect({ x: m(px - PW / 2), y: m(-PH / 2), width: m(PW), height: m(PH), fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(PW), y: m(PH) }, fillLinearGradientColorStops: [0, "rgba(255,255,255,0.28)", 0.28, "rgba(255,255,255,0.05)", 1, "rgba(0,0,0,0)"], listening: false }));
  group.add(new Konva.Line({ points: [m(px - PW / 2 + 0.003), m(-PH / 2 + 0.003), m(px - PW / 2 + 0.003), m(PH / 2 - 0.003)], stroke: "rgba(255,255,255,0.5)", strokeWidth: lw * 1.5, lineCap: "round", listening: false }));

  // Đoạn phim 35 mm cuộn nhẹ ở bên phải: dải nhựa xám với hai hàng lỗ kéo.
  const fx = 0.047;
  group.add(new Konva.Line({ points: [m(fx - 0.012), m(-0.0505), m(fx + 0.012), m(-0.0495), m(fx + 0.014), m(0.0495), m(fx - 0.01), m(0.0505)], closed: true, tension: 0, fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: m(0.026), y: 0 }, fillLinearGradientColorStops: [0, "#1f2937", 0.5, "#4b5563", 1, "#111827"], stroke: "#030712", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, listening: false }));
  for (let i = 0; i < 9; i += 1) {
    const y = -0.043 + i * 0.0108;
    group.add(new Konva.Rect({ x: m(fx - 0.0105), y: m(y), width: m(0.0025), height: m(0.0035), cornerRadius: m(0.0006), fill: "#0b1220", listening: false }));
    group.add(new Konva.Rect({ x: m(fx + 0.0085), y: m(y), width: m(0.0025), height: m(0.0035), cornerRadius: m(0.0006), fill: "#0b1220", listening: false }));
  }
  for (const y of [-0.036, -0.012, 0.012]) group.add(new Konva.Rect({ x: m(fx - 0.0065), y: m(y), width: m(0.0145), height: m(0.0215), fill: "#78350f", stroke: "#0f172a", strokeWidth: lw * 0.6, opacity: 0.85, listening: false }));
  group.add(new Konva.Line({ points: [m(fx - 0.0065), m(-0.0495), m(fx - 0.0065), m(0.0495)], stroke: "rgba(255,255,255,0.35)", strokeWidth: lw * 1.2, listening: false }));
  group.add(new Konva.Text({ x: m(fx - 0.011), y: m(0.0415), width: m(0.024), align: "center", text: "135", fontSize: m(0.0048), fontStyle: "bold", fill: "#facc15", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.054), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { plate: { x: m(px), y: 0 }, film: { x: m(fx), y: 0 } } };
};
