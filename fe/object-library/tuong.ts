/* OBJECT-META
{
  "catalog": "Tường / vách cứng",
  "title": "Tường gạch trát xi măng trên móng bê tông, có đệm cao su ở mặt va chạm",
  "fill": "#b45a3c",
  "anchor": "Giữa chân tường, chạm nền.",
  "useWhen": ["Cần vách cứng cố định cho vật va chạm từ bên phải, mặt va chạm có đệm cao su.","Cần mốc chân tường, mép trên và dưới mặt va chạm để đặt vật chạm đúng."],
  "avoidWhen": ["Cần vách đứng yên trên đường ray có lò xo va chạm: dùng xe-lan hoặc xe-dem-khi cho đầu đệm.","Cần mặt phẳng nghiêng hay mặt sàn: dùng mat-nghieng hoặc ban-thi-nghiem.","Mặt va chạm chỉ quay sang phải, vật tới từ bên trái phải lật cảnh."],
  "size": { "width": 0.34, "height": 1.0 },
  "parts": [],
  "points": [
    { "name": "base", "description": "Giữa chân tường." },
    { "name": "faceTop", "description": "Mép trên của mặt va chạm (phía bên phải)." },
    { "name": "faceBottom", "description": "Mép dưới của mặt va chạm, sát nền." },
    { "name": "bumper", "description": "Giữa đệm cao su trên mặt va chạm." }
  ],
  "notes": "Mặt va chạm quay sang phải: vật chuyển động từ bên phải tới sẽ chạm đệm cao su ở x ≈ +0,13 m. Phía sau (bên trái) vẽ các nét gạch chéo ký hiệu vật cố định. fill là màu gạch."
}
*/
const makeRigidWall = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.26;
  const H = 0.94;
  const FOOT_H = 0.06;
  const BRICK_H = 0.047;
  const BRICK_W = 0.1;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.002));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const shade = (i: number) => ["#b45a3c", "#a54f33", "#bf6444", "#9c492f", "#b8603f"][((i % 5) + 5) % 5];

  const group = new Konva.Group({ x: p.x, y: p.y });
  const left = -W / 2;

  // Móng bê tông.
  group.add(new Konva.Rect({ x: m(-0.17), y: m(-FOOT_H), width: m(0.34), height: m(FOOT_H), cornerRadius: m(0.003), ...lin(0, m(-FOOT_H), 0, 0, [0, "#cbd5e1", 1, "#7b8794"]), stroke: "#475569", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.015), shadowOpacity: 0.35, listening: false }));
  for (let i = 0; i < 26; i += 1) {
    group.add(new Konva.Circle({ x: m(-0.16 + ((i * 37) % 32) * 0.01), y: m(-0.052 + ((i * 17) % 6) * 0.0085), radius: m(0.0014 + (i % 3) * 0.0006), fill: "rgba(71,85,105,0.45)", listening: false }));
  }

  // Thân tường: vữa nền rồi các hàng gạch so le.
  const bodyTop = -FOOT_H - H;
  group.add(new Konva.Rect({ x: m(left), y: m(bodyTop), width: m(W), height: m(H), fill: "#d3cbbf", stroke: "#6b5b4a", strokeWidth: lw, listening: false }));
  const rows = Math.floor(H / BRICK_H);
  for (let r = 0; r < rows; r += 1) {
    const y = -FOOT_H - (r + 1) * BRICK_H;
    const offset = r % 2 === 0 ? 0 : BRICK_W / 2;
    for (let x = left - offset; x < left + W; x += BRICK_W) {
      const x0 = Math.max(x + 0.004, left);
      const x1 = Math.min(x + BRICK_W - 0.004, left + W);
      if (x1 - x0 < 0.012) continue;
      group.add(new Konva.Rect({ x: m(x0), y: m(y + 0.004), width: m(x1 - x0), height: m(BRICK_H - 0.008), ...lin(0, 0, 0, m(BRICK_H - 0.008), [0, "rgba(255,255,255,0.18)", 0.15, shade(r * 3 + Math.round(x * 40)), 1, "rgba(60,20,10,0.35)"]), fill: shade(r * 3 + Math.round(x * 40)), listening: false }));
    }
  }
  // Mũ tường xi măng.
  group.add(new Konva.Rect({ x: m(left - 0.012), y: m(bodyTop - 0.018), width: m(W + 0.024), height: m(0.02), cornerRadius: m(0.003), ...lin(0, m(bodyTop - 0.018), 0, m(bodyTop + 0.002), [0, "#e2e8f0", 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw, listening: false }));

  // Đệm cao su ở mặt va chạm (bên phải).
  const bx = left + W - 0.006;
  const by0 = -FOOT_H - 0.78;
  group.add(new Konva.Rect({ x: m(bx), y: m(by0), width: m(0.026), height: m(0.62), cornerRadius: m(0.006), ...lin(m(bx), 0, m(bx + 0.026), 0, [0, "#334155", 0.45, "#94a3b8", 1, "#475569"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.35, listening: false }));
  for (let i = 0; i < 11; i += 1) {
    group.add(new Konva.Line({ points: [m(bx + 0.004), m(by0 + 0.02 + i * 0.056), m(bx + 0.022), m(by0 + 0.02 + i * 0.056)], stroke: "rgba(15,23,42,0.35)", strokeWidth: lw, listening: false }));
  }

  // Nét gạch chéo ở sau tường: ký hiệu vật cố định.
  for (let i = 0; i < 18; i += 1) {
    const y = -FOOT_H - i * 0.05;
    group.add(new Konva.Line({ points: [m(left), m(y), m(left - 0.035), m(y + 0.035)], stroke: "rgba(226,232,240,0.5)", strokeWidth: lw, lineCap: "round", listening: false }));
  }
  group.add(new Konva.Line({ points: [m(left), m(-FOOT_H), m(left), m(bodyTop)], stroke: "#e2e8f0", strokeWidth: lw * 1.4, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.17), y: m(0.012), width: m(0.34), align: "center", text: label, fontSize: m(0.03), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: {
      base: { x: 0, y: 0 },
      faceTop: { x: m(bx + 0.026), y: m(by0) },
      faceBottom: { x: m(bx + 0.026), y: m(-FOOT_H) },
      bumper: { x: m(bx + 0.026), y: m(by0 + 0.31) },
    },
  };
};
