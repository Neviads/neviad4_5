/* OBJECT-META
{
  "catalog": "Đồng hồ đa năng hiện số",
  "title": "Đồng hồ vạn năng hiện số 3½ chữ số: vỏ vàng bọc cao su, màn LCD, núm xoay chọn thang, ba lỗ cắm que đo",
  "fill": "#f4c20d",
  "anchor": "Giữa đáy máy, chạm mặt bàn.",
  "useWhen": ["Cần đồng hồ đa năng hiện số có núm chọn thang, màn hình LCD và ba lỗ cắm COM, VΩ, 10 A.", "Cảnh đo điện áp, dòng, điện trở; đặt chữ lên màn hình để hiện số đo thật."],
  "avoidWhen": ["Cần ampe kế hoặc vôn kế kim riêng: dùng ampe-ke hoặc von-ke.", "Cần dụng cụ chỉ đo một đại lượng với thang cố định; đồng hồ này phải chọn thang bằng núm."],
  "size": { "width": 0.1, "height": 0.19 },
  "parts": [
    { "name": "knob", "label": "Núm chọn thang", "motion": "rotate", "min": -120, "max": 120, "description": "Góc xoay của núm chọn thang đo, độ; 0 ở giữa (OFF ở −120°, V~ ở −60°, V= ở −20°, A ở 20°, Ω ở 60°, thông mạch ở 100°)." }
  ],
  "points": [
    { "name": "base", "description": "Giữa đáy máy." },
    { "name": "display", "description": "Tâm màn hình LCD." },
    { "name": "jackCom", "description": "Lỗ cắm COM (que đen)." },
    { "name": "jackVohm", "description": "Lỗ cắm VΩ (que đỏ đo điện áp, điện trở)." },
    { "name": "jackAmp", "description": "Lỗ cắm 10 A (que đỏ đo dòng lớn)." }
  ],
  "notes": "Màn hình hiện 1.532 và đơn vị V mặc định; cảnh đặt chữ khác để hiện số thật. Các nhãn thang quanh núm theo thứ tự OFF, V~, V=, A, Ω, thông mạch. fill là màu vỏ nhựa."
}
*/
const makeMultimeter = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const W = 0.092;
  const H = 0.184;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const polar = (r: number, deg: number): [number, number] => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const top = -H;

  // Vỏ cao su đen ngoài cùng, bo tròn và có gờ.
  group.add(new Konva.Rect({ x: m(-W / 2 - 0.004), y: m(top - 0.004), width: m(W + 0.008), height: m(H + 0.004), cornerRadius: m(0.012), ...lin(m(-W / 2), 0, m(W / 2), 0, [0, "#1f2937", 0.5, "#111827", 1, "#030712"]), stroke: "#000", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.5, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  for (const y of [-0.012, -0.172]) group.add(new Konva.Rect({ x: m(-W / 2 - 0.0085), y: m(y - 0.012), width: m(0.012), height: m(0.024), cornerRadius: m(0.004), fill: "#111827", stroke: "#000", strokeWidth: lw, listening: false }));
  // Mặt máy màu vàng.
  group.add(new Konva.Rect({ x: m(-W / 2), y: m(top), width: m(W), height: m(H - 0.004), cornerRadius: m(0.009), ...lin(m(-W / 2), m(top), m(W / 2), m(-0.004), [0, "#fff3b0", 0.3, fill, 0.85, "#e0a800", 1, "#b78103"]), stroke: "#6b4e05", strokeWidth: lw, listening: false }));
  group.add(ln([-W / 2 + 0.008, top + 0.004, W / 2 - 0.008, top + 0.004], "rgba(255,255,255,0.55)", lw * 1.3));

  // Màn LCD: cửa sổ có số 7 đoạn.
  group.add(new Konva.Rect({ x: m(-0.0385), y: m(top + 0.012), width: m(0.077), height: m(0.04), cornerRadius: m(0.004), fill: "#0b1220", stroke: "#1f2937", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0355), y: m(top + 0.0145), width: m(0.071), height: m(0.035), cornerRadius: m(0.003), ...lin(0, m(top + 0.0145), 0, m(top + 0.0495), [0, "#cfe9c8", 1, "#a9d3a1"]), listening: false }));
  group.add(new Konva.Text({ x: m(-0.034), y: m(top + 0.0175), width: m(0.06), align: "right", text: "1.532", fontSize: m(0.0205), fontStyle: "bold", fontFamily: "Courier New", fill: "#052e16", listening: false }));
  group.add(new Konva.Text({ x: m(0.0262), y: m(top + 0.0345), text: "V", fontSize: m(0.0095), fontStyle: "bold", fill: "#052e16", listening: false }));
  group.add(new Konva.Text({ x: m(-0.033), y: m(top + 0.0155), text: "DC  AUTO", fontSize: m(0.0042), fontStyle: "bold", fill: "#14532d", listening: false }));
  group.add(new Konva.Rect({ x: m(-0.0355), y: m(top + 0.0145), width: m(0.071), height: m(0.014), cornerRadius: m(0.003), fill: "rgba(255,255,255,0.22)", listening: false }));
  // Hai nút chức năng (HOLD, RANGE) dưới màn hình.
  const buttons: [string, number][] = [["HOLD", -0.0225], ["RANGE", 0.0225]];
  for (const [text, x] of buttons) {
    group.add(new Konva.Rect({ x: m(x - 0.0145), y: m(top + 0.059), width: m(0.029), height: m(0.011), cornerRadius: m(0.003), ...lin(0, m(top + 0.059), 0, m(top + 0.07), [0, "#6b7280", 0.3, "#374151", 1, "#111827"]), stroke: "#030712", strokeWidth: lw, listening: false }));
    group.add(new Konva.Text({ x: m(x - 0.0145), y: m(top + 0.0612), width: m(0.029), align: "center", text, fontSize: m(0.0058), fontStyle: "bold", fill: "#e5e7eb", listening: false }));
  }

  // Núm chọn thang ở giữa: vòng nhãn quanh, chỉ báo trên núm.
  const kx = 0;
  const ky = top + 0.1;
  group.add(new Konva.Circle({ x: m(kx), y: m(ky), radius: m(0.0385), fill: "rgba(0,0,0,0.18)", listening: false }));
  const marks: [string, number][] = [["OFF", -120], ["V~", -60], ["V=", -20], ["A", 20], ["Ω", 60], ["•))", 100]];
  for (const [text, deg] of marks) {
    const [tx, ty] = polar(0.0355, deg);
    group.add(new Konva.Text({ x: m(kx + tx), y: m(ky + ty), width: m(0.016), offsetX: m(0.008), offsetY: m(0.0035), align: "center", text, fontSize: m(0.0075), fontStyle: "bold", fill: "#1f1305", listening: false }));
  }
  for (let deg = -120; deg <= 120; deg += 20) {
    const [x1, y1] = polar(0.0275, deg);
    const [x2, y2] = polar(0.0305, deg);
    group.add(ln([kx + x1, ky + y1, kx + x2, ky + y2], "#1f1305", lw * 0.8));
  }
  const knob = new Konva.Group({ x: m(kx), y: m(ky) });
  knob.add(new Konva.Circle({ radius: m(0.0265), ...lin(m(-0.0265), m(-0.0265), m(0.0265), m(0.0265), [0, "#374151", 0.4, "#111827", 1, "#030712"]), stroke: "#000", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.006), shadowOpacity: 0.5, listening: false }));
  for (let i = 0; i < 24; i += 1) {
    const a = (i * 360) / 24;
    const [x1, y1] = polar(0.0245, a);
    const [x2, y2] = polar(0.0265, a);
    knob.add(ln([x1, y1, x2, y2], "rgba(255,255,255,0.18)", lw));
  }
  knob.add(new Konva.Circle({ radius: m(0.0185), ...lin(m(-0.0185), m(-0.0185), m(0.0185), m(0.0185), [0, "#4b5563", 1, "#0b0f19"]), stroke: "#000", strokeWidth: lw * 0.7, listening: false }));
  knob.add(new Konva.Line({ points: [0, m(-0.0075), 0, m(-0.0262)], stroke: "#f8fafc", strokeWidth: m(0.0032), lineCap: "round", listening: false }));
  knob.add(new Konva.Circle({ radius: m(0.0034), fill: "#9ca3af", listening: false }));
  group.add(knob);

  // Ba lỗ cắm que đo dưới cùng: COM, VΩ và 10 A, có viền màu.
  const jacks: [string, number, string][] = [["COM", -0.027, "#111827"], ["VΩ", 0, "#dc2626"], ["10A", 0.027, "#dc2626"]];
  const jy = -0.0205;
  for (const [text, x, color] of jacks) {
    group.add(new Konva.Circle({ x: m(x), y: m(jy), radius: m(0.0085), fill: "#0b0f19", stroke: color, strokeWidth: m(0.0022), listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(jy), radius: m(0.0042), fill: "#000", stroke: "#9ca3af", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Text({ x: m(x - 0.011), y: m(jy - 0.0185), width: m(0.022), align: "center", text, fontSize: m(0.0062), fontStyle: "bold", fill: "#1f1305", listening: false }));
  }
  group.add(new Konva.Text({ x: m(-0.034), y: m(top + 0.073), width: m(0.068), align: "center", text: "DIGITAL MULTIMETER", fontSize: m(0.0045), fontStyle: "bold", fill: "#4a3510", listening: false }));
  group.add(new Konva.Text({ x: m(-0.034), y: m(-0.0455), width: m(0.068), align: "center", text: "CAT II 600 V", fontSize: m(0.0045), fill: "#4a3510", listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.05), y: m(0.006), width: m(0.1), align: "center", text: label, fontSize: m(0.01), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { knob: { node: knob, motion: "rotate" as const, min: -120, max: 120 } },
    points: { base: { x: 0, y: 0 }, display: { x: 0, y: m(top + 0.032) }, jackCom: { x: m(-0.027), y: m(jy) }, jackVohm: { x: 0, y: m(jy) }, jackAmp: { x: m(0.027), y: m(jy) } },
  };
};
