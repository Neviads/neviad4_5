"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { AssemblyDoc } from "@/assembly-kit/core/types";
import { type AssemblyView, buildAssembly, createStage } from "@/assembly-kit/three/build-scene";
import { loadBrowserKernel } from "@/assembly-kit/three/kernel-browser";
import { preloadMeshes } from "@/assembly-kit/three/preload";
import { renderView } from "@/assembly-kit/three/render";
import { chain } from "@/assembly-kit/core/math";
import { physicsKey } from "@/assembly-kit/physics/key";
import type { PhysicsModel } from "@/assembly-kit/physics/model";
import { World } from "@/assembly-kit/physics/solver";
import { type MaterialKit, createMaterialKit } from "@/assembly-kit/three/materials";

type Entry = { id: string; title: string; rev: number; updatedAt: string; doc: AssemblyDoc };
type ViewRequest = {
  key: string;
  requestedAt?: string;
  assembly: string;
  rev: number;
  pose: Record<string, number>;
  focus: string | null;
  mode?: "four" | "render" | "export";
  camera?: string;
  size?: [number, number];
  quality?: "preview" | "final";
};
type BridgeState = { version: number; assemblies: Entry[]; view: ViewRequest | null };

const POLL_MS = 700;
const CAP_W = 960, CAP_H = 640;

function newRenderer(canvas?: HTMLCanvasElement) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: !canvas });
  r.shadowMap.enabled = true;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  return r;
}

const boxOf = (o: THREE.Object3D) => {
  o.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(o);
};

/** Chụp 2×2: phối cảnh, trước (+z), cạnh (+x), trên (+y) — trả data URL PNG 1920×1280. */
function captureFour(renderer: THREE.WebGLRenderer, scene: THREE.Scene, box: THREE.Box3): string {
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const r = Math.max(0.02, s.length() / 2), qw = CAP_W / 2, qh = CAP_H / 2, aspect = qw / qh;
  const persp = new THREE.PerspectiveCamera(30, aspect, r / 50, r * 50);
  persp.position.copy(c).add(new THREE.Vector3(1, 0.8, 1.4).normalize().multiplyScalar((r / Math.sin((15 * Math.PI) / 180)) * 0.62));
  persp.lookAt(c);
  const ortho = (dir: THREE.Vector3, up: THREE.Vector3, w: number, h: number) => {
    const halfH = Math.max(h / 2, w / 2 / aspect) * 1.15, halfW = halfH * aspect;
    const cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, r / 50, r * 50);
    cam.up.copy(up);
    cam.position.copy(c).add(dir.clone().multiplyScalar(r * 4));
    cam.lookAt(c);
    return cam;
  };
  const views: [THREE.Camera, number, number, string][] = [
    [persp, 0, qh, "Phối cảnh"],
    [ortho(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), s.x, s.y), qw, qh, "Trước (+z)"],
    [ortho(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), s.z, s.y), 0, 0, "Cạnh (+x)"],
    [ortho(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1), s.x, s.z), qw, 0, "Trên (+y)"],
  ];
  renderer.setScissorTest(true);
  for (const [cam, x, y] of views) {
    renderer.setViewport(x, y, qw, qh);
    renderer.setScissor(x, y, qw, qh);
    renderer.render(scene, cam);
  }
  renderer.setScissorTest(false);
  const out = document.createElement("canvas");
  out.width = CAP_W * 2;
  out.height = CAP_H * 2;
  const g = out.getContext("2d")!;
  g.drawImage(renderer.domElement, 0, 0, out.width, out.height);
  g.strokeStyle = "rgba(255,255,255,.35)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(CAP_W, 0);
  g.lineTo(CAP_W, CAP_H * 2);
  g.moveTo(0, CAP_H);
  g.lineTo(CAP_W * 2, CAP_H);
  g.stroke();
  g.font = "600 26px system-ui, sans-serif";
  views.forEach(([, x, y, label]) => {
    const px = x * 2 + 16, py = (CAP_H - y - qh) * 2 + 40;
    g.fillStyle = "rgba(0,0,0,.55)";
    g.fillRect(px - 8, py - 30, g.measureText(label).width + 16, 40);
    g.fillStyle = "#fff";
    g.fillText(label, px, py);
  });
  return out.toDataURL("image/png");
}

