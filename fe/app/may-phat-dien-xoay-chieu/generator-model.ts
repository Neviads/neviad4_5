/**
 * Máy phát điện xoay chiều quay tay (mô hình để bàn) — phần hình, three.js.
 *
 * Theo định dạng "model factory" của Renderoni: mỗi hàm trả về một Object3D,
 * không đụng tới vật lý. Đơn vị mét, trục y hướng lên, mặt đế ở y = 0,
 * trục quay nằm dọc trục x ở độ cao SHAFT_Y.
 *
 * Kích thước thật (máy mẫu phòng thí nghiệm):
 *   đế gỗ 580 × 280 × 24 mm; tâm trục cao 135 mm
 *   khung dây 110 × 84 mm (tâm bó dây), bó dây Ø13 mm, dày 21 mm
 *   nam châm móng ngựa: má cực lõm R 58 mm, ôm ±46°, dài 88 mm; khe hở với khung dây ≈ 8 mm
 *   trục thép Ø12 mm; hai gối đỡ nhôm ở x = ±98 mm
 *   hai vành trượt đồng Ø34 mm ở x = 128 / 154 mm, chổi than tì từ dưới lên
 *   tay quay dài 65 mm ở đầu trái trục
 */

import * as THREE from "three";

export const SHAFT_Y = 0.135;
export const COIL_HALF_X = 0.055;
export const COIL_HALF_W = 0.042;
export const RING_X = [0.128, 0.154] as const;

const BASE = { x0: -0.25, x1: 0.33, z: 0.14, h: 0.024 };
const POLE = { r: 0.058, half: (46 * Math.PI) / 180, halfX: 0.044, outer: 0.082 };
const ARM = { inner: 0.082, outer: 0.104, top: SHAFT_Y + 0.046, yoke: 0.024 };
const UPRIGHT_X = 0.098;

// ───────── vật liệu ─────────

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function woodTexture() {
  return canvasTexture(1024, 512, (g) => {
    g.fillStyle = "#9a6338";
    g.fillRect(0, 0, 1024, 512);
    // thớ gỗ chạy dọc chiều dài đế
    for (let i = 0; i < 260; i++) {
      const y = Math.random() * 512;
      const a = 0.04 + Math.random() * 0.12;
      g.strokeStyle = Math.random() < 0.5 ? `rgba(60,30,12,${a})` : `rgba(210,150,95,${a * 0.7})`;
      g.lineWidth = 0.6 + Math.random() * 2.2;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 32) g.lineTo(x, y + Math.sin(x / 140 + i) * 3 + Math.sin(x / 37 + i * 2) * 0.8);
      g.stroke();
    }
  });
}

function windingTexture() {
  // mỗi vạch tối là khe giữa hai vòng dây
  return canvasTexture(256, 32, (g) => {
    g.fillStyle = "#c97a45";
    g.fillRect(0, 0, 256, 32);
    for (let x = 0; x < 256; x += 4) {
      const grad = g.createLinearGradient(x, 0, x + 4, 0);
      grad.addColorStop(0, "rgba(70,25,8,.85)");
      grad.addColorStop(0.35, "rgba(240,170,110,.35)");
      grad.addColorStop(1, "rgba(70,25,8,.6)");
      g.fillStyle = grad;
      g.fillRect(x, 0, 4, 32);
    }
  });
}

function letterTexture(letter: string) {
  return canvasTexture(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = "rgba(255,255,255,.92)";
    g.font = "bold 92px Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(letter, 64, 70);
  });
}

function dialTexture() {
  return canvasTexture(512, 384, (g) => {
    g.fillStyle = "#f4efe2";
    g.fillRect(0, 0, 512, 384);
    const cx = 256, cy = 330, r = 250;
    g.strokeStyle = "#222";
    g.fillStyle = "#222";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, cy, r - 30, Math.PI * 1.25, Math.PI * 1.75);
    g.stroke();
    g.font = "26px Arial, sans-serif";
    g.textAlign = "center";
    for (let i = -10; i <= 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * (Math.PI / 4);
      const long = i % 5 === 0;
      const r0 = r - 30, r1 = r0 - (long ? 26 : 13);
      g.lineWidth = long ? 3 : 1.6;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      g.stroke();
      if (long) g.fillText(String(Math.abs(i) * 2), cx + Math.cos(a) * (r1 - 22), cy + Math.sin(a) * (r1 - 22) + 8);
    }
    g.font = "bold 40px Arial, sans-serif";
    g.fillText("V", cx, 250);
    g.font = "20px Arial, sans-serif";
    g.fillText("−          0          +", cx, 285);
  });
}

