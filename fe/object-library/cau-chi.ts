/* OBJECT-META
{
  "catalog": "Cầu chì / aptomat",
  "title": "Cầu chì ống thuỷ tinh 5 A trong giá kẹp sứ và aptomat một cực 16 A có cần gạt: hai thiết bị bảo vệ mạch điện đặt cạnh nhau",
  "fill": "#e2e8f0",
  "anchor": "Giữa hai thiết bị, ngang tâm.",
  "useWhen": ["Cần thiết bị bảo vệ mạch điện: cầu chì ống 5 A hoặc aptomat một cực 16 A.","Cần hiển thị dây chảy đứt hay cần gạt ON khi quá dòng."],
  "avoidWhen": ["Cần công tắc đóng ngắt bằng tay có lưỡi dao quay: dùng cong-tac.","Cần chỉ một thiết bị: vật này luôn vẽ cả cầu chì và aptomat cạnh nhau, cần gạt không có bộ phận động."],
  "size": { "width": 0.144, "height": 0.104 },
  "parts": [],
  "points": [
    { "name": "fuse", "description": "Giữa ống cầu chì (dây chảy)." },
    { "name": "breaker", "description": "Giữa thân aptomat." },
    { "name": "fuseIn", "description": "Đầu nối bên trái của cầu chì." },
    { "name": "breakerOut", "description": "Đầu nối dưới của aptomat." }
  ],
  "notes": "Bên trái: ống cầu chì thuỷ tinh dài 0,032 m, đường kính 0,008 m, dây chảy 5 A, hai đầu mũ đồng, kẹp trong hai má thép trên đế sứ. Bên phải: aptomat một cực 16 A, thân nhựa trắng 0,018 m × 0,085 m, cần gạt ở vị trí ON. Khi dòng điện vượt định mức, dây chảy đứt hay aptomat tự ngắt. fill là màu nhựa vỏ aptomat."
}
*/
const makeFuseAndBreaker = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Đế sứ trắng có gờ cho cầu chì.
  group.add(new Konva.Rect({ x: m(-0.072), y: m(-0.032), width: m(0.058), height: m(0.032), cornerRadius: m(0.004), ...lin(0, m(-0.032), 0, 0, [0, "#ffffff", 0.4, "#e2e8f0", 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw * 1.1, shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  group.add(ln([-0.067, -0.0285, -0.019, -0.0285], "rgba(255,255,255,0.9)", lw * 1.3));
  for (const x of [-0.065, -0.021]) group.add(new Konva.Circle({ x: m(x), y: m(-0.0105), radius: m(0.0022), fill: "#475569", stroke: "#1e293b", strokeWidth: lw * 0.6, listening: false }));
  // Hai má kẹp thép cong ôm hai đầu ống, đế cao hơn đế sứ.
  for (const x of [-0.051, -0.027]) {
    group.add(new Konva.Rect({ x: m(x - 0.0045), y: m(-0.043), width: m(0.009), height: m(0.014), cornerRadius: m(0.0015), ...lin(m(x - 0.0045), 0, m(x + 0.0045), 0, steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Line({ points: [m(x - 0.0045), m(-0.043), m(x - 0.0033), m(-0.0535), m(x + 0.0033), m(-0.0535), m(x + 0.0045), m(-0.043)], stroke: "#cbd5e1", strokeWidth: lw * 1.4, lineJoin: "round", listening: false }));
  }
  // Ống cầu chì: thuỷ tinh trong, hai mũ đồng, dây chảy mảnh nối hai đầu có lò xo nhỏ.
  group.add(new Konva.Rect({ x: m(-0.0595), y: m(-0.0455), width: m(0.032), height: m(0.0088), cornerRadius: m(0.001), fill: "rgba(186,230,253,0.35)", stroke: "rgba(226,240,252,0.95)", strokeWidth: lw * 1.2, listening: false }));
  group.add(ln([-0.0585, -0.0452, -0.0285, -0.0452], "rgba(255,255,255,0.8)", lw * 1.1));
  for (const [x0, w] of [[-0.0605, 0.0075], [-0.0355, 0.0075]] as [number, number][]) {
    group.add(new Konva.Rect({ x: m(x0), y: m(-0.0465), width: m(w), height: m(0.0108), cornerRadius: m(0.0016), ...lin(0, m(-0.0465), 0, m(-0.0357), [0, "#fef3c7", 0.4, "#d97706", 1, "#78350f"]), stroke: "#78350f", strokeWidth: lw * 0.8, listening: false }));
  }
  group.add(new Konva.Line({ points: [m(-0.053), m(-0.041), m(-0.0495), m(-0.0425), m(-0.0455), m(-0.0392), m(-0.0415), m(-0.0425), m(-0.0375), m(-0.041)], stroke: "#fef08a", strokeWidth: lw * 0.9, lineJoin: "round", listening: false }));
  group.add(new Konva.Text({ x: m(-0.0535), y: m(-0.0345), width: m(0.026), align: "center", text: "5A 250V", fontSize: m(0.0042), fontStyle: "bold", fill: "#475569", listening: false }));
  group.add(new Konva.Text({ x: m(-0.072), y: m(-0.0305), width: m(0.058), align: "center", text: "CẦU CHÌ", fontSize: m(0.0048), fontStyle: "bold", fill: "#64748b", listening: false }));
  // Đầu nối dây hai bên cầu chì.
  for (const s of [-1, 1]) {
    const x = s < 0 ? -0.0655 : -0.0205;
    group.add(new Konva.Rect({ x: m(x - 0.0055), y: m(-0.0245), width: m(0.011), height: m(0.0095), cornerRadius: m(0.0015), ...lin(m(x - 0.0055), 0, m(x + 0.0055), 0, [0, "#fef3c7", 0.5, "#b45309", 1, "#451a03"]), stroke: "#431407", strokeWidth: lw * 0.7, listening: false }));
    group.add(ln([x - 0.003, -0.02, x + 0.003, -0.02], "#1f2937", lw * 1.1));
  }

  // Aptomat 1 cực: thân nhựa trắng chữ nhật, thanh DIN phía sau, cần gạt đen ở ON, nhãn 16 A và vạch ON/OFF.
  const bx = 0.04;
  group.add(new Konva.Rect({ x: m(bx - 0.0215), y: m(-0.009 - 0.095), width: m(0.043), height: m(0.007), ...lin(0, m(-0.104), 0, m(-0.097), steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(bx - 0.0095), y: m(-0.098), width: m(0.019), height: m(0.093), cornerRadius: m(0.002), ...lin(m(bx - 0.0095), 0, m(bx + 0.0095), 0, [0, "#ffffff", 0.45, fill, 1, "#94a3b8"]), stroke: "#475569", strokeWidth: lw * 1.1, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.003) }, listening: false }));
  group.add(new Konva.Rect({ x: m(bx - 0.0085), y: m(-0.0965), width: m(0.017), height: m(0.012), fill: "#cbd5e1", stroke: "#94a3b8", strokeWidth: lw * 0.6, listening: false }));
  group.add(new Konva.Rect({ x: m(bx - 0.0085), y: m(-0.0105), width: m(0.017), height: m(0.0055), fill: "#cbd5e1", stroke: "#94a3b8", strokeWidth: lw * 0.6, listening: false }));
  // Hai ốc đầu nối trên và dưới (ốc vít khe chéo trong ô).
  for (const y of [-0.0905, -0.0075]) {
    group.add(new Konva.Circle({ x: m(bx), y: m(y), radius: m(0.0042), ...lin(m(bx - 0.004), m(y - 0.004), m(bx + 0.004), m(y + 0.004), steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
    group.add(ln([bx - 0.0028, y, bx + 0.0028, y], "#0f172a", lw * 1.1));
  }
  group.add(new Konva.Rect({ x: m(bx - 0.0075), y: m(-0.079), width: m(0.015), height: m(0.034), cornerRadius: m(0.002), fill: "#0f172a", stroke: "#000", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(bx - 0.0045), y: m(-0.076), width: m(0.009), height: m(0.016), cornerRadius: m(0.0018), ...lin(m(bx - 0.0045), 0, m(bx + 0.0045), 0, [0, "#6b7280", 0.4, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.6, listening: false }));
  group.add(ln([bx - 0.0032, -0.075, bx - 0.0032, -0.0615], "rgba(255,255,255,0.28)", lw));
  group.add(new Konva.Text({ x: m(bx - 0.0075), y: m(-0.0575), width: m(0.015), align: "center", text: "ON", fontSize: m(0.0042), fontStyle: "bold", fill: "#4ade80", listening: false }));
  group.add(new Konva.Text({ x: m(bx - 0.0075), y: m(-0.0485), width: m(0.015), align: "center", text: "OFF", fontSize: m(0.0036), fill: "#94a3b8", listening: false }));
  group.add(new Konva.Text({ x: m(bx - 0.0095), y: m(-0.034), width: m(0.019), align: "center", text: "C16", fontSize: m(0.0046), fontStyle: "bold", fill: "#334155", listening: false }));
  group.add(new Konva.Text({ x: m(bx - 0.0095), y: m(-0.0275), width: m(0.019), align: "center", text: "1P", fontSize: m(0.0036), fill: "#64748b", listening: false }));
  group.add(new Konva.Text({ x: m(bx - 0.0095), y: m(-0.0215), width: m(0.019), align: "center", text: "APTOMAT", fontSize: m(0.0022), fill: "#94a3b8", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.08), y: m(0.006), width: m(0.16), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: { fuse: { x: m(-0.0435), y: m(-0.0412) }, breaker: { x: m(bx), y: m(-0.0515) }, fuseIn: { x: m(-0.0655), y: m(-0.0245) }, breakerOut: { x: m(bx), y: m(-0.0075) } },
  };
};
