"use client";

// Máy bơm thuỷ lực — bơm bánh răng, động cơ điện kéo trục, dầu tuần hoàn bể → ống hút → bơm → ống xả → bể.
// Mô hình dựng bằng MCP neviad-assembly (bản lắp ráp "may-bom-thuy-luc"), xuất ra pump.assembly.json.
// Trang tự chạy: mỗi khung hình tăng góc khớp quayChuDong (quayBiDong ăn theo tỉ số -1) và trượt vân dầu trong
// hai lõi dầu nằm trong ống trong, cho thấy dầu đang được bơm đi.

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { AssemblyDoc } from "@/assembly-kit/core/types";
import { type AssemblyView, buildAssembly, createStage } from "@/assembly-kit/three/build-scene";
import { loadBrowserKernel } from "@/assembly-kit/three/kernel-browser";
import { preloadMeshes } from "@/assembly-kit/three/preload";
import { createMaterialKit } from "@/assembly-kit/three/materials";
import raw from "./pump.assembly.json";

const doc = raw as unknown as AssemblyDoc;

/** độ/giây ở tốc độ 1× (20 vòng/phút — đủ chậm để nhìn thấy răng ăn khớp) */
const OMEGA = 120;

/** đầu ống xả thả vào miệng bể (toạ độ thế giới) và mặt dầu */
const JET_TOP = new THREE.Vector3(0, 0.128, -0.232);
const OIL_LEVEL = 0.1;

