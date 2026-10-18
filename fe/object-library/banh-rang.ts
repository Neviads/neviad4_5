/* OBJECT-META
{
  "catalog": "Bánh răng, thanh răng",
  "title": "Bánh răng trụ 20 răng ăn khớp với thanh răng thẳng, gá trên tấm đế có hai ngàm dẫn hướng cho thanh răng",
  "fill": "#d4a73a",
  "anchor": "Tâm trục bánh răng.",
  "useWhen": ["Cần bánh răng 20 răng mô đun 6 mm ăn khớp thanh răng, biến quay thành tịnh tiến.","Cần minh hoạ bánh (gear) quay kéo thanh răng (rack) trượt trong hai ngàm dẫn."],
  "avoidWhen": ["Cần bánh đà hoặc vô lăng không răng: dùng banh-da.","Chỉ một bánh răng và một thanh răng, không có cặp bánh răng ăn khớp nhau.","Số răng và mô đun cố định, không đổi kích thước được."],
  "size": { "width": 0.451, "height": 0.18 },
  "parts": [
    { "name": "gear", "label": "Bánh răng", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của bánh răng quanh trục, độ theo chiều kim đồng hồ. Ăn khớp không trượt: thanh răng dịch sang phải x thì bánh răng quay x / 0,06 (rad)." },
    { "name": "rack", "label": "Thanh răng", "motion": "slide", "axis": "right", "min": -0.1, "max": 0.1, "description": "Độ dịch của thanh răng sang phải (mét) so với vị trí một khe răng đối diện tâm bánh răng." }
  ],
  "points": [
    { "name": "axis", "description": "Tâm trục bánh răng." },
    { "name": "pitchPoint", "description": "Điểm ăn khớp trên đường chia (bán kính 0,06 m dưới tâm bánh răng)." },
    { "name": "rackEnd", "description": "Đầu phải của thanh răng ở vị trí nghỉ." }
  ],
  "notes": "Mô đun 6 mm, bước răng 18,85 mm, 20 răng, bán kính chia 0,06 m, bán kính đỉnh 0,066 m. Thanh răng dài 0,44 m; răng thanh răng đối nhau với khe giữa hai răng bánh ở điểm ăn khớp lúc nghỉ. fill là màu đồng thau."
}
*/
const makeGearRack = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const N = 20;
  const MOD = 0.006;
  const RP = (N * MOD) / 2;
  const ADD = MOD;
  const DED = MOD * 1.2;
  const PITCH = Math.PI * MOD;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const brass = [0, "#7c5a1a", 0.28, "#fff1bd", 0.55, fill, 1, "#5e4210"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Tấm đế thép và hai ngàm dẫn hướng giữ thanh răng.
  group.add(new Konva.Rect({ x: m(-0.22), y: m(0.098), width: m(0.44), height: m(0.012), cornerRadius: m(0.003), ...lin(0, m(0.098), 0, m(0.11), [0, "#94a3b8", 1, "#334155"]), stroke: "#0b1220", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  for (const x of [-0.13, 0.13]) {
    group.add(new Konva.Rect({ x: m(x - 0.022), y: m(RP + 0.0085), width: m(0.044), height: m(0.0255), cornerRadius: m(0.003), ...lin(0, m(RP + 0.0085), 0, m(RP + 0.034), [0, "#475569", 0.3, "#cbd5e1", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.022), y: m(RP + 0.034), width: m(0.044), height: m(0.01), fill: "#1e293b", listening: false }));
  }
  // Giá đỡ bánh răng: tấm chữ nhật với trục và ổ bi.
  group.add(new Konva.Rect({ x: m(-0.024), y: m(-0.07), width: m(0.048), height: m(0.16), cornerRadius: m(0.004), ...lin(m(-0.024), 0, m(0.024), 0, [0, "#475569", 0.3, "#cbd5e1", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.024), y: m(0.09), width: m(0.048), height: m(0.01), fill: "#1e293b", listening: false }));

  // BỘ PHẬN TRƯỢT: thanh răng với răng hình thang quay lên; răng chạy dài ra hai phía nên khi trượt vẫn đủ răng.
  const rack = new Konva.Group({ x: 0, y: 0 });
  const topY = RP - ADD + 0.0015;
  const rootY = RP + DED;
  const barBottom = rootY + 0.022;
  rack.add(new Konva.Rect({ x: m(-0.22), y: m(rootY - 0.0004), width: m(0.44), height: m(barBottom - rootY), ...lin(0, m(rootY), 0, m(barBottom), [0, "#e2e8f0", 0.2, fill, 0.85, "#7c5a1a", 1, "#5e4210"]), stroke: "#5e4210", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.35, listening: false }));
  const pts: number[] = [];
  const teeth = Math.ceil(0.44 / PITCH);
  for (let k = -Math.ceil(teeth / 2); k <= Math.ceil(teeth / 2); k += 1) {
    const cx = (k + 0.5) * PITCH;
    if (cx < -0.218 || cx > 0.218) continue;
    pts.push(m(cx - PITCH * 0.45), m(rootY), m(cx - PITCH * 0.19), m(topY), m(cx + PITCH * 0.19), m(topY), m(cx + PITCH * 0.45), m(rootY));
  }
  rack.add(new Konva.Line({ points: [m(-0.22), m(rootY), ...pts, m(0.22), m(rootY)], ...lin(0, m(topY), 0, m(rootY), [0, "#fff1bd", 0.4, fill, 1, "#6b4a10"]), closed: false, fill, stroke: "#5e4210", strokeWidth: lw, lineJoin: "round", listening: false }));
  rack.add(new Konva.Line({ points: [m(-0.21), m(rootY + 0.0035), m(0.21), m(rootY + 0.0035)], stroke: "rgba(255,255,255,0.45)", strokeWidth: lw, listening: false }));
  group.add(rack);

  // BỘ PHẬN QUAY: bánh răng 20 răng, lỗ giảm nhẹ, moay-ơ và rãnh then.
  const gear = new Konva.Group({ x: 0, y: 0 });
  const outline: number[] = [];
  const rRoot = RP - DED;
  const rTip = RP + ADD;
  for (let k = 0; k < N; k += 1) {
    const base = (k * 2 * Math.PI) / N;
    const dRoot = (PITCH * 0.5) / RP * 0.62;
    const dTip = (PITCH * 0.5) / RP * 0.36;
    const a = (ang: number, r: number): [number, number] => [m(r * Math.cos(ang)), m(r * Math.sin(ang))];
    outline.push(...a(base - dRoot * 1.1, rRoot), ...a(base - dRoot, rRoot), ...a(base - dTip, rTip), ...a(base + dTip, rTip), ...a(base + dRoot, rRoot), ...a(base + dRoot * 1.1, rRoot));
  }
  gear.add(new Konva.Line({ points: outline, closed: true, lineJoin: "round", ...lin(m(-RP), m(-RP), m(RP), m(RP), [0, "#fff1bd", 0.35, fill, 1, "#5e4210"]), stroke: "#5e4210", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  gear.add(new Konva.Circle({ radius: m(RP - DED - 0.0035), stroke: "rgba(94,66,16,0.55)", strokeWidth: lw * 0.8, listening: false }));
  for (let i = 0; i < 5; i += 1) {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    gear.add(new Konva.Circle({ x: m(0.0285 * Math.cos(a)), y: m(0.0285 * Math.sin(a)), radius: m(0.0092), fill: "#0b1220", stroke: "#5e4210", strokeWidth: lw, listening: false }));
    gear.add(new Konva.Arc({ x: m(0.0285 * Math.cos(a)), y: m(0.0285 * Math.sin(a)), innerRadius: m(0.0074), outerRadius: m(0.0092), angle: 100, rotation: 200, fill: "rgba(255,241,189,0.4)", listening: false }));
  }
  gear.add(new Konva.Circle({ radius: m(0.0135), ...lin(m(-0.0135), m(-0.0135), m(0.0135), m(0.0135), brass), stroke: "#4a3510", strokeWidth: lw, listening: false }));
  gear.add(new Konva.Circle({ radius: m(0.0058), fill: "#0b0f19", listening: false }));
  gear.add(new Konva.Rect({ x: m(-0.0016), y: m(-0.0098), width: m(0.0032), height: m(0.0052), fill: "#0b0f19", listening: false }));
  gear.add(new Konva.Circle({ x: 0, y: m(-RP + 0.012), radius: m(0.0024), fill: "#dc2626", listening: false }));
  group.add(gear);
  group.add(new Konva.Circle({ radius: m(0.0072), ...lin(m(-0.0072), m(-0.0072), m(0.0072), m(0.0072), [0, "#f8fafc", 1, "#475569"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.2), y: m(0.118), width: m(0.4), align: "center", text: label, fontSize: m(0.016), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      gear: { node: gear, motion: "rotate" as const, min: 0, max: 360 },
      rack: { node: rack, motion: "slide" as const, axis: "right" as const, min: -0.1, max: 0.1 },
    },
    points: { axis: { x: 0, y: 0 }, pitchPoint: { x: 0, y: m(RP) }, rackEnd: { x: m(0.22), y: m(rootY) } },
  };
};