export default function Studio() {
  const [state, setState] = useState<BridgeState>({ version: 0, assemblies: [], view: null });
  const [sync, setSync] = useState<"connecting" | "online" | "offline">("connecting");
  const [picked, setPicked] = useState<string | null>(null);
  const [pose, setPose] = useState<Record<string, number>>({});
  const [capturing, setCapturing] = useState<string | null>(null);
  const versionRef = useRef(-1);
  const hostRef = useRef<HTMLDivElement>(null);
  const three = useRef<{ renderer: THREE.WebGLRenderer; stage: ReturnType<typeof createStage>; camera: THREE.PerspectiveCamera; controls: OrbitControls; kit: MaterialKit } | null>(null);
  const viewRef = useRef<{ key: string; view: AssemblyView } | null>(null);
  const fittedRef = useRef<string | null>(null);
  const capRef = useRef<{ renderer: THREE.WebGLRenderer; stage: ReturnType<typeof createStage> } | null>(null);
  const doneKeys = useRef(new Set<string>());
  // lõi hình khối (boolean, khắc rãnh) nạp bất đồng bộ; dựng cảnh sau khi có
  const [kernelOk, setKernelOk] = useState(false);
  const [building, setBuilding] = useState<string | null>(null);
  // chạy vật lý: mô hình do MCP tính sẵn (physics_setup…), trang chỉ chạy bộ giải
  const simRef = useRef<{ world: World | null; model: PhysicsModel | null; running: boolean; speed: number; acc: number }>({ world: null, model: null, running: false, speed: 1, acc: 0 });
  const [sim, setSim] = useState<{ status: "idle" | "loading" | "running" | "paused" | "missing"; t: number }>({ status: "idle", t: 0 });
  const [rebuild, setRebuild] = useState(0);
  const [gpuLost, setGpuLost] = useState(false);
  useEffect(() => {
    loadBrowserKernel()
      .then(() => setKernelOk(true))
      .catch((e) => {
        console.error("Không nạp được lõi manifold:", e);
        setKernelOk(true); // vẫn dựng được các bản không dùng boolean
      });
  }, []);

  // Hỏi trạng thái định kỳ: bản lắp ráp Claude vừa sửa hiện lên trong chưa tới một giây.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(`/api/assembly-bridge?since=${versionRef.current}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as BridgeState | { version: number; unchanged: true };
        if (!stopped && !("unchanged" in data)) {
          versionRef.current = data.version;
          setState(data);
        }
        if (!stopped) setSync("online");
      } catch {
        if (!stopped) setSync("offline");
      }
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);

  // Chưa chọn thì theo bản vừa sửa gần nhất.
  const latest = useMemo(() => [...state.assemblies].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0], [state.assemblies]);
  const selected = state.assemblies.find((a) => a.id === picked) ?? latest;

  // Khởi tạo khung xem một lần.
  useEffect(() => {
    // canvas mới cho mỗi lần mount: cleanup gọi forceContextLoss(), nên dùng lại canvas cũ (StrictMode, Fast Refresh)
    // sẽ nhận đúng ngữ cảnh đã mất và three.js đổ lỗi "reading 'precision'"
    const canvas = document.createElement("canvas");
    canvas.className = "block h-full w-full";
    hostRef.current!.appendChild(canvas);
    const renderer = newRenderer(canvas);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const stage = createStage(renderer);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.005, 50);
    camera.position.set(0.5, 0.4, 0.7);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    const kit = createMaterialKit();
    three.current = { renderer, stage, camera, controls, kit };
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    let last = performance.now(), tick = 0;
    renderer.setAnimationLoop((now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = simRef.current, view = viewRef.current?.view;
      if (s.running && s.world && view) {
        const DT = 1 / 120;
        s.acc += dt * s.speed;
        for (let n = 0; s.acc >= DT && n < 6; n++, s.acc -= DT) s.world.step(DT);
        for (const b of s.world.bodies) {
          const M = s.world.matrix(b);
          for (const part of b.model.parts) view.setWorld(part.path, chain(M, part.offset));
        }
        if (++tick % 10 === 0) setSim({ status: "running", t: s.world.t });
      }
      controls.update();
      renderer.render(stage.scene, camera);
    });
    // GPU cạn (máy yếu, cảnh nặng): giữ trang sống và báo thay vì để lỗi tràn ra; trình duyệt tự khôi phục được thì dựng lại
    const lost = (e: Event) => {
      e.preventDefault();
      setGpuLost(true);
    };
    const restored = () => {
      setGpuLost(false);
      setRebuild((r) => r + 1);
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    return () => {
      ro.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      renderer.setAnimationLoop(null);
      controls.dispose();
      // dispose() không nhả ngữ cảnh WebGL; mỗi lần Fast Refresh dựng lại trang sẽ để lại một ngữ cảnh, đủ nhiều thì
      // trình duyệt mất ngữ cảnh và chặn trang. forceContextLoss() nhả hẳn.
      renderer.dispose();
      renderer.forceContextLoss();
      if (capRef.current) {
        capRef.current.renderer.dispose();
        capRef.current.renderer.forceContextLoss();
        capRef.current = null;
      }
      three.current = null;
      canvas.remove();
    };
  }, []);

  // Dựng lại khi đổi bản lắp ráp hoặc rev; giữ góc nhìn nếu vẫn là bản cũ.
  useEffect(() => {
    const t = three.current;
    if (!t || !kernelOk) return;
    const key = selected ? `${selected.id}@${selected.rev}#${rebuild}` : "";
    if (viewRef.current?.key === key) return;
    if (viewRef.current) {
      t.stage.scene.remove(viewRef.current.view.root);
      viewRef.current.view.dispose();
      viewRef.current = null;
    }
    if (!selected) return;
    let cancelled = false;
    const doc = selected.doc, id = selected.id;
    const title = selected.title;
    // tải lưới nướng sẵn trước (hình nặng như thân xe), rồi mới dựng: không dựng lại trên luồng giao diện
    Promise.resolve()
      .then(() => setBuilding(title))
      .then(() => preloadMeshes(doc))
      .catch(() => 0)
      .then(() => {
        if (cancelled || !three.current) return;
        try {
          const view = buildAssembly(doc, t.kit);
          view.setPose(pose);
          t.stage.scene.add(view.root);
          t.stage.applyScene(doc.scene).catch((e) => console.error(e));
          viewRef.current = { key, view };
          const box = boxOf(view.root);
          if (!box.isEmpty()) {
            t.stage.fit(box);
            if (fittedRef.current !== id) {
              fittedRef.current = id;
              const c = box.getCenter(new THREE.Vector3()), r = Math.max(0.05, box.getSize(new THREE.Vector3()).length() / 2);
              t.controls.target.copy(c);
              t.camera.position.copy(c).add(new THREE.Vector3(1, 0.8, 1.4).normalize().multiplyScalar(r * 3.2));
            }
          }
        } catch (e) {
          console.error(e);
        } finally {
          setBuilding(null);
        }
      });
    return () => {
      cancelled = true;
    };
    // pose đổi được xử lý ở effect riêng
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.rev, kernelOk, rebuild]);

  // đổi bản lắp ráp hoặc bản sửa mới thì bỏ mô phỏng cũ
  useEffect(() => {
    simRef.current = { ...simRef.current, world: null, model: null, running: false, acc: 0 };
    Promise.resolve().then(() => setSim({ status: "idle", t: 0 }));
  }, [selected?.id, selected?.rev]);

  const simStart = async () => {
    const s = simRef.current;
    if (!selected?.doc.physics) return;
    if (!s.model) {
      setSim({ status: "loading", t: 0 });
      const res = await fetch(`/api/assembly-bridge?physics=${physicsKey(selected.doc)}`);
      if (!res.ok) return setSim({ status: "missing", t: 0 });
      s.model = (await res.json()) as PhysicsModel;
    }
    s.world ??= new World(s.model);
    s.running = true;
    setSim({ status: "running", t: s.world.t });
  };
  const simPause = () => {
    simRef.current.running = false;
    setSim((x) => ({ ...x, status: "paused" }));
  };
  const simReset = () => {
    simRef.current = { ...simRef.current, world: null, running: false, acc: 0 };
    setSim({ status: "idle", t: 0 });
    setRebuild((r) => r + 1); // dựng lại cảnh về tư thế lắp ráp
  };

  useEffect(() => {
    try {
      viewRef.current?.view.setPose(pose);
    } catch (e) {
      console.error(e);
    }
  }, [pose]);

  // Chụp ảnh cho Claude: mỗi yêu cầu xem (key) chạy một lần, bằng renderer riêng để không đụng góc nhìn của người dùng.
  useEffect(() => {
    const req = state.view;
    const t = three.current;
    if (!req || !t || doneKeys.current.has(req.key)) return;
    // yêu cầu quá 1 phút là của phiên trước (MCP đã thôi chờ): bỏ qua, không render lại
    if (req.requestedAt && Date.now() - Date.parse(req.requestedAt) > 60_000) return;
    const entry = state.assemblies.find((a) => a.id === req.assembly);
    if (!entry) return;
    doneKeys.current.add(req.key);
    const post = (body: object) => fetch("/api/assembly-bridge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "snapshot", assembly: req.assembly, key: req.key, ...body }) });
    (async () => {
      let view: AssemblyView | null = null;
      setCapturing(req.assembly);
      try {
        await loadBrowserKernel();
        await preloadMeshes(entry.doc).catch(() => 0);
        if (!capRef.current) {
          const renderer = newRenderer();
          capRef.current = { renderer, stage: createStage(renderer) };
        }
        const cap = capRef.current;
        view = buildAssembly(entry.doc, t.kit);
        view.setPose(req.pose ?? {});
        if (req.mode === "export") {
          // glTF nhị phân của riêng vật (không có nền, đèn)
          const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
          const buf = (await new GLTFExporter().parseAsync(view.root, { binary: true })) as ArrayBuffer;
          let bin = "";
          const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          await post({ glb: btoa(bin) });
          return;
        }
        cap.stage.scene.add(view.root);
        await cap.stage.applyScene(entry.doc.scene);
        const all = boxOf(view.root);
        cap.stage.fit(all);
        if (req.mode === "render") {
          const detail = /^detail:(.+)$/.exec(req.camera ?? "");
          const part = detail ? view.parts.get(detail[1]) : undefined;
          const box = part ? boxOf(part).expandByScalar(0.01) : all;
          await post({ png: renderView(cap.renderer, cap.stage.scene, box, req.camera ?? "threeQuarterFront", req.size ?? [1600, 1000], req.quality ?? "final") });
        } else {
          cap.renderer.setPixelRatio(2);
          cap.renderer.setSize(CAP_W, CAP_H, false);
          const target = req.focus ? view.parts.get(req.focus) : undefined;
          const box = target ? boxOf(target).expandByScalar(0.01) : all;
          await post({ png: captureFour(cap.renderer, cap.stage.scene, box) });
        }
        cap.stage.scene.remove(view.root);
      } catch (e) {
        await post({ error: e instanceof Error ? e.message : String(e) });
      } finally {
        view?.dispose();
        setCapturing(null);
      }
    })();
  }, [state.view, state.assemblies]);

  // khớp ghép (couple) tự đi theo khớp dẫn: chỉ khớp dẫn có thanh trượt và chạy được
  const joints = (selected?.doc.joints ?? []).filter((j) => !j.couple);
  const limitsOf = (j: (typeof joints)[number]): [number, number] => j.limits ?? (j.kind === "revolute" ? [-180, 180] : [-0.1, 0.1]);

  // "Chạy cơ cấu": mọi khớp dẫn đi từ mút dưới lên mút trên rồi về, lặp lại; khớp quay đủ một vòng (chu kỳ 0–360°)
  // thì quay một chiều, vì đầu và cuối vòng là cùng một tư thế
  const [playing, setPlaying] = useState(false);
  const [period, setPeriod] = useState(2);
  useEffect(() => {
    if (!playing || !joints.length) return;
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const phase = (now - t0) / 1000 / period;
      const swing = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
      const turn = phase - Math.floor(phase);
      setPose((p) => ({
        ...p,
        ...Object.fromEntries(joints.map((j) => {
          const [lo, hi] = limitsOf(j);
          return [j.id, lo + (j.kind === "revolute" && hi - lo === 360 ? turn : swing) * (hi - lo)];
        })),
      }));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, period, selected?.id, joints.map((j) => `${j.id}:${limitsOf(j)}`).join("|")]);

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-white/10 p-3 text-[13px]">
        <div className="mb-2 flex items-center justify-between text-[12px] text-[#9aa3b0]">
          <span>Bản lắp ráp</span>
          <span>{sync === "online" ? "● đã kết nối" : sync === "offline" ? "○ mất kết nối" : "…"}</span>
        </div>
        {state.assemblies.length === 0 && <p className="text-[#9aa3b0]">Chưa có bản nào. Nhắn Claude dùng MCP neviad-assembly để dựng.</p>}
        <ul className="space-y-1">
          {state.assemblies.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => setPicked(a.id)}
                className={`w-full rounded-md px-2 py-1.5 text-left ${selected?.id === a.id ? "bg-white/10" : "hover:bg-white/5"}`}>
                <div className="font-medium">{a.title}</div>
                <div className="text-[11px] text-[#9aa3b0]">{a.id} · rev {a.rev} · {a.doc.parts.length} bộ phận</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="relative min-w-0 flex-1">
        <div ref={hostRef} className="h-full w-full" />
        {gpuLost && (
          <div className="absolute inset-x-3 top-3 rounded-md bg-red-900/80 px-3 py-2 text-[12px]">
            Trình duyệt đã mất ngữ cảnh WebGL (GPU hết bộ nhớ). Đang chờ khôi phục; nếu không tự hiện lại thì tải lại trang.
          </div>
        )}
        {capturing && <div className="absolute right-3 top-3 rounded-md bg-black/60 px-3 py-1.5 text-[12px]">Đang chụp {capturing} cho Claude…</div>}
        {building && !capturing && <div className="absolute right-3 top-3 rounded-md bg-black/60 px-3 py-1.5 text-[12px]">Đang dựng {building}…</div>}
        {selected?.doc.physics && (
          <div className="absolute right-3 bottom-3 flex items-center gap-2 rounded-lg bg-black/55 p-2 text-[12px] backdrop-blur">
            <span className="px-1 text-[#aab2bd]">Vật lý</span>
            <button type="button" className="rounded bg-white/10 px-2 py-1 hover:bg-white/20 disabled:opacity-40" disabled={sim.status === "running" || sim.status === "loading"} onClick={simStart}>
              {sim.status === "paused" ? "Tiếp tục" : "Chạy"}
            </button>
            <button type="button" className="rounded bg-white/10 px-2 py-1 hover:bg-white/20 disabled:opacity-40" disabled={sim.status !== "running"} onClick={simPause}>
              Dừng
            </button>
            <button type="button" className="rounded bg-white/10 px-2 py-1 hover:bg-white/20" onClick={simReset}>
              Đặt lại
            </button>
            <select className="rounded bg-white/10 px-1 py-1" defaultValue="1" onChange={(e) => (simRef.current.speed = +e.target.value)}>
              <option value="0.25">0,25×</option>
              <option value="0.5">0,5×</option>
              <option value="1">1×</option>
            </select>
            <span className="w-24 text-right tabular-nums text-[#aab2bd]">
              {sim.status === "loading" ? "đang tải…" : sim.status === "missing" ? "chưa có mô hình" : `t = ${sim.t.toFixed(2)} s`}
            </span>
          </div>
        )}
        {joints.length > 0 && (
          <div className="absolute bottom-3 left-3 w-72 space-y-2 rounded-lg bg-black/55 p-3 text-[12px] backdrop-blur">
            <div className="flex items-center gap-2">
              <button type="button" className="rounded bg-white/10 px-2 py-1 hover:bg-white/20" onClick={() => setPlaying((x) => !x)}>
                {playing ? "Dừng cơ cấu" : "Chạy cơ cấu"}
              </button>
              <select className="rounded bg-white/10 px-1 py-1" value={period} onChange={(e) => setPeriod(+e.target.value)}>
                <option value="0.5">0,5 s/chu kỳ</option>
                <option value="2">2 s/chu kỳ</option>
                <option value="6">6 s/chu kỳ</option>
              </select>
            </div>
            {joints.map((j) => {
              const [lo, hi] = limitsOf(j);
              const v = pose[j.id] ?? 0;
              return (
                <label key={j.id} className="block">
                  <span className="flex justify-between"><span>{j.id} ({j.kind})</span><span>{j.kind === "revolute" ? `${v.toFixed(0)}°` : `${(v * 1000).toFixed(1)} mm`}</span></span>
                  <input type="range" className="w-full" min={lo} max={hi} step={(hi - lo) / 360} value={v} onChange={(e) => setPose((p) => ({ ...p, [j.id]: Number(e.target.value) }))} />
                </label>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
