/**
 * Bộ phận điện – từ: khung dây, vành trượt, chổi than, nam châm móng ngựa, cọc đấu dây, bóng đèn, vôn kế, kim,
 * công tắc lẫy. Hình học tách từ máy phát ở app/may-phat-dien-xoay-chieu (kích thước thật của máy mẫu để bàn).
 */

import * as THREE from "three";
import type { PartType } from "../core/types";
import { RoundedBox, extrudeZY, mesh, screwHead, wire } from "../three/geo";
import { axis, hface, kitOf, num, point, ringLathe, shadowed, str, surface, vec } from "./_common";

// ───────── khung dây ─────────

export const coil: PartType = {
  type: "coil",
  category: "electrical",
  description: "Khung dây chữ nhật quấn N vòng, quay quanh trục dọc +x (đi qua hai má kẹp ở cạnh ngắn). Mặt khung chứa trục và up (+y); pháp tuyến khung là +z.",
  params: {
    length: { type: "number", unit: "m", default: 0.11, min: 0.02, max: 1, desc: "chiều dài dọc trục (tâm bó dây)" },
    width: { type: "number", unit: "m", default: 0.084, min: 0.02, max: 1, desc: "bề rộng vuông góc trục (tâm bó dây)" },
    bundle: { type: "number", unit: "m", default: 0.013, min: 0.003, max: 0.05, desc: "đường kính bó dây" },
    depth: { type: "number", unit: "m", default: 0.021, min: 0.003, max: 0.08, desc: "bề dày bó dây theo pháp tuyến khung" },
    turns: { type: "number", default: 200, min: 1, max: 10000, desc: "số vòng (cho vật lý; không đổi hình)" },
  },
  anchors: (p) => {
    const L = num(p, "length") / 2;
    return {
      axis: axis([0, 0, 0], [1, 0, 0], [0, 1, 0], "trục quay qua tâm khung; up = trong mặt khung"),
      normal: point([0, 0, 0], [0, 0, 1], "pháp tuyến mặt khung (cho vật lý: từ thông cực đại khi song song với từ trường)"),
      leadA: point([L + 0.008, 0.006, 0.008], [1, 0, 0], "đầu dây A (phía +x)"),
      leadB: point([L + 0.008, -0.006, -0.008], [1, 0, 0], "đầu dây B (phía +x)"),
    };
  },
  bounds: (p) => {
    const L = num(p, "length") / 2 + 0.012, W = num(p, "width") / 2 + num(p, "bundle") / 2, D = Math.max(num(p, "depth"), 0.03) / 2;
    return { min: [-L, -W, -D], max: [L, W, D] };
  },
  build: (p, k) => {
    const kit = kitOf(k), m = kit.byName;
    const L = num(p, "length") / 2, W = num(p, "width") / 2, r = num(p, "bundle") / 2, zs = num(p, "depth") / num(p, "bundle");
    const g = new THREE.Group();
    const rc = Math.min(0.01, L / 3, W / 3);
    const path = new THREE.CurvePath<THREE.Vector3>();
    const corners: [number, number][] = [[L, W], [-L, W], [-L, -W], [L, -W]];
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = corners[i], [bx, by] = corners[(i + 1) % 4], [cx, cy] = corners[(i + 2) % 4];
      const d1 = new THREE.Vector2(bx - ax, by - ay).normalize(), d2 = new THREE.Vector2(cx - bx, cy - by).normalize();
      const p0 = new THREE.Vector3(ax + d1.x * rc, ay + d1.y * rc, 0), p1 = new THREE.Vector3(bx - d1.x * rc, by - d1.y * rc, 0);
      path.add(new THREE.LineCurve3(p0, p1));
      path.add(new THREE.QuadraticBezierCurve3(p1, new THREE.Vector3(bx, by, 0), new THREE.Vector3(bx + d2.x * rc, by + d2.y * rc, 0)));
    }
    const coilGeo = new THREE.TubeGeometry(path as unknown as THREE.Curve<THREE.Vector3>, 400, r, 20, true);
    coilGeo.scale(1, 1, zs);
    mesh(coilGeo, m.winding, g);
    for (const [cx, cy] of corners) {
      const tape = new THREE.CylinderGeometry(r * 1.18, r * 1.18, 0.008, 20);
      tape.rotateZ(Math.PI / 2);
      tape.scale(1, 1, zs);
      mesh(tape, m.tape, g, cx * 0.7, cy, 0);
    }
    for (const s of [-1, 1]) {
      mesh(new RoundedBox(0.016, 0.024, Math.max(0.03, num(p, "depth") + 0.008)), m.bakelite, g, s * (L + 0.004), 0, 0);
      screwHead(g, m.steel, s * (L + 0.004), 0.012, 0);
    }
    return shadowed(g);
  },
};

