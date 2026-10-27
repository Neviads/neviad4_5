"use client";

/**
 * /va-cham-hai-xe — thí nghiệm va chạm một chiều của hai xe ô tô, 3D. Hai xe được lắp ráp bằng MCP neviad-assembly
 * và xuất bằng assembly_export (hai-xe.assembly.json: thân, ca-bin, bánh, cản, đèn ghép bằng ràng buộc; khớp trượt
 * xeA/xeB dọc ground.x, bánh ghép lăn theo). Trang này chỉ chạy vật lý ở collision.ts rồi đặt hai khớp trượt.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { AssemblyDoc } from "@/assembly-kit/core/types";
import { buildAssembly, createStage } from "@/assembly-kit/three/build-scene";
import { createMaterialKit } from "@/assembly-kit/three/materials";
import { type CollisionParams, type World, step } from "./collision";
import doc from "./hai-xe.assembly.json";
import styles from "./collision.module.css";

const ROAD_HALF = 12, CAR_HALF = 2.3, REST_X: [number, number] = [-5, 5];
const START: [number, number] = [-3, 3]; // xe A bắt đầu ở x = −8 m, xe B ở x = +8 m
const DT = 1 / 600;

const fmt = (v: number, d = 1) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
const kmh = (v: number) => v * 3.6;

interface Inputs {
  mA: number;
  mB: number;
  vA: number; // km/h
  vB: number;
  e: number;
  mu: number;
  slow: number;
}

interface Sample {
  t: number;
  vA: number;
  vB: number;
}

const DEFAULTS: Inputs = { mA: 1200, mB: 1500, vA: 54, vB: -36, e: 0.3, mu: 0, slow: 0.5 };
const newWorld = (i: Inputs): World => ({ t: 0, a: { s: START[0], v: i.vA / 3.6 }, b: { s: START[1], v: i.vB / 3.6 }, impact: null });

export default function CarCollisionPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphRef = useRef<HTMLCanvasElement>(null);
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const inputsRef = useRef(inputs);
  const worldRef = useRef<World>(newWorld(DEFAULTS));
  const samplesRef = useRef<Sample[]>([]);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  const gapRestRef = useRef(5.46);
  const [snap, setSnap] = useState<World>(() => newWorld(DEFAULTS));

  useEffect(() => {
    inputsRef.current = inputs;
  }, [inputs]);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const stage = createStage(renderer);
    const kit = createMaterialKit();
    const view = buildAssembly(doc as unknown as AssemblyDoc, kit);
    stage.scene.add(view.root);
    view.root.updateMatrixWorld(true);
    const box = (id: string) => new THREE.Box3().setFromObject(view.parts.get(id)!);
    // khoảng hở giữa hai cản trước lúc lắp ráp, đo trên hình đã dựng
    gapRestRef.current = box("bBump").min.x - box("aBump").max.x;
    stage.fit(new THREE.Box3(new THREE.Vector3(-ROAD_HALF, 0, -3), new THREE.Vector3(ROAD_HALF, 2, 3)));

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 300);
    camera.position.set(3.5, 8.5, 24);
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(3, 0.2, 0); // lệch phải để bảng điều khiển không che xe B
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0, last = performance.now(), uiTick = 0;
    const loop = (now: number) => {
      const elapsed = Math.min(0.05, (now - last) / 1000);
      last = now;
      const i = inputsRef.current, w = worldRef.current;
      if (runningRef.current) {
        const p: CollisionParams = {
          mA: i.mA,
          mB: i.mB,
          e: i.e,
          mu: i.mu,
          gapRest: gapRestRef.current,
          sMin: [-ROAD_HALF + CAR_HALF - REST_X[0], -ROAD_HALF + CAR_HALF - REST_X[1]],
          sMax: [ROAD_HALF - CAR_HALF - REST_X[0], ROAD_HALF - CAR_HALF - REST_X[1]],
        };
        for (let n = Math.round((elapsed * i.slow) / DT); n > 0; n--) step(w, p, DT);
        const s = samplesRef.current;
        if (!s.length || w.t - s[s.length - 1].t > 0.01) s.push({ t: w.t, vA: w.a.v, vB: w.b.v });
        if (w.t > 0.5 && w.a.v === 0 && w.b.v === 0) setRunning(false);
        if (w.t > 30) setRunning(false);
      }
      // các khớp bánh được ghép (couple) vào xeA/xeB trong bản lắp ráp nên tự lăn theo
      view.setPose({ xeA: w.a.s, xeB: w.b.s });
      controls.update();
      renderer.render(stage.scene, camera);
      if (++uiTick % 6 === 0) {
        setSnap({ ...w, a: { ...w.a }, b: { ...w.b } });
        drawGraph(graphRef.current, samplesRef.current, w.impact?.t ?? null);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      controls.dispose();
      view.dispose();
      renderer.dispose();
    };
  }, []);

  const reset = (next = inputs) => {
    worldRef.current = newWorld(next);
    samplesRef.current = [];
    setRunning(false);
    setSnap(worldRef.current);
  };
  const set = (k: keyof Inputs, v: number) => {
    const next = { ...inputs, [k]: v };
    setInputs(next);
    // đổi điều kiện đầu thì đặt lại; đổi tốc độ phát lại thì không
    if (k !== "slow" && k !== "mu" && worldRef.current.t === 0) reset(next);
  };

  const { mA, mB } = inputs, im = snap.impact;
  const p = (vA: number, vB: number) => mA * vA + mB * vB;
  const K = (vA: number, vB: number) => (mA * vA * vA + mB * vB * vB) / 2;
  const v0: [number, number] = [inputs.vA / 3.6, inputs.vB / 3.6];
  const willHit = v0[0] > v0[1];

  return (
    <div className={styles.page}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          ← Trang chủ
        </Link>
        <h1>Va chạm hai xe ô tô</h1>
        <p>Hai xe chạy trên cùng một làn rồi đâm trực diện hoặc đâm đuôi. Động lượng toàn phần được bảo toàn, còn động năng mất bao nhiêu thì tuỳ hệ số phục hồi e.</p>
      </header>

      <aside className={styles.panel}>
        <Slider label="Khối lượng xe A (đỏ)" unit="kg" min={500} max={4000} step={50} value={inputs.mA} onChange={(v) => set("mA", v)} />
        <Slider label="Khối lượng xe B (xanh)" unit="kg" min={500} max={4000} step={50} value={inputs.mB} onChange={(v) => set("mB", v)} />
        <Slider label="Vận tốc đầu xe A" unit="km/h" min={-90} max={90} step={1} value={inputs.vA} onChange={(v) => set("vA", v)} />
        <Slider label="Vận tốc đầu xe B" unit="km/h" min={-90} max={90} step={1} value={inputs.vB} onChange={(v) => set("vB", v)} />
        <Slider label="Hệ số phục hồi e" unit="" min={0} max={1} step={0.05} digits={2} value={inputs.e} onChange={(v) => set("e", v)} />
        <Slider label="Ma sát lăn μ" unit="" min={0} max={0.3} step={0.01} digits={2} value={inputs.mu} onChange={(v) => set("mu", v)} />
        <Slider label="Tốc độ phát" unit="×" min={0.1} max={1} step={0.05} digits={2} value={inputs.slow} onChange={(v) => set("slow", v)} />
        <div className={styles.buttons}>
          <button onClick={() => (snap.t > 0 && !running && (snap.a.v !== 0 || snap.b.v !== 0) ? setRunning(true) : (reset(), setRunning(true)))} disabled={running}>
            {running ? "Đang chạy" : snap.t > 0 && (snap.a.v !== 0 || snap.b.v !== 0) ? "Tiếp tục" : "Chạy"}
          </button>
          <button onClick={() => setRunning(false)} disabled={!running}>
            Dừng
          </button>
          <button onClick={() => reset()}>Đặt lại</button>
        </div>
        {!willHit && <p className={styles.warn}>Xe A không nhanh hơn xe B theo chiều +x nên hai xe sẽ không gặp nhau.</p>}

        <table className={styles.table}>
          <thead>
            <tr>
              <th />
              <th>Trước</th>
              <th>Sau</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>v<sub>A</sub> (km/h)</td>
              <td>{fmt(kmh(im ? im.before[0] : snap.a.v))}</td>
              <td>{im ? fmt(kmh(im.after[0])) : "—"}</td>
            </tr>
            <tr>
              <td>v<sub>B</sub> (km/h)</td>
              <td>{fmt(kmh(im ? im.before[1] : snap.b.v))}</td>
              <td>{im ? fmt(kmh(im.after[1])) : "—"}</td>
            </tr>
            <tr>
              <td>p (kg·m/s)</td>
              <td>{fmt(im ? p(...im.before) : p(snap.a.v, snap.b.v), 0)}</td>
              <td>{im ? fmt(p(...im.after), 0) : "—"}</td>
            </tr>
            <tr>
              <td>Động năng (kJ)</td>
              <td>{fmt((im ? K(...im.before) : K(snap.a.v, snap.b.v)) / 1000)}</td>
              <td>{im ? fmt(K(...im.after) / 1000) : "—"}</td>
            </tr>
          </tbody>
        </table>
        {im && (
          <p className={styles.note}>
            Mất {fmt((K(...im.before) - K(...im.after)) / 1000)} kJ ({fmt((100 * (K(...im.before) - K(...im.after))) / Math.max(1e-9, K(...im.before)), 0)}% động năng) thành biến dạng, nhiệt và âm thanh. Xung lượng lên mỗi xe {fmt(Math.abs(mA * (im.after[0] - im.before[0])), 0)} N·s.
          </p>
        )}
        <div className={styles.graphHead}>
          Vận tốc theo thời gian <span className={styles.keyA}>A</span> <span className={styles.keyB}>B</span>
        </div>
        <canvas ref={graphRef} className={styles.graph} width={560} height={260} />
        <p className={styles.time}>t = {fmt(snap.t, 2)} s</p>
      </aside>
    </div>
  );
}

function Slider(props: { label: string; unit: string; min: number; max: number; step: number; digits?: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className={styles.slider}>
      <span>
        {props.label}
        <b>
          {fmt(props.value, props.digits ?? 0)} {props.unit}
        </b>
      </span>
      <input type="range" min={props.min} max={props.max} step={props.step} value={props.value} onChange={(e) => props.onChange(+e.target.value)} />
    </label>
  );
}

/** Đồ thị v(t) của hai xe, trục đứng km/h; vạch dọc ở lúc va chạm. */
function drawGraph(c: HTMLCanvasElement | null, s: Sample[], tHit: number | null) {
  if (!c) return;
  const g = c.getContext("2d")!, W = c.width, H = c.height, pad = 36;
  g.clearRect(0, 0, W, H);
  const tMax = Math.max(2, s.length ? s[s.length - 1].t : 0);
  const vMax = Math.max(20, ...s.map((x) => Math.max(Math.abs(kmh(x.vA)), Math.abs(kmh(x.vB))))) * 1.1;
  const X = (t: number) => pad + ((W - pad - 10) * t) / tMax, Y = (v: number) => H / 2 - ((H / 2 - 14) * kmh(v)) / vMax;
  g.strokeStyle = "rgba(255,255,255,.18)";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(pad, H / 2);
  g.lineTo(W - 10, H / 2);
  g.moveTo(pad, 8);
  g.lineTo(pad, H - 8);
  g.stroke();
  g.fillStyle = "#8c96a5";
  g.font = "20px system-ui, sans-serif";
  g.fillText(`${Math.round(vMax)}`, 2, 24);
  g.fillText("0", 14, H / 2 + 6);
  g.fillText(`${fmt(tMax, 1)} s`, W - 70, H / 2 + 24);
  if (tHit !== null) {
    g.strokeStyle = "rgba(255,210,90,.6)";
    g.setLineDash([6, 6]);
    g.beginPath();
    g.moveTo(X(tHit), 8);
    g.lineTo(X(tHit), H - 8);
    g.stroke();
    g.setLineDash([]);
  }
  for (const [key, color] of [["vA", "#ff6b6b"], ["vB", "#5aa9ff"]] as const) {
    g.strokeStyle = color;
    g.lineWidth = 3;
    g.beginPath();
    s.forEach((x, n) => (n ? g.lineTo(X(x.t), Y(x[key])) : g.moveTo(X(x.t), Y(x[key]))));
    g.stroke();
  }
}
