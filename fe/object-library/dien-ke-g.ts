/* OBJECT-META
{
  "catalog": "Điện kế G (số 0 ở giữa)",
  "title": "Điện kế khung quay kiểu bàn: mặt chia hai phía −30…0…+30, kim đỏ, đế gỗ có hai đầu nối và vít chỉnh 0",
  "fill": "#7c4a1e",
  "anchor": "Trục kim (tâm mặt đồng hồ).",
  "useWhen": ["Cần điện kế có số 0 ở giữa để phát hiện dòng điện hai chiều, thang ±30 µA.", "Cảnh cảm ứng điện từ hoặc cầu Wheatstone cần kim lệch trái hay phải theo chiều dòng."],
  "avoidWhen": ["Cần ampe kế đo giá trị dòng ra ampe: dùng ampe-ke.", "Cần đồng hồ số có chữ số đọc: dùng dong-ho-da-nang; điện kế này chỉ có kim, thang ±30."],
  "size": { "width": 0.16, "height": 0.14 },
  "parts": [
    { "name": "needle", "label": "Kim chỉ", "motion": "rotate", "min": -60, "max": 60, "description": "Góc lệch của kim so với vạch 0 ở giữa, độ; dương là lệch sang phải, âm sang trái. 60° ứng với thang đầy +30." }
  ],
  "points": [
    { "name": "pivot", "description": "Trục kim." },
    { "name": "left", "description": "Đầu nối trái." },
    { "name": "right", "description": "Đầu nối phải." }
  ],
  "notes": "Thang chia 2 vạch nhỏ trên mỗi số, số ghi mỗi 10 đơn vị (µA) ở cả hai phía; điểm 0 ở giữa nên đo được dòng theo hai chiều (cảm ứng điện từ, cầu Wheatstone). fill là màu gỗ của đế."
}
*/
const makeGalvanometer = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const R = 0.046;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0012));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const polar = (r: number, deg: number): [number, number] => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Đế gỗ vát hai đầu, có chân cao su.
  group.add(new Konva.Line({ points: [m(-0.08), m(0.082), m(-0.074), m(0.052), m(0.074), m(0.052), m(0.08), m(0.082)], closed: true, ...lin(0, m(0.052), 0, m(0.082), [0, "#d7a566", 0.3, fill, 1, "#3b1f09"]), stroke: "#2a1606", strokeWidth: lw * 1.2, lineJoin: "round", shadowColor: "#000", shadowBlur: m(0.012), shadowOpacity: 0.45, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  for (let i = 0; i < 4; i += 1) group.add(new Konva.Line({ points: [m(-0.07), m(0.059 + i * 0.0055), m(-0.01), m(0.0595 + i * 0.0055), m(0.07), m(0.059 + i * 0.0055)], stroke: i % 2 ? "rgba(42,22,6,0.4)" : "rgba(255,225,180,0.22)", strokeWidth: lw * 0.6, tension: 0.4, listening: false }));
  for (const x of [-0.06, 0.06]) group.add(new Konva.Rect({ x: m(x - 0.01), y: m(0.082), width: m(0.02), height: m(0.005), cornerRadius: m(0.002), fill: "#0b0f19", listening: false }));

  // Thân điện kế hình trụ ngắn bằng đồng thau sơn đen: thân và vành trước.
  group.add(new Konva.Rect({ x: m(-0.056), y: m(-0.055), width: m(0.112), height: m(0.11), cornerRadius: m(0.012), ...lin(m(-0.056), 0, m(0.056), 0, [0, "#27272a", 0.2, "#3f3f46", 0.6, "#18181b", 1, "#09090b"]), stroke: "#000", strokeWidth: lw * 1.2, listening: false }));
  group.add(new Konva.Circle({ radius: m(0.0515), ...lin(m(-0.05), m(-0.05), m(0.05), m(0.05), [0, "#f1f5f9", 0.3, "#b0833a", 0.75, "#6b4a10", 1, "#3a2808"]), stroke: "#3a2808", strokeWidth: lw, listening: false }));
  group.add(new Konva.Circle({ radius: m(0.0485), fill: "#09090b", listening: false }));
  group.add(new Konva.Circle({ radius: m(0.0475), fillRadialGradientStartPoint: { x: m(-0.012), y: m(-0.016) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0475), fillRadialGradientColorStops: [0, "#ffffff", 0.7, "#f8f4e3", 1, "#d8d2bb"], listening: false }));

  // Thang chia hai phía: vạch 0 ở giữa; số 10, 20, 30; vạch phụ mỗi 2.
  for (let i = -15; i <= 15; i += 1) {
    const deg = i * 4;
    const major = i % 5 === 0;
    const [x1, y1] = polar(R - 0.0035, deg);
    const [x2, y2] = polar(R - (i === 0 ? 0.0125 : major ? 0.0105 : 0.0062), deg);
    group.add(ln([x1, y1, x2, y2], i === 0 ? "#b91c1c" : "#0f172a", i === 0 ? lw * 2.2 : major ? lw * 1.5 : lw * 0.8));
    if (major && i !== 0) {
      const [tx, ty] = polar(R - 0.0195, deg);
      group.add(new Konva.Text({ x: m(tx), y: m(ty), width: m(0.012), offsetX: m(0.006), offsetY: m(0.004), rotation: deg, align: "center", text: String(Math.abs(i) * 2), fontSize: m(0.0066), fontStyle: "bold", fill: "#0f172a", listening: false }));
    }
  }
  group.add(new Konva.Text({ x: m(-0.0035), y: m(-R + 0.0135), text: "0", fontSize: m(0.0088), fontStyle: "bold", fill: "#b91c1c", listening: false }));
  group.add(new Konva.Text({ x: m(-0.018), y: m(0.0085), width: m(0.036), align: "center", text: "G", fontSize: m(0.0255), fontStyle: "bold", fill: "#0f172a", listening: false }));
  group.add(new Konva.Text({ x: m(-0.03), y: m(0.0345), width: m(0.06), align: "center", text: "± 30 µA", fontSize: m(0.0062), fill: "#334155", listening: false }));
  group.add(new Konva.Text({ x: m(-0.03), y: m(-0.0105), width: m(0.06), align: "center", text: "GALVANOMETER", fontSize: m(0.0036), fontStyle: "bold", fill: "#64748b", listening: false }));

  // BỘ PHẬN QUAY: kim đỏ thẳng đứng ở 0; đuôi đối trọng hình thoi.
  const needle = new Konva.Group({ x: 0, y: 0 });
  needle.add(new Konva.Line({ points: [m(-0.0016), m(0.011), m(-0.0007), m(-R + 0.004), 0, m(-R - 0.0035), m(0.0007), m(-R + 0.004), m(0.0016), m(0.011)], closed: true, fill: "#dc2626", stroke: "#7f1d1d", strokeWidth: lw * 0.4, shadowColor: "#000", shadowBlur: m(0.0025), shadowOpacity: 0.4, shadowOffset: { x: m(0.001), y: m(0.0012) }, listening: false }));
  needle.add(new Konva.Circle({ x: 0, y: m(0.0095), radius: m(0.0032), fill: "#dc2626", stroke: "#7f1d1d", strokeWidth: lw * 0.5, listening: false }));
  group.add(needle);
  group.add(new Konva.Circle({ radius: m(0.0052), ...lin(m(-0.0052), m(-0.0052), m(0.0052), m(0.0052), [0, "#fde68a", 0.5, "#b0833a", 1, "#3a2808"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
  // Kính và vệt sáng.
  group.add(new Konva.Arc({ x: 0, y: 0, innerRadius: m(0.0432), outerRadius: m(0.0462), angle: 60, rotation: 205, fill: "rgba(255,255,255,0.6)", listening: false }));

  // Hai đầu nối và vít chỉnh số 0 trên đế.
  const posts: [number, string, string][] = [[-0.052, "#dc2626", "#fecaca"], [0.052, "#111827", "#9ca3af"]];
  for (const [x, color, hi] of posts) {
    group.add(new Konva.Circle({ x: m(x), y: m(0.0665), radius: m(0.0075), ...lin(m(x - 0.0075), 0, m(x + 0.0075), 0, [0, "#475569", 0.4, "#f1f5f9", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(0.0665), radius: m(0.0055), fillRadialGradientStartPoint: { x: m(x - 0.0015), y: m(0.065) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: m(x), y: m(0.0665) }, fillRadialGradientEndRadius: m(0.0055), fillRadialGradientColorStops: [0, hi, 0.5, color, 1, "#000"], stroke: "#030712", strokeWidth: lw * 0.8, listening: false }));
  }
  group.add(new Konva.Circle({ x: 0, y: m(0.0665), radius: m(0.0048), fill: "#cbd5e1", stroke: "#1f2937", strokeWidth: lw, listening: false }));
  group.add(ln([-0.0035, 0.0665, 0.0035, 0.0665], "#0f172a", lw * 1.4));

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.09), width: m(0.14), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: { needle: { node: needle, motion: "rotate" as const, min: -60, max: 60 } },
    points: { pivot: { x: 0, y: 0 }, left: { x: m(-0.052), y: m(0.0665) }, right: { x: m(0.052), y: m(0.0665) } },
  };
};
