/* OBJECT-META
{
  "catalog": "Ống dây (solenoid) có lõi sắt",
  "title": "Ống dây mặt cắt dọc: hai hàng tiết diện dây đồng (chấm và dấu ×) trên khung nhựa, thanh lõi sắt non ở giữa kéo ra vào được, hai đầu dây có chốt",
  "fill": "#d97706",
  "anchor": "Tâm ống dây.",
  "useWhen": ["Cần ống dây có lõi sắt non kéo ra vào được (bộ phận core), mặt cắt dọc có chấm và dấu × chỉ chiều dòng điện.", "Cảnh nam châm điện, từ trường ống dây, lõi sắt làm tăng từ trường; ống dài 0,09 m, 36 vòng."],
  "avoidWhen": ["Cần ống dây không lõi hay cuộn dây cảm ứng với nam châm: vật này luôn có lõi sắt, dù kéo ra được.", "Chỉ vẽ 18 tiết diện mỗi hàng, thưa hơn thật; không có đường sức từ, phải do cảnh vẽ."],
  "size": { "width": 0.167, "height": 0.054 },
  "parts": [
    { "name": "core", "label": "Lõi sắt", "motion": "slide", "axis": "right", "min": 0, "max": 0.09, "description": "Độ kéo lõi sắt sang phải so với vị trí đặt trọn trong ống, mét; 0 là lõi nằm giữa ống dây, 0,09 là lõi gần rời hẳn ống." }
  ],
  "points": [
    { "name": "center", "description": "Tâm ống dây." },
    { "name": "endLeft", "description": "Mặt đầu trái của ống, trên trục." },
    { "name": "endRight", "description": "Mặt đầu phải của ống, trên trục." },
    { "name": "terminalA", "description": "Chốt nối đầu dây bên trái." },
    { "name": "terminalB", "description": "Chốt nối đầu dây bên phải." }
  ],
  "notes": "Ống dài 0,09 m, đường kính trong 0,025 m, 36 vòng dây đồng (vẽ 18 tiết diện mỗi hàng, thưa hơn thật); lõi sắt non dài 0,09 m, đường kính 0,02 m. Hình cắt dọc: dòng điện vào mặt phẳng ở một hàng (×) và ra khỏi mặt phẳng ở hàng kia (•). Khi có dòng điện, ống dây là nam châm điện; lõi sắt làm tăng từ trường. fill là màu dây đồng."
}
*/
const makeSolenoidCore = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0013));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const steel = [0, "#64748b", 0.3, "#f8fafc", 0.62, "#cbd5e1", 1, "#475569"];
  const group = new Konva.Group({ x: p.x, y: p.y });
  const L = 0.09;
  const RI = 0.0125;
  const RO = 0.0225;
  const N = 18;

  // Dây nối hai đầu ra chốt đồng đỏ/đen.
  for (const [s, c] of [[-1, "#1f2937"], [1, "#ef4444"]] as [number, string][]) {
    group.add(new Konva.Line({ points: [m(s * (L / 2 - 0.0025)), m(-(RI + RO) / 2), m(s * (L / 2 + 0.02)), m(-RO - 0.006), m(s * (L / 2 + 0.034)), m(-RO + 0.002)], stroke: "#7c2d12", strokeWidth: m(0.0038), lineCap: "round", tension: 0.5, listening: false }));
    group.add(new Konva.Line({ points: [m(s * (L / 2 - 0.0025)), m(-(RI + RO) / 2), m(s * (L / 2 + 0.02)), m(-RO - 0.006), m(s * (L / 2 + 0.034)), m(-RO + 0.002)], stroke: fill, strokeWidth: m(0.0026), lineCap: "round", tension: 0.5, listening: false }));
    group.add(new Konva.Circle({ x: m(s * (L / 2 + 0.034)), y: m(-RO + 0.0045), radius: m(0.0043), fillRadialGradientStartPoint: { x: m(-0.001), y: m(-0.001) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0043), fillRadialGradientColorStops: [0, "#fff", 0.35, c, 1, "#000"], stroke: "#000", strokeWidth: lw * 0.6, listening: false }));
  }

  // Khung nhựa trong suốt (hai mặt cắt đứng và lòng rỗng tối).
  group.add(new Konva.Rect({ x: m(-L / 2 - 0.004), y: m(-RO - 0.003), width: m(L + 0.008), height: m((RO + 0.003) * 2), cornerRadius: m(0.002), fill: "rgba(186,230,253,0.14)", stroke: "rgba(226,240,252,0.9)", strokeWidth: lw * 1.2, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.3, listening: false }));
  group.add(new Konva.Rect({ x: m(-L / 2), y: m(-RI), width: m(L), height: m(RI * 2), fill: "#0b1220", stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  // Hai hàng tiết diện dây: hàng trên là chấm (dòng ra), hàng dưới là dấu × (dòng vào).
  for (let i = 0; i < N; i += 1) {
    const x = -L / 2 + (i + 0.5) * (L / N);
    for (const [y, out] of [[-(RI + RO) / 2, true], [(RI + RO) / 2, false]] as [number, boolean][]) {
      group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(0.0021), fillRadialGradientStartPoint: { x: m(-0.0007), y: m(-0.0007) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0021), fillRadialGradientColorStops: [0, "#fef3c7", 0.45, fill, 1, "#7c2d12"], stroke: "#431407", strokeWidth: lw * 0.5, listening: false }));
      if (out) group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(0.0006), fill: "#1c0a02", listening: false }));
      else group.add(new Konva.Line({ points: [m(x - 0.0009), m(y - 0.0009), m(x + 0.0009), m(y + 0.0009), m(x), m(y), m(x - 0.0009), m(y + 0.0009), m(x + 0.0009), m(y - 0.0009)], stroke: "#1c0a02", strokeWidth: lw * 0.6, listening: false }));
    }
  }

  // BỘ PHẬN TRƯỢT: lõi sắt non tròn, bóng bề mặt; đầu tay nhựa phía phải. Gốc nhóm ở vị trí đặt trọn trong ống.
  const core = new Konva.Group();
  core.add(new Konva.Rect({ x: m(-L / 2), y: m(-0.0095), width: m(L), height: m(0.019), cornerRadius: m(0.001), ...lin(0, 0, 0, m(0.019), [0, "#475569", 0.3, "#f1f5f9", 0.6, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  core.add(new Konva.Line({ points: [m(-L / 2 + 0.003), m(-0.0062), m(L / 2 - 0.003), m(-0.0062)], stroke: "rgba(255,255,255,0.7)", strokeWidth: lw * 1.2, lineCap: "round", listening: false }));
  core.add(new Konva.Rect({ x: m(L / 2), y: m(-0.0042), width: m(0.012), height: m(0.0084), ...lin(0, 0, 0, m(0.0084), steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  core.add(new Konva.Rect({ x: m(L / 2 + 0.012), y: m(-0.0078), width: m(0.011), height: m(0.0156), cornerRadius: m(0.003), ...lin(0, 0, 0, m(0.0156), [0, "#6b7280", 0.4, "#1f2937", 1, "#030712"]), stroke: "#000", strokeWidth: lw * 0.8, listening: false }));
  group.add(core);
  // Trục ống dây.
  group.add(new Konva.Line({ points: [m(-L / 2 - 0.016), 0, m(-L / 2 - 0.004), 0], stroke: "rgba(251,191,36,0.6)", strokeWidth: lw, dash: [m(0.003), m(0.002)], listening: false }));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.09), y: m(RO + 0.012), width: m(0.18), align: "center", text: label, fontSize: m(0.012), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { core: { node: core, motion: "slide" as const, axis: "right" as const, min: 0, max: 0.09 } },
    points: { center: { x: 0, y: 0 }, endLeft: { x: m(-L / 2), y: 0 }, endRight: { x: m(L / 2), y: 0 }, terminalA: { x: m(-L / 2 - 0.034), y: m(-RO + 0.0045) }, terminalB: { x: m(L / 2 + 0.034), y: m(-RO + 0.0045) } },
  };
};
