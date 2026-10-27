/**
 * Decal: chữ hoặc SVG chiếu lên mặt một bộ phận (DecalGeometry), gắn làm con của bộ phận để chạy theo khớp.
 * print = in phẳng; emboss / engrave = thêm normal map từ hình chữ (nổi / chìm). Chỉ chạy trong trình duyệt.
 */

import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import { type Registry, type Solved, anchorFrame } from "../core/solve";
import type { Decal } from "../core/types";

const PX = 1024;

function drawContent(d: Decal, onUpdate: () => void): HTMLCanvasElement {
  const [w, h] = d.size;
  const c = document.createElement("canvas");
  c.width = PX;
  c.height = Math.max(16, Math.round((PX * h) / w));
  const g = c.getContext("2d")!;
  if (d.content.background) {
    g.fillStyle = d.content.background;
    g.fillRect(0, 0, c.width, c.height);
  }
  const text = d.content.text;
  if (text) {
    let fontPx = Math.round(c.height * 0.72);
    const setFont = () => (g.font = d.content.font ? d.content.font.replace(/\{px\}/g, String(fontPx)) : `700 ${fontPx}px system-ui, "Segoe UI", sans-serif`);
    setFont();
    if (d.content.arcRadius) {
      // chữ theo cung: thu cỡ chữ tới khi dây cung vừa 95% bề rộng decal
      const r = (d.content.arcRadius / w) * c.width;
      for (let k = 0; k < 40 && 2 * r * Math.sin(Math.min(Math.PI, g.measureText(text).width / r) / 2) > c.width * 0.95; k++) {
        fontPx = Math.round(fontPx * 0.92);
        setFont();
      }
    }
    g.fillStyle = d.content.color ?? "#f2f2f2";
    g.textBaseline = "middle";
    g.textAlign = "center";
    if (d.content.arcRadius) {
      // chữ chạy theo cung tròn có tâm nằm dưới tâm decal (hông lốp, mặt đồng hồ)
      const r = (d.content.arcRadius / w) * c.width, cx = c.width / 2, cy = c.height / 2 + r;
      const total = g.measureText(text).width / r;
      let a = -Math.PI / 2 - total / 2;
      for (const ch of text) {
        const cw = g.measureText(ch).width / r;
        g.save();
        g.translate(cx + r * Math.cos(a + cw / 2), cy + r * Math.sin(a + cw / 2));
        g.rotate(a + cw / 2 + Math.PI / 2);
        g.fillText(ch, 0, 0);
        g.restore();
        a += cw;
      }
    } else {
      const fit = Math.min(1, (c.width * 0.96) / g.measureText(text).width);
      g.save();
      g.translate(c.width / 2, c.height / 2);
      g.scale(fit, fit);
      g.fillText(text, 0, 0);
      g.restore();
    }
  }
  if (d.content.svg) {
    const img = new Image();
    img.onload = () => {
      g.drawImage(img, 0, 0, c.width, c.height);
      onUpdate();
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(d.content.svg)}`;
  }
  return c;
}

/** Normal map từ độ phủ (alpha) của hình: chữ nổi (emboss) hoặc chìm (engrave). */
function reliefNormal(src: HTMLCanvasElement, sign: number): THREE.Texture {
  const w = src.width, h = src.height, a = src.getContext("2d")!.getImageData(0, 0, w, h).data;
  const H = (x: number, y: number) => a[(Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4 + 3] / 255;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!, img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 3 * sign, dy = (H(x, y + 1) - H(x, y - 1)) * 3 * sign, l = Math.hypot(dx, dy, 1);
    img.data.set([(-dx / l * 0.5 + 0.5) * 255, (dy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255, 255], (y * w + x) * 4);
  }
  g.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}

/** Dựng các decal của tài liệu lên các bộ phận (gọi sau khi đặt ma trận thế giới ở tư thế 0). */
export function addDecals(decals: Decal[], parts: Map<string, THREE.Object3D>, solved: Solved, registry: Registry): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  for (const d of decals) {
    const obj = parts.get(d.target);
    if (!obj) continue;
    obj.updateMatrixWorld(true);
    // DecalGeometry chiếu lên một lưới: lấy lưới lớn nhất của bộ phận
    const meshes: THREE.Mesh[] = [];
    obj.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && !o.name.startsWith("decal:")) meshes.push(o as THREE.Mesh);
    });
    const mesh = meshes.sort((p, q) => q.geometry.attributes.position.count - p.geometry.attributes.position.count)[0];
    if (!mesh) continue;
    const { frame, world } = anchorFrame(registry, solved.parts, d.at, "world");
    const W = new THREE.Matrix4().fromArray(world);
    const pos = new THREE.Vector3(...frame.origin).applyMatrix4(W);
    const n = new THREE.Vector3(...frame.dir).transformDirection(W);
    const up = new THREE.Vector3(...frame.up).transformDirection(W);
    const x = new THREE.Vector3().crossVectors(up, n).normalize();
    const basis = new THREE.Matrix4().makeBasis(x, new THREE.Vector3().crossVectors(n, x), n);
    if (d.angle) basis.multiply(new THREE.Matrix4().makeRotationZ((d.angle * Math.PI) / 180));
    const orient = new THREE.Euler().setFromRotationMatrix(basis);
    const depth = d.depth ?? Math.max(d.size[0], d.size[1]);
    const geo = new DecalGeometry(mesh, pos, orient, new THREE.Vector3(d.size[0], d.size[1], depth));
    // về khung của bộ phận để decal đi theo khi khớp chuyển động
    geo.applyMatrix4(obj.matrixWorld.clone().invert());
    const canvas = drawContent(d, () => {
      map.needsUpdate = true;
    });
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    const mat = new THREE.MeshPhysicalMaterial({ map, transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false });
    if (d.mode === "emboss" || d.mode === "engrave") mat.normalMap = reliefNormal(canvas, d.mode === "emboss" ? 1 : -1);
    const dm = new THREE.Mesh(geo, mat);
    dm.name = `decal:${d.id}`;
    dm.receiveShadow = true;
    obj.add(dm);
    out.push(dm);
  }
  return out;
}