// ───────── vành trượt, chổi than ─────────

export const slipRing: PartType = {
  type: "slipRing",
  category: "electrical",
  description: "Vành trượt đồng trên ống lót bakelite, hai gờ cách điện hai bên (trục dọc y). Lắp coaxial lên trục.",
  params: {
    diameter: { type: "number", unit: "m", default: 0.034, min: 0.008, max: 0.3, desc: "đường kính vành đồng" },
    width: { type: "number", unit: "m", default: 0.011, min: 0.002, max: 0.1, desc: "bề rộng vành dọc trục" },
    boreDiameter: { type: "number", unit: "m", default: 0.012, min: 0.002, max: 0.2, desc: "lỗ (vừa trục)" },
  },
  anchors: (p) => {
    const R = num(p, "diameter") / 2, w = num(p, "width") / 2;
    return {
      axis: axis([0, 0, 0], [0, 1, 0], [0, 0, 1], "trục vành", num(p, "boreDiameter") / 2),
      surface: surface([0, 0, 0], [0, 1, 0], R, [0, 0, 1], "mặt đồng nơi chổi than tì vào (@bottom, @top, …)"),
      end0: { ...hface([0, -w - 0.003, 0], false, "mặt bên phía −trục"), up: [0, 0, 1] },
      end1: { ...hface([0, w + 0.003, 0], true, "mặt bên phía +trục"), up: [0, 0, 1] },
    };
  },
  bounds: (p) => {
    const R = num(p, "diameter") / 2, w = num(p, "width") / 2 + 0.003;
    return { min: [-R, -w, -R], max: [R, w, R] };
  },
  build: (p, k) => {
    const m = kitOf(k).byName;
    const R = num(p, "diameter") / 2, w = num(p, "width"), rb = num(p, "boreDiameter") / 2;
    const g = new THREE.Group();
    mesh(ringLathe(R, rb, w, 64), m.copper, g);
    for (const s of [-1, 1]) mesh(ringLathe(R * 0.8, rb, 0.003, 48), m.bakelite, g, 0, s * (w / 2 + 0.0015), 0);
    mesh(ringLathe(R * 0.65, rb, w + 0.006, 32), m.bakelite, g);
    return shadowed(g);
  },
};

