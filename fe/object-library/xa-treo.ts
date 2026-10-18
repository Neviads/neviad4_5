/* OBJECT-META
{
  "catalog": "Xà treo / giá treo ngang",
  "title": "Xà treo ngang bằng thép hộp, hai giá đỡ hai đầu và ba móc treo",
  "fill": "#94a3b8",
  "anchor": "Giữa xà, trên đường tâm của thanh.",
  "useWhen": ["Cần xà ngang thép dài 0,88 m có ba móc treo để buộc dây con lắc, lò xo hay ròng rọc.","Cần điểm treo ở trái, giữa, phải để treo nhiều vật cạnh nhau."],
  "avoidWhen": ["Cần giá thí nghiệm có chân đế và thanh đứng: dùng gia-thi-nghiem.","Cần con lắc hay lò xo đã gắn sẵn: dùng con-lac-don hoặc con-lac-lo-xo.","Chỉ là xà và hai giá đỡ, không có dây hay vật treo kèm."],
  "size": {
    "width": 0.88,
    "height": 0.141
  },
  "parts": [],
  "points": [
    {
      "name": "center",
      "description": "Giữa xà."
    },
    {
      "name": "hookLeft",
      "description": "Điểm treo của móc bên trái."
    },
    {
      "name": "hookMid",
      "description": "Điểm treo của móc giữa."
    },
    {
      "name": "hookRight",
      "description": "Điểm treo của móc bên phải."
    }
  ],
  "notes": "Dài 0,88 m. Móc treo là các vòng nhỏ để buộc dây con lắc, lò xo hay ròng rọc; vật treo vào điểm treo của móc. fill là màu thép của xà."
}
*/
const makeHangingBeam = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const LEN = 0.88;
  const H = 0.034;
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0025));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });

  const group = new Konva.Group({ x: p.x, y: p.y });

  // Hai giá đỡ chữ L bắt vào tường hay giá đỡ phía sau.
  for (const side of [-1, 1]) {
    const x = side * (LEN / 2 - 0.02);
    group.add(new Konva.Rect({ x: m(x - 0.018), y: m(-0.09), width: m(0.036), height: m(0.09 + H / 2 + 0.012), cornerRadius: m(0.004), ...lin(m(x - 0.018), 0, m(x + 0.018), 0, [0, "#475569", 0.3, "#cbd5e1", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.01), shadowOpacity: 0.3, listening: false }));
    for (const y of [-0.075, -0.05]) group.add(new Konva.Circle({ x: m(x), y: m(y), radius: m(0.0045), fill: "#e2e8f0", stroke: "#1e293b", strokeWidth: lw * 0.7, listening: false }));
  }

  // Xà: thép hộp có gân sáng ở mép trên.
  group.add(new Konva.Rect({ x: m(-LEN / 2), y: m(-H / 2), width: m(LEN), height: m(H), cornerRadius: m(0.005), ...lin(0, m(-H / 2), 0, m(H / 2), [0, "#e2e8f0", 0.12, fill, 0.7, "#64748b", 1, "#334155"]), stroke: "#1e293b", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.4, shadowOffset: { x: 0, y: m(0.006) }, listening: false }));
  group.add(new Konva.Line({ points: [m(-LEN / 2 + 0.012), m(-H / 2 + 0.004), m(LEN / 2 - 0.012), m(-H / 2 + 0.004)], stroke: "rgba(255,255,255,0.7)", strokeWidth: lw, lineCap: "round", listening: false }));
  // Bu lông bắt giá đỡ vào xà.
  for (const side of [-1, 1]) group.add(new Konva.Circle({ x: m(side * (LEN / 2 - 0.02)), y: 0, radius: m(0.0065), fill: "#cbd5e1", stroke: "#1e293b", strokeWidth: lw * 0.7, listening: false }));
  // Vạch chia để đặt móc đều nhau.
  for (let i = -8; i <= 8; i += 1) {
    const x = (i * LEN) / 20;
    group.add(new Konva.Line({ points: [m(x), m(H / 2 - 0.009), m(x), m(H / 2 - 0.002)], stroke: "rgba(15,23,42,0.55)", strokeWidth: lw * 0.6, listening: false }));
  }

  // Ba móc treo: kẹp trượt trên xà, vòng thép bên dưới.
  const hooks: Record<string, { x: number; y: number }> = {};
  const names = ["hookLeft", "hookMid", "hookRight"];
  [-0.28, 0, 0.28].forEach((x, index) => {
    group.add(new Konva.Rect({ x: m(x - 0.011), y: m(-H / 2 - 0.004), width: m(0.022), height: m(H + 0.008), cornerRadius: m(0.003), ...lin(m(x - 0.011), 0, m(x + 0.011), 0, [0, "#7f1d1d", 0.4, "#ef4444", 1, "#7f1d1d"]), stroke: "#450a0a", strokeWidth: lw * 0.7, listening: false }));
    group.add(new Konva.Line({ points: [m(x), m(H / 2 + 0.004), m(x), m(H / 2 + 0.018)], stroke: "#cbd5e1", strokeWidth: m(0.0035), lineCap: "round", listening: false }));
    group.add(new Konva.Circle({ x: m(x), y: m(H / 2 + 0.026), radius: m(0.0075), stroke: "#e2e8f0", strokeWidth: m(0.0035), shadowColor: "#000", shadowBlur: m(0.004), shadowOpacity: 0.3, listening: false }));
    hooks[names[index]] = { x: m(x), y: m(H / 2 + 0.0335) };
  });

  if (label) {
    group.add(new Konva.Text({ x: m(-0.15), y: m(-0.095), width: m(0.3), align: "center", text: label, fontSize: m(0.018), fill: "#e2e8f0", listening: false }));
  }

  return { group, parts: {}, points: { center: { x: 0, y: 0 }, ...hooks } as { center: { x: number; y: number }; hookLeft: { x: number; y: number }; hookMid: { x: number; y: number }; hookRight: { x: number; y: number } } };
};