export function createMaterials() {
  const wood = woodTexture();
  wood.repeat.set(1, 1);
  const winding = windingTexture();
  winding.repeat.set(96, 1);
  return {
    wood: new THREE.MeshPhysicalMaterial({ map: wood, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    felt: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 1 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 1, roughness: 0.32 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xdcdfe3, metalness: 1, roughness: 0.18 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x8b9199, metalness: 0.9, roughness: 0.38 }),
    red: new THREE.MeshPhysicalMaterial({ color: 0xc0262b, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    blue: new THREE.MeshPhysicalMaterial({ color: 0x1f4fa6, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xe0956a, metalness: 1, roughness: 0.22 }),
    winding: new THREE.MeshStandardMaterial({ map: winding, metalness: 0.75, roughness: 0.38 }),
    bakelite: new THREE.MeshPhysicalMaterial({ color: 0x2a1c15, roughness: 0.4, clearcoat: 0.5 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd2ac55, metalness: 1, roughness: 0.28 }),
    carbon: new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.85 }),
    wireRed: new THREE.MeshStandardMaterial({ color: 0xb3201f, roughness: 0.5 }),
    wireBlack: new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.5 }),
    enamel: new THREE.MeshStandardMaterial({ color: 0xa8431c, metalness: 0.6, roughness: 0.3 }),
    dial: new THREE.MeshStandardMaterial({ map: dialTexture(), roughness: 0.6 }),
    needle: new THREE.MeshStandardMaterial({ color: 0xd11a1a, roughness: 0.4 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transmission: 0.95, thickness: 0.002, ior: 1.5, transparent: true }),
    // mặt kính phẳng của đồng hồ: chỉ phản chiếu, không khúc xạ (transmission làm nhoè mặt số)
    coverGlass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.12, depthWrite: false }),
    letterN: new THREE.MeshBasicMaterial({ map: letterTexture("N"), transparent: true, depthWrite: false }),
    letterS: new THREE.MeshBasicMaterial({ map: letterTexture("S"), transparent: true, depthWrite: false }),
  };
}
export type GeneratorMaterials = ReturnType<typeof createMaterials>;

// ───────── tiện ích hình học ─────────

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Trụ nằm dọc trục x. */
function xCylinder(r: number, x0: number, x1: number, mat: THREE.Material, parent: THREE.Object3D, y = 0, z = 0, seg = 32) {
  const g = new THREE.CylinderGeometry(r, r, x1 - x0, seg);
  g.rotateZ(Math.PI / 2);
  return mesh(g, mat, parent, (x0 + x1) / 2, y, z);
}

/** Đùn một hình 2D vẽ trong mặt phẳng (z, y) dọc theo trục x, từ x0 tới x1. */
function extrudeZY(shape: THREE.Shape, x0: number, x1: number, bevel = 0.0015) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: x1 - x0 - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 32,
  });
  // hình: x → z thế giới, y → y; trục đùn z → x thế giới
  g.rotateY(-Math.PI / 2);
  g.translate(x1 - bevel, 0, 0);
  return g;
}

function wire(points: [number, number, number][], r: number, mat: THREE.Material, parent: THREE.Object3D) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "centripetal");
  return mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 16), r, 10, false), mat, parent);
}

