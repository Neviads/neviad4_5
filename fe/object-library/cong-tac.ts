/* OBJECT-META
{
  "catalog": "Công tắc / khoá K",
  "title": "Khoá K dạng dao đóng ngắt: đế sứ trắng, hai cực đồng có ốc nối dây, lưỡi dao đồng quay quanh bản lề với tay cầm nhựa đen",
  "fill": "#d6a15a",
  "anchor": "Giữa đáy đế, chạm mặt bàn.",
  "useWhen": ["Cần khoá K dạng dao đóng ngắt có lưỡi dao quay từ -80 độ (hở) đến 0 độ (kín).","Cần công tắc đóng mở mạch điện thí nghiệm với hai cực nối dây."],
  "avoidWhen": ["Cần cầu chì hoặc aptomat bảo vệ mạch: dùng cau-chi.","Cần biến trở thay đổi điện trở: dùng bien-tro; khoá này chỉ đóng hoặc ngắt, không điều chỉnh liên tục."],
  "size": { "width": 0.106, "height": 0.044 },
  "parts": [
    { "name": "blade", "label": "Lưỡi dao", "motion": "rotate", "min": -80, "max": 0, "description": "Góc quay của lưỡi dao quanh bản lề, độ theo chiều kim đồng hồ; 0° là lưỡi nằm ngang ép vào ngàm (mạch kín), âm là nhấc lưỡi lên (mạch hở), tối đa −80°." }
  ],
  "points": [
    { "name": "hinge", "description": "Bản lề quay của lưỡi dao, cực nối dây bên trái." },
    { "name": "contact", "description": "Ngàm tiếp xúc ở cực phải, nơi lưỡi dao ép vào khi đóng." },
    { "name": "handle", "description": "Đầu tay cầm khi khoá đóng." },
    { "name": "base", "description": "Giữa đáy đế." }
  ],
  "notes": "Đế sứ 0,1 m × 0,02 m cao, hai cực cách nhau 0,07 m; lưỡi dao dài 0,068 m, quay từ −80° (hở) đến 0° (kín). Lưỡi dao chỉ dẫn điện khi chạm ngàm ở cực phải. Mạch kín khi 0°. fill là màu đồng của cực và lưỡi dao."
}
*/
const makeKnifeSwitch = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const copper = [0, "#fff7ed", 0.3, fill, 0.7, "#92400e", 1, "#431407"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const HX = -0.035;
  const CX = 0.035;
  const PY = -0.026;

  // Đế sứ trắng có gờ, bóng đổ và hai lỗ bắt vít.
  group.add(new Konva.Rect({ x: m(-0.053), y: m(-0.02), width: m(0.106), height: m(0.02), cornerRadius: m(0.003), ...lin(0, m(-0.02), 0, 0, [0, "#ffffff", 0.4, "#e2e8f0", 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw * 1.1, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(ln([-0.047, -0.0172, 0.047, -0.0172], "rgba(255,255,255,0.8)", lw * 1.3));
  for (const x of [-0.047, 0.047]) group.add(new Konva.Circle({ x: m(x), y: m(-0.01), radius: m(0.0022), fill: "#475569", stroke: "#1e293b", strokeWidth: lw * 0.6, listening: false }));

  // Cực trái (bản lề): trụ đồng, đai có ốc nối dây, hai tai kẹp ôm lưỡi dao.
  group.add(new Konva.Rect({ x: m(HX - 0.0075), y: m(PY + 0.004), width: m(0.015), height: m(-PY - 0.024), cornerRadius: m(0.002), ...lin(m(HX - 0.0075), 0, m(HX + 0.0075), 0, copper), stroke: "#431407", strokeWidth: lw * 0.9, listening: false }));
  group.add(new Konva.Rect({ x: m(HX - 0.011), y: m(-0.032), width: m(0.022), height: m(0.012), cornerRadius: m(0.002), ...lin(m(HX - 0.011), 0, m(HX + 0.011), 0, copper), stroke: "#431407", strokeWidth: lw * 0.9, listening: false }));
  group.add(new Konva.Circle({ x: m(HX), y: m(-0.026), radius: m(0.0042), ...lin(m(HX - 0.004), m(-0.03), m(HX + 0.004), m(-0.022), [0, "#fef3c7", 1, "#78350f"]), stroke: "#431407", strokeWidth: lw * 0.7, listening: false }));
  group.add(ln([HX - 0.003, -0.0262, HX + 0.003, -0.0258], "#431407", lw * 0.8));
  // Ốc nối dây ở phía trên mỗi cực.
  const post = (x: number) => {
    group.add(new Konva.Rect({ x: m(x - 0.0036), y: m(-0.0395), width: m(0.0072), height: m(0.005), ...lin(m(x - 0.0036), 0, m(x + 0.0036), 0, copper), stroke: "#431407", strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.0058), y: m(-0.0435), width: m(0.0116), height: m(0.0045), cornerRadius: m(0.0014), ...lin(m(x - 0.0058), 0, m(x + 0.0058), 0, [0, "#fef3c7", 0.5, "#b45309", 1, "#451a03"]), stroke: "#431407", strokeWidth: lw * 0.6, listening: false }));
    group.add(ln([x, -0.043, x, -0.039], "#1f2937", lw));
  };
  post(HX);
  post(CX);

  // Cực phải: ngàm kẹp chữ U hai má đồng.
  group.add(new Konva.Rect({ x: m(CX - 0.0075), y: m(PY + 0.004), width: m(0.015), height: m(-PY - 0.024), cornerRadius: m(0.002), ...lin(m(CX - 0.0075), 0, m(CX + 0.0075), 0, copper), stroke: "#431407", strokeWidth: lw * 0.9, listening: false }));
  group.add(new Konva.Rect({ x: m(CX - 0.011), y: m(-0.032), width: m(0.022), height: m(0.012), cornerRadius: m(0.002), ...lin(m(CX - 0.011), 0, m(CX + 0.011), 0, copper), stroke: "#431407", strokeWidth: lw * 0.9, listening: false }));
  group.add(new Konva.Rect({ x: m(CX - 0.01), y: m(PY - 0.005), width: m(0.02), height: m(0.0032), fill: "#92400e", stroke: "#431407", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(CX - 0.01), y: m(PY + 0.0025), width: m(0.02), height: m(0.0032), fill: "#92400e", stroke: "#431407", strokeWidth: lw * 0.6, listening: false }));

  // BỘ PHẬN QUAY: lưỡi dao dẹt đồng có lỗ bản lề, tay cầm nhựa đen có khía. Gốc nhóm là tâm bản lề.
  const blade = new Konva.Group({ x: m(HX), y: m(PY) });
  blade.add(new Konva.Rect({ x: m(-0.003), y: m(-0.0045), width: m(0.068), height: m(0.009), cornerRadius: m(0.0015), ...lin(0, m(-0.0045), 0, m(0.0045), [0, "#fff7ed", 0.35, fill, 1, "#7c2d12"]), stroke: "#431407", strokeWidth: lw * 0.9, listening: false }));
  blade.add(ln([0.004, -0.0028, 0.062, -0.0028], "rgba(255,255,255,0.65)", lw * 1.1));
  blade.add(new Konva.Circle({ radius: m(0.003), fill: "#431407", listening: false }));
  blade.add(new Konva.Circle({ radius: m(0.0015), fill: "#fef3c7", listening: false }));
  blade.add(new Konva.Rect({ x: m(0.0615), y: m(-0.0085), width: m(0.0105), height: m(0.017), cornerRadius: m(0.0028), ...lin(0, m(-0.0085), 0, m(0.0085), [0, "#6b7280", 0.35, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.8, listening: false }));
  blade.add(new Konva.Rect({ x: m(0.0638), y: m(-0.0065), width: m(0.0012), height: m(0.013), fill: "rgba(255,255,255,0.28)", listening: false }));
  group.add(blade);
  group.add(new Konva.Text({ x: m(-0.02), y: m(-0.0178), width: m(0.04), align: "center", text: "K", fontSize: m(0.0075), fontStyle: "bold", fill: "#334155", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.006), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { blade: { node: blade, motion: "rotate" as const, min: -80, max: 0 } },
    points: { hinge: { x: m(HX), y: m(PY) }, contact: { x: m(CX), y: m(PY) }, handle: { x: m(HX + 0.0715), y: m(PY) }, base: { x: 0, y: 0 } },
  };
};
