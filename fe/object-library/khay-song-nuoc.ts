/* OBJECT-META
{
  "catalog": "Khay / chậu sóng nước",
  "title": "Khay sóng nước nhìn từ trên xuống: khay kính trong nước nông, thành khung gỗ, dải xốp hấp thụ sóng quanh mép, thước và hai chân",
  "fill": "#7dd3fc",
  "anchor": "Tâm khay sóng nước.",
  "useWhen": ["Cần khay sóng nước nhìn từ trên xuống, có hai điểm đặt nguồn cách 0,06 m để làm giao thoa sóng.", "Cảnh vẽ vân giao thoa hay sóng tròn lan trên mặt nước nông, có dải xốp chống phản xạ."],
  "avoidWhen": ["Cần nguồn sóng (cần rung, mũi nhọn) đi kèm: dùng nguon-song-nuoc; khay không có sẵn nguồn.", "Cần nhìn ngang để thấy độ sâu nước hay sóng dọc/ngang trên dây: khay chỉ nhìn từ trên xuống, nước sâu 5 mm."],
  "size": { "width": 0.58, "height": 0.46 },
  "parts": [],
  "points": [
    { "name": "center", "description": "Tâm khay: nước phẳng, nơi sóng lan ra." },
    { "name": "source1", "description": "Vị trí đặt nguồn sóng thứ nhất (trái)." },
    { "name": "source2", "description": "Vị trí đặt nguồn sóng thứ hai (phải), cách source1 0,06 m." },
    { "name": "cornerTopLeft", "description": "Góc trên trái vùng nước." },
    { "name": "cornerBottomRight", "description": "Góc dưới phải vùng nước." }
  ],
  "notes": "Vùng nước 0,5 m × 0,4 m sâu 5 mm, nhìn thẳng từ trên xuống. Dải xốp zig-zag quanh bốn thành hấp thụ sóng để không phản xạ. Sóng nước, vân giao thoa do cảnh vẽ chồng lên mặt nước (metrics.items). fill là màu nước."
}
*/
const makeRippleTank = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.5;
  const H = 0.4;
  const FRAME = 0.035;
  const FOAM = 0.02;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Khung gỗ ngoài với bốn chân vặn chỉnh phẳng ở các góc.
  const FW = W + 2 * FRAME;
  const FH = H + 2 * FRAME;
  group.add(new Konva.Rect({ x: m(-FW / 2), y: m(-FH / 2), width: m(FW), height: m(FH), cornerRadius: m(0.012), ...lin(m(-FW / 2), m(-FH / 2), m(FW / 2), m(FH / 2), [0, "#e7b274", 0.3, "#c8873f", 1, "#6b4219"]), stroke: "#3b220c", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.024), shadowOpacity: 0.5, shadowOffset: { x: m(0.005), y: m(0.012) }, listening: false }));
  for (let i = 0; i < 10; i += 1) group.add(ln([-FW / 2 + 0.01, -FH / 2 + 0.006 + i * 0.0065, 0, -FH / 2 + 0.0065 + i * 0.0065, FW / 2 - 0.01, -FH / 2 + 0.006 + i * 0.0065], i % 2 ? "rgba(59,34,12,0.3)" : "rgba(255,235,200,0.28)", lw * 0.6));
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    group.add(new Konva.Circle({ x: m(sx * (FW / 2 - 0.016)), y: m(sy * (FH / 2 - 0.016)), radius: m(0.0095), ...lin(m(sx * (FW / 2 - 0.016) - 0.0095), 0, m(sx * (FW / 2 - 0.016) + 0.0095), 0, [0, "#e5e7eb", 0.5, "#9ca3af", 1, "#374151"]), stroke: "#111827", strokeWidth: lw, listening: false }));
    group.add(new Konva.Circle({ x: m(sx * (FW / 2 - 0.016)), y: m(sy * (FH / 2 - 0.016)), radius: m(0.0036), fill: "#111827", listening: false }));
  }

  // Lòng khay kính: nước trong có sắc xanh, đáy tối ở gần mép, sáng ở giữa vì đèn chiếu từ trên.
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(-H / 2), width: m(W), height: m(H), cornerRadius: m(0.003), fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.33), fillRadialGradientColorStops: [0, "rgba(186,230,253,0.95)", 0.6, fill, 1, "rgba(14,116,144,0.9)"], stroke: "#0c4a6e", strokeWidth: lw * 1.2, listening: false }));
  // Dải xốp hấp thụ sóng zig-zag chạy dọc bốn thành.
  const foam = (x1: number, y1: number, x2: number, y2: number, horizontal: boolean) => {
    const n = Math.round((horizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1)) / 0.012);
    const pts: number[] = [];
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      const jag = (i % 2 === 0 ? 0 : FOAM * 0.9);
      if (horizontal) pts.push(x1 + (x2 - x1) * t, y1 + (y2 > y1 ? 1 : -1) * jag * 0 + (i % 2 === 0 ? 0 : (y1 < 0 ? FOAM : -FOAM)));
      else pts.push(x1 + (i % 2 === 0 ? 0 : (x1 < 0 ? FOAM : -FOAM)), y1 + (y2 - y1) * t);
    }
    return pts;
  };
  const bands: { pts: number[]; rect: [number, number, number, number] }[] = [
    { pts: foam(-W / 2, -H / 2, W / 2, -H / 2, true), rect: [-W / 2, -H / 2, W, FOAM * 0.45] },
    { pts: foam(-W / 2, H / 2, W / 2, H / 2, true), rect: [-W / 2, H / 2 - FOAM * 0.45, W, FOAM * 0.45] },
    { pts: foam(-W / 2, -H / 2, -W / 2, H / 2, false), rect: [-W / 2, -H / 2, FOAM * 0.45, H] },
    { pts: foam(W / 2, -H / 2, W / 2, H / 2, false), rect: [W / 2 - FOAM * 0.45, -H / 2, FOAM * 0.45, H] },
  ];
  for (const band of bands) {
    group.add(new Konva.Rect({ x: m(band.rect[0]), y: m(band.rect[1]), width: m(band.rect[2]), height: m(band.rect[3]), fill: "#d6d3d1", stroke: "#78716c", strokeWidth: lw * 0.6, listening: false }));
    group.add(new Konva.Line({ points: band.pts.map(m), stroke: "#a8a29e", strokeWidth: lw * 2.4, lineJoin: "round", lineCap: "round", listening: false }));
    group.add(new Konva.Line({ points: band.pts.map(m), stroke: "rgba(255,255,255,0.55)", strokeWidth: lw * 0.9, lineJoin: "round", lineCap: "round", listening: false }));
  }
  // Mặt nước phản chiếu đèn: vệt sáng và gợn phẳng.
  group.add(new Konva.Ellipse({ x: m(-0.09), y: m(-0.075), radiusX: m(0.11), radiusY: m(0.045), rotation: -18, fill: "rgba(255,255,255,0.18)", listening: false }));
  group.add(new Konva.Circle({ x: 0, y: 0, radius: m(0.0042), stroke: "rgba(15,23,42,0.35)", strokeWidth: lw, listening: false }));
  // Hai điểm đặt nguồn (chốt kẹp mũi nhọn) cách nhau 6 cm, ở sát thành trên.
  for (const x of [-0.03, 0.03]) {
    group.add(new Konva.Circle({ x: m(x), y: m(-H / 2 + 0.06), radius: m(0.0042), fill: "#dc2626", stroke: "#450a0a", strokeWidth: lw * 0.8, shadowColor: "#ef4444", shadowBlur: m(0.008), shadowOpacity: 0.7, listening: false }));
  }
  // Thước mm dán theo thành dưới khung.
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(FH / 2 - 0.0285), width: m(W), height: m(0.0185), fill: "#fefce8", stroke: "#a16207", strokeWidth: lw * 0.6, listening: false }));
  for (let cm = 0; cm <= 50; cm += 1) {
    const x = -W / 2 + cm / 100;
    const ten = cm % 10 === 0;
    group.add(ln([x, FH / 2 - 0.0285, x, FH / 2 - 0.0285 + (ten ? 0.0085 : cm % 5 === 0 ? 0.0055 : 0.0034)], "#0f172a", ten ? lw : lw * 0.55));
    if (ten) group.add(new Konva.Text({ x: m(x - 0.012), y: m(FH / 2 - 0.0195), width: m(0.024), align: "center", text: String(cm), fontSize: m(0.0065), fontStyle: "bold", fill: "#0f172a", listening: false }));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-0.2), y: m(FH / 2 + 0.01), width: m(0.4), align: "center", text: label, fontSize: m(0.016), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: { center: { x: 0, y: 0 }, source1: { x: m(-0.03), y: m(-H / 2 + 0.06) }, source2: { x: m(0.03), y: m(-H / 2 + 0.06) }, cornerTopLeft: { x: m(-W / 2), y: m(-H / 2) }, cornerBottomRight: { x: m(W / 2), y: m(H / 2) } },
  };
};