function screwHead(parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number) {
  const g = new THREE.SphereGeometry(0.0042, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(1, 0.55, 1);
  mesh(g, mat, parent, x, y, z);
  const slot = mesh(new THREE.BoxGeometry(0.0064, 0.0012, 0.0011), new THREE.MeshStandardMaterial({ color: 0x333333 }), parent, x, y + 0.0021, z);
  slot.castShadow = false;
}

// ───────── phần đứng yên ─────────

export interface StatorHandles {
  root: THREE.Group;
  needlePivot: THREE.Object3D;
  filament: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  bulbGlow: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  lampLight: THREE.PointLight;
  switchLever: THREE.Object3D;
}

export function createGeneratorStator(m: GeneratorMaterials): StatorHandles {
  const root = new THREE.Group();
  root.name = "generator-stator";

  // Đế gỗ bo cạnh, có bốn chân dạ
  const L = BASE.x1 - BASE.x0;
  const baseShape = new THREE.Shape();
  // bevel nở ra 4 mm mỗi phía nên hình gốc lùi vào đúng chừng đó
  const bv = 0.004;
  baseShape.moveTo(-BASE.z + bv, -BASE.h + bv);
  baseShape.lineTo(BASE.z - bv, -BASE.h + bv);
  baseShape.lineTo(BASE.z - bv, -bv);
  baseShape.lineTo(-BASE.z + bv, -bv);
  baseShape.closePath();
  const base = mesh(extrudeZY(baseShape, BASE.x0, BASE.x1, bv), m.wood, root);
  base.geometry.computeBoundingBox();
  // UV thớ gỗ theo chiều dài đế
  {
    const pos = base.geometry.attributes.position, uv = base.geometry.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - BASE.x0) / L, (pos.getZ(i) + BASE.z) / (2 * BASE.z) + pos.getY(i) * 4);
  }
  for (const fx of [BASE.x0 + 0.03, BASE.x1 - 0.03]) for (const fz of [-BASE.z + 0.03, BASE.z - 0.03]) {
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 20), m.felt, root, fx, -BASE.h - 0.002, fz);
  }

  // Nam châm móng ngựa: hai nửa (N đỏ ở z+, S xanh ở z−), mỗi nửa là chữ L đùn dọc x
  for (const side of [1, -1]) {
    const s = new THREE.Shape();
    const rc = 0.02;
    s.moveTo(0, 0);
    s.lineTo(ARM.outer - rc, 0);
    s.absarc(ARM.outer - rc, rc, rc, -Math.PI / 2, 0, false);
    s.lineTo(ARM.outer, ARM.top - 0.004);
    s.quadraticCurveTo(ARM.outer, ARM.top, ARM.outer - 0.004, ARM.top);
    s.lineTo(ARM.inner + 0.004, ARM.top);
    s.quadraticCurveTo(ARM.inner, ARM.top, ARM.inner, ARM.top - 0.004);
    s.lineTo(ARM.inner, ARM.yoke + 0.012);
    s.quadraticCurveTo(ARM.inner, ARM.yoke, ARM.inner - 0.012, ARM.yoke);
    s.lineTo(0, ARM.yoke);
    s.closePath();
    const half = mesh(extrudeZY(s, -POLE.halfX, POLE.halfX, 0.002), side > 0 ? m.red : m.blue, root);
    half.scale.z = side;

    // má cực sắt non: vành lõm bán kính POLE.r, ôm ±POLE.half quanh trục
    const p = new THREE.Shape();
    const a0 = -POLE.half, a1 = POLE.half;
    p.moveTo(POLE.r * Math.cos(a0), SHAFT_Y + POLE.r * Math.sin(a0));
    p.absarc(0, SHAFT_Y, POLE.r, a0, a1, false);
    p.lineTo(POLE.outer + 0.001, SHAFT_Y + POLE.r * Math.sin(a1));
    p.lineTo(POLE.outer + 0.001, SHAFT_Y + POLE.r * Math.sin(a0));
    p.closePath();
    const pole = mesh(extrudeZY(p, -POLE.halfX + 0.001, POLE.halfX - 0.001, 0.001), m.iron, root);
    pole.scale.z = side;

    // chữ N / S sơn ở mặt ngoài cánh nam châm
    const letter = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), side > 0 ? m.letterN : m.letterS);
    letter.position.set(0, SHAFT_Y + 0.01, side * (ARM.outer + 0.0026));
    if (side < 0) letter.rotation.y = Math.PI;
    root.add(letter);
    // vít bắt nam châm xuống đế
    screwHead(root, m.steel, 0.03, ARM.yoke + 0.002, side * 0.04);
    screwHead(root, m.steel, -0.03, ARM.yoke + 0.002, side * 0.04);
  }

  // Hai gối đỡ nhôm: chân rộng, thân thon, đầu tròn ôm ổ bi
  for (const gx of [-UPRIGHT_X, UPRIGHT_X]) {
    const s = new THREE.Shape();
    s.moveTo(-0.036, 0);
    s.lineTo(0.036, 0);
    s.lineTo(0.036, 0.008);
    s.quadraticCurveTo(0.017, 0.012, 0.017, 0.04);
    s.lineTo(0.017, SHAFT_Y);
    s.absarc(0, SHAFT_Y, 0.017, 0, Math.PI, false);
    s.lineTo(-0.017, 0.04);
    s.quadraticCurveTo(-0.017, 0.012, -0.036, 0.008);
    s.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, SHAFT_Y, 0.0105, 0, Math.PI * 2, true);
    s.holes.push(hole);
    mesh(extrudeZY(s, gx - 0.006, gx + 0.006), m.alu, root);
    // ổ bi: vòng ngoài + vòng trong
    const outer = new THREE.TorusGeometry(0.0098, 0.0028, 12, 40);
    outer.rotateY(Math.PI / 2);
    mesh(outer, m.steel, root, gx, SHAFT_Y, 0).scale.set(2.6, 1, 1);
    screwHead(root, m.steel, gx, 0.0095, 0.026);
    screwHead(root, m.steel, gx, 0.0095, -0.026);
  }

  // Cụm chổi than: cột bakelite + hai hộp đồng thau + thỏi than tì vào vành trượt
  const postX0 = RING_X[0] - 0.009, postX1 = RING_X[1] + 0.009;
  mesh(new THREE.BoxGeometry(postX1 - postX0, 0.072, 0.026), m.bakelite, root, (postX0 + postX1) / 2, 0.036, 0);
  const ringBottom = SHAFT_Y - 0.017;
  for (const rx of RING_X) {
    mesh(new THREE.BoxGeometry(0.011, 0.026, 0.015), m.brass, root, rx, 0.072 + 0.013, 0);
    mesh(new THREE.BoxGeometry(0.0082, ringBottom - 0.098 + 0.0004, 0.0105), m.carbon, root, rx, (0.098 + ringBottom + 0.0004) / 2, 0);
    // lò xo ép chổi (xoắn ốc nhỏ cạnh hộp)
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 120; i++) {
      const a = (i / 120) * Math.PI * 2 * 7;
      pts.push(new THREE.Vector3(rx + Math.cos(a) * 0.0026, 0.088 + (i / 120) * 0.022, 0.0105 + Math.sin(a) * 0.0026));
    }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.0005, 6), m.steel, root);
    // vít đấu dây bên hông hộp
    const sg = new THREE.CylinderGeometry(0.0032, 0.0032, 0.003, 16);
    sg.rotateX(Math.PI / 2);
    mesh(sg, m.steel, root, rx, 0.08, 0.0088);
  }

  // Cọc đấu dây (đỏ / đen) phía trước bên phải
  const POSTS: [number, number, THREE.Material][] = [[0.205, 0.105, m.red], [0.245, 0.105, m.wireBlack]];
  for (const [px, pz, cap] of POSTS) {
    mesh(new THREE.CylinderGeometry(0.0075, 0.009, 0.006, 24), m.bakelite, root, px, 0.003, pz);
    mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.03, 12), m.brass, root, px, 0.018, pz);
    mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.016, 24), cap, root, px, 0.024, pz);
    mesh(new THREE.CylinderGeometry(0.0052, 0.0052, 0.004, 16), m.brass, root, px, 0.034, pz);
  }

  // Bóng đèn 12 V trên đui bakelite
  const LX = 0.205, LZ = -0.07;
  mesh(new THREE.CylinderGeometry(0.019, 0.022, 0.02, 32), m.bakelite, root, LX, 0.01, LZ);
  const screwProfile: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) screwProfile.push(new THREE.Vector2(0.0092 + 0.0008 * Math.sin((i / 24) * Math.PI * 8), (i / 24) * 0.012));
  mesh(new THREE.LatheGeometry(screwProfile, 32), m.brass, root, LX, 0.02, LZ);
  // cổ bóng Ø17,6 mm nở thành cầu R 19 mm tâm cao 24 mm trên miệng đui
  const bulbProfile: THREE.Vector2[] = [new THREE.Vector2(0.0088, 0), new THREE.Vector2(0.0088, 0.004)];
  for (let i = 0; i <= 30; i++) {
    const a = -Math.PI / 3 + (i / 30) * ((Math.PI * 5) / 6);
    bulbProfile.push(new THREE.Vector2(Math.max(0.0003, Math.cos(a) * 0.019), 0.024 + Math.sin(a) * 0.019));
  }
  const bulb = mesh(new THREE.LatheGeometry(bulbProfile, 40), m.glass, root, LX, 0.032, LZ);
  bulb.castShadow = false;
  // dây tóc: hai cọc đỡ + lò xo vonfram nằm ngang
  for (const dx of [-0.005, 0.005]) wire([[LX + dx * 0.6, 0.034, LZ], [LX + dx, 0.05, LZ], [LX + dx, 0.058, LZ]], 0.00035, m.steel, root);
  const fil: THREE.Vector3[] = [];
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2 * 12;
    fil.push(new THREE.Vector3(LX - 0.005 + (i / 160) * 0.01, 0.058 + Math.sin(a) * 0.0009, LZ + Math.cos(a) * 0.0009));
  }
  const filament = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fil), 320, 0.00025, 5),
    new THREE.MeshStandardMaterial({ color: 0x3a3a3a, emissive: 0x000000, roughness: 0.5 }),
  );
  root.add(filament);
  const bulbGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.017, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  bulbGlow.position.set(LX, 0.056, LZ);
  bulbGlow.renderOrder = 2; // vẽ sau vỏ bóng thuỷ tinh
  root.add(bulbGlow);
  const lampLight = new THREE.PointLight(0xffb357, 0, 0.35, 2);
  lampLight.position.set(LX, 0.058, LZ);
  root.add(lampLight);

  // Vôn kế số 0 ở giữa, mặt nghiêng về phía người xem
  const meter = new THREE.Group();
  meter.position.set(0.285, 0, -0.05);
  meter.rotation.x = -0.18;
  root.add(meter);
  const caseShape = new THREE.Shape();
  caseShape.moveTo(-0.04, 0);
  caseShape.lineTo(0.04, 0);
  caseShape.lineTo(0.04, 0.062);
  caseShape.quadraticCurveTo(0.04, 0.072, 0.03, 0.072);
  caseShape.lineTo(-0.03, 0.072);
  caseShape.quadraticCurveTo(-0.04, 0.072, -0.04, 0.062);
  caseShape.closePath();
  const caseGeo = new THREE.ExtrudeGeometry(caseShape, { depth: 0.034, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 2 });
  caseGeo.translate(0, 0, -0.017);
  mesh(caseGeo, m.bakelite, meter);
  const face = mesh(new THREE.PlaneGeometry(0.068, 0.051), m.dial, meter, 0, 0.038, 0.0195);
  face.castShadow = false;
  const needlePivot = new THREE.Object3D();
  needlePivot.position.set(0, 0.0196, 0.0205);
  meter.add(needlePivot);
  const ng = new THREE.BoxGeometry(0.0009, 0.029, 0.0006);
  ng.translate(0, 0.0145, 0);
  mesh(ng, m.needle, needlePivot).castShadow = false;
  mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.002, 16).rotateX(Math.PI / 2), m.bakelite, needlePivot, 0, 0, 0.0008);
  const cover = mesh(new THREE.PlaneGeometry(0.07, 0.054), m.coverGlass, meter, 0, 0.038, 0.0215);
  cover.castShadow = false;
  for (const tx of [-0.015, 0.015]) {
    const tg = new THREE.CylinderGeometry(0.0035, 0.0035, 0.008, 16);
    mesh(tg, tx < 0 ? m.red : m.wireBlack, meter, tx, 0.076, 0.004);
  }

  // Công tắc lẫy giữa cọc đen và đèn
  const SX = 0.27, SZ = 0.05;
  mesh(new THREE.BoxGeometry(0.03, 0.012, 0.022), m.bakelite, root, SX, 0.006, SZ);
  const switchLever = new THREE.Object3D();
  switchLever.position.set(SX, 0.012, SZ);
  root.add(switchLever);
  const lg = new THREE.CylinderGeometry(0.0022, 0.0028, 0.022, 12);
  lg.translate(0, 0.011, 0);
  mesh(lg, m.steel, switchLever);
  mesh(new THREE.SphereGeometry(0.004, 16, 12), m.red, switchLever, 0, 0.023, 0);

  // Dây nối (đường đi nằm trên mặt đế)
  const y = 0.0022;
  wire([[RING_X[0], 0.08, 0.0098], [RING_X[0], 0.07, 0.03], [0.16, y + 0.002, 0.07], [0.2, y, 0.1], [0.205, 0.02, 0.105]], 0.0016, m.wireRed, root);
  wire([[RING_X[1], 0.08, 0.0098], [RING_X[1], 0.065, 0.03], [0.19, y + 0.002, 0.06], [0.24, y, 0.095], [0.245, 0.02, 0.105]], 0.0016, m.wireBlack, root);
  wire([[0.205, 0.02, 0.105], [0.19, y, 0.07], [0.185, y, -0.02], [0.195, y, -0.06], [LX - 0.012, 0.012, LZ]], 0.0014, m.wireRed, root);
  wire([[LX + 0.012, 0.012, LZ], [0.23, y, -0.04], [0.255, y, 0.02], [SX - 0.012, 0.008, SZ]], 0.0014, m.wireBlack, root);
  wire([[SX + 0.012, 0.008, SZ], [0.275, y, 0.09], [0.25, y, 0.11], [0.245, 0.02, 0.105]], 0.0014, m.wireBlack, root);
  // dây vôn kế vòng ra sau vỏ rồi lên hai cọc trên nóc, không vắt qua mặt số
  wire([[0.205, 0.02, 0.105], [0.22, y, 0.07], [0.238, y, -0.02], [0.24, y, -0.082], [0.262, 0.05, -0.08], [0.27, 0.083, -0.064], [0.27, 0.077, -0.0596]], 0.0012, m.wireRed, root);
  wire([[0.245, 0.02, 0.105], [0.318, y, 0.06], [0.33, y, -0.03], [0.322, y, -0.082], [0.305, 0.05, -0.08], [0.3, 0.083, -0.064], [0.3, 0.077, -0.0596]], 0.0012, m.wireBlack, root);

  return { root, needlePivot, filament, bulbGlow, lampLight, switchLever };
}

