/* OBJECT-META
{
  "catalog": "Thang máy (cabin + cáp)",
  "title": "Mô hình thang máy: giếng thang thép có ray dẫn hướng, buồng thang có cửa trượt, đối trọng và cáp vắt qua puly kéo ở phòng máy",
  "fill": "#cbd5e1",
  "anchor": "Tâm puly kéo (điểm treo cáp) ở phòng máy trên cùng.",
  "useWhen": ["Cần mô hình thang máy có buồng, đối trọng và cáp vắt qua puly, cabin lên bao nhiêu đối trọng xuống bấy nhiêu.","Cần ba tầng cách nhau 0,3 m để mô tả chuyển động của buồng thang hoặc lực căng cáp."],
  "avoidWhen": ["Cần chỉ một ròng rọc cố định treo hai vật (máy Atwood): dùng rong-roc-co-dinh.","Cần buồng thang đứng yên đo số chỉ lực kế hay cân: dùng vật khác, thang này luôn có cabin và đối trọng cùng chuyển động.","Cabin và đối trọng chỉ chạy tối đa 0,6 m, không đủ cho tòa nhà cao hơn."],
  "size": { "width": 0.34, "height": 1.14 },
  "parts": [
    { "name": "cabin", "label": "Buồng thang", "motion": "slide", "axis": "up", "min": 0, "max": 0.6, "description": "Độ nâng của buồng thang lên so với tầng 1 (mét); cáp phía buồng ngắn lại đúng chừng đó." },
    { "name": "counterweight", "label": "Đối trọng", "motion": "slide", "axis": "down", "min": 0, "max": 0.6, "description": "Độ hạ của đối trọng xuống so với vị trí cao nhất (mét); khi buồng đi lên h thì đối trọng đi xuống h, nên cabin và counterweight lấy cùng một giá trị." }
  ],
  "points": [
    { "name": "sheave", "description": "Tâm puly kéo ở phòng máy." },
    { "name": "cabinFloor1", "description": "Sàn buồng thang ở tầng 1 (vị trí thấp nhất)." },
    { "name": "cabinFloor3", "description": "Sàn buồng thang khi nâng 0,6 m, ngang tầng 3." },
    { "name": "pit", "description": "Đáy hố thang." }
  ],
  "notes": "Giếng cao 1,0 m dưới puly, rộng 0,24 m; buồng thang 0,1 m × 0,16 m (nặng), đối trọng 0,05 m × 0,2 m. Ba tầng cách nhau 0,3 m (tầng 1 ở y = 0,96 m dưới puly). Hai nhánh cáp đi từ buồng và đối trọng lên vắt qua puly nên cabin lên bao nhiêu thì đối trọng xuống bấy nhiêu. fill là màu thép của khung và cabin."
}
*/
const makeElevator = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const SHEAVE_R = 0.04;
  const FLOOR_Y = 0.96;
  const CAB_W = 0.1;
  const CAB_H = 0.16;
  const CW_W = 0.05;
  const CW_H = 0.2;
  const CW_REST_TOP = 0.08;
  const CAB_X = -SHEAVE_R;
  const CW_X = SHEAVE_R;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0016));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, fill, 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Hố thang: đáy bê tông có hai lò xo giảm chấn, hai cột thép dàn lưới và dầm ngang.
  group.add(new Konva.Rect({ x: m(-0.18), y: m(FLOOR_Y), width: m(0.36), height: m(0.04), cornerRadius: m(0.004), ...lin(0, m(FLOOR_Y), 0, m(FLOOR_Y + 0.04), [0, "#d1d5db", 1, "#6b7280"]), stroke: "#374151", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.4, listening: false }));
  for (const x of [CAB_X, CW_X]) {
    for (let i = 0; i < 5; i += 1) group.add(ln([x - 0.012 + (i % 2) * 0.004, FLOOR_Y - 0.002 - i * 0.0046, x + 0.012 - (i % 2) * 0.004, FLOOR_Y - 0.0046 - i * 0.0046], "#cbd5e1", lw * 1.3));
  }
  for (const x of [-0.125, 0.125]) {
    group.add(new Konva.Rect({ x: m(x - 0.011), y: m(-0.09), width: m(0.022), height: m(FLOOR_Y + 0.09), fill: "rgba(148,163,184,0.18)", stroke: "#475569", strokeWidth: lw * 0.9, listening: false }));
    for (let i = 0; i < 24; i += 1) {
      const y = -0.09 + i * ((FLOOR_Y + 0.09) / 24);
      group.add(ln([x - 0.011, y, x + 0.011, y + (FLOOR_Y + 0.09) / 24], "#94a3b8", lw));
      group.add(ln([x + 0.011, y, x - 0.011, y + (FLOOR_Y + 0.09) / 24], "rgba(71,85,105,0.7)", lw * 0.8));
    }
  }
  // Ray dẫn hướng cho buồng và đối trọng.
  for (const x of [-0.095, 0.0 + 0.0, 0.08]) {
    if (x === 0) continue;
    group.add(new Konva.Rect({ x: m(x - 0.0035), y: m(0.0), width: m(0.007), height: m(FLOOR_Y), ...lin(m(x - 0.0035), 0, m(x + 0.0035), 0, steel), stroke: "#334155", strokeWidth: lw * 0.6, listening: false }));
  }
  // Số tầng và vạch tầng bên cột trái.
  for (const [floor, y] of [[3, 0.36], [2, 0.66], [1, FLOOR_Y]] as const) {
    group.add(ln([-0.17, y, -0.136, y], "#fbbf24", lw * 1.4));
    group.add(new Konva.Text({ x: m(-0.2), y: m(y - 0.017), width: m(0.026), align: "right", text: String(floor), fontSize: m(0.016), fontStyle: "bold", fill: "#fbbf24", listening: false }));
  }

  // Phòng máy trên cùng: hộp thép, puly kéo có rãnh cáp, động cơ và nhãn.
  group.add(new Konva.Rect({ x: m(-0.17), y: m(-0.15), width: m(0.34), height: m(0.075), cornerRadius: m(0.006), ...lin(0, m(-0.15), 0, m(-0.075), [0, "#e2e8f0", 0.2, fill, 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Text({ x: m(-0.168), y: m(-0.14), width: m(0.336), align: "center", text: "MACHINE ROOM", fontSize: m(0.0105), fontStyle: "bold", fill: "#1f2937", listening: false }));
  group.add(new Konva.Rect({ x: m(0.085), y: m(-0.116), width: m(0.062), height: m(0.04), cornerRadius: m(0.004), ...lin(0, m(-0.116), 0, m(-0.076), [0, "#1e3a8a", 1, "#0b1226"]), stroke: "#030712", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 4; i += 1) group.add(ln([0.09 + i * 0.0145, -0.112, 0.09 + i * 0.0145, -0.08], "rgba(255,255,255,0.18)", lw));
  group.add(new Konva.Rect({ x: m(-0.158), y: m(-0.112), width: m(0.05), height: m(0.032), cornerRadius: m(0.004), fill: "#0b0f19", stroke: "#475569", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Circle({ x: m(-0.133), y: m(-0.096), radius: m(0.0042), fill: "#22c55e", shadowColor: "#22c55e", shadowBlur: m(0.006), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: 0, radius: m(SHEAVE_R + 0.008), ...lin(m(-SHEAVE_R), m(-SHEAVE_R), m(SHEAVE_R), m(SHEAVE_R), [0, "#f8fafc", 0.35, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw * 1.3, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: 0, radius: m(SHEAVE_R - 0.002), ...lin(m(SHEAVE_R), m(SHEAVE_R), m(-SHEAVE_R), m(-SHEAVE_R), [0, "#1f2937", 0.5, "#64748b", 1, "#0b1220"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  for (let i = 0; i < 6; i += 1) {
    const a = (i * Math.PI) / 3;
    group.add(ln([0.008 * Math.cos(a), 0.008 * Math.sin(a), (SHEAVE_R - 0.012) * Math.cos(a), (SHEAVE_R - 0.012) * Math.sin(a)], "#cbd5e1", m(0.0055)));
  }
  group.add(new Konva.Circle({ x: 0, y: 0, radius: m(0.0095), ...lin(m(-0.0095), m(-0.0095), m(0.0095), m(0.0095), [0, "#f8fafc", 0.5, "#94a3b8", 1, "#475569"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ x: 0, y: 0, radius: m(0.0035), fill: "#0f172a", listening: false }));

  // BỘ PHẬN TRƯỢT 1: buồng thang ở tầng 1. Gốc nhóm là giữa sàn.
  const cabin = new Konva.Group({ x: m(CAB_X), y: m(FLOOR_Y) });
  cabin.add(new Konva.Rect({ x: m(-CAB_W / 2), y: m(-CAB_H), width: m(CAB_W), height: m(CAB_H), cornerRadius: m(0.004), ...lin(m(-CAB_W / 2), 0, m(CAB_W / 2), 0, [0, "#475569", 0.2, "#e2e8f0", 0.7, "#94a3b8", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  cabin.add(new Konva.Rect({ x: m(-CAB_W / 2 + 0.006), y: m(-CAB_H + 0.026), width: m(CAB_W - 0.012), height: m(CAB_H - 0.036), fill: "#0b1220", stroke: "#475569", strokeWidth: lw * 0.8, listening: false }));
  for (const side of [-1, 1]) cabin.add(new Konva.Rect({ x: m(side === -1 ? -CAB_W / 2 + 0.0065 : 0.0005), y: m(-CAB_H + 0.0265), width: m(CAB_W / 2 - 0.007), height: m(CAB_H - 0.037), ...lin(0, m(-CAB_H), 0, 0, [0, "#e2e8f0", 0.5, "#94a3b8", 1, "#64748b"]), stroke: "#475569", strokeWidth: lw * 0.7, listening: false }));
  cabin.add(new Konva.Line({ points: [m(-0.0005), m(-CAB_H + 0.0265), m(-0.0005), m(-0.0105)], stroke: "#0b1220", strokeWidth: lw * 1.2, listening: false }));
  cabin.add(new Konva.Rect({ x: m(-0.02), y: m(-CAB_H + 0.04), width: m(0.012), height: m(0.04), fill: "rgba(186,230,253,0.5)", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  cabin.add(new Konva.Rect({ x: m(0.008), y: m(-CAB_H + 0.04), width: m(0.012), height: m(0.04), fill: "rgba(186,230,253,0.5)", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));
  cabin.add(new Konva.Rect({ x: m(-0.022), y: m(-CAB_H + 0.0045), width: m(0.044), height: m(0.016), cornerRadius: m(0.002), fill: "#0b0f19", stroke: "#475569", strokeWidth: lw * 0.7, listening: false }));
  cabin.add(new Konva.Text({ x: m(-0.022), y: m(-CAB_H + 0.0062), width: m(0.044), align: "center", text: "▲ 1", fontSize: m(0.01), fontStyle: "bold", fill: "#f87171", listening: false }));
  cabin.add(new Konva.Rect({ x: m(-0.011), y: m(-0.014), width: m(0.022), height: m(0.014), fill: "#334155", stroke: "#1e293b", strokeWidth: lw * 0.6, listening: false }));
  cabin.add(new Konva.Rect({ x: m(-0.013), y: m(-CAB_H - 0.0075), width: m(0.026), height: m(0.0075), cornerRadius: m(0.002), fill: "#cbd5e1", stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(cabin);
  // BỘ PHẬN TRƯỢT 2: đối trọng gồm các khối gang xếp chồng trong khung.
  const counterweight = new Konva.Group({ x: m(CW_X), y: m(CW_REST_TOP) });
  counterweight.add(new Konva.Rect({ x: m(-CW_W / 2), y: 0, width: m(CW_W), height: m(CW_H), cornerRadius: m(0.003), ...lin(m(-CW_W / 2), 0, m(CW_W / 2), 0, [0, "#0b0f19", 0.3, "#4b5563", 1, "#030712"]), stroke: "#030712", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, listening: false }));
  for (let i = 0; i < 6; i += 1) {
    counterweight.add(new Konva.Rect({ x: m(-CW_W / 2 + 0.004), y: m(0.01 + i * 0.0315), width: m(CW_W - 0.008), height: m(0.0275), cornerRadius: m(0.002), ...lin(0, m(0.01 + i * 0.0315), 0, m(0.0375 + i * 0.0315), [0, "#6b7280", 0.3, "#374151", 1, "#111827"]), stroke: "#030712", strokeWidth: lw * 0.7, listening: false }));
  }
  counterweight.add(new Konva.Text({ x: m(-CW_W / 2), y: m(0.083), width: m(CW_W), align: "center", text: "CW", fontSize: m(0.0105), fontStyle: "bold", fill: "#e5e7eb", listening: false }));
  counterweight.add(new Konva.Rect({ x: m(-0.011), y: m(-0.0075), width: m(0.022), height: m(0.0075), cornerRadius: m(0.002), fill: "#cbd5e1", stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(counterweight);

  // Cáp: nhánh buồng thang, cung vắt qua puly (phía trên), nhánh đối trọng. Vẽ theo vị trí hiện tại của hai bộ phận.
  const cabTop = () => (cabin.y() || 0) / ppm - CAB_H - 0.0075;
  const cwTop = () => ((counterweight.y() || 0) / ppm) - 0.0075;
  const rope = (ctx: Konva.Context) => {
    ctx.beginPath();
    ctx.moveTo(m(CAB_X), m(cabTop()));
    ctx.lineTo(m(CAB_X), 0);
    ctx.arc(0, 0, m(SHEAVE_R), Math.PI, 2 * Math.PI, false);
    ctx.lineTo(m(CW_X), m(cwTop()));
  };
  group.add(new Konva.Shape({ stroke: "#0b0f19", strokeWidth: m(0.0034), lineCap: "round", lineJoin: "round", listening: false, sceneFunc: (ctx, shape) => { rope(ctx); ctx.fillStrokeShape(shape); } }));
  group.add(new Konva.Shape({ stroke: "#9ca3af", strokeWidth: m(0.0011), lineCap: "round", lineJoin: "round", listening: false, sceneFunc: (ctx, shape) => { rope(ctx); ctx.fillStrokeShape(shape); } }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.17), y: m(FLOOR_Y + 0.05), width: m(0.34), align: "center", text: label, fontSize: m(0.022), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      cabin: { node: cabin, motion: "slide" as const, axis: "up" as const, min: 0, max: 0.6 },
      counterweight: { node: counterweight, motion: "slide" as const, axis: "down" as const, min: 0, max: 0.6 },
    },
    points: { sheave: { x: 0, y: 0 }, cabinFloor1: { x: m(CAB_X), y: m(FLOOR_Y) }, cabinFloor3: { x: m(CAB_X), y: m(FLOOR_Y - 0.6) }, pit: { x: 0, y: m(FLOOR_Y + 0.04) } },
  };
};