export const carbonBrush: PartType = {
  type: "carbonBrush",
  category: "electrical",
  description: "Chổi than trong hộp đồng thau có lò xo ép và vít đấu dây; tuỳ chọn cột bakelite đỡ phía dưới. Gốc ở đầu tì (mặt trên thỏi than). Lắp touch(brush.tip, ring.surface@bottom) với follow: false.",
  params: {
    carbon: { type: "vec3", unit: "m", default: [0.0082, 0.02, 0.0105], min: 0.002, max: 0.1, desc: "thỏi than [x, y, z]" },
    standHeight: { type: "number", unit: "m", default: 0, min: 0, max: 1, desc: "chiều cao cột đỡ dưới hộp (0 = không có)" },
  },
  anchors: (p) => {
    const [, ch] = vec(p, "carbon"), hb = -ch + 0.006 - 0.026, sh = num(p, "standHeight");
    return {
      tip: { ...hface([0, 0, 0], true, "đầu tì của thỏi than"), up: [1, 0, 0] },
      holderBottom: { ...hface([0, hb, 0], false, "đáy hộp đồng thau"), up: [1, 0, 0] },
      foot: { ...hface([0, hb - sh, 0], false, "đáy cột đỡ (bằng holderBottom nếu không có cột)"), up: [1, 0, 0] },
      terminal: point([0, hb + 0.008, 0.0088], [0, 0, 1], "vít đấu dây bên hông hộp"),
    };
  },
  bounds: (p) => {
    const [, ch] = vec(p, "carbon"), hb = -ch + 0.006 - 0.026, sh = num(p, "standHeight");
    return { min: [-0.013, hb - sh, -0.013], max: [0.013, 0, 0.013] };
  },
  build: (p, k) => {
    const m = kitOf(k).byName;
    const [cw, ch, cd] = vec(p, "carbon"), sh = num(p, "standHeight");
    const hTop = -ch + 0.006, hb = hTop - 0.026;
    const g = new THREE.Group();
    mesh(new THREE.BoxGeometry(cw, ch, cd), m.carbon, g, 0, -ch / 2, 0);
    mesh(new THREE.BoxGeometry(cw + 0.0028, 0.026, cd + 0.0045), m.brass, g, 0, (hTop + hb) / 2, 0);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 14;
      pts.push(new THREE.Vector3(Math.cos(a) * 0.0026, hb + 0.004 + (i / 120) * 0.022, cd / 2 + 0.0026 + Math.sin(a) * 0.0026));
    }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.0005, 6), m.steel, g);
    const sg = new THREE.CylinderGeometry(0.0032, 0.0032, 0.003, 16);
    sg.rotateX(Math.PI / 2);
    mesh(sg, m.steel, g, 0, hb + 0.008, cd / 2 + 0.0035);
    if (sh > 0) mesh(new RoundedBox(0.02, sh, 0.026, 0.0015), m.bakelite, g, 0, hb - sh / 2, 0);
    return shadowed(g);
  },
};

// ───────── nam châm ─────────

