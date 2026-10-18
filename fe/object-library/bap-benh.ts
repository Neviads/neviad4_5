/* OBJECT-META
{
  "catalog": "Bập bênh",
  "title": "Bập bênh sân chơi: ván gỗ dài 2,4 m có hai ghế ngồi và tay vịn, trụ đỡ chữ A bằng thép sơn và đệm cao su dưới hai đầu",
  "fill": "#c8863a",
  "anchor": "Trục quay ở giữa ván.",
  "useWhen": ["Cần bập bênh sân chơi ván dài 2,4 m quay quanh trục giữa, minh hoạ đòn bẩy và momen lực.","Cần hai ghế cách trục 1,0 m (seatLeft, seatRight) để đặt người ngồi riêng."],
  "avoidWhen": ["Cần cân đòn hai đĩa trên bàn thí nghiệm: dùng can-don.","Vật cao 0,78 m, rộng 2,7 m, quá lớn so với dụng cụ trên bàn.","Không kèm người ngồi, phải đặt người thành vật riêng."],
  "size": { "width": 2.7, "height": 0.78 },
  "parts": [
    { "name": "plank", "label": "Ván bập bênh", "motion": "rotate", "min": -18, "max": 18, "description": "Góc nghiêng của ván quanh trục, độ; dương là đầu phải đi xuống." }
  ],
  "points": [
    { "name": "pivot", "description": "Trục quay giữa ván." },
    { "name": "seatLeft", "description": "Mặt ghế bên trái khi ván nằm ngang, cách trục 1,0 m." },
    { "name": "seatRight", "description": "Mặt ghế bên phải khi ván nằm ngang, cách trục 1,0 m." },
    { "name": "ground", "description": "Mặt đất dưới trụ đỡ." }
  ],
  "notes": "Ván dài 2,4 m dày 0,06 m; trục cao 0,48 m trên mặt đất. Hai ghế cách trục 1,0 m, tay vịn cao 0,25 m. Người ngồi là vật riêng đặt tại seatLeft, seatRight. fill là màu gỗ của ván."
}
*/
const makeSeesaw = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const HALF = 1.2;
  const PIVOT_Y = -0.48;
  const SEAT = 1.0;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.004));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Mặt đất và hai đệm cao su dưới hai đầu ván.
  group.add(new Konva.Rect({ x: m(-1.35), y: 0, width: m(2.7), height: m(0.03), ...lin(0, 0, 0, m(0.03), [0, "#475569", 1, "#0f172a"]), listening: false }));
  group.add(new Konva.Line({ points: [m(-1.35), 0, m(1.35), 0], stroke: "#64748b", strokeWidth: lw, listening: false }));
  for (const s of [-1, 1]) {
    group.add(new Konva.Rect({ x: m(s * 1.12 - 0.05), y: m(-0.14), width: m(0.1), height: m(0.14), cornerRadius: m(0.012), ...lin(m(s * 1.12 - 0.05), 0, m(s * 1.12 + 0.05), 0, [0, "#1f2937", 0.5, "#4b5563", 1, "#0b0f19"]), stroke: "#000", strokeWidth: lw * 0.7, listening: false }));
    for (let i = 0; i < 3; i += 1) group.add(new Konva.Line({ points: [m(s * 1.12 - 0.045), m(-0.035 - i * 0.035), m(s * 1.12 + 0.045), m(-0.035 - i * 0.035)], stroke: "rgba(255,255,255,0.12)", strokeWidth: lw * 0.6, listening: false }));
  }

  // Trụ đỡ chữ A: hai chân thép chéo, thanh giằng và đế bê tông.
  for (const s of [-1, 1]) {
    group.add(new Konva.Line({ points: [m(s * 0.02), m(PIVOT_Y + 0.02), m(s * 0.2), m(-0.02)], stroke: "#0b1226", strokeWidth: m(0.064), lineCap: "round", listening: false }));
    group.add(new Konva.Line({ points: [m(s * 0.02), m(PIVOT_Y + 0.02), m(s * 0.2), m(-0.02)], stroke: "#2563eb", strokeWidth: m(0.052), lineCap: "round", listening: false }));
    group.add(new Konva.Line({ points: [m(s * 0.02 - 0.012), m(PIVOT_Y + 0.03), m(s * 0.2 - 0.012), m(-0.02)], stroke: "rgba(255,255,255,0.35)", strokeWidth: m(0.008), lineCap: "round", listening: false }));
    group.add(new Konva.Rect({ x: m(s * 0.2 - 0.07), y: m(-0.03), width: m(0.14), height: m(0.03), cornerRadius: m(0.004), ...lin(0, m(-0.03), 0, 0, [0, "#cbd5e1", 1, "#6b7280"]), stroke: "#475569", strokeWidth: lw * 0.7, listening: false }));
  }
  group.add(new Konva.Line({ points: [m(-0.1), m(-0.17), m(0.1), m(-0.17)], stroke: "#0b1226", strokeWidth: m(0.034), lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(-0.1), m(-0.17), m(0.1), m(-0.17)], stroke: "#1d4ed8", strokeWidth: m(0.024), lineCap: "round", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.07), y: m(PIVOT_Y - 0.045), width: m(0.14), height: m(0.09), cornerRadius: m(0.014), ...lin(m(-0.07), 0, m(0.07), 0, [0, "#1e3a8a", 0.3, "#3b82f6", 1, "#0b1e63"]), stroke: "#0b1226", strokeWidth: lw, listening: false }));

  // BỘ PHẬN QUAY: ván gỗ, hai ghế và tay vịn; gốc nhóm đúng trục quay.
  const plank = new Konva.Group({ x: 0, y: m(PIVOT_Y) });
  plank.add(new Konva.Rect({ x: m(-HALF), y: m(-0.03), width: m(2 * HALF), height: m(0.06), cornerRadius: m(0.012), ...lin(0, m(-0.03), 0, m(0.03), [0, "#e7b274", 0.18, fill, 0.85, "#8a5524", 1, "#5a3512"]), stroke: "#3b220c", strokeWidth: lw * 0.8, shadowColor: "#000", shadowBlur: m(0.02), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.008) }, listening: false }));
  for (let i = 0; i < 5; i += 1) plank.add(new Konva.Line({ points: [m(-HALF + 0.03), m(-0.02 + i * 0.01), m(-0.4), m(-0.0195 + i * 0.01), m(0.4), m(-0.021 + i * 0.01), m(HALF - 0.03), m(-0.02 + i * 0.01)], stroke: i % 2 ? "rgba(59,34,12,0.4)" : "rgba(255,230,190,0.35)", strokeWidth: lw * 0.55, tension: 0.4, listening: false }));
  plank.add(new Konva.Line({ points: [m(-HALF + 0.03), m(-0.0255), m(HALF - 0.03), m(-0.0255)], stroke: "rgba(255,255,255,0.45)", strokeWidth: lw * 0.9, lineCap: "round", listening: false }));
  // Hai ghế hộp, và tay vịn chữ U ở phía sau lưng người ngồi (hướng vào giữa).
  for (const s of [-1, 1]) {
    plank.add(new Konva.Rect({ x: m(s * SEAT - 0.17), y: m(-0.075), width: m(0.34), height: m(0.045), cornerRadius: m(0.012), ...lin(0, m(-0.075), 0, m(-0.03), [0, "#fca5a5", 0.2, "#dc2626", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.8, listening: false }));
    plank.add(new Konva.Line({ points: [m(s * (SEAT + 0.12)), m(-0.075), m(s * (SEAT + 0.12)), m(-0.27), m(s * (SEAT + 0.04)), m(-0.27), m(s * (SEAT + 0.04)), m(-0.075)], stroke: "#0b0f19", strokeWidth: m(0.022), lineCap: "round", lineJoin: "round", listening: false }));
    plank.add(new Konva.Line({ points: [m(s * (SEAT + 0.12)), m(-0.075), m(s * (SEAT + 0.12)), m(-0.27), m(s * (SEAT + 0.04)), m(-0.27), m(s * (SEAT + 0.04)), m(-0.075)], stroke: "#9ca3af", strokeWidth: m(0.0135), lineCap: "round", lineJoin: "round", listening: false }));
    plank.add(new Konva.Line({ points: [m(s * (SEAT + 0.105)), m(-0.09), m(s * (SEAT + 0.105)), m(-0.255)], stroke: "rgba(255,255,255,0.55)", strokeWidth: m(0.0035), lineCap: "round", listening: false }));
    plank.add(new Konva.Rect({ x: m(s * (SEAT + 0.12) - 0.012), y: m(-0.18), width: m(0.024), height: m(0.08), cornerRadius: m(0.01), fill: "#111827", stroke: "#000", strokeWidth: lw * 0.6, listening: false }));
  }
  group.add(plank);
  // Chốt trục ở giữa ván.
  group.add(new Konva.Circle({ x: 0, y: m(PIVOT_Y), radius: m(0.034), ...lin(m(-0.034), m(-0.034), m(0.034), m(0.034), [0, "#f8fafc", 0.5, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: m(PIVOT_Y), radius: m(0.012), fill: "#0f172a", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.4), y: m(0.04), width: m(0.8), align: "center", text: label, fontSize: m(0.07), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { plank: { node: plank, motion: "rotate" as const, min: -18, max: 18 } },
    points: { pivot: { x: 0, y: m(PIVOT_Y) }, seatLeft: { x: m(-SEAT), y: m(PIVOT_Y - 0.075) }, seatRight: { x: m(SEAT), y: m(PIVOT_Y - 0.075) }, ground: { x: 0, y: 0 } },
  };
};