// ───────── phần quay (gắn với vật rắn Rapier, gốc ở tâm trục) ─────────

export function createGeneratorRotor(m: GeneratorMaterials): THREE.Group {
  const root = new THREE.Group();
  root.name = "generator-rotor";

  // Bó dây khung chữ nhật trong mặt phẳng (x, y); pháp tuyến dọc z
  const r = 0.0065, rc = 0.01;
  const path = new THREE.CurvePath<THREE.Vector3>();
  const corners: [number, number][] = [[COIL_HALF_X, COIL_HALF_W], [-COIL_HALF_X, COIL_HALF_W], [-COIL_HALF_X, -COIL_HALF_W], [COIL_HALF_X, -COIL_HALF_W]];
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = corners[i];
    const [bx, by] = corners[(i + 1) % 4];
    const [cx, cy] = corners[(i + 2) % 4];
    const d1 = new THREE.Vector2(bx - ax, by - ay).normalize();
    const d2 = new THREE.Vector2(cx - bx, cy - by).normalize();
    const p0 = new THREE.Vector3(ax + d1.x * rc, ay + d1.y * rc, 0);
    const p1 = new THREE.Vector3(bx - d1.x * rc, by - d1.y * rc, 0);
    const p2 = new THREE.Vector3(bx + d2.x * rc, by + d2.y * rc, 0);
    path.add(new THREE.LineCurve3(p0, p1));
    path.add(new THREE.QuadraticBezierCurve3(p1, new THREE.Vector3(bx, by, 0), p2));
  }
  const coilGeo = new THREE.TubeGeometry(path as unknown as THREE.Curve<THREE.Vector3>, 400, r, 20, true);
  coilGeo.scale(1, 1, 1.6);
  mesh(coilGeo, m.winding, root);
  // băng vải cách điện quấn trên hai cạnh dài, gần bốn góc
  const tapeMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9 });
  for (const [cx, cy] of corners) {
    const tape = new THREE.CylinderGeometry(r * 1.18, r * 1.18, 0.008, 20);
    tape.rotateZ(Math.PI / 2);
    tape.scale(1, 1, 1.6);
    mesh(tape, tapeMat, root, cx * 0.7, cy, 0);
  }

  // Hai má kẹp bakelite giữ cạnh ngắn của khung, trục thép bắt vào má kẹp
  for (const s of [-1, 1]) {
    mesh(new RoundedBox(0.016, 0.024, 0.03), m.bakelite, root, s * (COIL_HALF_X + 0.004), 0, 0);
    screwHead(root, m.steel, s * (COIL_HALF_X + 0.004), 0.012, 0);
  }
  xCylinder(0.006, -0.222, -COIL_HALF_X - 0.012, m.steel, root);
  xCylinder(0.006, COIL_HALF_X + 0.012, 0.19, m.steel, root);
  // vòng chặn hai bên gối đỡ
  for (const x of [-UPRIGHT_X - 0.011, -UPRIGHT_X + 0.011, UPRIGHT_X - 0.011, UPRIGHT_X + 0.011]) xCylinder(0.0095, x - 0.003, x + 0.003, m.steel, root);

  // Vành trượt: ống cách điện + hai vành đồng + gờ ngăn
  xCylinder(0.011, 0.112, 0.17, m.bakelite, root);
  for (const x of RING_X) xCylinder(0.017, x - 0.0055, x + 0.0055, m.copper, root, 0, 0, 48);
  for (const x of [0.115, 0.141, 0.167]) xCylinder(0.0135, x - 0.0015, x + 0.0015, m.bakelite, root, 0, 0, 40);
  // đai ốc đầu trục
  const nut = new THREE.CylinderGeometry(0.009, 0.009, 0.006, 6);
  nut.rotateZ(Math.PI / 2);
  mesh(nut, m.steel, root, 0.193, 0, 0);

  // Hai đầu dây khung dây chạy dọc trục tới từng vành
  wire([[COIL_HALF_X - 0.004, 0.006, 0.01], [0.07, 0.0085, 0.006], [0.1, 0.0075, 0.0035], [RING_X[0] - 0.008, 0.0115, 0.002], [RING_X[0] - 0.004, 0.015, 0.0015]], 0.0009, m.enamel, root);
  wire([[COIL_HALF_X - 0.004, -0.006, -0.01], [0.07, -0.0085, -0.006], [0.1, -0.0075, -0.0035], [RING_X[1] - 0.008, -0.0115, -0.002], [RING_X[1] - 0.004, -0.015, -0.0015]], 0.0009, m.enamel, root);

  // Tay quay ở đầu trái: moay-ơ, cần nhôm, núm gỗ
  const CX = -0.214;
  xCylinder(0.012, CX - 0.008, CX + 0.008, m.alu, root);
  const arm = new THREE.Shape();
  arm.absarc(0, 0, 0.011, Math.PI / 2, (Math.PI * 3) / 2, false);
  arm.lineTo(0.065, -0.007);
  arm.absarc(0.065, 0, 0.007, -Math.PI / 2, Math.PI / 2, false);
  arm.closePath();
  const armGeo = extrudeZY(arm, CX - 0.016, CX - 0.008, 0.001);
  armGeo.rotateX(-Math.PI / 2);
  mesh(armGeo, m.alu, root);
  xCylinder(0.0028, -0.27, CX - 0.016, m.steel, root, 0.065, 0);
  const grip = new THREE.LatheGeometry(
    [[0.0001, 0], [0.007, 0.001], [0.0095, 0.012], [0.0085, 0.03], [0.0095, 0.042], [0.006, 0.046], [0.0001, 0.0465]].map(([a, b]) => new THREE.Vector2(a, b)),
    32,
  );
  grip.rotateZ(Math.PI / 2);
  mesh(grip, m.wood, root, CX - 0.017, 0.065, 0);

  return root;
}

/** Hộp bo góc nhỏ (không kéo thêm addon). */
class RoundedBox extends THREE.ExtrudeGeometry {
  constructor(w: number, h: number, d: number, r = 0.002) {
    const s = new THREE.Shape();
    const x = w / 2 - r, y = h / 2 - r;
    s.absarc(x, y, r, 0, Math.PI / 2, false);
    s.absarc(-x, y, r, Math.PI / 2, Math.PI, false);
    s.absarc(-x, -y, r, Math.PI, (Math.PI * 3) / 2, false);
    s.absarc(x, -y, r, (Math.PI * 3) / 2, Math.PI * 2, false);
    super(s, { depth: d - 2 * r, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 3 });
    this.translate(0, 0, -(d - 2 * r) / 2);
  }
}
