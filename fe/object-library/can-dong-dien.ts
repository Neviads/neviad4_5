/* OBJECT-META
{
  "catalog": "Cân dòng điện / cân từ",
  "title": "Cân dòng điện: đòn cân quay quanh dao đặt trên trụ, một đầu treo khung dây chữ U thả vào khe nam châm chữ U, đầu kia có đĩa cân để đặt quả cân",
  "fill": "#d97706",
  "anchor": "Giữa đáy trụ, chạm mặt bàn.",
  "useWhen": ["Cần cân từ để đo lực từ F = B·I·l lên cạnh ngang của khung dây chữ U trong khe nam châm.","Cần đòn nghiêng quanh dao, đầu phải có đĩa đặt quả cân để cân bằng lực từ."],
  "avoidWhen": ["Cần cân đòn hai đĩa so sánh khối lượng thông thường: dùng can-don.","Cần thanh dây thẳng đặt trong từ trường nam châm chữ U không có đòn cân: dùng day-dan-thang và nam-cham-chu-u."],
  "size": { "width": 0.23, "height": 0.129 },
  "parts": [
    { "name": "beam", "label": "Đòn cân", "motion": "rotate", "min": -10, "max": 10, "description": "Góc nghiêng của đòn cân quanh dao, độ theo chiều kim đồng hồ; dương là đầu phải (đĩa cân) đi xuống, âm là đầu trái (khung dây) đi xuống." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy trụ." },
    { "name": "pivot", "description": "Dao đặt đòn cân, trục quay." },
    { "name": "loop", "description": "Cạnh ngang dưới của khung dây trong khe nam châm." },
    { "name": "pan", "description": "Giữa đĩa cân bên phải." }
  ],
  "notes": "Đòn dài 0,22 m, trụ cao 0,14 m; đầu trái treo khung dây hình chữ U rộng 0,04 m cao 0,03 m có cạnh ngang nằm trong khe nam châm chữ U (B ≈ 0,1 T), đầu phải treo đĩa cân. Khi có dòng điện I qua khung, cạnh ngang chịu lực F = B·I·l làm đòn nghiêng; thêm quả cân bên phải để cân bằng lại. fill là màu dây đồng."
}
*/
const makeCurrentBalance = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const PY = -0.125;
  const HL = 0.09;

  // Đế gang và trụ đứng; dao đặt ở đỉnh trụ.
  group.add(new Konva.Rect({ x: m(-0.06), y: m(-0.01), width: m(0.12), height: m(0.01), cornerRadius: m(0.002), ...lin(0, 0, 0, m(0.01), [0, "#e2e8f0", 0.4, "#64748b", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0055), y: m(PY + 0.008), width: m(0.011), height: m(-0.01 - PY - 0.008), ...lin(0, 0, m(0.011), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.011), m(PY + 0.0085), m(0.011), m(PY + 0.0085), 0, m(PY + 0.0015)], closed: true, fill: "#e2e8f0", stroke: "#334155", strokeWidth: lw * 0.8, lineJoin: "round", listening: false }));
  // Thang cố định ở trụ.
  for (let i = -3; i <= 3; i += 1) group.add(ln([0.007, PY + 0.02 + i * 0.0045 + 0.0135, 0.013, PY + 0.02 + i * 0.0045 + 0.0135], "#e2e8f0", lw * 0.8));

  // Nam châm chữ U cố định dưới đầu trái: hai chân đỏ/xanh hướng lên, khe giữa chứa cạnh ngang của khung.
  const mx = -HL;
  group.add(new Konva.Rect({ x: m(mx - 0.0255), y: m(-0.058), width: m(0.011), height: m(0.048), ...lin(0, 0, m(0.011), 0, [0, "#172554", 0.4, "#2563eb", 1, "#bfdbfe"]), stroke: "#172554", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(mx + 0.0145), y: m(-0.058), width: m(0.011), height: m(0.048), ...lin(0, 0, m(0.011), 0, [0, "#fecaca", 0.6, "#dc2626", 1, "#450a0a"]), stroke: "#450a0a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(mx - 0.0255), y: m(-0.019), width: m(0.051), height: m(0.011), cornerRadius: m(0.002), ...lin(0, 0, 0, m(0.011), [0, "#e2e8f0", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Text({ x: m(mx - 0.0255), y: m(-0.0535), width: m(0.011), align: "center", text: "S", fontSize: m(0.0085), fontStyle: "bold", fill: "#fff", listening: false }));
  group.add(new Konva.Text({ x: m(mx + 0.0145), y: m(-0.0535), width: m(0.011), align: "center", text: "N", fontSize: m(0.0085), fontStyle: "bold", fill: "#fff", listening: false }));

  // BỘ PHẬN QUAY: đòn cân thép, kim chỉ thị, sợi treo khung dây và đĩa cân. Gốc nhóm ở dao.
  const beam = new Konva.Group({ x: 0, y: m(PY) });
  beam.add(new Konva.Rect({ x: m(-0.115), y: m(-0.0035), width: m(0.23), height: m(0.007), cornerRadius: m(0.002), ...lin(0, 0, 0, m(0.007), steel), stroke: "#334155", strokeWidth: lw, listening: false }));
  beam.add(new Konva.Line({ points: [m(-0.113), m(-0.0021), m(0.113), m(-0.0021)], stroke: "rgba(255,255,255,0.8)", strokeWidth: lw, lineCap: "round", listening: false }));
  for (let i = -4; i <= 4; i += 1) if (i !== 0) beam.add(ln([i * 0.0125, 0.0035, i * 0.0125, 0.0058], "#0f172a", lw * 0.7));
  beam.add(new Konva.Line({ points: [0, m(0.0035), 0, m(0.043)], stroke: "#dc2626", strokeWidth: lw * 1.6, lineCap: "round", listening: false }));
  // Khung dây chữ U treo ở đầu trái bằng hai sợi chỉ; cạnh ngang vào khe nam châm.
  const hx = -HL;
  beam.add(ln([hx - 0.017, 0.0035, hx - 0.017, 0.043], "#e2e8f0", lw * 1.2));
  beam.add(ln([hx + 0.017, 0.0035, hx + 0.017, 0.043], "#e2e8f0", lw * 1.2));
  beam.add(new Konva.Line({ points: [m(hx - 0.017), m(0.012), m(hx - 0.017), m(0.0425), m(hx + 0.017), m(0.0425), m(hx + 0.017), m(0.012)], stroke: "#431407", strokeWidth: m(0.0034), lineCap: "round", lineJoin: "round", listening: false }));
  beam.add(new Konva.Line({ points: [m(hx - 0.017), m(0.012), m(hx - 0.017), m(0.0425), m(hx + 0.017), m(0.0425), m(hx + 0.017), m(0.012)], stroke: fill, strokeWidth: m(0.0022), lineCap: "round", lineJoin: "round", listening: false }));
  beam.add(new Konva.Line({ points: [m(hx - 0.0155), m(0.0415), m(hx + 0.0155), m(0.0415)], stroke: "rgba(255,247,237,0.8)", strokeWidth: lw * 0.7, lineCap: "round", listening: false }));
  // Đĩa cân đầu phải: móc, hai dây treo, đĩa và quả cân nhỏ.
  const px = HL;
  beam.add(new Konva.Circle({ x: m(px), y: m(0.0003), radius: m(0.0034), fill: "#e2e8f0", stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  beam.add(new Konva.Line({ points: [m(px), m(0.004), m(px - 0.019), m(0.043)], stroke: "#cbd5e1", strokeWidth: lw * 1.1, listening: false }));
  beam.add(new Konva.Line({ points: [m(px), m(0.004), m(px + 0.019), m(0.043)], stroke: "#cbd5e1", strokeWidth: lw * 1.1, listening: false }));
  beam.add(new Konva.Ellipse({ x: m(px), y: m(0.0445), radiusX: m(0.0235), radiusY: m(0.0042), ...lin(m(-0.0235), 0, m(0.0235), 0, [0, "#64748b", 0.3, "#f8fafc", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  beam.add(new Konva.Rect({ x: m(px - 0.0045), y: m(0.0385), width: m(0.009), height: m(0.0045), cornerRadius: m(0.001), ...lin(0, 0, m(0.009), 0, [0, "#fde68a", 0.5, "#d97706", 1, "#78350f"]), stroke: "#78350f", strokeWidth: lw * 0.7, listening: false }));
  group.add(beam);
  group.add(new Konva.Circle({ x: 0, y: m(PY), radius: m(0.0026), fill: "#0f172a", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.006), width: m(0.14), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { beam: { node: beam, motion: "rotate" as const, min: -10, max: 10 } },
    points: { base: { x: 0, y: 0 }, pivot: { x: 0, y: m(PY) }, loop: { x: m(-HL), y: m(PY + 0.0425) }, pan: { x: m(HL), y: m(PY + 0.0445) } },
  };
};
