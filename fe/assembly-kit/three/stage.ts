/**
 * Sân khấu cho bản lắp ráp: môi trường phản chiếu (phòng dựng sẵn, studio hộp đèn mềm, HDRI thật trong
 * public/hdri), đèn chính có bóng đổ, và nền (mặt bàn, phông studio cong, mặt đường, sàn bóng). `fit` đặt đèn và nền
 * theo khung bao vật; `applyScene` đổi theo doc.scene. Chỉ chạy trong trình duyệt.
 */

import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import type { SceneSpec } from "../core/types";

const HDRI: Record<string, string> = { street: "/hdri/street.hdr", sunset: "/hdri/sunset.hdr", dawn: "/hdri/dawn.hdr" };
const hdrCache = new Map<string, Promise<THREE.DataTexture>>();

/** Studio chụp xe: hộp đèn lớn trên đầu và hai bên trên nền tối, cho vệt phản chiếu dài trên sơn bóng. */
function studioScene(): THREE.Scene {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x26282c); // phòng xám tối: kim loại vẫn có thứ để phản chiếu
  const panel = (w: number, h: number, intensity: number, pos: THREE.Vector3Tuple, look: THREE.Vector3Tuple) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(...look);
    s.add(m);
  };
  panel(6, 2.2, 6, [0, 5, 0], [0, 0, 0]); // hộp đèn trần
  panel(5, 1.6, 3, [0, 2, 5], [0, 1, 0]); // trước
  panel(5, 1.6, 2.2, [0, 2, -5], [0, 1, 0]); // sau
  panel(1.2, 3, 2.2, [5, 1.8, 0], [0, 1, 0]); // hông
  panel(1.2, 3, 1.4, [-5, 1.8, 0], [0, 1, 0]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ color: 0x15161a }));
  floor.rotation.x = -Math.PI / 2;
  s.add(floor);
  return s;
}

function makeStages() {
  const table = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ color: 0x2c3139, roughness: 0.85 }));
  table.rotation.x = -Math.PI / 2;
  table.position.y = -0.0005;
  // phông cong liền sàn: dải mặt kéo dọc x theo biên dạng (z, y): sàn phẳng → cung 1/4 → tường đứng ở phía −z
  const prof: [number, number][] = [[1, 0], [-0.55, 0]];
  for (let k = 1; k <= 24; k++) {
    const a = -Math.PI / 2 - (k / 24) * (Math.PI / 2);
    prof.push([-0.55 + 0.45 * Math.cos(a), 0.45 + 0.45 * Math.sin(a)]);
  }
  prof.push([-1, 1.2]);
  const pos: number[] = [], idx: number[] = [];
  prof.forEach(([z, y], k) => {
    pos.push(-1.5, y, z, 1.5, y, z);
    if (k) idx.push(2 * k - 2, 2 * k - 1, 2 * k, 2 * k - 1, 2 * k + 1, 2 * k);
  });
  const cycGeo = new THREE.BufferGeometry();
  cycGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  cycGeo.setIndex(idx);
  cycGeo.computeVertexNormals();
  const cyc = new THREE.Mesh(cycGeo, new THREE.MeshStandardMaterial({ color: 0xd9dadc, roughness: 0.9, side: THREE.DoubleSide }));
  const road = new THREE.Group();
  const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x2b2c2e, roughness: 0.95 }));
  asphalt.rotation.x = -Math.PI / 2;
  road.add(asphalt);
  for (const z of [-0.18, 0.18]) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.006), new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.7 }));
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.0004, z);
    road.add(line);
  }
  const glossy = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshPhysicalMaterial({ color: 0x1a1c20, roughness: 0.45, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3 }));
  glossy.rotation.x = -Math.PI / 2;
  const stages: Record<string, THREE.Object3D> = { table, studioCyc: cyc, road, glossyFloor: glossy };
  for (const o of Object.values(stages)) o.traverse((c) => (c.receiveShadow = true));
  return stages;
}

export function createStage(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1d2129);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envs = new Map<string, THREE.Texture>();
  const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  envs.set("room", roomEnv);
  scene.environment = roomEnv;
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x3a2a1c, 0.35);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2e0, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.002;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const stages = makeStages();
  const ground = new THREE.Group();
  scene.add(ground);
  let stageName = "table";
  ground.add(stages.table);
  let lastBox: THREE.Box3 | null = null;

  /** Đặt đèn và nền theo khung bao của vật đang xem. */
  const fit = (box: THREE.Box3) => {
    lastBox = box.clone();
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()), r = Math.max(0.05, size.length() / 2);
    sun.position.copy(c).add(new THREE.Vector3(0.6, 1, 0.7).normalize().multiplyScalar(r * 4));
    sun.target.position.copy(c);
    Object.assign(sun.shadow.camera, { left: -r * 1.3, right: r * 1.3, top: r * 1.3, bottom: -r * 1.3, near: r * 0.5, far: r * 8 });
    sun.shadow.camera.updateProjectionMatrix();
    ground.position.set(c.x, box.min.y < 0.01 ? 0 : box.min.y, c.z);
    stages.table.scale.setScalar(r * 6);
    stages.glossyFloor.scale.setScalar(r * 8);
    stages.road.scale.set(Math.max(size.x * 4, r * 8), 1, Math.max(size.z * 3, r * 3));
    // phông cong: rộng gấp 4 vật, tường sau cách vật một khoảng bằng nửa chiều dài vật
    const s = Math.max(size.x, size.z, size.y) * 2.2;
    stages.studioCyc.scale.setScalar(s);
    stages.studioCyc.position.set(0, -0.0005, -size.z / 2 - s * 0.1);
  };

  const loadHdr = (name: string) => {
    let p = hdrCache.get(name);
    if (!p) {
      p = new RGBELoader().loadAsync(HDRI[name]);
      hdrCache.set(name, p);
    }
    return p;
  };

  /** Đổi môi trường, nền và độ phơi sáng theo doc.scene (mặc định giữ như cũ: phòng + mặt bàn). */
  const applyScene = async (spec: SceneSpec = {}) => {
    const env = spec.environment ?? "room";
    if (!envs.has(env)) {
      if (env === "studio") envs.set(env, pmrem.fromScene(studioScene(), 0.02).texture);
      else if (HDRI[env]) {
        const tex = await loadHdr(env);
        envs.set(env, pmrem.fromEquirectangular(tex).texture);
      }
    }
    scene.environment = envs.get(env) ?? roomEnv;
    // studio: ánh sáng chủ yếu từ hộp đèn (môi trường), đèn chính chỉ để có bóng đổ, tránh điểm loá trên sàn bóng
    sun.intensity = env === "room" ? 2.2 : env === "studio" ? 0.7 : 1.3;
    hemi.intensity = env === "room" ? 0.35 : 0.12;
    scene.background = new THREE.Color(env === "studio" ? 0x17181b : env === "room" ? 0x1d2129 : 0x1a1d22);
    const want = spec.stage ?? "table";
    if (want !== stageName) {
      ground.clear();
      if (stages[want]) ground.add(stages[want]);
      stageName = want;
    }
    renderer.toneMappingExposure = spec.exposure ?? 1.05;
    if (lastBox) fit(lastBox);
  };

  return { scene, fit, applyScene };
}
export type Stage = ReturnType<typeof createStage>;
