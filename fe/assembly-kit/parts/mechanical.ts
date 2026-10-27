/**
 * Bộ phận cơ khí: đế gỗ, gối đỡ có ổ bi, tay quay. Hình học tách từ máy phát ở app/may-phat-dien-xoay-chieu.
 */

import * as THREE from "three";
import type { PartType } from "../core/types";
import { RoundedBox, extrudeZY, mesh, screwHead, xCylinder } from "../three/geo";
import { axis, boxFaces, hface, kitOf, num, shadowed, vec } from "./_common";

export const basePlate: PartType = {
  type: "basePlate",
  category: "mechanical",
  description: "Đế gỗ bo cạnh có bốn chân dạ. Gốc ở tâm mặt trên; đặt lên bàn bằng onto(base.bottom, ground.top).",
  params: {
    size: { type: "vec3", unit: "m", default: [0.58, 0.024, 0.28], min: 0.005, max: 3, desc: "[dài x, dày y, rộng z]" },
  },
  anchors: (p) => {
    const [w, h, d] = vec(p, "size");
    const faces = boxFaces([w, h, d], [0, -h / 2, 0]);
    return { ...faces, top: hface([0, 0, 0], true, "mặt trên, gốc ở tâm; at = [x, z]"), bottom: hface([0, -h - 0.004, 0], false, "đáy chân dạ") };
  },
  bounds: (p) => {
    const [w, h, d] = vec(p, "size");
    return { min: [-w / 2, -h - 0.004, -d / 2], max: [w / 2, 0, d / 2] };
  },
  build: (p, k) => {
    const m = kitOf(k).byName;
    const [w, h, d] = vec(p, "size");
    const g = new THREE.Group();
    const board = mesh(new RoundedBox(w, h, d, Math.min(0.004, h / 3)), m.wood, g, 0, -h / 2, 0);
    // thớ gỗ chạy dọc chiều dài
    const pos = board.geometry.attributes.position, uv = board.geometry.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) * 4 + pos.getZ(i) / d + 0.5);
    for (const fx of [-w / 2 + 0.03, w / 2 - 0.03]) for (const fz of [-d / 2 + 0.03, d / 2 - 0.03]) mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 20), m.felt, g, fx, -h - 0.002, fz);
    return shadowed(g);
  },
};

export const bearingBlock: PartType = {
  type: "bearingBlock",
  category: "mechanical",
  description: "Gối đỡ nhôm (chân, thân, đầu tròn) có ổ bi; lỗ nằm ngang dọc x. Gốc ở tâm đáy chân.",
  params: {
    centerHeight: { type: "number", unit: "m", default: 0.135, min: 0.02, max: 1, desc: "chiều cao tâm lỗ so với đáy" },
    boreDiameter: { type: "number", unit: "m", default: 0.012, min: 0.003, max: 0.1, desc: "đường kính lỗ (vừa trục)" },
    thickness: { type: "number", unit: "m", default: 0.012, min: 0.004, max: 0.1, desc: "bề dày dọc trục x" },
  },
  anchors: (p) => {
    const ch = num(p, "centerHeight"), t = num(p, "thickness");
    return {
      foot: hface([0, 0, 0], false, "đáy chân; đặt lên đế bằng onto"),
      bore: axis([0, ch, 0], [1, 0, 0], [0, 1, 0], "lỗ ổ bi (dọc +x)", num(p, "boreDiameter") / 2),
      faceIn: { kind: "face", origin: [t / 2, ch, 0], normal: [1, 0, 0], up: [0, 1, 0], desc: "mặt bên +x quanh lỗ" },
      faceOut: { kind: "face", origin: [-t / 2, ch, 0], normal: [-1, 0, 0], up: [0, 1, 0], desc: "mặt bên −x quanh lỗ" },
    };
  },
  bounds: (p) => {
    const ch = num(p, "centerHeight"), t = num(p, "thickness"), R = Math.max(0.017, num(p, "boreDiameter"));
    return { min: [-t / 2, 0, -0.036], max: [t / 2, ch + R, 0.036] };
  },
  build: (p, k) => {
    const m = kitOf(k).byName;
    const ch = num(p, "centerHeight"), t = num(p, "thickness"), rb = num(p, "boreDiameter") / 2;
    const R = Math.max(0.017, rb + 0.008);
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(-0.036, 0);
    s.lineTo(0.036, 0);
    s.lineTo(0.036, 0.008);
    s.quadraticCurveTo(R, 0.012, R, Math.min(0.04, ch - R));
    s.lineTo(R, ch);
    s.absarc(0, ch, R, 0, Math.PI, false);
    s.lineTo(-R, Math.min(0.04, ch - R));
    s.quadraticCurveTo(-R, 0.012, -0.036, 0.008);
    s.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, ch, rb + 0.0045, 0, Math.PI * 2, true);
    s.holes.push(hole);
    mesh(extrudeZY(s, -t / 2, t / 2), m.aluminium, g);
    const ring = new THREE.TorusGeometry(rb + 0.0038, 0.0028, 12, 40);
    ring.rotateY(Math.PI / 2);
    mesh(ring, m.steel, g, 0, ch, 0).scale.set(t / 0.0046, 1, 1);
    screwHead(g, m.steel, 0, 0.0095, 0.026);
    screwHead(g, m.steel, 0, 0.0095, -0.026);
    return shadowed(g);
  },
};

