"use client";

/**
 * /may-phat-dien-xoay-chieu — máy phát điện xoay chiều quay tay, 3D, chạy trên
 * Renderoni (three.js + Rapier). Hình ở generator-model.ts, vật lý ở
 * generator-sim.ts; trang này chỉ dựng cảnh, nối điều khiển và vẽ dao động ký.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { RenderoniEngine } from "renderoni";
import type { Generator } from "./generator-sim";
import styles from "./generator.module.css";

const fmt = (v: number, d = 0) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);

interface Readout {
  rpm: number;
  emf: number;
  emfPeak: number;
  current: number;
  lampPower: number;
}

export default function AcGeneratorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scopeRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<RenderoniEngine | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torque, setTorque] = useState(0.2);
  const [cranking, setCranking] = useState(true);
  const [closed, setClosed] = useState(true);
  const [read, setRead] = useState<Readout>({ rpm: 0, emf: 0, emfPeak: 0, current: 0, lampPower: 0 });

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const canvas = canvasRef.current!;
      const [THREE, { createRenderoni }, { buildGenerator }, { OrbitControls }, { RoomEnvironment }] = await Promise.all([
        import("three"),
        import("renderoni"),
        import("./generator-sim"),
        import("three/examples/jsm/controls/OrbitControls.js"),
        import("three/examples/jsm/environments/RoomEnvironment.js"),
      ]);
      const game = await createRenderoni({ mode: "interactive", canvas, seed: 1, clock: { tickRateHz: 120 } });
      if (disposed) {
        game.dispose();
        return;
      }
      gameRef.current = game;
      const { scene, camera, renderer } = game.native;
      const r = renderer!;
      // Renderoni đặt kích thước canvas theo cửa sổ bằng style inline; trả lại cho CSS
      canvas.style.width = canvas.style.height = "100%";
      r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.05;
      const pmrem = new THREE.PMREMGenerator(r);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.background = new THREE.Color(0x1d2129);
      scene.fog = new THREE.Fog(0x1d2129, 1.4, 3.2);

      const sun = new THREE.DirectionalLight(0xfff2e0, 2.2);
      sun.position.set(0.5, 0.9, 0.6);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.002;
      Object.assign(sun.shadow.camera, { left: -0.4, right: 0.4, top: 0.4, bottom: -0.4, near: 0.1, far: 2.5 });
      sun.target.position.set(0.04, 0.05, 0);
      scene.add(sun, sun.target);
      scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a2a1c, 0.35));
      const table = new THREE.Mesh(new THREE.CircleGeometry(2.5, 64), new THREE.MeshStandardMaterial({ color: 0x2c3139, roughness: 0.85 }));
      table.rotation.x = -Math.PI / 2;
      table.position.y = -0.0265;
      table.receiveShadow = true;
      scene.add(table);

      camera.fov = 32;
      camera.near = 0.01;
      camera.far = 10;
      camera.position.set(0.3, 0.34, 0.62);
      const controls = new OrbitControls(camera, canvas);
      controls.target.set(0.04, 0.07, 0);
      controls.enableDamping = true;
      controls.minDistance = 0.18;
      controls.maxDistance = 1.6;
      controls.maxPolarAngle = Math.PI * 0.49;
      controls.update();

      const gen: Generator = buildGenerator(game, { visual: true });
      const st = gen.stator!;

      // trên màn rộng, bảng điều khiển chiếm mép phải: lệch tâm khung hình sang trái cho máy không bị che
      const resize = () => {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        r.setSize(w, h, false);
        camera.aspect = w / h;
        const shift = w > 720 ? 160 : 0;
        camera.setViewOffset(w, h, shift, 0, w, h);
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
      resize();

      // dao động ký: 2 s gần nhất của e(t)
      const scope = scopeRef.current!;
      const sctx = scope.getContext("2d")!;
      const hist = new Float32Array(240);
      let head = 0, needle = 0, needleV = 0, uiT = 0, peak = 0;
      // ghi e theo từng tick mô phỏng (không theo khung hình) để không bị lấy mẫu chồng
      game.systems.add({
        phase: "postPhysics",
        update: () => {
          hist[head] = gen.state.emf;
          head = (head + 1) % hist.length;
          peak = Math.max(peak * 0.9985, Math.abs(gen.state.emf));
        },
      });
      const drawScope = () => {
        const w = scope.width, h = scope.height;
        sctx.clearRect(0, 0, w, h);
        sctx.strokeStyle = "rgba(255,255,255,.12)";
        sctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
          sctx.beginPath();
          sctx.moveTo(0, (h * i) / 4);
          sctx.lineTo(w, (h * i) / 4);
          sctx.stroke();
        }
        sctx.strokeStyle = "#7ee0a1";
        sctx.lineWidth = 2;
        sctx.beginPath();
        for (let i = 0; i < hist.length; i++) {
          const v = hist[(head + i) % hist.length];
          const x = (i / (hist.length - 1)) * w, y = h / 2 - (v / 30) * (h / 2);
          if (i) sctx.lineTo(x, y);
          else sctx.moveTo(x, y);
        }
        sctx.stroke();
      };

      game.start((dt) => {
        controls.update();
        const s = gen.state;
        // kim vôn kế: hệ dao động tắt dần bậc hai, toàn thang ±20 V = ±45°
        const target = Math.max(-1.08, Math.min(1.08, s.emf / 20));
        const k = 900, c = 38;
        needleV += (k * (target - needle) - c * needleV) * Math.min(dt, 0.03);
        needle += needleV * Math.min(dt, 0.03);
        st.needlePivot.rotation.z = -needle * (Math.PI / 4);
        // đèn
        const b = s.brightness;
        // non tải: dây tóc đỏ cam; gần định mức: vàng trắng
        const g = Math.sqrt(b);
        st.filament.material.emissive.setRGB(1, 0.25 + 0.6 * b, 0.04 + 0.45 * b * b);
        st.filament.material.emissiveIntensity = b > 0.005 ? 1.5 + g * 6 : 0;
        st.bulbGlow.material.opacity = Math.min(0.8, g * 0.75);
        st.bulbGlow.scale.setScalar(0.5 + g * 0.6);
        st.lampLight.intensity = b * 0.06;
        st.switchLever.rotation.z = s.switchClosed ? -0.45 : 0.45;

        drawScope();
        uiT += dt;
        if (uiT > 0.12) {
          uiT = 0;
          setRead({ rpm: s.rpm, emf: s.emf, emfPeak: peak, current: s.current, lampPower: s.lampPower });
        }
      });
      setReady(true);
      cleanup = () => {
        ro.disconnect();
        controls.dispose();
        pmrem.dispose();
        game.dispose();
      };
    })().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    return () => {
      disposed = true;
      gameRef.current = null;
      cleanup();
    };
  }, []);

  useEffect(() => {
    gameRef.current?.act({ name: "generator.drive", payload: { torque: cranking ? torque : 0 } });
  }, [torque, cranking, ready]);
  useEffect(() => {
    gameRef.current?.act({ name: "generator.switch", payload: { closed } });
  }, [closed, ready]);

  const pct = (torque / 0.4) * 100;

  return (
    <main className={styles.page}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Mô hình 3D máy phát điện xoay chiều" />

      <header className={styles.header}>
        <Link href="/" className={styles.back}>← Trang chủ</Link>
        <h1>Máy phát điện xoay chiều</h1>
        <p>Quay khung dây trong từ trường nam châm, suất điện động đổi chiều mỗi nửa vòng. Kéo để xoay, cuộn để phóng to.</p>
      </header>

      <aside className={styles.panel}>
        <label className={styles.control}>
          <span className={styles.row}><span>Lực quay tay</span><strong>{fmt(torque, 2)} N·m</strong></span>
          <input type="range" min={0.05} max={0.4} step={0.01} value={torque} style={{ "--p": `${pct}%` } as CSSProperties} onChange={(e) => setTorque(Number(e.target.value))} />
        </label>
        <div className={styles.buttons}>
          <button type="button" aria-pressed={cranking} onClick={() => setCranking((v) => !v)}>{cranking ? "Thả tay quay" : "Quay"}</button>
          <button type="button" aria-pressed={closed} onClick={() => setClosed((v) => !v)}>{closed ? "Ngắt đèn" : "Nối đèn"}</button>
        </div>

        <dl className={styles.stats}>
          <div><dt>Tốc độ</dt><dd>{fmt(Math.abs(read.rpm))} <small>vòng/phút</small></dd></div>
          <div><dt>Tần số</dt><dd>{fmt(Math.abs(read.rpm) / 60, 1)} <small>Hz</small></dd></div>
          <div><dt>e đỉnh</dt><dd>{fmt(read.emfPeak, 1)} <small>V</small></dd></div>
          <div><dt>Công suất đèn</dt><dd>{fmt(read.lampPower, 2)} <small>W</small></dd></div>
        </dl>

        <div className={styles.scope}>
          <span>e(t) · 2 s gần nhất · ±30 V</span>
          <canvas ref={scopeRef} width={560} height={150} />
        </div>
        <p className={styles.note}>
          e = N·B·A·ω·sin ωt với N = 200 vòng, B = 0,3 T, A = 92 cm². Khi nối đèn, dòng điện trong khung tạo mô-men cản (định luật Lenz)
          nên cùng một lực quay, máy chạy chậm hơn hẳn so với lúc hở mạch.
        </p>
      </aside>

      {!ready && !error && <div className={styles.loading}>Đang nạp Rapier…</div>}
      {error && <div className={styles.loading}>Lỗi: {error}</div>}
    </main>
  );
}
