/* OBJECT-META
{
  "catalog": "Người (đứng, đẩy, kéo, ngồi)",
  "title": "Người nhìn nghiêng, quay mặt sang phải",
  "fill": "#e8724a",
  "anchor": "Giữa đế giày, chạm sàn.",
  "useWhen": ["Cần người nhìn nghiêng quay mặt sang phải, cao 1,715 m, có tay chân tách rời để biểu diễn chuyển động.","Cần người đứng, đi, ném hoặc đẩy vật, có thân, tay trước sau, chân trước sau."],
  "avoidWhen": ["Cần người nhìn chính diện hoặc quay mặt sang trái: vật này chỉ nhìn nghiêng sang phải.","Cần vật chuyển động đơn giản thay cho người: dùng vien-bi hoặc xe-lan.","Cần người trong thang máy hoặc ô tô: dùng nguoi kết hợp thang-may hoặc o-to."],
  "size": {
    "width": 0.3,
    "height": 1.715
  },
  "parts": [
    {
      "name": "torso",
      "label": "Thân nghiêng",
      "motion": "rotate",
      "min": -30,
      "max": 35,
      "description": "Thân, đầu và hai tay nghiêng quanh hông, độ; dương là cúi về phía trước (khi đẩy)."
    },
    {
      "name": "frontArm",
      "label": "Tay trước",
      "motion": "rotate",
      "min": -170,
      "max": 60,
      "description": "Tay phía người xem quay quanh vai, độ; âm là đưa tay ra trước, −90° là duỗi thẳng ngang."
    },
    {
      "name": "backArm",
      "label": "Tay sau",
      "motion": "rotate",
      "min": -170,
      "max": 60,
      "description": "Tay phía bên kia, cùng quy ước với tay trước."
    },
    {
      "name": "frontLeg",
      "label": "Chân trước",
      "motion": "rotate",
      "min": -50,
      "max": 40,
      "description": "Chân phía người xem quay quanh hông, độ; âm là bước ra trước."
    },
    {
      "name": "backLeg",
      "label": "Chân sau",
      "motion": "rotate",
      "min": -50,
      "max": 40,
      "description": "Chân phía bên kia, cùng quy ước."
    }
  ],
  "points": [
    {
      "name": "hip",
      "description": "Khớp hông, tâm quay của thân và hai chân."
    },
    {
      "name": "shoulder",
      "description": "Khớp vai ở tư thế đứng thẳng."
    },
    {
      "name": "hand",
      "description": "Bàn tay trước ở tư thế đứng thẳng (tay buông)."
    },
    {
      "name": "headTop",
      "description": "Đỉnh đầu."
    }
  ],
  "notes": "Cao 1,72 m. Tay nằm trong nhóm thân nên nghiêng theo thân. fill là màu áo."
}
*/
const makePerson = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const HIP = 0.92;
  const SHOULDER = 0.47; // từ hông lên vai
  const ARM = 0.6;
  const m = (v: number) => v * ppm;
  const skin = "#e8b48a";
  const skinShade = "#c98f66";
  const pants = "#1f3a5f";
  const pantsShade = "#162a45";
  const shoe = "#111827";
  const line = Math.max(1, m(0.004));

  const group = new Konva.Group({ x: p.x, y: p.y });

  /** Một chân: gốc ở khớp hông, ống quần thon dần xuống mắt cá rồi tới giày. */
  const makeLeg = (shade: boolean) => {
    const leg = new Konva.Group({ x: 0, y: m(-HIP) });
    leg.add(new Konva.Line({
      points: [m(-0.075), m(0), m(0.07), m(0), m(0.062), m(0.42), m(0.05), m(0.84), m(-0.05), m(0.84), m(-0.064), m(0.42)],
      closed: true, tension: 0.15, fill: shade ? pantsShade : pants, stroke: "#0b1526", strokeWidth: line, listening: false,
    }));
    // Nếp gấp ở đầu gối.
    leg.add(new Konva.Line({ points: [m(-0.02), m(0.42), m(0.04), m(0.44)], stroke: "rgba(255,255,255,0.12)", strokeWidth: line, lineCap: "round", listening: false }));
    // Giày: mũi giày hướng về phía trước (sang phải).
    leg.add(new Konva.Line({
      points: [m(-0.065), m(0.83), m(0.06), m(0.83), m(0.17), m(0.875), m(0.185), m(0.905), m(0.18), m(0.92), m(-0.07), m(0.92), m(-0.075), m(0.88)],
      closed: true, tension: 0.2, fill: shade ? "#0b0f19" : shoe, stroke: "#374151", strokeWidth: line, listening: false,
    }));
    leg.add(new Konva.Rect({ x: m(-0.07), y: m(0.905), width: m(0.25), height: m(0.015), cornerRadius: m(0.006), fill: "#4b5563", listening: false }));
    return leg;
  };

  /** Một tay: gốc ở khớp vai, tay áo ngắn rồi cẳng tay và bàn tay. */
  const makeArm = (shade: boolean) => {
    const arm = new Konva.Group({ x: m(0.005), y: m(-SHOULDER) });
    arm.add(new Konva.Line({
      points: [m(-0.042), m(-0.02), m(0.042), m(-0.02), m(0.034), m(0.5), m(-0.03), m(0.5)],
      closed: true, tension: 0.2, fill: shade ? skinShade : skin, stroke: "#8a5a3c", strokeWidth: line * 0.7, listening: false,
    }));
    // Tay áo (màu áo) che phần trên cánh tay.
    arm.add(new Konva.Line({
      points: [m(-0.055), m(-0.04), m(0.055), m(-0.04), m(0.05), m(0.2), m(-0.048), m(0.2)],
      closed: true, tension: 0.25, fill, stroke: "rgba(0,0,0,0.35)", strokeWidth: line, opacity: shade ? 0.82 : 1, listening: false,
    }));
    // Bàn tay.
    arm.add(new Konva.Ellipse({ x: m(0.004), y: m(ARM - 0.06), radiusX: m(0.038), radiusY: m(0.05), fill: shade ? skinShade : skin, stroke: "#8a5a3c", strokeWidth: line * 0.7, listening: false }));
    arm.add(new Konva.Ellipse({ x: m(0.03), y: m(ARM - 0.075), radiusX: m(0.012), radiusY: m(0.025), rotation: -20, fill: shade ? skinShade : skin, stroke: "#8a5a3c", strokeWidth: line * 0.6, listening: false }));
    return arm;
  };

  const backLeg = makeLeg(true);
  group.add(backLeg);

  // Thân: gốc ở hông. Tay sau vẽ trước thân, tay trước vẽ sau.
  const torso = new Konva.Group({ x: 0, y: m(-HIP) });
  const backArm = makeArm(true);
  torso.add(backArm);
  // Áo: ngực hơi nhô ra trước, lưng thẳng.
  torso.add(new Konva.Line({
    points: [m(-0.1), m(0.02), m(-0.115), m(-0.25), m(-0.1), m(-0.45), m(-0.05), m(-0.5), m(0.05), m(-0.5), m(0.105), m(-0.44), m(0.125), m(-0.3), m(0.1), m(-0.1), m(0.09), m(0.02)],
    closed: true, tension: 0.3, fill, stroke: "rgba(0,0,0,0.4)", strokeWidth: line, shadowColor: "#000", shadowBlur: m(0.02), shadowOpacity: 0.3, listening: false,
  }));
  // Đường may và thắt lưng.
  torso.add(new Konva.Line({ points: [m(0.0), m(-0.48), m(0.02), m(-0.05)], stroke: "rgba(0,0,0,0.15)", strokeWidth: line, listening: false }));
  torso.add(new Konva.Rect({ x: m(-0.1), y: m(-0.02), width: m(0.195), height: m(0.035), cornerRadius: m(0.008), fill: "#3f2a1d", listening: false }));
  torso.add(new Konva.Rect({ x: m(0.04), y: m(-0.016), width: m(0.03), height: m(0.026), cornerRadius: m(0.004), stroke: "#d4b483", strokeWidth: line * 0.7, listening: false }));
  // Cổ.
  torso.add(new Konva.Rect({ x: m(-0.03), y: m(-0.57), width: m(0.06), height: m(0.09), cornerRadius: m(0.02), fill: skinShade, listening: false }));
  // Đầu: khuôn mặt nhìn nghiêng sang phải.
  const head = new Konva.Group({ x: m(0.015), y: m(-0.67) });
  head.add(new Konva.Ellipse({ radiusX: m(0.095), radiusY: m(0.115), fill: skin, stroke: "#8a5a3c", strokeWidth: line * 0.7, listening: false }));
  head.add(new Konva.Line({ points: [m(0.085), m(-0.02), m(0.115), m(0.025), m(0.09), m(0.035)], closed: true, tension: 0.3, fill: skin, stroke: "#8a5a3c", strokeWidth: line * 0.6, listening: false }));
  head.add(new Konva.Line({
    points: [m(-0.1), m(0.02), m(-0.105), m(-0.06), m(-0.06), m(-0.115), m(0.03), m(-0.125), m(0.095), m(-0.07), m(0.07), m(-0.055), m(-0.02), m(-0.06), m(-0.045), m(0.03)],
    closed: true, tension: 0.35, fill: "#2b1d14", listening: false,
  }));
  head.add(new Konva.Ellipse({ x: m(-0.02), y: m(0.0), radiusX: m(0.018), radiusY: m(0.028), fill: skinShade, stroke: "#8a5a3c", strokeWidth: line * 0.5, listening: false }));
  head.add(new Konva.Circle({ x: m(0.058), y: m(-0.012), radius: m(0.009), fill: "#1f2937", listening: false }));
  head.add(new Konva.Line({ points: [m(0.045), m(-0.032), m(0.075), m(-0.036)], stroke: "#2b1d14", strokeWidth: line * 1.2, lineCap: "round", listening: false }));
  head.add(new Konva.Line({ points: [m(0.06), m(0.06), m(0.085), m(0.058)], stroke: "#9a4a3c", strokeWidth: line, lineCap: "round", listening: false }));
  torso.add(head);
  const frontArm = makeArm(false);
  torso.add(frontArm);
  group.add(torso);

  const frontLeg = makeLeg(false);
  group.add(frontLeg);

  if (label) {
    group.add(new Konva.Text({ x: m(-0.4), y: m(-1.86), width: m(0.8), align: "center", text: label, fontSize: m(0.06), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      torso: { node: torso, motion: "rotate" as const, min: -30, max: 35 },
      frontArm: { node: frontArm, motion: "rotate" as const, min: -170, max: 60 },
      backArm: { node: backArm, motion: "rotate" as const, min: -170, max: 60 },
      frontLeg: { node: frontLeg, motion: "rotate" as const, min: -50, max: 40 },
      backLeg: { node: backLeg, motion: "rotate" as const, min: -50, max: 40 },
    },
    points: {
      hip: { x: 0, y: m(-HIP) },
      shoulder: { x: m(0.005), y: m(-HIP - SHOULDER) },
      hand: { x: m(0.01), y: m(-HIP - SHOULDER + ARM - 0.06) },
      headTop: { x: m(0.015), y: m(-0.67 - HIP - 0.115) },
    },
  };
};