export const horseshoeMagnet: PartType = {
  type: "horseshoeMagnet",
  category: "electrical",
  description: "Nam châm móng ngựa: nửa N (sơn đỏ, phía +z) và S (xanh, −z), má cực sắt non lõm ôm một khe tròn dọc +x. Gốc ở tâm đáy. Đặt khung dây vào khe bằng coaxial(coil.axis, magnet.gap).",
  params: {
    gapHeight: { type: "number", unit: "m", default: 0.135, min: 0.04, max: 1, desc: "chiều cao tâm khe so với đáy" },
    poleRadius: { type: "number", unit: "m", default: 0.058, min: 0.01, max: 0.5, desc: "bán kính mặt cực lõm" },
    poleArc: { type: "number", unit: "°", default: 92, min: 20, max: 160, desc: "góc ôm của mặt cực" },
    length: { type: "number", unit: "m", default: 0.088, min: 0.01, max: 1, desc: "bề dài dọc khe (x)" },
    arm: { type: "number", unit: "m", default: 0.022, min: 0.005, max: 0.2, desc: "bề dày cánh" },
  },
  anchors: (p) => {
    const gh = num(p, "gapHeight"), R = num(p, "poleRadius");
    return {
      bottom: hface([0, 0, 0], false, "đáy nam châm; at = [x, z]"),
      gap: axis([0, gh, 0], [1, 0, 0], [0, 1, 0], "trục khe giữa hai cực (dọc +x)", R),
      north: point([0, gh, R], [0, 0, -1], "giữa mặt cực N, hướng vào khe"),
      south: point([0, gh, -R], [0, 0, 1], "giữa mặt cực S, hướng vào khe"),
      field: point([0, gh, 0], [0, 0, -1], "hướng từ trường trong khe (N → S)"),
    };
  },
  bounds: (p) => {
    const R = num(p, "poleRadius"), a = num(p, "arm"), L = num(p, "length") / 2, top = num(p, "gapHeight") + R * 0.8;
    const out = R + 0.024 + a;
    return { min: [-L, 0, -out], max: [L, top, out] };
  },
  build: (p, k) => {
    const kit = kitOf(k), m = kit.byName;
    const SY = num(p, "gapHeight"), R = num(p, "poleRadius"), half = (num(p, "poleArc") / 2) * (Math.PI / 180), L = num(p, "length") / 2, a = num(p, "arm");
    const inner = R + 0.024, outer = inner + a, top = SY + R * 0.8, yoke = 0.024;
    const g = new THREE.Group();
    for (const side of [1, -1]) {
      const s = new THREE.Shape();
      const rc = Math.min(0.02, a);
      s.moveTo(0, 0);
      s.lineTo(outer - rc, 0);
      s.absarc(outer - rc, rc, rc, -Math.PI / 2, 0, false);
      s.lineTo(outer, top - 0.004);
      s.quadraticCurveTo(outer, top, outer - 0.004, top);
      s.lineTo(inner + 0.004, top);
      s.quadraticCurveTo(inner, top, inner, top - 0.004);
      s.lineTo(inner, yoke + 0.012);
      s.quadraticCurveTo(inner, yoke, inner - 0.012, yoke);
      s.lineTo(0, yoke);
      s.closePath();
      mesh(extrudeZY(s, -L, L, 0.002), side > 0 ? m.redPaint : m.bluePaint, g).scale.z = side;
      const pole = new THREE.Shape();
      pole.moveTo(R * Math.cos(-half), SY + R * Math.sin(-half));
      pole.absarc(0, SY, R, -half, half, false);
      pole.lineTo(inner + 0.001, SY + R * Math.sin(half));
      pole.lineTo(inner + 0.001, SY + R * Math.sin(-half));
      pole.closePath();
      mesh(extrudeZY(pole, -L + 0.001, L - 0.001, 0.001), m.iron, g).scale.z = side;
      const letter = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(0.05, L * 1.1), Math.min(0.05, L * 1.1)), side > 0 ? kit.letterN : kit.letterS);
      letter.position.set(0, SY + 0.01, side * (outer + 0.0026));
      if (side < 0) letter.rotation.y = Math.PI;
      g.add(letter);
      for (const x of [-L * 0.68, L * 0.68]) screwHead(g, m.steel, x, yoke + 0.002, side * Math.min(0.04, inner * 0.5));
    }
    return shadowed(g);
  },
};

// ───────── mạch ngoài ─────────

export const bindingPost: PartType = {
  type: "bindingPost",
  category: "electrical",
  description: "Cọc đấu dây 4 mm có núm vặn (đỏ hoặc đen). Gốc ở tâm đáy.",
  params: { color: { type: "enum", options: ["red", "black"], default: "red", desc: "màu núm" } },
  anchors: () => ({
    bottom: hface([0, 0, 0], false, "đáy cọc"),
    top: point([0, 0.036, 0], [0, 1, 0], "đỉnh cọc"),
    terminal: point([0, 0.02, 0.0028], [0, 0, 1], "chỗ kẹp dây (thân cọc)"),
  }),
  bounds: () => ({ min: [-0.009, 0, -0.009], max: [0.009, 0.036, 0.009] }),
  build: (p, k) => {
    const m = kitOf(k).byName;
    const g = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.0075, 0.009, 0.006, 24), m.bakelite, g, 0, 0.003, 0);
    mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.03, 12), m.brass, g, 0, 0.018, 0);
    mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.016, 24), str(p, "color") === "red" ? m.redPaint : m.blackPaint, g, 0, 0.024, 0);
    mesh(new THREE.CylinderGeometry(0.0052, 0.0052, 0.004, 16), m.brass, g, 0, 0.034, 0);
    return shadowed(g);
  },
};

