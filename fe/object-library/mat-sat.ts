/* OBJECT-META
{
  "catalog": "Mạt sắt trên tấm bìa",
  "title": "Tấm bìa trắng rắc mạt sắt xếp theo đường sức của một nam châm thẳng nằm dưới: mạt dày ở hai cực, vòng cung nối từ cực này sang cực kia",
  "fill": "#f1f5f9",
  "anchor": "Tâm tấm bìa, trên nam châm.",
  "useWhen": ["Cần ảnh mạt sắt rắc trên bìa trắng hiện đường sức từ của nam châm thẳng nằm dưới.","Cần minh hoạ từ phổ: mạt dày ở hai cực, vòng cung nối cực này sang cực kia."],
  "avoidWhen": ["Cần nam châm thanh thấy rõ cực N/S: dùng nam-cham-thang.","Cần nam châm chữ U hoặc từ phổ ống dây: dùng nam-cham-chu-u hoặc ong-day-loi-sat.","Từ phổ này chỉ của nam châm thẳng, không phải dây dẫn hay ống dây."],
  "size": { "width": 0.18, "height": 0.123 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm tấm bìa, ngay trên giữa nam châm." },
    { "name": "poleLeft", "description": "Vị trí cực trái của nam châm bên dưới." },
    { "name": "poleRight", "description": "Vị trí cực phải của nam châm bên dưới." }
  ],
  "notes": "Tấm bìa 0,18 m × 0,12 m phẳng nằm ngang; nam châm thẳng 0,07 m nằm ngay dưới, trục dọc theo cạnh dài. Mạt sắt hàng trăm hạt nhỏ 3 mm, mỗi hạt nằm theo phương đường sức tại chỗ nên lộ ra từ phổ (từ trường là hiện tượng, không thay đổi được). fill là màu tấm bìa."
}
*/
const makeIronFilings = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const W = 0.18;
  const H = 0.12;
  let seed = 11;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  // Tấm bìa: cạnh dày, mặt có gradient nhẹ và nếp gấp ở góc.
  group.add(new Konva.Rect({ x: m(-W / 2 + 0.003), y: m(-H / 2 + 0.005), width: m(W), height: m(H), cornerRadius: m(0.003), fill: "#64748b", stroke: "#0f172a", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.45, shadowOffset: { x: m(0.003), y: m(0.005) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(-H / 2), width: m(W), height: m(H), cornerRadius: m(0.003), ...lin(0, 0, m(W), m(H), [0, "#ffffff", 0.5, fill, 1, "#cbd5e1"]), stroke: "#94a3b8", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: [m(W / 2 - 0.016), m(-H / 2), m(W / 2), m(-H / 2 + 0.016)], stroke: "rgba(100,116,139,0.35)", strokeWidth: lw, listening: false }));

  // Nam châm ẩn dưới: bóng mờ hai nửa đỏ/xanh qua bìa.
  group.add(new Konva.Rect({ x: m(-0.035), y: m(-0.007), width: m(0.035), height: m(0.014), fill: "rgba(37,99,235,0.2)", listening: false }));
  group.add(new Konva.Rect({ x: 0, y: m(-0.007), width: m(0.035), height: m(0.014), fill: "rgba(220,38,38,0.2)", listening: false }));

  // Mạt sắt: đặt dọc các đường sức lưỡng cực r = Lc·sin²θ (trục là trục nam châm); các hạt sát nhau, hơi lệch.
  const dash = (x: number, y: number, ang: number) => {
    if (Math.abs(x) > W / 2 - 0.004 || Math.abs(y) > H / 2 - 0.004) return;
    const len = 0.0021 + rnd() * 0.0012;
    const c = Math.cos(ang) * len;
    const s = Math.sin(ang) * len;
    group.add(new Konva.Line({ points: [m(x - c), m(y - s), m(x + c), m(y + s)], stroke: "rgba(15,23,42,0.9)", strokeWidth: lw * 1.25, lineCap: "round", listening: false }));
    group.add(new Konva.Line({ points: [m(x - c), m(y - s - 0.0004), m(x + c * 0.2), m(y + s * 0.2 - 0.0004)], stroke: "rgba(148,163,184,0.7)", strokeWidth: lw * 0.4, lineCap: "round", listening: false }));
  };
  const D = 0.035;
  for (const c of [-0.16, -0.09, -0.05, -0.025, -0.008, 0, 0.008, 0.018, 0.032, 0.055, 0.09, 0.15, 0.3]) {
    const rho = Math.sqrt(D * D + c * c);
    const t0 = Math.atan2(c, D);
    for (const sign of [-1, 1]) {
      let t = t0 + 0.02;
      while (t < Math.PI - t0 - 0.02) {
        const x = rho * Math.cos(t) + (rnd() - 0.5) * 0.0012;
        const y = sign * -(rho * Math.sin(t) - c) + (rnd() - 0.5) * 0.0012;
        const tx = -Math.sin(t);
        const ty = sign * -Math.cos(t);
        dash(x, y, Math.atan2(ty, tx) + (rnd() - 0.5) * 0.1);
        t += (0.0034 + rnd() * 0.0012) / rho;
      }
    }
  }
  for (const x of [-0.05, -0.058, -0.068, -0.08, 0.05, 0.058, 0.068, 0.08]) dash(x, (rnd() - 0.5) * 0.002, 0);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.09), y: m(H / 2 + 0.008), width: m(0.18), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, poleLeft: { x: m(-0.035), y: 0 }, poleRight: { x: m(0.035), y: 0 } } };
};
