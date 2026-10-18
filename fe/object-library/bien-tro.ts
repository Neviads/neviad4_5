/* OBJECT-META
{
  "catalog": "Biến trở con chạy",
  "title": "Biến trở con chạy: ống sứ nâu quấn dây điện trở, thanh trượt thép phía trên mang con chạy có núm, ba đầu nối A, B và C",
  "fill": "#b45309",
  "anchor": "Tâm ống sứ.",
  "useWhen": ["Cần biến trở con chạy 50 Ω có ba đầu nối A, B, C để điều chỉnh dòng hay phân áp.","Con chạy trượt trên thanh và chạm các vòng dây quấn quanh ống sứ."],
  "avoidWhen": ["Cần điện trở cố định có vạch màu: dùng dien-tro.","Cần dây dẫn thẳng đơn giản không chỉnh được: dùng day-dan-thang.","Giá trị toàn phần cố định 50 Ω, không đổi được."],
  "size": { "width": 0.243, "height": 0.087 },
  "parts": [
    { "name": "slider", "label": "Con chạy", "motion": "slide", "axis": "right", "min": 0, "max": 0.2, "description": "Vị trí con chạy tính từ đầu trái (đầu A), mét, tối đa bằng chiều dài cuộn dây; càng lớn thì phần dây giữa A và con chạy càng dài." }
  ],
  "points": [
    { "name": "terminalA", "description": "Đầu nối A ở đầu trái ống sứ." },
    { "name": "terminalB", "description": "Đầu nối B ở đầu phải ống sứ." },
    { "name": "terminalC", "description": "Đầu nối C ở đầu phải thanh trượt (nối với con chạy)." },
    { "name": "sliderStart", "description": "Vị trí con chạy ở đầu A (rest)." }
  ],
  "notes": "Ống sứ dài 0,22 m, đường kính 0,038 m, quấn dây niken-crôm điện trở toàn phần 50 Ω; thanh trượt đặt cao hơn ống 0,038 m. Hai đầu dây ra A, B ở đáy hai đế sứ; đầu C ở cạnh trên. Con chạy trượt trên thanh, đầu lò xo thép chạm các vòng dây. fill là màu men sứ."
}
*/
const makeSlideRheostat = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const group = new Konva.Group({ x: p.x, y: p.y });
  const X0 = -0.11;
  const X1 = 0.11;
  const R = 0.019;
  const RODY = -0.036;

  // Hai đế sứ hai đầu, có ốc nối dây A và B ở bên dưới.
  for (const x of [X0, X1]) {
    group.add(new Konva.Rect({ x: m(x - 0.011), y: m(-R - 0.003), width: m(0.022), height: m(R * 2 + 0.006), cornerRadius: m(0.003), ...lin(m(x - 0.011), 0, m(x + 0.011), 0, [0, "#fff7ed", 0.4, fill, 1, "#451a03"]), stroke: "#431407", strokeWidth: lw, listening: false }));
    group.add(new Konva.Rect({ x: m(x - 0.0095), y: m(R + 0.0025), width: m(0.019), height: m(0.007), cornerRadius: m(0.0015), ...lin(m(x - 0.0095), 0, m(x + 0.0095), 0, [0, "#fef3c7", 0.5, "#b45309", 1, "#451a03"]), stroke: "#431407", strokeWidth: lw * 0.7, listening: false }));
    group.add(ln([x, R + 0.0035, x, R + 0.0085], "#1f2937", lw * 1.1));
  }
  // Ống sứ: thân trụ gradient dọc, dây điện trở quấn nghiêng và vạch sáng bóng men.
  group.add(new Konva.Rect({ x: m(X0 + 0.011), y: m(-R), width: m(X1 - X0 - 0.022), height: m(R * 2), ...lin(0, m(-R), 0, m(R), [0, "#fff7ed", 0.25, fill, 0.75, "#7c2d12", 1, "#2a0a02"]), stroke: "#431407", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.4, shadowOffset: { x: m(0.002), y: m(0.004) }, listening: false }));
  const turns = 56;
  for (let i = 0; i < turns; i += 1) {
    const x = X0 + 0.0125 + (i * (X1 - X0 - 0.025)) / (turns - 1);
    group.add(ln([x - 0.0012, -R + 0.0008, x + 0.0012, R - 0.0008], "#cbd5e1", lw * 0.8));
    group.add(ln([x - 0.0004, -R + 0.0008, x + 0.0028, R - 0.0008], "rgba(15,23,42,0.5)", lw * 0.6));
  }
  group.add(ln([X0 + 0.015, -R + 0.0032, X1 - 0.015, -R + 0.0032], "rgba(255,255,255,0.45)", lw * 1.5));
  group.add(new Konva.Text({ x: m(-0.05), y: m(R - 0.01), width: m(0.1), align: "center", text: "50 Ω  2 A", fontSize: m(0.0058), fontStyle: "bold", fill: "rgba(255,255,255,0.9)", listening: false }));
  group.add(new Konva.Text({ x: m(X0 - 0.0045), y: m(R + 0.011), text: "A", fontSize: m(0.0075), fontStyle: "bold", fill: "#e2e8f0", listening: false }));
  group.add(new Konva.Text({ x: m(X1 - 0.0045), y: m(R + 0.011), text: "B", fontSize: m(0.0075), fontStyle: "bold", fill: "#e2e8f0", listening: false }));

  // Thanh trượt thép phía trên, hai trụ đỡ và đầu nối C ở bên phải.
  for (const x of [X0 + 0.003, X1 - 0.003]) group.add(new Konva.Rect({ x: m(x - 0.003), y: m(RODY), width: m(0.006), height: m(0.014), ...lin(m(x - 0.003), 0, m(x + 0.003), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Rect({ x: m(X0 - 0.002), y: m(RODY - 0.0032), width: m(X1 - X0 + 0.008), height: m(0.0064), cornerRadius: m(0.0015), ...lin(0, m(RODY - 0.0032), 0, m(RODY + 0.0032), steel), stroke: "#334155", strokeWidth: lw * 0.8, listening: false }));
  group.add(new Konva.Rect({ x: m(X1 + 0.004), y: m(RODY - 0.0055), width: m(0.0075), height: m(0.011), cornerRadius: m(0.0015), ...lin(0, m(RODY - 0.0055), 0, m(RODY + 0.0055), [0, "#fef3c7", 0.5, "#b45309", 1, "#451a03"]), stroke: "#431407", strokeWidth: lw * 0.7, listening: false }));
  group.add(new Konva.Text({ x: m(X1 + 0.0125), y: m(RODY - 0.0045), text: "C", fontSize: m(0.0075), fontStyle: "bold", fill: "#e2e8f0", listening: false }));

  // BỘ PHẬN TRƯỢT: con chạy ở đầu A: thân kẹp thanh, tay lò xo thép chạm dây và núm gạt nhựa đen. Gốc nhóm ở vị trí nghỉ.
  const slider = new Konva.Group({ x: m(X0 + 0.016) });
  slider.add(new Konva.Rect({ x: m(-0.0085), y: m(RODY - 0.0085), width: m(0.017), height: m(0.0145), cornerRadius: m(0.0025), ...lin(m(-0.0085), 0, m(0.0085), 0, [0, "#475569", 0.35, "#e2e8f0", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, listening: false }));
  slider.add(new Konva.Line({ points: [0, m(RODY + 0.006), 0, m(-R + 0.0006)], stroke: "#e2e8f0", strokeWidth: lw * 1.8, lineCap: "round", listening: false }));
  slider.add(new Konva.Line({ points: [m(-0.0035), m(RODY + 0.006), m(-0.0012), m(-R - 0.001), m(0.0012), m(-R + 0.0006)], stroke: "#cbd5e1", strokeWidth: lw * 1.3, lineCap: "round", lineJoin: "round", listening: false }));
  slider.add(new Konva.Rect({ x: m(-0.0055), y: m(RODY - 0.0225), width: m(0.011), height: m(0.015), cornerRadius: m(0.0035), ...lin(m(-0.0055), 0, m(0.0055), 0, [0, "#6b7280", 0.4, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.8, listening: false }));
  for (let i = 0; i < 3; i += 1) slider.add(new Konva.Line({ points: [m(-0.0055), m(RODY - 0.0185 + i * 0.0035), m(0.0055), m(RODY - 0.0185 + i * 0.0035)], stroke: "rgba(255,255,255,0.22)", strokeWidth: lw, listening: false }));
  group.add(slider);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.1), y: m(0.036), width: m(0.2), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { slider: { node: slider, motion: "slide" as const, axis: "right" as const, min: 0, max: 0.2 } },
    points: { terminalA: { x: m(X0), y: m(R + 0.0085) }, terminalB: { x: m(X1), y: m(R + 0.0085) }, terminalC: { x: m(X1 + 0.0115), y: m(RODY) }, sliderStart: { x: m(X0 + 0.016), y: m(RODY) } },
  };
};