export const bulb: PartType = {
  type: "bulb",
  category: "electrical",
  description: "Bóng đèn 12 V trên đui bakelite (bóng thuỷ tinh, đuôi xoáy, dây tóc). Gốc ở tâm đáy đui.",
  params: { bulbDiameter: { type: "number", unit: "m", default: 0.038, min: 0.01, max: 0.2, desc: "đường kính bóng" } },
  anchors: (p) => {
    const R = num(p, "bulbDiameter") / 2;
    return {
      bottom: hface([0, 0, 0], false, "đáy đui"),
      terminalA: point([-0.019, 0.012, 0], [-1, 0, 0], "cực đui phía −x"),
      terminalB: point([0.019, 0.012, 0], [1, 0, 0], "cực đui phía +x"),
      filament: point([0, 0.032 + 0.024 + 0.002, 0], [0, 1, 0], "dây tóc"),
      top: point([0, 0.032 + 0.024 + R, 0], [0, 1, 0], "đỉnh bóng"),
    };
  },
  bounds: (p) => {
    const R = Math.max(0.022, num(p, "bulbDiameter") / 2);
    return { min: [-R, 0, -R], max: [R, 0.056 + num(p, "bulbDiameter") / 2, R] };
  },
  build: (p, k) => {
    const kit = kitOf(k), m = kit.byName;
    const R = num(p, "bulbDiameter") / 2, cy = 0.024;
    const g = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.019, 0.022, 0.02, 32), m.bakelite, g, 0, 0.01, 0);
    const screw: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) screw.push(new THREE.Vector2(0.0092 + 0.0008 * Math.sin((i / 24) * Math.PI * 8), (i / 24) * 0.012));
    mesh(new THREE.LatheGeometry(screw, 32), m.brass, g, 0, 0.02, 0);
    const prof: THREE.Vector2[] = [new THREE.Vector2(0.0088, 0), new THREE.Vector2(0.0088, 0.004)];
    for (let i = 0; i <= 30; i++) {
      const t = -Math.PI / 3 + (i / 30) * ((Math.PI * 5) / 6);
      prof.push(new THREE.Vector2(Math.max(0.0003, Math.cos(t) * R), cy + Math.sin(t) * R));
    }
    mesh(new THREE.LatheGeometry(prof, 40), m.glass, g, 0, 0.032, 0).castShadow = false;
    for (const dx of [-0.005, 0.005]) wire([[dx * 0.6, 0.034, 0], [dx, 0.05, 0], [dx, 0.058, 0]], 0.00035, m.steel, g);
    const fil: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * Math.PI * 24;
      fil.push(new THREE.Vector3(-0.005 + (i / 160) * 0.01, 0.058 + Math.sin(t) * 0.0009, Math.cos(t) * 0.0009));
    }
    const f = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fil), 320, 0.00025, 5), kit.filament);
    f.name = "filament";
    g.add(f);
    return shadowed(g);
  },
};