/** vân dầu: các vệt sáng/tối lặp dọc chiều dài ống (uv.y của hình quét = mét dọc ống) */
function flowTexture() {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2b7f9e";
  g.fillRect(0, 0, 8, 256);
  for (let i = 0; i < 4; i++) {
    const y = i * 64;
    const grd = g.createLinearGradient(0, y, 0, y + 44);
    grd.addColorStop(0, "#8fd8ee");
    grd.addColorStop(0.45, "#5cb8d6");
    grd.addColorStop(1, "#2b7f9e");
    g.fillStyle = grd;
    g.fillRect(0, y, 8, 44);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(1, 9);
  return t;
}

export default function MayBomThuyLucPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<AssemblyView | null>(null);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [ready, setReady] = useState(false);
  const [angle, setAngle] = useState(0);
  const runningRef = useRef(true);
  const speedRef = useRef(1);
  const readyRef = useRef(false);
  runningRef.current = running;
  speedRef.current = speed;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let stopped = false;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const stage = createStage(renderer);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.005, 50);
    camera.position.set(0.55, 0.42, 0.62);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.2;
    controls.maxDistance = 3;

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const flowTex: THREE.Texture[] = [];
    const jets: THREE.Mesh[] = [];
    const ripples: THREE.Mesh[] = [];

    /** thay vật liệu hai lõi dầu bằng vân trượt + thêm tia dầu và gợn sóng ở miệng bể */
    const buildFlow = (view: AssemblyView) => {
      for (const id of ["loiDauHut", "loiDauXa"]) {
        const part = view.parts.get(id);
        if (!part) continue;
        const tex = flowTexture();
        flowTex.push(tex);
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.22, metalness: 0.0 });
        part.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (mesh.isMesh) mesh.material = mat;
        });
      }

      const grp = new THREE.Group();
      grp.name = "flow";
      const jetMat = new THREE.MeshBasicMaterial({ color: 0x8fd8ee, toneMapped: false });
      for (let i = 0; i < 7; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 10, 8), jetMat);
        s.userData.phase = i / 7;
        jets.push(s);
        grp.add(s);
      }
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.004, 0.0062, 40),
          new THREE.MeshBasicMaterial({ color: 0x9ad9ea, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(JET_TOP.x, OIL_LEVEL + 0.0012, JET_TOP.z);
        ring.userData.phase = i / 3;
        ripples.push(ring);
        grp.add(ring);
      }
      stage.scene.add(grp);
    };

    let last = performance.now();
    let deg = 0;
    let since = 0;
    renderer.setAnimationLoop((now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const view = viewRef.current;
      if (view && runningRef.current && readyRef.current) {
        deg += OMEGA * speedRef.current * dt;
        if (deg > 360) deg -= 360;
        view.setPose({ quayChuDong: deg });
        since += dt;
        if (since > 0.12) {
          since = 0;
          setAngle(deg);
        }
        // dầu trượt dọc ống (uv.y = mét dọc ống)
        for (const t of flowTex) t.offset.y -= dt * 0.75 * speedRef.current;
        // tia dầu rơi từ đầu ống xả xuống mặt dầu
        const span = JET_TOP.y - OIL_LEVEL;
        for (const s of jets) {
          const ph = ((s.userData.phase as number) + (now / 1000) * 0.9 * speedRef.current) % 1;
          s.position.set(JET_TOP.x, JET_TOP.y - ph * span, JET_TOP.z);
          s.scale.setScalar(1 + ph * 0.35);
        }
        // gợn lan trên mặt dầu
        for (const r of ripples) {
          const ph = ((r.userData.phase as number) + (now / 1000) * 0.6 * speedRef.current) % 1;
          r.scale.setScalar(1 + ph * 4);
          (r.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - ph);
        }
      }
      controls.update();
      renderer.render(stage.scene, camera);
    });

    (async () => {
      try {
        await loadBrowserKernel();
        await preloadMeshes(doc, (h) => `/assembly-meshes/${h}.bin`).catch(() => 0);
        if (stopped) return;
        const view = buildAssembly(doc, createMaterialKit());
        view.setPose({ quayChuDong: 0 });
        stage.scene.add(view.root);
        await stage.applyScene(doc.scene).catch(() => 0);
        viewRef.current = view;
        buildFlow(view);

        const box = new THREE.Box3().setFromObject(view.root);
        const center = box.getCenter(new THREE.Vector3());
        const radius = Math.max(0.08, box.getSize(new THREE.Vector3()).length() / 2);
        controls.target.copy(center);
        camera.position.copy(center).add(new THREE.Vector3(1, 0.62, 1.15).normalize().multiplyScalar(radius * 2.35));
        controls.update();
        readyRef.current = true;
        setReady(true);
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      stopped = true;
      ro.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
      viewRef.current?.dispose();
      viewRef.current = null;
    };
  }, []);

  return (
    <main className="flex h-dvh flex-col bg-[#151a21] text-[#e9ecf1]">
      <header className="border-b border-white/10 px-4 py-3 sm:px-6">
        <h1 className="text-[18px] font-semibold">Máy bơm thuỷ lực — bơm bánh răng</h1>
        <p className="mt-0.5 text-[13px] text-[#aab2bd]">
          Động cơ điện kéo trục bơm; hai bánh răng 12 răng (môđun 4 mm, khoảng cách tâm 48 mm) ăn khớp quay ngược chiều,
          hút dầu từ bể qua ống hút rồi đẩy qua ống xả đổ lại miệng bể.
        </p>
      </header>

      <section className="relative min-h-0 flex-1">
        <canvas ref={canvasRef} className="block h-full w-full" />

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[#aab2bd]">
            Đang dựng mô hình…
          </div>
        )}

        <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2 rounded-lg bg-black/55 p-2 text-[13px] backdrop-blur">
          <button
            type="button"
            onClick={() => setRunning((v) => !v)}
            className="rounded bg-white/10 px-3 py-1.5 font-medium hover:bg-white/20"
          >
            {running ? "Dừng" : "Chạy"}
          </button>
          <span className="px-1 text-[#aab2bd]">Tốc độ</span>
          {[0.5, 1, 2].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={`rounded px-2 py-1.5 tabular-nums ${speed === s ? "bg-[#3f7d6b] text-white" : "bg-white/10 hover:bg-white/20"}`}
            >
              {s}×
            </button>
          ))}
          <span className="w-24 text-right tabular-nums text-[#aab2bd]">
            {Math.round(angle)}° / {Math.round(((OMEGA * speed) / 360) * 60)} v/ph
          </span>
        </div>

        <div className="absolute bottom-4 right-4 rounded-lg bg-black/45 px-3 py-1.5 text-[12px] text-[#aab2bd] backdrop-blur">
          Kéo để xoay · lăn để phóng
        </div>
      </section>
    </main>
  );
}