export const crank: PartType = {
  type: "crank",
  category: "mechanical",
  description: "Tay quay: moay-ơ trên trục (trục dọc +x), cần nhôm hướng +y, núm gỗ chĩa về −x. Lắp coaxial(crank.axis, shaft.axis); dùng flip nếu muốn núm chĩa về phía kia.",
  params: {
    armLength: { type: "number", unit: "m", default: 0.065, min: 0.02, max: 0.4, desc: "khoảng cách tâm trục → tâm núm" },
    hubDiameter: { type: "number", unit: "m", default: 0.024, min: 0.008, max: 0.1, desc: "đường kính moay-ơ" },
    gripLength: { type: "number", unit: "m", default: 0.046, min: 0.02, max: 0.15, desc: "chiều dài núm" },
  },
  anchors: (p) => ({
    axis: axis([0, 0, 0], [1, 0, 0], [0, 1, 0], "trục quay ở tâm moay-ơ; cần hướng theo up (+y)"),
    hubFace: { kind: "face", origin: [0.008, 0, 0], normal: [1, 0, 0], up: [0, 1, 0], desc: "mặt moay-ơ phía +x" },
  }),
  bounds: (p) => {
    const a = num(p, "armLength"), gl = num(p, "gripLength"), hr = num(p, "hubDiameter") / 2;
    return { min: [-0.02 - gl, -hr, -hr], max: [0.008, a + 0.01, hr] };
  },
  build: (p, k) => {
    const m = kitOf(k).byName;
    const a = num(p, "armLength"), hr = num(p, "hubDiameter") / 2, gl = num(p, "gripLength");
    const g = new THREE.Group();
    xCylinder(hr, -0.008, 0.008, m.aluminium, g);
    const arm = new THREE.Shape();
    arm.absarc(0, 0, hr * 0.9, Math.PI / 2, (Math.PI * 3) / 2, false);
    arm.lineTo(a, -0.007);
    arm.absarc(a, 0, 0.007, -Math.PI / 2, Math.PI / 2, false);
    arm.closePath();
    const armGeo = extrudeZY(arm, -0.016, -0.008, 0.001);
    armGeo.rotateX(-Math.PI / 2);
    mesh(armGeo, m.aluminium, g);
    xCylinder(0.0028, -0.02 - gl * 0.9, -0.016, m.steel, g, a, 0);
    const grip = new THREE.LatheGeometry(
      [[0.0001, 0], [0.007, 0.001], [0.0095, gl * 0.26], [0.0085, gl * 0.65], [0.0095, gl * 0.91], [0.006, gl], [0.0001, gl + 0.0005]].map(([x, y]) => new THREE.Vector2(x, y)),
      32,
    );
    grip.rotateZ(Math.PI / 2);
    mesh(grip, m.wood, g, -0.017, a, 0);
    return shadowed(g);
  },
};
