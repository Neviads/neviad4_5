/**
 * Tiện ích dựng hình three.js dùng chung (máy phát ở /may-phat-dien-xoay-chieu, các bộ phận của assembly-kit).
 * Đơn vị mét, y hướng lên.
 */

import * as THREE from "three";

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Trụ nằm dọc trục x. */
export function xCylinder(r: number, x0: number, x1: number, mat: THREE.Material, parent: THREE.Object3D, y = 0, z = 0, seg = 32) {
  const g = new THREE.CylinderGeometry(r, r, x1 - x0, seg);
  g.rotateZ(Math.PI / 2);
  return mesh(g, mat, parent, (x0 + x1) / 2, y, z);
}

/** Đùn một hình 2D vẽ trong mặt phẳng (z, y) dọc theo trục x, từ x0 tới x1. */
export function extrudeZY(shape: THREE.Shape, x0: number, x1: number, bevel = 0.0015) {
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

export function wire(points: [number, number, number][], r: number, mat: THREE.Material, parent: THREE.Object3D) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "centripetal");
  return mesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 16), r, 10, false), mat, parent);
}

export function screwHead(parent: THREE.Object3D, mat: THREE.Material, x: number, y: number, z: number) {
  const g = new THREE.SphereGeometry(0.0042, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(1, 0.55, 1);
  mesh(g, mat, parent, x, y, z);
  const slot = mesh(new THREE.BoxGeometry(0.0064, 0.0012, 0.0011), new THREE.MeshStandardMaterial({ color: 0x333333 }), parent, x, y + 0.0021, z);
  slot.castShadow = false;
}

/**
 * Hộp bo góc nhỏ (không kéo thêm addon), đúng cỡ w × h × d. Phần vát (bevel) nở đường viền ra thêm r mỗi phía,
 * nên hình gốc phải lùi vào 2r: góc bo bán kính r đặt tại (w/2 − 2r, h/2 − 2r).
 */
export class RoundedBox extends THREE.ExtrudeGeometry {
  constructor(w: number, h: number, d: number, r = 0.002) {
    r = Math.min(r, w / 4.01, h / 4.01, d / 2.01);
    const s = new THREE.Shape();
    const x = w / 2 - 2 * r, y = h / 2 - 2 * r;
    s.absarc(x, y, r, 0, Math.PI / 2, false);
    s.absarc(-x, y, r, Math.PI / 2, Math.PI, false);
    s.absarc(-x, -y, r, Math.PI, (Math.PI * 3) / 2, false);
    s.absarc(x, -y, r, (Math.PI * 3) / 2, Math.PI * 2, false);
    super(s, { depth: d - 2 * r, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 3 });
    this.translate(0, 0, -(d - 2 * r) / 2);
  }
}
