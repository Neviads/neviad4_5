/**
 * Render một góc máy đặt sẵn cho render_view: phối cảnh vừa khung bao, chất lượng "final" thêm che sáng môi trường
 * (GTAO) và loá sáng cho nguồn sáng (bloom). Quy ước của xe: đầu xe hướng +x, bên trái là +z.
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const DIRS: Record<string, THREE.Vector3Tuple> = {
  threeQuarterFront: [0.95, 0.42, 1],
  threeQuarterRear: [-0.95, 0.42, 1],
  side: [0, 0.06, 1],
  front: [1, 0.12, 0],
  rear: [-1, 0.12, 0],
  top: [0.0001, 1, 0.0001],
};

export function cameraFor(name: string, box: THREE.Box3, aspect: number): THREE.PerspectiveCamera {
  const dir = new THREE.Vector3(...(DIRS[name] ?? DIRS.threeQuarterFront)).normalize();
  const c = box.getCenter(new THREE.Vector3()), r = Math.max(0.01, box.getSize(new THREE.Vector3()).length() / 2);
  const fov = 28, cam = new THREE.PerspectiveCamera(fov, aspect, r / 100, r * 100);
  // khoảng cách để quả cầu bao vừa cả chiều đứng lẫn chiều ngang của khung hình
  const half = (fov * Math.PI) / 360, halfH = Math.atan(Math.tan(half) * aspect);
  const dist = (r / Math.sin(Math.min(half, halfH))) * 1.02;
  cam.position.copy(c).addScaledVector(dir, dist);
  cam.lookAt(c);
  return cam;
}

/** Render ra data URL PNG. `renderer` là renderer riêng để chụp (preserveDrawingBuffer). */
export function renderView(renderer: THREE.WebGLRenderer, scene: THREE.Scene, box: THREE.Box3, camera: string, size: [number, number], quality: "preview" | "final"): string {
  const [w, h] = size;
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  const cam = cameraFor(camera.startsWith("detail:") ? "threeQuarterFront" : camera, box, w / h);
  if (quality === "final") {
    const target = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(renderer, target);
    composer.setSize(w, h);
    const ao = new GTAOPass(scene, cam, w, h);
    ao.updateGtaoMaterial({ radius: box.getSize(new THREE.Vector3()).length() * 0.04, distanceFallOff: 1, thickness: 1 });
    ao.blendIntensity = 0.85;
    const passes = [new RenderPass(scene, cam), ao, new UnrealBloomPass(new THREE.Vector2(w, h), 0.22, 0.35, 1.6), new OutputPass()];
    for (const p of passes) composer.addPass(p);
    try {
      composer.render();
      return renderer.domElement.toDataURL("image/png");
    } finally {
      // composer.dispose() chỉ nhả hai đích của composer; AO và bloom giữ đích riêng cỡ w × h (nhiều mức mip),
      // không nhả thì mỗi lần render rò vài chục MB GPU, đến lúc trình duyệt mất ngữ cảnh WebGL và chặn trang.
      for (const p of passes) p.dispose();
      composer.dispose();
      target.dispose();
    }
  }
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL("image/png");
}
