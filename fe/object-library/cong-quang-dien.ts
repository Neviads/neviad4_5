/* OBJECT-META
{
  "catalog": "Đồng hồ đo thời gian hiện số + cổng quang điện",
  "title": "Cổng quang điện trên giá đỡ nối dây với đồng hồ đo thời gian hiện số 0,001 s",
  "fill": "#1f2937",
  "anchor": "Giữa đáy giá đỡ của cổng quang điện, chạm mặt bàn.",
  "useWhen": ["Cần cổng quang điện nối đồng hồ đo thời gian hiện số 0,001 s để đo thời gian vật chắn sáng đi qua.","Cần khe rộng 0,05 m cho tấm chắn sáng của xe hay vật rơi đi qua."],
  "avoidWhen": ["Cần đồng hồ bấm giây bấm tay: dùng dong-ho-bam-giay.","Cần chỉ tấm chắn gắn trên xe: dùng tam-chan-sang; cổng này đứng yên, không tự có tấm chắn."],
  "size": {
    "width": 0.365,
    "height": 0.174
  },
  "parts": [],
  "points": [
    {
      "name": "base",
      "description": "Giữa đáy giá đỡ của cổng."
    },
    {
      "name": "beam",
      "description": "Giữa tia hồng ngoại giữa hai nhánh của cổng; vật chắn tia ở đây."
    },
    {
      "name": "display",
      "description": "Tâm màn hình số của đồng hồ."
    }
  ],
  "notes": "Cổng cao 0,16 m, khe rộng 0,05 m; vật có tấm chắn sáng đi qua khe làm ngắt tia (đèn báo đổi màu do cảnh). Đồng hồ đặt cách cổng 0,18 m, nối bằng dây cáp. Màn hình hiển thị 0.000 s mặc định, cảnh đặt chữ khác nếu cần. fill là màu vỏ nhựa."
}
*/
const makePhotogateTimer = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const m = (v: number) => v * ppm;
  const lw = Math.max(1, m(0.0014));
  const lin = (x1: number, y1: number, x2: number, y2: number, stops: (number | string)[]) => ({
    fillLinearGradientStartPoint: { x: x1, y: y1 }, fillLinearGradientEndPoint: { x: x2, y: y2 }, fillLinearGradientColorStops: stops,
  });
  const ln = (pts: number[], stroke: string, w: number) => new Konva.Line({ points: pts.map(m), stroke, strokeWidth: w, lineCap: "round", listening: false });
  const steel = [0, "#64748b", 0.3, "#f1f5f9", 0.62, "#cbd5e1", 1, "#475569"];

  const group = new Konva.Group({ x: p.x, y: p.y });
  const GX = 0; // trục giá đỡ của cổng
  const TIMER_X = 0.18;

  // Dây cáp từ cổng sang đồng hồ.
  group.add(new Konva.Line({ points: [m(0.012), m(-0.108), m(0.05), m(-0.095), m(0.07), m(-0.01), m(0.11), m(-0.004), m(TIMER_X - 0.01), m(-0.03), m(TIMER_X + 0.02), m(-0.045)], stroke: "#0b1220", strokeWidth: m(0.0042), tension: 0.5, lineCap: "round", listening: false }));
  group.add(new Konva.Line({ points: [m(0.012), m(-0.108), m(0.05), m(-0.095), m(0.07), m(-0.01), m(0.11), m(-0.004), m(TIMER_X - 0.01), m(-0.03), m(TIMER_X + 0.02), m(-0.045)], stroke: "rgba(255,255,255,0.14)", strokeWidth: m(0.0012), tension: 0.5, lineCap: "round", listening: false }));

  // Đế đỡ kim loại và trụ.
  group.add(new Konva.Rect({ x: m(GX - 0.045), y: m(-0.012), width: m(0.09), height: m(0.012), cornerRadius: m(0.003), ...lin(0, m(-0.012), 0, 0, [0, "#94a3b8", 1, "#334155"]), stroke: "#0f172a", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.008), shadowOpacity: 0.4, listening: false }));
  group.add(new Konva.Rect({ x: m(GX - 0.0065), y: m(-0.098), width: m(0.013), height: m(0.088), cornerRadius: m(0.0065), ...lin(m(GX - 0.0065), 0, m(GX + 0.0065), 0, steel), stroke: "#334155", strokeWidth: lw * 0.7, listening: false }));
  // Thân cổng hình chữ U gắn trên đỉnh trụ: hai nhánh phát và thu.
  const top = -0.17;
  group.add(new Konva.Rect({ x: m(GX - 0.039), y: m(top + 0.045), width: m(0.078), height: m(0.03), cornerRadius: m(0.004), ...lin(0, m(top + 0.045), 0, m(top + 0.075), [0, "#4b5563", 1, fill]), stroke: "#0b1220", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(GX - 0.039), y: m(top), width: m(0.014), height: m(0.06), cornerRadius: m(0.003), ...lin(m(GX - 0.039), 0, m(GX - 0.025), 0, [0, "#6b7280", 0.5, "#374151", 1, fill]), stroke: "#0b1220", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(GX + 0.025), y: m(top), width: m(0.014), height: m(0.06), cornerRadius: m(0.003), ...lin(m(GX + 0.025), 0, m(GX + 0.039), 0, [0, "#6b7280", 0.5, "#374151", 1, fill]), stroke: "#0b1220", strokeWidth: lw, listening: false }));
  // Đèn phát (đỏ) và mắt thu (xanh dương) đối diện nhau.
  group.add(new Konva.Circle({ x: m(GX - 0.0235), y: m(top + 0.03), radius: m(0.0042), fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0, fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.0042), fillRadialGradientColorStops: [0, "#fecaca", 0.5, "#ef4444", 1, "#7f1d1d"], shadowColor: "#ef4444", shadowBlur: m(0.012), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Circle({ x: m(GX + 0.0235), y: m(top + 0.03), radius: m(0.0042), fill: "#0f172a", stroke: "#38bdf8", strokeWidth: lw, listening: false }));
  // Tia hồng ngoại giữa hai nhánh.
  group.add(new Konva.Line({ points: [m(GX - 0.019), m(top + 0.03), m(GX + 0.019), m(top + 0.03)], stroke: "rgba(248,113,113,0.8)", strokeWidth: m(0.0016), dash: [m(0.004), m(0.003)], listening: false }));
  // Đèn báo trạng thái và nhãn.
  group.add(new Konva.Circle({ x: m(GX), y: m(top + 0.06), radius: m(0.0026), fill: "#22c55e", shadowColor: "#22c55e", shadowBlur: m(0.006), shadowOpacity: 0.9, listening: false }));
  group.add(new Konva.Text({ x: m(GX - 0.016), y: m(top + 0.0495), width: m(0.032), align: "center", text: "GATE", fontSize: m(0.0042), fontStyle: "bold", fill: "#9ca3af", listening: false }));

  // Đồng hồ đo thời gian hiện số.
  const tx = TIMER_X;
  group.add(new Konva.Rect({ x: m(tx - 0.012), y: m(-0.001), width: m(0.14), height: m(0.001), fill: "rgba(0,0,0,0.001)", listening: false }));
  group.add(new Konva.Rect({ x: m(tx), y: m(-0.085), width: m(0.14), height: m(0.085), cornerRadius: m(0.007), ...lin(0, m(-0.085), 0, 0, [0, "#4b5563", 0.12, fill, 1, "#0b1220"]), stroke: "#030712", strokeWidth: lw, shadowColor: "#000", shadowBlur: m(0.014), shadowOpacity: 0.45, shadowOffset: { x: 0, y: m(0.005) }, listening: false }));
  group.add(new Konva.Rect({ x: m(tx + 0.009), y: m(-0.077), width: m(0.122), height: m(0.04), cornerRadius: m(0.004), fill: "#04210f", stroke: "#052e16", strokeWidth: lw, listening: false }));
  group.add(new Konva.Rect({ x: m(tx + 0.011), y: m(-0.075), width: m(0.118), height: m(0.036), cornerRadius: m(0.003), ...lin(0, m(-0.075), 0, m(-0.039), [0, "#a7f3a0", 1, "#6fcf6a"]), listening: false }));
  group.add(new Konva.Text({ x: m(tx + 0.014), y: m(-0.0725), width: m(0.098), align: "right", text: "0.000", fontSize: m(0.03), fontStyle: "bold", fontFamily: "Courier New", fill: "#052e16", listening: false }));
  group.add(new Konva.Text({ x: m(tx + 0.1135), y: m(-0.0525), text: "s", fontSize: m(0.0105), fontStyle: "bold", fill: "#052e16", listening: false }));
  // Hàng nút và cổng cắm.
  const buttons: [string, string][] = [["RESET", "#dc2626"], ["MODE", "#475569"], ["START", "#16a34a"]];
  buttons.forEach(([text, color], i) => {
    const bx = tx + 0.012 + i * 0.028;
    group.add(new Konva.Rect({ x: m(bx), y: m(-0.028), width: m(0.022), height: m(0.013), cornerRadius: m(0.003), ...lin(0, m(-0.028), 0, m(-0.015), [0, "#e5e7eb", 0.2, color, 1, "#111827"]), stroke: "#030712", strokeWidth: lw * 0.8, listening: false }));
    group.add(new Konva.Text({ x: m(bx - 0.002), y: m(-0.0125), width: m(0.026), align: "center", text, fontSize: m(0.0042), fill: "#cbd5e1", listening: false }));
  });
  for (let i = 0; i < 2; i += 1) {
    group.add(new Konva.Circle({ x: m(tx + 0.106 + i * 0.016), y: m(-0.02), radius: m(0.0052), fill: "#0b1220", stroke: "#cbd5e1", strokeWidth: lw, listening: false }));
    group.add(new Konva.Circle({ x: m(tx + 0.106 + i * 0.016), y: m(-0.02), radius: m(0.0018), fill: "#e2e8f0", listening: false }));
  }
  group.add(ln([tx + 0.01, 0, tx + 0.01, 0.004], "#0b1220", lw * 3));
  group.add(ln([tx + 0.13, 0, tx + 0.13, 0.004], "#0b1220", lw * 3));

  if (label) {
    group.add(new Konva.Text({ x: m(tx), y: m(0.01), width: m(0.14), align: "center", text: label, fontSize: m(0.011), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {},
    points: { base: { x: 0, y: 0 }, beam: { x: 0, y: m(top + 0.03) }, display: { x: m(tx + 0.07), y: m(-0.057) } },
  };
};
