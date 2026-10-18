/* OBJECT-META
{
  "catalog": "Đập nước + tuabin",
  "title": "Đập bê tông chắn hồ chứa nước: mặt đập có bậc cửa xả, ống dẫn nước xuống nhà máy, tuabin nước quay ở chân đập và dòng nước thoát ra hạ lưu",
  "fill": "#9ca3af",
  "anchor": "Giữa chân đập (mặt cắt), chạm đáy hạ lưu.",
  "useWhen": ["Cần đập nước cao 30 m mặt cắt với hồ chứa, ống áp lực và tuabin Francis quay ở chân đập.","Cần minh hoạ thuỷ điện: nước từ hồ chảy qua tuabin xuống hạ lưu."],
  "avoidWhen": ["Cần máy phát điện xoay chiều tách riêng: dùng may-phat-dien.","Cần bình thông nhau hay bể nước nhỏ trong phòng thí nghiệm: dùng binh-thong-nhau hoặc be-nuoc."],
  "size": { "width": 52.0, "height": 36.0 },
  "parts": [
    { "name": "turbine", "label": "Tuabin", "motion": "rotate", "min": 0, "max": 360, "description": "Góc quay của tuabin cùng trục máy phát ở chân đập, độ theo chiều kim đồng hồ khi nhìn từ phía hạ lưu." }
  ],
  "points": [
    { "name": "damFoot", "description": "Giữa chân đập, chạm đáy hạ lưu." },
    { "name": "reservoirSurface", "description": "Mặt thoáng hồ chứa sát đập." },
    { "name": "turbine", "description": "Tâm tuabin trong nhà máy." },
    { "name": "outflow", "description": "Cửa xả nước ra hạ lưu." }
  ],
  "notes": "Đập trọng lực cao 30 m, đáy rộng 22 m, đỉnh rộng 4 m; hồ chứa đầy ở độ cao 28 m (bên trái), mặt nước hạ lưu cao 3 m (bên phải). Nước theo ống áp lực đi vào tuabin Francis đường kính 3 m ở chân đập, quay máy phát. Công suất P = ρ g Q H η. fill là màu bê tông."
}
*/
const makeDam = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.1));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const pts = (a: number[]) => a.map(m);
  const TX = 17;

  // Đáy hồ và nền đất đá, mực nước hồ bên trái, dòng nước hạ lưu bên phải.
  group.add(new Konva.Rect({ x: m(-26), y: m(-1.0), width: m(52), height: m(1.0), ...lin(0, 0, 0, m(1.0), [0, "#78716c", 1, "#292524"]), listening: false }));
  group.add(new Konva.Line({ points: pts([-26, -0.5, -26, -28, -11, -28, -11, -0.5]), closed: true, ...lin(0, m(-28), 0, m(-0.5), [0, "rgba(56,189,248,0.8)", 1, "rgba(3,105,161,0.95)"]), listening: false }));
  group.add(new Konva.Line({ points: pts([-26, -28, -11, -28]), stroke: "#e0f2fe", strokeWidth: lw * 0.6, listening: false }));
  for (let i = 0; i < 5; i += 1) group.add(new Konva.Line({ points: pts([-24 + i * 3, -26.5 + (i % 2) * 0.2, -22 + i * 3, -26.5 + (i % 2) * 0.2]), stroke: "rgba(255,255,255,0.45)", strokeWidth: lw * 0.4, listening: false }));
  group.add(new Konva.Line({ points: pts([11, -0.5, 11, -3, 26, -3, 26, -0.5]), closed: true, ...lin(0, m(-3), 0, m(-0.5), [0, "rgba(125,211,252,0.9)", 1, "rgba(3,105,161,0.95)"]), listening: false }));
  for (let i = 0; i < 5; i += 1) group.add(new Konva.Line({ points: pts([13 + i * 2.4, -2.5, 14.3 + i * 2.4, -2.2]), stroke: "rgba(255,255,255,0.55)", strokeWidth: lw * 0.4, listening: false }));

  // Thân đập: mặt thượng lưu dốc đứng, mặt hạ lưu bậc, đỉnh có lan can và đường đi.
  group.add(new Konva.Line({ points: pts([-11, -0.5, -9, -30, -5, -30, 11, -0.5]), closed: true, ...lin(m(-11), 0, m(11), 0, [0, "#e5e7eb", 0.4, fill, 1, "#374151"]), stroke: "#1f2937", strokeWidth: lw, lineJoin: "round", listening: false }));
  for (let i = 0; i < 6; i += 1) group.add(new Konva.Line({ points: pts([-5 + i * 2.7, -30 + i * 5, 11 - (5 - i) * 0.4 - (i === 5 ? 0 : 0), -30 + i * 5]), stroke: "rgba(15,23,42,0.5)", strokeWidth: lw * 0.6, listening: false }));
  for (let i = 0; i < 12; i += 1) group.add(new Konva.Line({ points: pts([-10.8 + i * 0.1, -2 - i * 2.4, -9.5 + i * 0.1, -2.5 - i * 2.4]), stroke: "rgba(255,255,255,0.2)", strokeWidth: lw * 0.5, listening: false }));
  group.add(new Konva.Rect({ x: m(-9.4), y: m(-30.8), width: m(4.8), height: m(0.8), fill: "#d4d4d8", stroke: "#27272a", strokeWidth: lw * 0.6, listening: false }));
  for (let i = 0; i < 6; i += 1) group.add(new Konva.Line({ points: pts([-9.2 + i * 0.9, -30.8, -9.2 + i * 0.9, -31.9]), stroke: "#e5e7eb", strokeWidth: lw * 0.5, listening: false }));
  group.add(new Konva.Line({ points: pts([-9.2, -31.9, -4.7, -31.9]), stroke: "#e5e7eb", strokeWidth: lw * 0.5, listening: false }));
  // Cửa xả tràn trên mặt đập với tia nước ra.
  group.add(new Konva.Rect({ x: m(-7.4), y: m(-28.2), width: m(1.8), height: m(1.0), fill: "#0b1220", stroke: "#475569", strokeWidth: lw * 0.6, listening: false }));

  // Nhà máy ở chân đập: hộp bê tông thấp, mái kim loại, cửa sổ, tuabin nhìn qua cửa kính.
  group.add(new Konva.Rect({ x: m(6), y: m(-8.5), width: m(15), height: m(8.0), ...lin(0, 0, 0, m(8.0), [0, "#e2e8f0", 1, "#475569"]), stroke: "#1f2937", strokeWidth: lw, listening: false }));
  group.add(new Konva.Line({ points: pts([5.2, -8.5, 13.5, -10.2, 21.8, -8.5]), closed: true, fill: "#475569", stroke: "#1f2937", strokeWidth: lw * 0.8, lineJoin: "round", listening: false }));
  group.add(new Konva.Circle({ x: m(TX - 4.6), y: m(-5.2), radius: m(2.1), fill: "#0b1220", stroke: "#94a3b8", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(TX + 0.4), y: m(-7.6), width: m(3.2), height: m(5.6), ...lin(0, 0, m(3.2), 0, [0, "#475569", 1, "#1e293b"]), stroke: "#0f172a", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Text({ x: m(TX + 0.4), y: m(-6.2), width: m(3.2), align: "center", text: "G", fontSize: m(1.6), fontStyle: "bold", fill: "#fde047", listening: false }));
  // Ống áp lực: từ cửa nhận nước ở hồ chảy xuống nhà máy.
  group.add(new Konva.Line({ points: pts([-10.8, -6, 0, -6, 3.5, -4.2, TX - 4.6, -3.4]), stroke: "#0b1220", strokeWidth: m(1.3), lineCap: "round", lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: pts([-10.8, -6, 0, -6, 3.5, -4.2, TX - 4.6, -3.4]), stroke: "#64748b", strokeWidth: m(1.0), lineCap: "round", lineJoin: "round", listening: false }));
  group.add(new Konva.Line({ points: pts([-10.8, -6.3, 0, -6.3, 3.4, -4.6, TX - 4.6, -3.7]), stroke: "rgba(255,255,255,0.5)", strokeWidth: m(0.15), lineCap: "round", lineJoin: "round", listening: false }));

  // BỘ PHẬN QUAY: tuabin Francis nhìn ngang: tâm trục, 12 cánh cong, vành ngoài.
  const turbine = new Konva.Group({ x: m(TX - 4.6), y: m(-5.2) });
  turbine.add(new Konva.Circle({ radius: m(1.9), ...lin(m(-1.9), m(-1.9), m(1.9), m(1.9), [0, "#e2e8f0", 0.5, "#64748b", 1, "#1f2937"]), stroke: "#0f172a", strokeWidth: lw * 0.8, listening: false }));
  for (let i = 0; i < 12; i += 1) {
    const a = (i * Math.PI) / 6;
    turbine.add(new Konva.Line({ points: [m(0.35 * Math.cos(a)), m(0.35 * Math.sin(a)), m(1.1 * Math.cos(a + 0.35)), m(1.1 * Math.sin(a + 0.35)), m(1.7 * Math.cos(a + 0.7)), m(1.7 * Math.sin(a + 0.7))], stroke: "#e2e8f0", strokeWidth: m(0.13), lineCap: "round", tension: 0.5, listening: false }));
  }
  turbine.add(new Konva.Circle({ radius: m(0.45), fill: "#fbbf24", stroke: "#78350f", strokeWidth: lw * 0.7, listening: false }));
  turbine.add(new Konva.Circle({ x: m(1.45), radius: m(0.12), fill: "#ef4444", listening: false }));
  group.add(turbine);
  // Dòng nước thoát ra hạ lưu từ cống dưới đáy nhà máy.
  group.add(new Konva.Line({ points: pts([TX - 2.5, -3.2, 20, -2.4, 23, -2.7, 26, -2.4]), stroke: "rgba(224,242,254,0.6)", strokeWidth: m(0.5), lineCap: "round", tension: 0.5, listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-8), y: m(0.8), width: m(16), align: "center", text: label, fontSize: m(1.2), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: { turbine: { node: turbine, motion: "rotate" as const, min: 0, max: 360 } }, points: { damFoot: { x: 0, y: 0 }, reservoirSurface: { x: m(-10), y: m(-28) }, turbine: { x: m(TX - 4.6), y: m(-5.2) }, outflow: { x: m(TX - 2.5), y: m(-3.2) } } };
};
