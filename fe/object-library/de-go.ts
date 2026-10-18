/* OBJECT-META
{
  "catalog": "Đế gỗ / hộp cộng hưởng",
  "title": "Hộp cộng hưởng bằng gỗ hở một đầu, có ổ vặn cuống âm thoa trên nắp",
  "fill": "#c8873f",
  "anchor": "Giữa đáy hộp, chạm mặt bàn.",
  "useWhen": ["Cần hộp cộng hưởng gỗ hở một đầu để gắn âm thoa và khuếch đại âm.", "Cảnh có âm thoa đặt trên hộp, miệng hộp quay về phía người nghe bên phải."],
  "avoidWhen": ["Cần cột khí hoặc ống cộng hưởng kín/hai đầu: dùng ong-cong-huong.", "Cần chỉ cái đế đỡ đơn thuần không có miệng hộp: hộp này luôn có ổ vặn và miệng hở."],
  "size": { "width": 0.26, "height": 0.1 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa đáy hộp." },
    { "name": "socket", "description": "Tâm ổ vặn cuống âm thoa trên nắp hộp." },
    { "name": "mouth", "description": "Tâm miệng hộp hở ở đầu bên phải, nơi âm thoát ra." }
  ],
  "notes": "Hộp dài 0,24 m, cao 0,085 m, hở ở đầu phải (miệng quay về phía người nghe). Ổ vặn có sẵn ren để bắt cuống âm thoa. fill là màu gỗ."
}
*/
const makeResonanceBox = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const L = 0.24;
  const H = 0.085;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0022));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });

  const group = new Konva.Group({ x: p.x, y: p.y });
  const left = -L / 2;
  const top = -H - 0.006;

  // Bốn chân cao su.
  for (const x of [-0.1, 0.1]) group.add(new Konva.Rect({ x: m(x - 0.012), y: m(-0.006), width: m(0.024), height: m(0.006), cornerRadius: m(0.002), fill: "#111827", listening: false }));

  // Thân hộp: gỗ xoan có vân dọc.
  group.add(new Konva.Rect({ x: m(left), y: m(top), width: m(L), height: m(H), cornerRadius: m(0.004), ...lin(0, m(top), 0, m(top + H), [0, "#e7b274", 0.12, fill, 0.8, "#8a5524", 1, "#5a3512"]), stroke: "#3b220c", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  for (let i = 0; i < 9; i += 1) {
    const y = top + 0.008 + i * 0.0085;
    group.add(new Konva.Line({ points: [m(left + 0.004), m(y), m(left + 0.07), m(y + 0.002), m(left + 0.14), m(y - 0.001), m(left + L - 0.016), m(y + 0.001)], stroke: i % 2 ? "rgba(90,53,18,0.35)" : "rgba(255,230,190,0.25)", strokeWidth: lw * 0.6, tension: 0.4, listening: false }));
  }
  // Mối ghép ở hai đầu và đinh gỗ.
  group.add(new Konva.Line({ points: [m(left + 0.012), m(top), m(left + 0.012), m(top + H)], stroke: "rgba(59,34,12,0.55)", strokeWidth: lw * 0.8, listening: false }));

  // Miệng hộp hở ở bên phải: khung dày và lòng hộp tối.
  const mouthX = left + L - 0.012;
  group.add(new Konva.Rect({ x: m(mouthX - 0.004), y: m(top + 0.012), width: m(0.016), height: m(H - 0.024), cornerRadius: m(0.003), ...lin(m(mouthX), 0, m(mouthX + 0.012), 0, [0, "#050a14", 0.7, "#1e293b", 1, "#0b1220"]), stroke: "#3b220c", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: [m(mouthX + 0.001), m(top + 0.016), m(mouthX + 0.001), m(top + H - 0.016)], stroke: "rgba(255,200,130,0.4)", strokeWidth: lw * 0.6, listening: false }));

  // Ổ vặn trên nắp hộp: vòng kim loại, lỗ ren và cuống bắt thử.
  const sx = -0.03;
  group.add(new Konva.Ellipse({ x: m(sx), y: m(top + 0.001), radiusX: m(0.014), radiusY: m(0.0038), ...lin(m(sx - 0.014), 0, m(sx + 0.014), 0, [0, "#475569", 0.4, "#f1f5f9", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Ellipse({ x: m(sx), y: m(top + 0.0006), radiusX: m(0.006), radiusY: m(0.0016), fill: "#0b1220", listening: false }));
  // Mặt bên có nhãn và đinh tán.
  for (const x of [-0.105, -0.045, 0.015, 0.075]) group.add(new Konva.Circle({ x: m(x), y: m(top + H - 0.012), radius: m(0.0027), fill: "#d4d4d8", stroke: "#27272a", strokeWidth: lw * 0.5, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.07), y: m(top + 0.02), width: m(0.07), height: m(0.026), cornerRadius: m(0.002), fill: "#fef3c7", stroke: "#92400e", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Text({ x: m(-0.07), y: m(top + 0.0265), width: m(0.07), align: "center", text: "440 Hz", fontSize: m(0.0125), fontStyle: "bold", fill: "#451a03", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(left), y: m(0.006), width: m(L), align: "center", text: label, fontSize: m(0.014), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: { base: { x: 0, y: 0 }, socket: { x: m(sx), y: m(top) }, mouth: { x: m(mouthX + 0.006), y: m(top + H / 2) } },
  };
};
