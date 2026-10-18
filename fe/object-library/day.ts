/* OBJECT-META
{
  "catalog": "Dây (mảnh, không giãn)",
  "title": "Đoạn dây bện dù mảnh không giãn dài 0,30 m, hai đầu có vòng buộc lồng ống đồng",
  "fill": "#c8a06c",
  "anchor": "Giữa đoạn dây (trung điểm).",
  "useWhen": ["Cần đoạn dây dù mảnh không giãn dài 0,30 m có hai vòng buộc ở đầu để treo hoặc nối vật.","Cần hình mẫu một sợi dây đơn giản không dẫn điện."],
  "avoidWhen": ["Cần dây nối điện có kẹp hoặc chốt cắm: dùng day-noi.","Cần dây đàn căng trên hộp cộng hưởng: dùng day-dan; dây này vẽ sẵn thẳng nằm ngang, không tự uốn."],
  "size": { "width": 0.323, "height": 0.012 },
  "parts": [],
  "points": [
    { "name": "start", "description": "Tâm vòng buộc ở đầu trái." },
    { "name": "end", "description": "Tâm vòng buộc ở đầu phải." },
    { "name": "mid", "description": "Giữa đoạn dây." }
  ],
  "notes": "Mẫu dây vẽ thẳng nằm ngang dài 0,30 m, dùng làm hình mẫu khi chỉ cần một đoạn dây. Khi nối hai vật, dây không phải vật vẽ sẵn: cảnh vẽ đường thẳng từ điểm có tên của vật này sang vật kia. fill là màu sợi dây."
}
*/
const makeCord = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const LEN = 0.3;
  const T = 0.0042;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0008));
  const group = new Konva.Group({ x: p.x, y: p.y });

  // Bóng đổ dưới dây.
  group.add(new Konva.Line({ points: [m(-LEN / 2), m(0.0045), m(LEN / 2), m(0.0045)], stroke: "rgba(0,0,0,0.35)", strokeWidth: m(T * 1.1), lineCap: "round", listening: false }));
  // Lõi dây tối, vỏ bện sáng bên trên và các lọn bện nghiêng.
  group.add(new Konva.Line({ points: [m(-LEN / 2), 0, m(LEN / 2), 0], stroke: "#4a3510", strokeWidth: m(T + 0.0007), lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(-LEN / 2), 0, m(LEN / 2), 0], stroke: fill, strokeWidth: m(T), lineCap: "round", listening: false }));
  for (let x = -LEN / 2 + 0.003; x < LEN / 2 - 0.003; x += 0.0034) {
    group.add(new Konva.Line({ points: [m(x), m(-T / 2), m(x + 0.0022), m(T / 2)], stroke: "rgba(74,53,16,0.62)", strokeWidth: lw * 1.3, lineCap: "round", listening: false }));
    group.add(new Konva.Line({ points: [m(x + 0.0017), m(-T / 2 + 0.0004), m(x + 0.0039), m(T / 2 - 0.0004)], stroke: "rgba(255,240,200,0.5)", strokeWidth: lw, lineCap: "round", listening: false }));
  }
  group.add(new Konva.Line({ points: [m(-LEN / 2), m(-T / 2 + 0.0007), m(LEN / 2), m(-T / 2 + 0.0007)], stroke: "rgba(255,255,255,0.4)", strokeWidth: lw * 1.1, lineCap: "round", listening: false }));

  // Hai đầu: vòng buộc lồng ống đồng và khâu quấn chỉ.
  for (const side of [-1, 1]) {
    const x = side * (LEN / 2 + 0.0055);
    group.add(new Konva.Circle({ x: m(x), y: 0, radius: m(0.0058), stroke: "#4a3510", strokeWidth: m(0.0042), listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: 0, radius: m(0.0058), stroke: fill, strokeWidth: m(0.0028), listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: 0, radius: m(0.0034), stroke: "#e8b04a", strokeWidth: m(0.0009), listening: false }));
    group.add(new Konva.Rect({ x: m(side * (LEN / 2 - 0.0075) - 0.0045), y: m(-T / 2 - 0.0008), width: m(0.009), height: m(T + 0.0016), cornerRadius: m(0.0014), fill: "#d4a73a", stroke: "#6b4a10", strokeWidth: lw, listening: false }));
    for (let i = 0; i < 3; i += 1) group.add(new Konva.Line({ points: [m(side * (LEN / 2 - 0.0075) - 0.003 + i * 0.003), m(-T / 2 - 0.0008), m(side * (LEN / 2 - 0.0075) - 0.003 + i * 0.003), m(T / 2 + 0.0008)], stroke: "rgba(107,74,16,0.7)", strokeWidth: lw, listening: false }));
  }

  if (label) {
    group.add(new Konva.Text({ x: m(-0.06), y: m(0.012), width: m(0.12), align: "center", text: label, fontSize: m(0.008), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { start: { x: m(-LEN / 2 - 0.0055), y: 0 }, end: { x: m(LEN / 2 + 0.0055), y: 0 }, mid: { x: 0, y: 0 } } };
};