export const analogMeter: PartType = {
  type: "analogMeter",
  category: "electrical",
  description: "Đồng hồ kim (vôn kế số 0 ở giữa, ±20 V) vỏ bakelite, mặt số hướng +z, hai cọc trên nóc. Không kèm kim: thêm part needle rồi coaxial(needle.axis, meter.pivot) và joint revolute.",
  params: { size: { type: "vec3", unit: "m", default: [0.08, 0.072, 0.034], min: 0.02, max: 0.5, desc: "[rộng, cao, sâu]" } },
  anchors: (p) => {
    const [w, h, d] = vec(p, "size");
    return {
      bottom: hface([0, 0, 0], false, "đáy vỏ"),
      face: { kind: "face", origin: [0, h * 0.53, d / 2 + 0.0005], normal: [0, 0, 1], up: [0, 1, 0], desc: "mặt số" },
      pivot: axis([0, h * 0.272, d / 2 + 0.0015], [0, 0, 1], [0, 1, 0], "trục kim, vuông góc mặt số; up = vạch 0"),
      plus: point([-w * 0.19, h + 0.008, -0.004], [0, 1, 0], "cọc + trên nóc"),
      minus: point([w * 0.19, h + 0.008, -0.004], [0, 1, 0], "cọc − trên nóc"),
      back: { kind: "face", origin: [0, h / 2, -d / 2], normal: [0, 0, -1], up: [0, 1, 0], desc: "mặt sau" },
    };
  },
  bounds: (p) => {
    const [w, h, d] = vec(p, "size");
    return { min: [-w / 2, 0, -d / 2], max: [w / 2, h + 0.008, d / 2] };
  },
  build: (p, k) => {
    const kit = kitOf(k), m = kit.byName;
    const [w, h, d] = vec(p, "size");
    const g = new THREE.Group();
    mesh(new RoundedBox(w, h, d, 0.003), m.bakelite, g, 0, h / 2, 0);
    const face = mesh(new THREE.PlaneGeometry(w * 0.85, h * 0.71), kit.dial, g, 0, h * 0.53, d / 2 + 0.0005);
    face.castShadow = false;
    const cover = mesh(new THREE.PlaneGeometry(w * 0.875, h * 0.75), kit.coverGlass, g, 0, h * 0.53, d / 2 + 0.0025);
    cover.castShadow = false;
    for (const [x, mat] of [[-w * 0.19, m.redPaint], [w * 0.19, m.blackPaint]] as const) mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.008, 16), mat, g, x, h + 0.004, -0.004);
    return shadowed(g);
  },
};

export const needle: PartType = {
  type: "needle",
  category: "electrical",
  description: "Kim đồng hồ đỏ, quay quanh trục dọc +z, chĩa theo up (+y). Lắp coaxial(needle.axis, meter.pivot).",
  params: { length: { type: "number", unit: "m", default: 0.029, min: 0.005, max: 0.3, desc: "chiều dài kim" } },
  anchors: (p) => ({
    axis: axis([0, 0, 0], [0, 0, 1], [0, 1, 0], "trục kim; kim chĩa theo up"),
    tip: point([0, num(p, "length"), 0], [0, 1, 0], "đầu kim"),
  }),
  bounds: (p) => ({ min: [-0.0025, -0.0025, -0.0005], max: [0.0025, num(p, "length"), 0.002] }),
  build: (p, k) => {
    const m = kitOf(k).byName;
    const L = num(p, "length");
    const g = new THREE.Group();
    const ng = new THREE.BoxGeometry(0.0009, L, 0.0006);
    ng.translate(0, L / 2, 0);
    mesh(ng, m.redPaint, g);
    mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.002, 16).rotateX(Math.PI / 2), m.bakelite, g, 0, 0, 0.0008);
    return g;
  },
};

export const toggleSwitch: PartType = {
  type: "toggleSwitch",
  category: "electrical",
  description: "Công tắc lẫy trên đế bakelite; lẫy nghiêng về +x khi đóng. Gốc ở tâm đáy.",
  params: { on: { type: "boolean", default: true, desc: "đóng mạch" } },
  anchors: () => ({
    bottom: hface([0, 0, 0], false, "đáy đế"),
    terminalA: point([-0.015, 0.006, 0], [-1, 0, 0], "cực phía −x"),
    terminalB: point([0.015, 0.006, 0], [1, 0, 0], "cực phía +x"),
  }),
  bounds: () => ({ min: [-0.015, 0, -0.011], max: [0.015, 0.036, 0.011] }),
  build: (p, k) => {
    const m = kitOf(k).byName;
    const g = new THREE.Group();
    mesh(new RoundedBox(0.03, 0.012, 0.022, 0.0015), m.bakelite, g, 0, 0.006, 0);
    const lever = new THREE.Group();
    lever.position.set(0, 0.012, 0);
    lever.rotation.z = p.on ? -0.45 : 0.45;
    const lg = new THREE.CylinderGeometry(0.0022, 0.0028, 0.022, 12);
    lg.translate(0, 0.011, 0);
    mesh(lg, m.steel, lever);
    mesh(new THREE.SphereGeometry(0.004, 16, 12), m.redPaint, lever, 0, 0.023, 0);
    g.add(lever);
    return shadowed(g);
  },
};

