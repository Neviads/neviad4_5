/* OBJECT-META
{
  "catalog": "Máy bắn / súng bắn bi / pháo",
  "title": "Pháo thí nghiệm: nòng thép trên trục quay, giá pháo có hai bánh và đệm giật, bệ ray trượt và cung chia độ góc bắn",
  "fill": "#3f4a3d",
  "anchor": "Giữa đáy bệ ray, chạm mặt sàn.",
  "useWhen": ["Cần pháo thí nghiệm có nòng quay quanh trục, đệm giật và cung chia độ góc bắn cho bài ném xiên.","Cần nguồn bắn đạn theo góc chọn được, đặt trên bệ ray trượt."],
  "avoidWhen": ["Cần tên lửa hoặc vật phóng tự hành: dùng ten-lua.","Cần xe lăn có đệm khí để xét va chạm, giật lùi: dùng xe-lan.","Cần thiết bị thả vật rơi tự do: dùng nam-cham-dien-giu-bi."],
  "size": { "width": 0.644, "height": 0.278 },
  "parts": [
    { "name": "carriage", "label": "Giá pháo giật lùi", "motion": "slide", "axis": "left", "min": 0, "max": 0.07, "description": "Độ giật lùi của cả giá pháo trên ray sang trái (mét) khi bắn; nòng đi theo." },
    { "name": "barrel", "label": "Nòng pháo", "motion": "rotate", "min": -80, "max": 0, "description": "Góc nâng nòng: nòng chĩa sang phải, giá trị ÂM nâng miệng nòng lên (−θ là nâng θ độ so với phương ngang); 0 là nằm ngang." }
  ],
  "points": [
    { "name": "muzzle", "description": "Miệng nòng khi nằm ngang và chưa giật lùi: nơi đạn xuất phát." },
    { "name": "trunnion", "description": "Trục quay của nòng trên giá pháo." },
    { "name": "base", "description": "Giữa đáy bệ ray." }
  ],
  "notes": "Nòng dài 0,3 m, đường kính ngoài 0,038 m, đặt tâm trục ở cao 0,16 m so với sàn. Góc nâng đọc trên cung chia độ 0–80° gắn vào giá. Khói, lửa và đạn là hiện tượng (metrics.items). fill là màu sơn xanh quân dụng."
}
*/
const makeCannon = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const BARREL = 0.3;
  const TRUN_X = 0.02;
  const TRUN_Y = -0.165;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0015));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const steel = [0, "#1f2937", 0.28, "#9ca3af", 0.55, "#374151", 1, "#0b0f19"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Bệ ray: tấm đế dày với hai thanh ray dọc và hai chặn hai đầu.
  group.add(new Konva.Rect({ x: m(-0.32), y: m(-0.024), width: m(0.64), height: m(0.024), cornerRadius: m(0.004), ...lin(0, m(-0.024), 0, 0, [0, "#94a3b8", 0.2, "#334155", 1, "#0f172a"]), stroke: "#0b1220", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.45, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.3), y: m(-0.031), width: m(0.6), height: m(0.008), ...lin(0, m(-0.031), 0, m(-0.023), [0, "#f8fafc", 1, "#64748b"]), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  for (const x of [-0.3, 0.292]) group.add(new Konva.Rect({ x: m(x), y: m(-0.052), width: m(0.008), height: m(0.03), cornerRadius: m(0.002), fill: "#111827", stroke: "#374151", strokeWidth: lw * 0.7, listening: false }));
  for (let i = 0; i < 14; i += 1) group.add(ln([-0.29 + i * 0.044, -0.008, -0.29 + i * 0.044, -0.003], "rgba(255,255,255,0.25)", lw));

  // BỘ PHẬN TRƯỢT: giá pháo trượt giật lùi trên ray. Gốc nhóm ở chân giữa của giá, trên mặt ray.
  const carriage = new Konva.Group({ x: 0, y: m(-0.031) });
  // Thân giá: hai má thép chữ A và thanh giằng, bọc sơn xanh.
  carriage.add(new Konva.Line({ points: [m(-0.1), 0, m(-0.075), m(TRUN_Y + 0.031 + 0.012), m(0.05), m(TRUN_Y + 0.031 + 0.012), m(0.085), 0], closed: true, lineJoin: "round", ...lin(0, m(TRUN_Y + 0.031), 0, 0, [0, "#7b8c78", 0.3, fill, 1, "#1e271c"]), stroke: "#10170f", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  carriage.add(new Konva.Rect({ x: m(-0.07), y: m(-0.056), width: m(0.14), height: m(0.014), cornerRadius: m(0.003), fill: "#111827", stroke: "#374151", strokeWidth: lw * 0.7, listening: false }));
  carriage.add(ln([-0.07, -0.103, -0.04, -0.103], "rgba(255,255,255,0.4)", lw * 1.2));
  // Hai bánh to có nan, đặt ở hai phía.
  for (const x of [-0.065, 0.05]) {
    carriage.add(new Konva.Circle({ x: m(x), y: m(-0.034), radius: m(0.034), fillRadialGradientStartPoint: { x: m(x - 0.01), y: m(-0.044) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: m(x), y: m(-0.034) }, fillRadialGradientEndRadius: m(0.034), fillRadialGradientColorStops: [0, "#9ca3af", 0.7, "#374151", 1, "#0b0f19"], stroke: "#030712", strokeWidth: lw * 1.3, listening: false }));
    carriage.add(new Konva.Circle({ x: m(x), y: m(-0.034), radius: m(0.0255), stroke: "rgba(255,255,255,0.18)", strokeWidth: lw, listening: false }));
    for (let i = 0; i < 8; i += 1) {
      const a = (i * Math.PI) / 4;
      carriage.add(ln([x + 0.006 * Math.cos(a), -0.034 + 0.006 * Math.sin(a), x + 0.0245 * Math.cos(a), -0.034 + 0.0245 * Math.sin(a)], "#9ca3af", lw * 1.8));
    }
    carriage.add(new Konva.Circle({ x: m(x), y: m(-0.034), radius: m(0.0075), fill: "#d1d5db", stroke: "#030712", strokeWidth: lw, listening: false }));
  }
  // Ống giật lùi (đệm thuỷ lực) dưới nòng, và đuôi giá chĩa xuống để chống giật.
  carriage.add(new Konva.Rect({ x: m(-0.01), y: m(-0.102), width: m(0.18), height: m(0.016), cornerRadius: m(0.008), ...lin(0, m(-0.102), 0, m(-0.086), [0, "#e5e7eb", 0.3, "#6b7280", 1, "#111827"]), stroke: "#030712", strokeWidth: lw, listening: false }));
  carriage.add(new Konva.Rect({ x: m(0.16), y: m(-0.096), width: m(0.05), height: m(0.004), fill: "#cbd5e1", listening: false }));
  carriage.add(new Konva.Line({ points: [m(-0.1), 0, m(-0.17), m(-0.01), m(-0.17), 0], closed: true, fill: "#27301f", stroke: "#10170f", strokeWidth: lw, lineJoin: "round", listening: false }));

  // Cung chia độ gắn trên giá: 0–80°, bán kính 0,1 m quanh trục nòng.
  const SR = 0.115;
  carriage.add(new Konva.Arc({ x: m(TRUN_X), y: m(TRUN_Y + 0.031), innerRadius: m(SR - 0.012), outerRadius: m(SR), angle: 82, rotation: -82, fill: "#f8fafc", stroke: "#94a3b8", strokeWidth: lw * 0.7, listening: false }));
  for (let d = 0; d <= 80; d += 5) {
    const a = (d * Math.PI) / 180;
    const len = d % 10 === 0 ? 0.0088 : 0.005;
    carriage.add(ln([TRUN_X + SR * Math.cos(a), TRUN_Y + 0.031 - SR * Math.sin(a), TRUN_X + (SR - len) * Math.cos(a), TRUN_Y + 0.031 - (SR - len) * Math.sin(a)], "#0f172a", d % 10 === 0 ? lw * 1.2 : lw * 0.7));
  }

  // BỘ PHẬN QUAY: nòng pháo nằm trong nhóm giá nên giật theo giá; gốc nhóm đúng trục nòng.
  const barrel = new Konva.Group({ x: m(TRUN_X), y: m(TRUN_Y + 0.031) });
  barrel.add(new Konva.Line({ points: [m(-0.04), m(-0.019), m(0.0), m(-0.0215), m(BARREL - 0.04), m(-0.0165), m(BARREL), m(-0.0175), m(BARREL), m(0.0175), m(BARREL - 0.04), m(0.0165), m(0), m(0.0215), m(-0.04), m(0.019)], closed: true, lineJoin: "round", ...lin(0, m(-0.0215), 0, m(0.0215), steel), stroke: "#030712", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.003) }, listening: false }));
  for (const x of [0.03, 0.17, BARREL - 0.025]) barrel.add(new Konva.Rect({ x: m(x), y: m(-0.021), width: m(0.011), height: m(0.042), cornerRadius: m(0.0025), ...lin(m(x), 0, m(x + 0.011), 0, [0, "#4b5563", 0.5, "#e5e7eb", 1, "#374151"]), stroke: "#030712", strokeWidth: lw * 0.8, listening: false }));
  barrel.add(new Konva.Rect({ x: m(BARREL - 0.002), y: m(-0.0165), width: m(0.006), height: m(0.033), cornerRadius: m(0.002), fill: "#0b0f19", stroke: "#4b5563", strokeWidth: lw * 0.7, listening: false }));
  barrel.add(new Konva.Rect({ x: m(BARREL + 0.003), y: m(-0.0095), width: m(0.0015), height: m(0.019), fill: "#000", listening: false }));
  barrel.add(ln([-0.03, -0.0185, BARREL - 0.04, -0.0145], "rgba(255,255,255,0.55)", lw * 1.5));
  barrel.add(new Konva.Circle({ x: 0, y: 0, radius: m(0.0145), ...lin(m(-0.0145), m(-0.0145), m(0.0145), m(0.0145), [0, "#f1f5f9", 0.5, "#9ca3af", 1, "#1f2937"]), stroke: "#030712", strokeWidth: lw, listening: false }));
  barrel.add(new Konva.Circle({ x: 0, y: 0, radius: m(0.0055), fill: "#030712", listening: false }));
  carriage.add(barrel);
  group.add(carriage);
  // Má đỡ trục nòng ở phía trước nòng (vẽ đè lên để thấy nòng đặt trong má).
  group.add(new Konva.Circle({ x: m(TRUN_X), y: m(TRUN_Y), radius: m(0.0185), ...lin(m(TRUN_X - 0.0185), m(TRUN_Y - 0.0185), m(TRUN_X + 0.0185), m(TRUN_Y + 0.0185), [0, "#9ca3af", 0.5, fill, 1, "#10170f"]), stroke: "#030712", strokeWidth: lw * 1.2, listening: false }));
  group.add(new Konva.Circle({ x: m(TRUN_X), y: m(TRUN_Y), radius: m(0.006), fill: "#d1d5db", stroke: "#030712", strokeWidth: lw, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.3), y: m(0.006), width: m(0.6), align: "center", text: label, fontSize: m(0.018), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      carriage: { node: carriage, motion: "slide" as const, axis: "left" as const, min: 0, max: 0.07 },
      barrel: { node: barrel, motion: "rotate" as const, min: -80, max: 0 },
    },
    points: { muzzle: { x: m(TRUN_X + BARREL), y: m(TRUN_Y) }, trunnion: { x: m(TRUN_X), y: m(TRUN_Y) }, base: { x: 0, y: 0 } },
  };
};
