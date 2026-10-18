/* OBJECT-META
{
  "catalog": "Bình tràn + vật chìm",
  "title": "Bình tràn thuỷ tinh có vòi, cốc hứng nước tràn đặt dưới vòi và khối đồng treo bằng sợi chỉ từ giá để nhúng chìm",
  "fill": "#38bdf8",
  "anchor": "Giữa đáy bình tràn, chạm mặt bàn.",
  "useWhen": ["Cần bình tràn có vòi, cốc hứng và khối đồng treo chỉ để đo thể tích vật chìm (Archimedes).","Cần nửa phần nước phủ khối cho thấy phần chìm, cốc hứng có mực riêng (catch)."],
  "avoidWhen": ["Cần bể kính lớn đựng nước để quan sát ánh sáng: dùng be-nuoc.","Cần đo lực đẩy bằng lực kế: vật này không có lực kế.","Khối nhúng là đồng 0,04 × 0,05 m, vật khác phải đổi tham số."],
  "size": { "width": 0.354, "height": 0.3 },
  "parts": [
    { "name": "object", "label": "Vật nhúng chìm", "motion": "slide", "axis": "down", "min": 0, "max": 0.12, "description": "Độ hạ của khối đồng xuống (mét) tính từ vị trí ở ngay trên miệng bình; nhúng sâu thì nước tràn qua vòi nhiều hơn." },
    { "name": "catch", "label": "Mực nước trong cốc hứng", "motion": "slide", "axis": "up", "min": 0, "max": 0.035, "description": "Độ cao nước tràn thu được trong cốc hứng (mét); engine tính từ thể tích phần vật chìm." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy bình tràn." },
    { "name": "spout", "description": "Miệng vòi, nơi nước tràn chảy ra." },
    { "name": "objectRest", "description": "Đáy khối đồng ở tư thế treo cao nhất, ngay trên miệng bình." },
    { "name": "catchBottom", "description": "Giữa đáy cốc hứng." }
  ],
  "notes": "Bình cao 0,2 m, rộng 0,1 m, vòi cao 0,17 m nên mực nước bình là mực vòi. Khối đồng 0,04 m × 0,05 m treo vào sợi chỉ buộc ở giá phía trái. Phần nước phủ lên khối vẽ nửa trong suốt để thấy phần chìm. fill là màu nước."
}
*/
const makeOverflowCan = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const CAN_W = 0.1;
  const CAN_H = 0.2;
  const SPOUT_Y = 0.17;
  const WALL = 0.0035;
  const CAN_X = -0.04;
  const CATCH_X = 0.14;
  const OBJ_W = 0.04;
  const OBJ_H = 0.05;
  const OBJ_REST_BOTTOM = CAN_H + 0.025;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Giá nhỏ phía trái: trụ đứng và xà ngang đưa ra tới trên miệng bình, nơi buộc sợi chỉ.
  const POLE_X = -0.145;
  const ARM_Y = -(CAN_H + 0.09);
  group.add(new Konva.Rect({ x: m(-0.18), y: m(-0.014), width: m(0.07), height: m(0.014), cornerRadius: m(0.003), ...lin(0, m(-0.014), 0, 0, [0, "#94a3b8", 0.2, "#334155", 1, "#0f172a"]), stroke: "#0b1220", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(POLE_X - 0.006), y: m(ARM_Y - 0.01), width: m(0.012), height: m(-ARM_Y - 0.004), ...lin(m(POLE_X - 0.006), 0, m(POLE_X + 0.006), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(POLE_X - 0.006), y: m(ARM_Y - 0.01), width: m(0.12), height: m(0.011), cornerRadius: m(0.003), ...lin(0, m(ARM_Y - 0.01), 0, m(ARM_Y + 0.001), [0, "#f8fafc", 0.2, "#cbd5e1", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  const armTip = CAN_X;

  // Cốc hứng ở bên phải: thành thuỷ tinh, mực nước dâng theo bộ phận catch.
  const catchGroup = new Konva.Group({ x: 0, y: 0 });
  group.add(catchGroup);
  const catchLevel = () => Math.max(0, -(catchGroup.y() || 0) / ppm);
  group.add(new Konva.Shape({
    ...lin(0, 0, 0, m(-0.06), [0, "rgba(14,165,233,0.9)", 1, "rgba(56,189,248,0.8)"]), fill, opacity: 0.88, listening: false,
    sceneFunc: (ctx, shape) => {
      const h = catchLevel();
      if (h <= 0.0008) return;
      ctx.beginPath();
      ctx.moveTo(m(CATCH_X - 0.0295), m(-0.003));
      ctx.lineTo(m(CATCH_X - 0.0315 - 0.0007 * 0), m(-0.003 - h));
      ctx.lineTo(m(CATCH_X + 0.0315), m(-0.003 - h));
      ctx.lineTo(m(CATCH_X + 0.0295), m(-0.003));
      ctx.closePath();
      ctx.fillStrokeShape(shape);
    },
  }));
  group.add(new Konva.Line({ points: [m(CATCH_X - 0.034), m(-0.062), m(CATCH_X - 0.031), m(0), m(CATCH_X + 0.031), m(0), m(CATCH_X + 0.034), m(-0.062)], ...lin(m(CATCH_X - 0.034), 0, m(CATCH_X + 0.034), 0, [0, "rgba(186,230,253,0.5)", 0.3, "rgba(240,249,255,0.1)", 1, "rgba(100,170,210,0.5)"]), stroke: "rgba(226,240,252,0.95)", strokeWidth: lw * 1.4, lineJoin: "round", lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(CATCH_X - 0.029), m(-0.05), m(CATCH_X - 0.0265), m(-0.01)], stroke: "rgba(255,255,255,0.6)", strokeWidth: lw * 2, lineCap: "round", listening: false }));
  for (let ml = 0; ml <= 6; ml += 1) group.add(new Konva.Line({ points: [m(CATCH_X + 0.024), m(-0.003 - ml * 0.008), m(CATCH_X + 0.03), m(-0.003 - ml * 0.008)], stroke: "rgba(226,232,240,0.7)", strokeWidth: lw * 0.8, listening: false }));

  // Khối đồng treo bằng sợi chỉ: đứng trên miệng bình ở tư thế nghỉ và hạ xuống theo bộ phận object.
  const object = new Konva.Group({ x: m(armTip), y: m(-OBJ_REST_BOTTOM) });
  object.add(new Konva.Rect({ x: m(-OBJ_W / 2), y: m(-OBJ_H), width: m(OBJ_W), height: m(OBJ_H), cornerRadius: m(0.003), ...lin(m(-OBJ_W / 2), 0, m(OBJ_W / 2), 0, [0, "#7c4a14", 0.25, "#f4b860", 0.55, "#c8873a", 1, "#6b3b0c"]), stroke: "#4a2a08", strokeWidth: lw * 1.1, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.35, listening: false }));
  object.add(new Konva.Line({ points: [m(-OBJ_W / 2 + 0.004), m(-OBJ_H + 0.004), m(-OBJ_W / 2 + 0.004), m(-0.004)], stroke: "rgba(255,255,255,0.55)", strokeWidth: lw * 1.8, lineCap: "round", listening: false }));
  object.add(new Konva.Circle({ x: 0, y: m(-OBJ_H - 0.0035), radius: m(0.0042), stroke: "#e2e8f0", strokeWidth: m(0.002), listening: false }));
  group.add(object);
  // Sợi chỉ: từ đầu xà ngang xuống khối đồng, vẽ theo vị trí khối.
  group.add(new Konva.Shape({
    stroke: "#e5e7eb", strokeWidth: Math.max(1, m(0.0009)), lineCap: "round", listening: false,
    sceneFunc: (ctx, shape) => {
      ctx.beginPath();
      ctx.moveTo(m(armTip), m(ARM_Y + 0.001));
      ctx.lineTo(m(armTip), m(((object.y() || 0) / ppm) - OBJ_H - 0.0075));
      ctx.fillStrokeShape(shape);
    },
  }));
  group.add(new Konva.Circle({ x: m(armTip), y: m(ARM_Y + 0.001), radius: m(0.0035), fill: "#cbd5e1", stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));

  // Nước trong bình tràn tới ngang vòi; vẽ bán trong suốt đè lên khối để thấy phần chìm.
  group.add(new Konva.Rect({ x: m(CAN_X - CAN_W / 2 + WALL), y: m(-SPOUT_Y), width: m(CAN_W - 2 * WALL), height: m(SPOUT_Y - 0.006), ...lin(0, m(-SPOUT_Y), 0, m(-0.006), [0, "rgba(125,211,252,0.5)", 1, "rgba(14,116,144,0.62)"]), listening: false }));
  group.add(new Konva.Line({ points: [m(CAN_X - CAN_W / 2 + WALL), m(-SPOUT_Y), m(CAN_X + CAN_W / 2 - WALL), m(-SPOUT_Y)], stroke: "rgba(255,255,255,0.8)", strokeWidth: lw * 1.4, lineCap: "round", listening: false }));
  // Vỏ bình thuỷ tinh có đáy dày; vòi tràn ra bên phải ở độ cao SPOUT_Y.
  group.add(new Konva.Rect({ x: m(CAN_X - CAN_W / 2), y: m(-CAN_H), width: m(CAN_W), height: m(CAN_H), ...lin(m(CAN_X - CAN_W / 2), 0, m(CAN_X + CAN_W / 2), 0, [0, "rgba(186,230,253,0.4)", 0.16, "rgba(248,250,252,0.08)", 0.8, "rgba(224,242,254,0.06)", 1, "rgba(100,170,210,0.45)"]), stroke: "rgba(226,240,252,0.95)", strokeWidth: lw * 1.5, listening: false }));
  group.add(new Konva.Rect({ x: m(CAN_X - CAN_W / 2), y: m(-0.011), width: m(CAN_W), height: m(0.011), fill: "rgba(100,170,210,0.35)", stroke: "rgba(226,240,252,0.9)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: [m(CAN_X - CAN_W / 2 + 0.006), m(-CAN_H + 0.01), m(CAN_X - CAN_W / 2 + 0.006), m(-0.02)], stroke: "rgba(255,255,255,0.6)", strokeWidth: lw * 2.4, lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(CAN_X + CAN_W / 2), m(-SPOUT_Y - 0.0045), m(CAN_X + CAN_W / 2 + 0.032), m(-SPOUT_Y - 0.0045 + 0.018), m(CAN_X + CAN_W / 2 + 0.058), m(-SPOUT_Y - 0.0045 + 0.034)], stroke: "rgba(226,240,252,0.95)", strokeWidth: m(0.0075), lineCap: "round", lineJoin: "round", tension: 0.3, listening: false }));
  group.add(new Konva.Line({ points: [m(CAN_X + CAN_W / 2), m(-SPOUT_Y - 0.0045), m(CAN_X + CAN_W / 2 + 0.032), m(-SPOUT_Y - 0.0045 + 0.018), m(CAN_X + CAN_W / 2 + 0.058), m(-SPOUT_Y - 0.0045 + 0.034)], stroke: "rgba(125,211,252,0.55)", strokeWidth: m(0.0035), lineCap: "round", lineJoin: "round", tension: 0.3, listening: false }));
  group.add(new Konva.Line({ points: [m(CAN_X - CAN_W / 2 - 0.004), m(-CAN_H + 0.001), m(CAN_X + CAN_W / 2 + 0.004), m(-CAN_H + 0.001)], stroke: "rgba(241,245,249,0.95)", strokeWidth: lw * 1.8, lineCap: "round", listening: false }));
  group.add(new Konva.Text({ x: m(CAN_X - 0.034), y: m(-CAN_H + 0.03), width: m(0.068), align: "center", text: "BÌNH TRÀN", fontSize: m(0.0078), fontStyle: "bold", fill: "rgba(226,232,240,0.8)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.2), y: m(0.008), width: m(0.4), align: "center", text: label, fontSize: m(0.014), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      object: { node: object, motion: "slide" as const, axis: "down" as const, min: 0, max: 0.12 },
      catch: { node: catchGroup, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.035 },
    },
    points: { base: { x: m(CAN_X), y: 0 }, spout: { x: m(CAN_X + CAN_W / 2 + 0.058), y: m(-SPOUT_Y - 0.0045 + 0.034) }, objectRest: { x: m(armTip), y: m(-OBJ_REST_BOTTOM) }, catchBottom: { x: m(CATCH_X), y: 0 } },
  };
};
