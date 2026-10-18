/* OBJECT-META
{
  "catalog": "Quả bóng bay",
  "title": "Quả bóng bay cao su buộc nút ở miệng: bóng xẹp thành quả lê nhỏ và phồng dần thành quả trứng lớn khi bơm khí, có vệt phản chiếu và vân căng",
  "fill": "#ef4444",
  "anchor": "Miệng bóng, chỗ buộc nút.",
  "useWhen": ["Cần quả bóng bay cao su buộc nút, có tham số độ phồng để thể hiện bơm khí, thể tích tăng.","Cần bóng xẹp dần phồng thành hình trứng."],
  "avoidWhen": ["Cần bóng đá có hoạ tiết da: dùng qua-bong; cần khinh khí cầu có giỏ: dùng khinh-khi-cau.","Bóng bay không có dây giữ, không kèm bơm hay bình chứa khí."],
  "size": { "width": 0.06, "height": 0.106 },
  "parts": [
    { "name": "inflate", "label": "Độ phồng", "motion": "slide", "axis": "up", "min": 0, "max": 0.04, "description": "Mức bơm phồng, mét: bán kính bóng bằng 0,03 m cộng giá trị này; 0 là bóng nhỏ, 0,04 là bóng căng hết cỡ." }
  ],
  "points": [
    { "name": "mouth", "description": "Chỗ buộc nút ở miệng bóng." },
    { "name": "center", "description": "Tâm quả bóng ở cỡ nhỏ nhất." }
  ],
  "notes": "Bóng tròn nở từ bán kính 0,03 m đến 0,07 m, chiều cao gần 1,12 lần chiều rộng; nút buộc ở dưới bằng dây chỉ ngắn. Khi bơm, thể tích khí tăng, màng cao su mỏng đi và sáng hơn. fill là màu cao su."
}
*/
const makeBalloon = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // BỘ PHẬN TRƯỢT: nhóm rỗng giữ mức bơm; bán kính đọc từ độ cao của nhóm này.
  const inflate = new Konva.Group({ x: 0, y: 0 });
  const rad = () => 0.03 + Math.min(0.04, Math.max(0, -(inflate.y() || 0) / ppm));
  const body = (ctx: Konva.Context, r: number, dx = 0, dy = 0) => {
    const h = r * 1.12;
    const by = -0.006 + dy;
    ctx.beginPath();
    ctx.moveTo(m(dx), m(by));
    ctx.bezierCurveTo(m(dx + r * 0.25), m(by - h * 0.3), m(dx + r * 1.05), m(by - h * 0.45), m(dx + r), m(by - h * 1.0));
    ctx.bezierCurveTo(m(dx + r * 0.95), m(by - h * 1.62), m(dx + r * 0.35), m(by - h * 2.02), m(dx), m(by - h * 2.02));
    ctx.bezierCurveTo(m(dx - r * 0.35), m(by - h * 2.02), m(dx - r * 0.95), m(by - h * 1.62), m(dx - r), m(by - h * 1.0));
    ctx.bezierCurveTo(m(dx - r * 1.05), m(by - h * 0.45), m(dx - r * 0.25), m(by - h * 0.3), m(dx), m(by));
    ctx.closePath();
  };
  // Bóng đổ nhẹ, thân màu chính, vùng tối bên phải/dưới và vệt sáng.
  group.add(new Konva.Shape({ fill: "rgba(0,0,0,0.25)", listening: false, sceneFunc: (ctx, shape) => { body(ctx, rad(), 0.004, 0.004); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Shape({ fill, stroke: "#7f1d1d", strokeWidth: lw * 1.1, lineJoin: "round", listening: false, sceneFunc: (ctx, shape) => { body(ctx, rad()); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Shape({ fill: "rgba(127,29,29,0.5)", listening: false, sceneFunc: (ctx, shape) => { const r = rad(); body(ctx, r * 0.96, r * 0.1, r * 0.04); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Shape({ fill, listening: false, sceneFunc: (ctx, shape) => { const r = rad(); body(ctx, r * 0.9, -r * 0.07, -r * 0.03); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Shape({ fill: "rgba(255,255,255,0.28)", listening: false, sceneFunc: (ctx, shape) => { const r = rad(); body(ctx, r * 0.42, -r * 0.28, -r * 0.78); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Shape({ fill: "rgba(255,255,255,0.8)", listening: false, sceneFunc: (ctx, shape) => { const r = rad(); ctx.beginPath(); ctx.ellipse(m(-r * 0.42), m(-0.006 - r * 1.35), m(r * 0.1), m(r * 0.22), -0.4, 0, Math.PI * 2, false); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Shape({ fill: "#fff", listening: false, sceneFunc: (ctx, shape) => { const r = rad(); ctx.beginPath(); ctx.arc(m(-r * 0.3), m(-0.006 - r * 1.75), m(0.0032), 0, Math.PI * 2, false); ctx.fillStrokeShape(shape); } }));
  group.add(inflate);
  group.add(new Konva.Rect({ x: m(-0.03), y: m(-0.078), width: m(0.06), height: m(0.106), fill: "rgba(0,0,0,0)", listening: false }));

  // Miệng bóng thắt nút: cổ ngắn, nút tròn, hai đầu dây buộc.
  group.add(new Konva.Line({ points: [m(-0.0055), m(-0.012), m(-0.0035), m(-0.0035), m(0), m(0.001), m(0.0035), m(-0.0035), m(0.0055), m(-0.012)], closed: true, tension: 0.4, fill, stroke: "#7f1d1d", strokeWidth: lw, lineJoin: "round", listening: false }));
  group.add(new Konva.Ellipse({ x: 0, y: m(-0.0015), radiusX: m(0.0058), radiusY: m(0.0042), fill: "#b91c1c", stroke: "#7f1d1d", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Ellipse({ x: m(-0.0015), y: m(-0.0025), radiusX: m(0.0018), radiusY: m(0.0012), fill: "rgba(255,255,255,0.45)", listening: false }));
  group.add(ln([0, 0.0025, -0.003, 0.012, -0.0015, 0.021], "#e2e8f0", lw * 0.6));
  group.add(ln([0, 0.0025, 0.004, 0.011, 0.0028, 0.02], "#e2e8f0", lw * 0.6));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.034), width: m(0.12), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { inflate: { node: inflate, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.04 } },
    points: { mouth: { x: 0, y: 0 }, center: { x: 0, y: m(-0.006 - 0.03 * 1.12 * 1.01) } },
  };
};
