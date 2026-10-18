/* OBJECT-META
{
  "catalog": "Photon / tia gamma (gói sóng)",
  "title": "Photon / tia gamma: gói sóng điện từ dạng dao động sin có đường bao Gauss, nhãn hf và mũi tên chiều truyền",
  "fill": "#fde047",
  "anchor": "Tâm gói sóng.",
  "useWhen": ["Cần minh hoạ photon hoặc tia γ là gói sóng điện từ có bao Gauss, nhãn hf, chiều truyền sang phải.","Cần nói năng lượng ε = hf của một lượng tử ánh sáng."],
  "avoidWhen": ["Cần hạt có khối lượng như electron, proton, hạt alpha: dùng electron, proton, hat-alpha.","Cần tia sáng thẳng trong quang hình học: dùng ray-quang-hoc hoặc nguồn laser (laser)."],
  "size": { "width": 0.15, "height": 0.058 },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Tâm gói sóng."
    },
    {
      "name": "front",
      "description": "Đầu trước gói sóng (bên phải)."
    }
  ],
  "notes": "Một photon là gói sóng điện từ năng lượng ε = hf lan truyền thẳng với tốc độ c; hình vẽ minh hoạ khoa học (không phải ảnh): dao động vàng, bao Gauss dài 0,14 m, mũi tên chỉ chiều truyền (sang phải). Tia γ cùng dạng nhưng bước sóng ngắn hơn rất nhiều. fill là màu photon."
}
*/
const makePhoton = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0006));
  const group = new Konva.Group({ x: p.x, y: p.y });
  const tx = (x: number, y: number, s: number, text: string, color: string) => group.add(new Konva.Text({ x: m(x - s * 2.5), y: m(y - s * 0.6), width: m(s * 5), align: "center", text, fontSize: m(s), fontStyle: "bold", fill: color, listening: false }));
  const env: number[] = [];
  const wave: number[] = [];
  for (let i = 0; i <= 140; i += 1) {
    const x = -0.07 + i * 0.001;
    const g = Math.exp(-((x / 0.028) ** 2));
    wave.push(m(x), m(-0.022 * g * Math.sin(x * 330)));
    env.push(m(x), m(-0.024 * g));
  }
  group.add(new Konva.Line({ points: wave, stroke: "rgba(253,224,71,0.35)", strokeWidth: m(0.008), lineCap: "round", lineJoin: "round", tension: 0.4, listening: false }));
  group.add(new Konva.Line({ points: wave, stroke: fill, strokeWidth: m(0.0028), lineCap: "round", lineJoin: "round", tension: 0.4, listening: false }));
  group.add(new Konva.Line({ points: env, stroke: "rgba(254,240,138,0.45)", strokeWidth: lw, dash: [m(0.003), m(0.002)], tension: 0.3, listening: false }));
  group.add(new Konva.Line({ points: wave.map((v, i) => (i % 2 === 1 ? -v : v)), stroke: "rgba(254,240,138,0.45)", strokeWidth: lw, dash: [m(0.003), m(0.002)], tension: 0.3, listening: false }));
  group.add(new Konva.Line({ points: [m(-0.075), 0, m(0.075), 0], stroke: "rgba(148,163,184,0.5)", strokeWidth: lw, listening: false }));
  group.add(new Konva.Arrow({ points: [m(0.02), m(0.034), m(0.07), m(0.034)], stroke: "#fef08a", fill: "#fef08a", strokeWidth: lw * 1.6, pointerLength: m(0.007), pointerWidth: m(0.006), listening: false }));
  tx(-0.03, 0.034, 0.0095, "ε = hf", "#fef9c3");

  if (label) {
    group.add(new Konva.Text({ x: m(-0.07), y: m(0.045), width: m(0.14), align: "center", text: label, fontSize: m(0.0065), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, front: { x: m(0.07), y: 0 } } };
};
