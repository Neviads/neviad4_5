/* OBJECT-META
{
  "catalog": "Nhạc cụ (đàn guitar, sáo, trống)",
  "title": "Đàn guitar thùng nằm ngang: thân đàn có lỗ cộng hưởng, cần đàn có phím, đầu đàn với sáu khoá chỉnh, sáu dây nilon và cầu đàn",
  "fill": "#b8741a",
  "anchor": "Tâm lỗ cộng hưởng của thân đàn.",
  "useWhen": ["Cần đàn guitar nhìn ngang với dây thứ ba gảy rung được để minh hoạ dao động dây hay độ cao âm.", "Cần thân đàn có lỗ cộng hưởng, cần 12 phím, cầu đàn và xương đàn làm điểm neo."],
  "avoidWhen": ["Cần sáo hoặc trống (cột khí hay màng rung): vật này không có, phải tìm vật khác cùng nhóm.", "Cần sợi dây đơn giản hai đầu cố định: vật này là cả cây đàn dài 1,02 m, chỉ một dây rung được."],
  "size": { "width": 1.02, "height": 0.4 },
  "parts": [
    { "name": "string", "label": "Dây đang gảy", "motion": "slide", "axis": "up", "min": -0.006, "max": 0.006, "description": "Độ lệch của điểm giữa dây thứ ba (mét), dương là lên trên; dây bị kéo thành hai đoạn thẳng gấp ở điểm giữa nên trông như đang rung." }
  ],
  "points": [
    { "name": "soundhole", "description": "Tâm lỗ cộng hưởng." },
    { "name": "bridge", "description": "Giữa cầu đàn." },
    { "name": "nut", "description": "Giữa xương đàn (nơi dây rời cần đàn lên đầu đàn)." },
    { "name": "headstock", "description": "Giữa đầu đàn." }
  ],
  "notes": "Thân đàn dài 0,48 m, cần đàn dài 0,5 m với 12 phím; dây dài 0,64 m từ cầu đến xương đàn. Một dây (dây thứ ba) được vẽ để rung riêng theo bộ phận string. Khi cảnh cần sáo hay trống thì thay bằng vật khác cùng nhóm. fill là màu gỗ của thân."
}
*/
const makeGuitar = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const BODY_L = 0.48;
  const NECK_L = 0.5;
  const SOUND_X = 0.02;
  const BRIDGE_X = 0.16;
  const NUT_X = -0.48 + 0.64 - 0.001; // xương đàn cách cầu 0,64 m: -0,48 .. ngược về phía đầu đàn
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  // Quy ước: thân đàn bên trái (x từ −0,24 tới +0,24 quanh lỗ cộng hưởng), cần đàn chạy sang phải; cầu đàn ở bên trái lỗ.
  const bx = -0.15;
  const nutX = bx + 0.64 - 0.0;

  // Thân đàn: hình số 8 gồm hai thuỳ, vẽ bằng đường cong khép kín.
  const bodyPts: number[] = [];
  const outline: [number, number][] = [[-0.27, 0], [-0.265, -0.09], [-0.2, -0.17], [-0.12, -0.18], [-0.06, -0.155], [-0.02, -0.12], [0.03, -0.1], [0.08, -0.125], [0.12, -0.16], [0.18, -0.175], [0.23, -0.15], [0.245, -0.09], [0.245, 0.09], [0.23, 0.15], [0.18, 0.175], [0.12, 0.16], [0.08, 0.125], [0.03, 0.1], [-0.02, 0.12], [-0.06, 0.155], [-0.12, 0.18], [-0.2, 0.17], [-0.265, 0.09]];
  for (const [x, y] of outline) bodyPts.push(m(x), m(y));
  group.add(new Konva.Line({ points: bodyPts, closed: true, tension: 0.4, ...lin(0, m(-0.18), 0, m(0.18), [0, "#f2c27c", 0.25, fill, 0.8, "#6b3a0a", 1, "#3f2206"]), stroke: "#2a1606", strokeWidth: lw * 1.4, shadowColor: "#000", shadowBlur: m(0.02), shadowOpacity: 0.45, shadowOffset: { x: m(0.004), y: m(0.01) }, listening: false }));
  group.add(new Konva.Line({ points: bodyPts.map((v) => v * 0.93), closed: true, tension: 0.4, stroke: "rgba(255,230,190,0.5)", strokeWidth: lw * 1.2, listening: false }));
  for (let i = 0; i < 12; i += 1) group.add(ln([-0.24, -0.15 + i * 0.027, -0.1, -0.148 + i * 0.027, 0.0, -0.152 + i * 0.027, 0.2, -0.149 + i * 0.027], i % 2 ? "rgba(63,34,6,0.26)" : "rgba(255,225,170,0.22)", lw * 0.6));
  // Lỗ cộng hưởng hình tròn với vòng trang trí bằng gỗ sẫm, và miếng bảo vệ phía trên.
  group.add(new Konva.Circle({ x: m(SOUND_X), y: 0, radius: m(0.054), fill: "#0b0f19", stroke: "#2a1606", strokeWidth: lw * 1.4, listening: false }));
  for (const r of [0.059, 0.066]) group.add(new Konva.Circle({ x: m(SOUND_X), y: 0, radius: m(r), stroke: r === 0.059 ? "#f2c27c" : "#2a1606", strokeWidth: lw * 1.2, listening: false }));
  group.add(new Konva.Arc({ x: m(SOUND_X), y: 0, innerRadius: m(0.0475), outerRadius: m(0.053), angle: 80, rotation: 205, fill: "rgba(255,255,255,0.18)", listening: false }));
  group.add(new Konva.Line({ points: [m(0.056), m(-0.07), m(0.078), m(-0.085), m(0.1), m(-0.07), m(0.078), m(-0.052)], closed: true, tension: 0.4, fill: "#111827", opacity: 0.8, listening: false }));
  // Cầu đàn: thanh gỗ cứng với xương cầu trắng và sáu chốt giữ dây.
  group.add(new Konva.Rect({ x: m(bx - 0.012), y: m(-0.075), width: m(0.024), height: m(0.15), cornerRadius: m(0.006), ...lin(m(bx - 0.012), 0, m(bx + 0.012), 0, [0, "#3f2206", 0.4, "#7c4a14", 1, "#1c0e02"]), stroke: "#150a01", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(bx + 0.0105), y: m(-0.066), width: m(0.003), height: m(0.132), fill: "#f8fafc", stroke: "#94a3b8", strokeWidth: lw * 0.5, listening: false }));
  for (let i = 0; i < 6; i += 1) group.add(new Konva.Circle({ x: m(bx - 0.002), y: m(-0.052 + i * 0.0208), radius: m(0.0026), fill: "#f8fafc", stroke: "#111827", strokeWidth: lw * 0.6, listening: false }));

  // Cần đàn gỗ sẫm, mặt phím với 12 phím kim loại, chấm đánh dấu và xương đàn ở cuối.
  const neckLeft = 0.2;
  const neckRight = neckLeft + NECK_L;
  group.add(new Konva.Rect({ x: m(neckLeft), y: m(-0.0235), width: m(NECK_L), height: m(0.047), cornerRadius: m(0.003), ...lin(0, m(-0.0235), 0, m(0.0235), [0, "#6b4219", 0.5, "#3b2209", 1, "#1c0e02"]), stroke: "#150a01", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(neckLeft), y: m(-0.0235), width: m(NECK_L), height: m(0.0042), fill: "rgba(255,225,180,0.28)", listening: false }));
  const frets = [0.0, 0.032, 0.062, 0.09, 0.117, 0.142, 0.166, 0.188, 0.209, 0.229, 0.248, 0.266];
  frets.forEach((f, i) => {
    const x = neckLeft + f + 0.012;
    group.add(new Konva.Line({ points: [m(x), m(-0.0233), m(x), m(0.0233)], stroke: "#e2e8f0", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));
    if ([2, 4, 6, 8].includes(i)) group.add(new Konva.Circle({ x: m(x + 0.01), y: 0, radius: m(0.0032), fill: "#f8fafc", opacity: 0.85, listening: false }));
  });
  group.add(new Konva.Circle({ x: m(neckLeft + 0.266 + 0.012 + 0.0085), y: m(-0.007), radius: m(0.0027), fill: "#f8fafc", opacity: 0.85, listening: false }));
  group.add(new Konva.Circle({ x: m(neckLeft + 0.266 + 0.012 + 0.0085), y: m(0.007), radius: m(0.0027), fill: "#f8fafc", opacity: 0.85, listening: false }));
  // Đầu đàn: tấm gỗ nở rộng có sáu khoá chỉnh ở hai bên.
  const headLeft = neckRight - 0.002;
  group.add(new Konva.Line({ points: [m(headLeft), m(-0.0235), m(headLeft + 0.015), m(-0.034), m(headLeft + 0.105), m(-0.034), m(headLeft + 0.115), m(-0.028), m(headLeft + 0.115), m(0.028), m(headLeft + 0.105), m(0.034), m(headLeft + 0.015), m(0.034), m(headLeft), m(0.0235)], closed: true, tension: 0.12, ...lin(0, m(-0.034), 0, m(0.034), [0, "#6b4219", 0.5, "#3b2209", 1, "#1c0e02"]), stroke: "#150a01", strokeWidth: lw * 1.2, listening: false }));
  for (let i = 0; i < 6; i += 1) {
    const side = i < 3 ? -1 : 1;
    const x = headLeft + 0.03 + (i % 3) * 0.032;
    group.add(new Konva.Line({ points: [m(x), m(side * 0.0235), m(x), m(side * 0.0405)], stroke: "#cbd5e1", strokeWidth: m(0.0028), lineCap: "round", listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.0065), y: m(side * 0.0405 - (side > 0 ? 0 : 0.0085)), width: m(0.013), height: m(0.0085), cornerRadius: m(0.003), ...lin(0, 0, m(0.013), 0, [0, "#fbbf24", 0.5, "#fef3c7", 1, "#92400e"]), stroke: "#78350f", strokeWidth: lw * 0.7, listening: false }));
  }
  // Xương đàn trên cùng cần.
  group.add(new Konva.Rect({ x: m(neckRight - 0.0045), y: m(-0.0235), width: m(0.0045), height: m(0.047), fill: "#f8fafc", stroke: "#94a3b8", strokeWidth: lw * 0.5, listening: false }));

  // Sáu dây nilon từ cầu đàn tới xương đàn; dây thứ ba có bộ phận rung (đoạn gấp ở giữa).
  const strY = [-0.052, -0.031, -0.0104, 0.0104, 0.031, 0.052];
  const nutYs = [-0.0185, -0.011, -0.0037, 0.0037, 0.011, 0.0185];
  for (let i = 0; i < 6; i += 1) {
    if (i === 2) continue;
    group.add(ln([bx, strY[i], neckRight - 0.002, nutYs[i]], i < 3 ? "#e2e8f0" : "#d4a73a", i < 3 ? lw * 0.9 : lw * 1.3));
  }
  const stringPart = new Konva.Group({ x: 0, y: 0 });
  group.add(stringPart);
  group.add(new Konva.Shape({
    stroke: "#f8fafc", strokeWidth: lw * 1.1, lineCap: "round", lineJoin: "round", listening: false,
    sceneFunc: (ctx, shape) => {
      const dy = (stringPart.y() || 0);
      const midX = (bx + neckRight - 0.002) / 2;
      const midY = (strY[2] + nutYs[2]) / 2;
      ctx.beginPath();
      ctx.moveTo(m(bx), m(strY[2]));
      ctx.lineTo(m(midX), m(midY) + dy);
      ctx.lineTo(m(neckRight - 0.002), m(nutYs[2]));
      ctx.fillStrokeShape(shape);
    },
  }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.2), y: m(0.2), width: m(0.4), align: "center", text: label, fontSize: m(0.02), fill: "#e2e8f0", listening: false }));
  }
  void NUT_X; void nutX; void BODY_L; void BRIDGE_X; void lin;

  return {
    group,
    parts: { string: { node: stringPart, motion: "slide" as const, axis: "up" as const, min: -0.006, max: 0.006 } },
    points: { soundhole: { x: m(SOUND_X), y: 0 }, bridge: { x: m(bx), y: 0 }, nut: { x: m(neckRight - 0.002), y: 0 }, headstock: { x: m(headLeft + 0.06), y: 0 } },
  };
};
