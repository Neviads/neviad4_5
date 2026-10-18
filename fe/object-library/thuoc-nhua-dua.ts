/* OBJECT-META
{
  "catalog": "Thước nhựa, đũa thuỷ tinh, mảnh lụa/dạ",
  "title": "Bộ dụng cụ nhiễm điện do cọ xát: thước nhựa xanh có vạch chia, đũa thuỷ tinh trong và mảnh lụa gấp có tua ở hai đầu",
  "fill": "#38bdf8",
  "anchor": "Đầu cầm của đũa thuỷ tinh (đầu bên trái).",
  "useWhen": ["Cần bộ nhiễm điện do cọ xát: đũa thuỷ tinh cọ lụa và thước nhựa cọ dạ.","Cần cả ba dụng cụ đặt cạnh nhau trong một hình: đũa, thước, mảnh lụa."],
  "avoidWhen": ["Cần thanh đã nhiễm điện treo hút giấy hay qua cầu tích điện: dùng qua-cau-tich-dien hoặc dien-nghiem.","Cần thước kẻ đo độ dài: dùng thuoc-thang; thước nhựa ở đây chỉ làm vật cọ xát.","Cần dạ cọ thước nhựa: vật chỉ có mảnh lụa, không có mảnh dạ."],
  "size": { "width": 0.231, "height": 0.072 },
  "parts": [],
  "points": [
    { "name": "rodHandle", "description": "Đầu cầm của đũa thuỷ tinh." },
    { "name": "rodTip", "description": "Đầu còn lại của đũa thuỷ tinh (đầu cọ xát)." },
    { "name": "rulerHandle", "description": "Đầu cầm của thước nhựa." },
    { "name": "cloth", "description": "Tâm mảnh lụa." }
  ],
  "notes": "Đũa thuỷ tinh dài 0,2 m đường kính 0,01 m; thước nhựa dài 0,18 m rộng 0,03 m chia mm (nhựa trong màu xanh); mảnh lụa 0,05 m × 0,03 m gấp đôi. Cọ đũa thuỷ tinh vào lụa làm đũa nhiễm điện dương, cọ thước nhựa vào dạ làm thước nhiễm điện âm. fill là màu thước nhựa."
}
*/
const makeFrictionSet = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const ry = -0.03;
  const ty = 0.02;

  group.add(new Konva.Rect({ x: m(0.004), y: m(ry + 0.0045), width: m(0.2), height: m(0.01), cornerRadius: m(0.005), fill: "rgba(0,0,0,0.3)", listening: false }));
  group.add(new Konva.Rect({ x: 0, y: m(ry - 0.005), width: m(0.2), height: m(0.01), cornerRadius: m(0.005), ...lin(0, 0, 0, m(0.01), [0, "rgba(255,255,255,0.8)", 0.3, "rgba(186,230,253,0.35)", 0.75, "rgba(100,116,139,0.35)", 1, "rgba(30,64,175,0.35)"]), stroke: "rgba(226,240,252,0.95)", strokeWidth: lw * 1.2, listening: false }));
  group.add(ln([0.006, ry - 0.0028, 0.194, ry - 0.0028], "rgba(255,255,255,0.9)", lw * 1.3));
  group.add(ln([0.01, ry + 0.0025, 0.19, ry + 0.0025], "rgba(15,23,42,0.18)", lw));
  group.add(new Konva.Ellipse({ x: m(0.0015), y: m(ry), radiusX: m(0.0012), radiusY: m(0.0042), fill: "rgba(255,255,255,0.45)", listening: false }));
  group.add(new Konva.Text({ x: m(0.012), y: m(ry - 0.0125), text: "đũa thuỷ tinh", fontSize: m(0.0058), fill: "rgba(226,232,240,0.85)", listening: false }));

  group.add(new Konva.Rect({ x: m(0.003), y: m(ty - 0.0135), width: m(0.18), height: m(0.03), cornerRadius: m(0.002), fill: "rgba(0,0,0,0.3)", listening: false }));
  group.add(new Konva.Rect({ x: 0, y: m(ty - 0.015), width: m(0.18), height: m(0.03), cornerRadius: m(0.002), ...lin(0, 0, m(0.18), m(0.03), [0, "rgba(186,230,253,0.85)", 0.5, fill, 1, "rgba(3,105,161,0.7)"]), stroke: "#0369a1", strokeWidth: lw * 1.1, listening: false }));
  for (let i = 0; i <= 90; i += 1) {
    const x = 0.008 + i * 0.0019;
    const tall = i % 10 === 0 ? 0.0085 : i % 5 === 0 ? 0.006 : 0.0035;
    group.add(ln([x, ty - 0.015, x, ty - 0.015 + tall], "rgba(7,35,60,0.9)", i % 10 === 0 ? lw * 0.9 : lw * 0.55));
    if (i % 10 === 0 && i > 0 && i < 90) group.add(new Konva.Text({ x: m(x - 0.004), y: m(ty - 0.0055), width: m(0.008), align: "center", text: String(i / 10), fontSize: m(0.0048), fill: "rgba(7,35,60,0.9)", listening: false }));
  }
  group.add(new Konva.Circle({ x: m(0.172), y: m(ty), radius: m(0.0032), fill: "#0b1220", stroke: "rgba(7,35,60,0.9)", strokeWidth: lw * 0.6, listening: false }));
  group.add(ln([0.004, ty + 0.0125, 0.176, ty + 0.0125], "rgba(255,255,255,0.65)", lw * 1.2));
  group.add(new Konva.Text({ x: m(0.012), y: m(ty + 0.0035), text: "cm", fontSize: m(0.0045), fill: "rgba(7,35,60,0.9)", listening: false }));

  const cx = 0.218;
  const cy = 0.0;
  const top = [cx - 0.03, cy - 0.0135, cx - 0.012, cy - 0.0155, cx + 0.012, cy - 0.0125, cx + 0.03, cy - 0.0145, cx + 0.031, cy + 0.0035, cx + 0.012, cy + 0.0055, cx - 0.012, cy + 0.0035, cx - 0.031, cy + 0.0055];
  group.add(new Konva.Line({ points: top.map(m), closed: true, tension: 0.3, ...lin(0, 0, m(0.05), m(0.02), [0, "#fde68a", 0.5, "#f59e0b", 1, "#b45309"]), stroke: "#78350f", strokeWidth: lw, lineJoin: "round", shadowColor: "#000", shadowBlur: m(0.005), shadowOpacity: 0.4, shadowOffset: { x: m(0.001), y: m(0.002) }, listening: false }));
  group.add(new Konva.Line({ points: [cx - 0.031, cy + 0.0055, cx - 0.012, cy + 0.0035, cx + 0.012, cy + 0.0055, cx + 0.031, cy + 0.0035, cx + 0.03, cy + 0.0165, cx + 0.012, cy + 0.0185, cx - 0.012, cy + 0.0155, cx - 0.03, cy + 0.0175].map(m), closed: true, tension: 0.3, ...lin(0, 0, m(0.05), m(0.02), [0, "#fcd34d", 0.5, "#d97706", 1, "#78350f"]), stroke: "#78350f", strokeWidth: lw, lineJoin: "round", listening: false }));
  for (let i = 0; i < 12; i += 1) group.add(ln([cx - 0.027 + i * 0.0049, cy + 0.0167, cx - 0.0275 + i * 0.0049, cy + 0.0225], "#fde68a", lw * 0.8));
  for (const dy of [-0.0055, 0, 0.0055]) group.add(ln([cx - 0.026, cy + dy, cx + 0.027, cy + dy - 0.001], "rgba(120,53,15,0.28)", lw * 0.7));
  group.add(ln([cx - 0.026, cy - 0.0125, cx + 0.024, cy - 0.0115], "rgba(255,255,255,0.7)", lw * 1.1));
  group.add(new Konva.Text({ x: m(cx - 0.025), y: m(cy + 0.0245), width: m(0.05), align: "center", text: "lụa / dạ", fontSize: m(0.0056), fill: "rgba(226,232,240,0.85)", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(0.04), y: m(0.036), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { rodHandle: { x: 0, y: m(ry) }, rodTip: { x: m(0.2), y: m(ry) }, rulerHandle: { x: m(0.003), y: m(ty) }, cloth: { x: m(cx), y: m(cy) } } };
};
