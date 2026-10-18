/* OBJECT-META
{
  "catalog": "Nguyên tử, mô hình Bohr (hạt nhân + quỹ đạo)",
  "title": "Nguyên tử natri theo mẫu Bohr (2, 8, 1)",
  "fill": "#60758b",
  "anchor": "Tâm hạt nhân.",
  "useWhen": ["Cần mô hình Bohr nguyên tử natri (2, 8, 1) có các lớp electron K, L, M quay riêng được.", "Cần electron hoá trị lớp ngoài để vẽ photon hấp thụ hoặc electron bứt ra."],
  "avoidWhen": ["Cần mẫu bánh pudding hay đám mây xác suất: dùng nguyen-tu-thomson hoặc nguyen-tu-dam-may.", "Vật không theo tỉ lệ thật và chỉ là natri; cần hiđro hay nguyên tố khác thì phải vẽ lại."],
  "size": { "width": 0.6, "height": 0.6 },
  "parts": [
    { "name": "shell1", "label": "Lớp K", "motion": "rotate", "min": 0, "max": 360, "description": "Góc của 2 electron lớp trong cùng, độ." },
    { "name": "shell2", "label": "Lớp L", "motion": "rotate", "min": 0, "max": 360, "description": "Góc của 8 electron lớp giữa, độ." },
    { "name": "shell3", "label": "Lớp M", "motion": "rotate", "min": 0, "max": 360, "description": "Góc của electron hoá trị lớp ngoài, độ." }
  ],
  "points": [
    { "name": "nucleus", "description": "Tâm hạt nhân." },
    { "name": "valence", "description": "Electron lớp ngoài ở góc 0° (để vẽ photon hay electron bứt ra)." }
  ],
  "notes": "Kích thước là của mô hình (bán kính quỹ đạo ngoài 0,28 m), không theo tỉ lệ thật. Hạt nhân 11 proton (đỏ) và 12 neutron (xám). Không dùng fill."
}
*/
const makeBohrSodiumAtom = (p: { x: number; y: number }, ppm: number, fill: string, label?: string) => {
  const ORBITS = [0.12, 0.2, 0.28];
  const ELECTRONS = [2, 8, 1];
  const PROTONS = 11;
  const NEUTRONS = 12;
  const BALL = 0.014;
  const ELECTRON = 0.016;
  const m = (v: number) => v * ppm;

  const group = new Konva.Group({ x: p.x, y: p.y });

  // Quầng sáng sau hạt nhân.
  group.add(new Konva.Circle({
    radius: m(0.11),
    fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0,
    fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(0.11),
    fillRadialGradientColorStops: [0, "rgba(251,146,60,0.45)", 0.55, "rgba(251,146,60,0.12)", 1, "rgba(251,146,60,0)"],
    listening: false,
  }));

  // Quỹ đạo.
  for (const r of ORBITS) {
    group.add(new Konva.Circle({ radius: m(r), stroke: "rgba(148,163,184,0.7)", strokeWidth: Math.max(1, m(0.0025)), dash: [m(0.008), m(0.006)], listening: false }));
  }

  // Hạt nhân: các nucleon xếp theo xoắn ốc hướng dương, proton và neutron xen kẽ; vẽ từ ngoài vào để quả ở giữa nằm trên.
  const nucleons = PROTONS + NEUTRONS;
  const spread = 0.0122;
  const balls: { x: number; y: number; proton: boolean }[] = [];
  let protonsLeft = PROTONS;
  for (let i = 0; i < nucleons; i += 1) {
    const r = spread * Math.sqrt(i + 0.5);
    const a = i * 2.39996;
    const proton = protonsLeft > 0 && (i % 2 === 0 || nucleons - i <= protonsLeft);
    if (proton) protonsLeft -= 1;
    balls.push({ x: r * Math.cos(a), y: r * Math.sin(a), proton });
  }
  for (const ball of balls.reverse()) {
    const cx = m(ball.x);
    const cy = m(ball.y);
    const colors = ball.proton ? ["#fecaca", "#ef4444", "#7f1d1d"] : ["#f1f5f9", "#94a3b8", "#334155"];
    group.add(new Konva.Circle({
      x: cx, y: cy, radius: m(BALL),
      fillRadialGradientStartPoint: { x: -m(BALL * 0.4), y: -m(BALL * 0.4) }, fillRadialGradientStartRadius: 0,
      fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(BALL),
      fillRadialGradientColorStops: [0, colors[0], 0.55, colors[1], 1, colors[2]],
      stroke: "rgba(15,23,42,0.6)", strokeWidth: Math.max(0.5, m(0.0012)), listening: false,
    }));
  }

  // Electron: quả cầu xanh có dấu trừ. Mỗi lớp là một nhóm quay quanh tâm.
  const makeElectron = (x: number, y: number) => {
    const e = new Konva.Group({ x, y });
    e.add(new Konva.Circle({
      radius: m(ELECTRON * 1.9),
      fillRadialGradientStartPoint: { x: 0, y: 0 }, fillRadialGradientStartRadius: 0,
      fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(ELECTRON * 1.9),
      fillRadialGradientColorStops: [0, "rgba(56,189,248,0.5)", 1, "rgba(56,189,248,0)"],
      listening: false,
    }));
    e.add(new Konva.Circle({
      radius: m(ELECTRON),
      fillRadialGradientStartPoint: { x: -m(ELECTRON * 0.4), y: -m(ELECTRON * 0.4) }, fillRadialGradientStartRadius: 0,
      fillRadialGradientEndPoint: { x: 0, y: 0 }, fillRadialGradientEndRadius: m(ELECTRON),
      fillRadialGradientColorStops: [0, "#e0f2fe", 0.5, "#38bdf8", 1, "#0c4a6e"],
      listening: false,
    }));
    e.add(new Konva.Line({ points: [m(-ELECTRON * 0.5), 0, m(ELECTRON * 0.5), 0], stroke: "#f8fafc", strokeWidth: Math.max(1, m(0.0028)), lineCap: "round", listening: false }));
    return e;
  };
  const shells = ORBITS.map((r, index) => {
    const shell = new Konva.Group({ x: 0, y: 0 });
    const count = ELECTRONS[index];
    for (let k = 0; k < count; k += 1) {
      const a = (k / count) * Math.PI * 2;
      shell.add(makeElectron(m(r * Math.cos(a)), m(r * Math.sin(a))));
    }
    group.add(shell);
    return shell;
  });

  if (label) {
    group.add(new Konva.Text({ x: m(-0.3), y: m(0.31), width: m(0.6), align: "center", text: label, fontSize: m(0.03), fill: "#e2e8f0", listening: false }));
  }

  return {
    group,
    parts: {
      shell1: { node: shells[0], motion: "rotate" as const, min: 0, max: 360 },
      shell2: { node: shells[1], motion: "rotate" as const, min: 0, max: 360 },
      shell3: { node: shells[2], motion: "rotate" as const, min: 0, max: 360 },
    },
    points: { nucleus: { x: 0, y: 0 }, valence: { x: m(ORBITS[2]), y: 0 } },
  };
};
