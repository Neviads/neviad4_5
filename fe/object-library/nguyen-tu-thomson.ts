/* OBJECT-META
{
  "catalog": "Nguyên tử, mô hình \"bánh pudding\" của Thomson",
  "title": "Nguyên tử mô hình bánh pudding của Thomson: khối cầu điện tích dương màu hồng nhạt trong đó nhúng các electron xanh như nho khô",
  "fill": "#fda4af",
  "anchor": "Tâm khối cầu.",
  "useWhen": ["Cần mẫu nguyên tử Thomson 1904: khối cầu điện tích dương nhúng các electron như nho khô.", "Cảnh so sánh các mẫu nguyên tử trước thí nghiệm tán xạ hạt alpha của Rutherford."],
  "avoidWhen": ["Cần mẫu có hạt nhân nhỏ và electron quay: dùng nguyen-tu-bohr.", "Cần mẫu hiện đại: dùng nguyen-tu-dam-may; vật này tĩnh, không có hạt nhân và không có bộ phận quay."],
  "size": { "width": 0.1, "height": 0.1 },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Tâm nguyên tử."
    }
  ],
  "notes": "Mô hình J. J. Thomson (1904): nguyên tử là khối cầu điện tích dương phân bố đều (hồng nhạt), các electron (xanh) nhúng rải rác bên trong; vẽ phóng to khoảng 10¹⁰ lần (bán kính 0,055 m). Bị thí nghiệm tán xạ hạt α của Rutherford bác bỏ. fill là màu khối điện tích dương."
}
*/
const makeThomsonAtom = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0006));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const ball = (x: number, y: number, r: number, c1: string, c2: string, c3: string) => group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(r), fillRadialGradientStartPoint: { x: -m(r) * 0.35, y: -m(r) * 0.35 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(r), fillRadialGradientColorStops: [0, "#ffffff", 0.3, c1, 1, c2], stroke: c3, strokeWidth: lw, shadowColor: c1, shadowBlur: m(r) * 0.5, shadowOpacity: 0.45, listening: false }));
  const tx = (x: number, y: number, s: number, text: string, color: string) => group.add(new Konva.Text({ x: m(x - s * 2.5), y: m(y - s * 0.6), width: m(s * 5), align: "center", text, fontSize: m(s), fontStyle: "bold", fill: color, listening: false }));
  group.add(new Konva.Circle({ radius: m(0.055), fillRadialGradientStartPoint: { x: m(-0.02), y: m(-0.022) }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.055), fillRadialGradientColorStops: [0, "#fff1f2", 0.45, fill, 1, "#e11d48"], stroke: "#9f1239", strokeWidth: lw * 1.4, shadowColor: "#fb7185", shadowBlur: m(0.012), shadowOpacity: 0.5, listening: false }));
  for (const [x, y] of [[-0.027, -0.03], [0.02, -0.036], [0.038, -0.008], [-0.04, 0.003], [-0.006, 0.004], [0.026, 0.026], [-0.022, 0.032], [0.002, -0.015], [-0.01, 0.04]] as [number, number][]) {
    ball(x, y, 0.0073, "#38bdf8", "#0c4a6e", "#082f49");
    group.add(new Konva.Line({ points: [m(x - 0.0033), m(y), m(x + 0.0033), m(y)], stroke: "#f0f9ff", strokeWidth: m(0.0016), lineCap: "round", listening: false }));
  }
  group.add(new Konva.Text({ x: m(-0.012), y: m(0.014), text: "+", fontSize: m(0.018), fontStyle: "bold", fill: "rgba(127,29,29,0.5)", listening: false }));
  tx(0, -0.0625, 0.0065, "điện tích dương trải đều", "#fecdd3");

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.068), width: m(0.14), align: "center", text: label, fontSize: m(0.0065), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 } } };
};
