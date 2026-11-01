"use client";

// Kích sàn thuỷ lực 2,5 tấn — nâng ô tô bằng một tay.
// Mô hình dựng bằng MCP neviad-assembly (bản lắp ráp "kich-san-thuy-luc"), xuất ra kich-san.assembly.json.
//
// Cơ cấu (như kích sàn thật): đơn vị thuỷ lực ở đuôi — bình dầu ôm xi lanh chính nằm ngang, tháp bơm và van xả
// trên lưng — bắt vào khung bằng chốt sau và lắc nhẹ theo hành trình. Cán xi lanh đẩy chân tay quay hàn dưới trục
// cần nâng, nên cần quay lên; thanh giằng song song (hình bình hành) giữ đĩa đỡ luôn nằm ngang.
//
// Trang chỉ làm phần dầu: mỗi lần pít-tông bơm đi xuống (van xả đóng), dầu đẩy sang xi lanh chính
// ΔL = (d_bơm / D_xi lanh)² × độ dời pít-tông. Trang đặt `truotCan` (hành trình cán, khớp phụ thuộc), `bom`, `vanXa`;
// góc cần, góc lắc đơn vị thuỷ lực, thanh giằng và đĩa đỡ do bộ giải vòng kín suy ra — trang không tự tính góc cần.

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { AssemblyDoc } from "@/assembly-kit/core/types";
import { type AssemblyView, buildAssembly, createStage } from "@/assembly-kit/three/build-scene";
import { loadBrowserKernel } from "@/assembly-kit/three/kernel-browser";
import { preloadMeshes } from "@/assembly-kit/three/preload";
import { createMaterialKit } from "@/assembly-kit/three/materials";
import raw from "./kich-san.assembly.json";

const doc = raw as unknown as AssemblyDoc;

// ── số đo thật của mô hình (bản lắp ráp) ──
/** pít-tông bơm Ø18 mm, xi lanh chính lòng Ø55 mm (ống Ø65, nằm trong bình dầu Ø90) */
const PUMP_AREA = (Math.PI * 0.018 ** 2) / 4;
const RAM_AREA = (Math.PI * 0.055 ** 2) / 4;
/** hành trình cán lớn nhất (m): giới hạn của khớp `truotCan`, ứng với cần nâng 58° */
const ROD_MAX = 0.075;
/** biên độ tay bơm (độ): giới hạn khớp `bom` */
const PUMP_SWING = 12;
/** tay bơm: từ chốt quay tới tay nắm ≈ 1,0 m, tới chốt thanh truyền ≈ 85 mm */
const HANDLE_ARM = 1.0;
const HANDLE_LINK = 0.085;
/** van an toàn mở ở 45 MPa (giả thiết; cho tải định mức ≈ 2,5 t ở vị trí thấp nhất) */
const P_RELIEF = 45e6;
/** lỗ van xả Ø0,8 mm, hệ số lưu lượng 0,6; dầu thuỷ lực 870 kg/m³ */
const ORIFICE = 0.6 * (Math.PI * 0.0008 ** 2) / 4;
const OIL_RHO = 870;
/** khối lượng tương đương của cần + đĩa (để cần rỗng vẫn tự hạ khi xả) */
const ARM_KG = 12;
/** ngưỡng gầm xe: mặt dưới dầm cách sàn (m) */
const SILL_Y = 0.3;
const G = 9.81;

type Load = { label: string; kg: number };

/** tải đè lên đĩa khi kích một đầu xe ≈ 55–60% khối lượng xe */
const LOADS: Load[] = [
  { label: "Đầu xe nhỏ", kg: 540 },
  { label: "Đầu sedan", kg: 870 },
  { label: "Đầu SUV", kg: 1260 },
];

/** nội suy bảng tăng dần theo x */
function lerpTable(xs: number[], ys: number[], x: number) {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) return ys[i - 1] + ((ys[i] - ys[i - 1]) * (x - xs[i - 1])) / (xs[i] - xs[i - 1]);
  }
  return ys[ys.length - 1];
}

/** một điểm neo: toạ độ trong hệ của hình, ghép với ma trận thế giới của bộ phận ra toạ độ thật */
type AnchorRow = { ref: string; partId: string; kind: string; local: THREE.Vector3 };

type RawAnchor = { origin?: number[]; kind?: string };

function collectAnchors(doc: AssemblyDoc): AnchorRow[] {
  const byShape = new Map<string, Record<string, RawAnchor>>();
  for (const s of (doc.shapes ?? []) as unknown as Array<{ id: string; anchors?: Record<string, RawAnchor> }>) {
    byShape.set(s.id, s.anchors ?? {});
  }
  const rows: AnchorRow[] = [];
  for (const p of doc.parts as unknown as Array<{ id: string; type?: string; anchors?: Record<string, RawAnchor> }>) {
    const sid = String(p.type ?? "").replace(/^shape:/, "");
    const merged = { ...(byShape.get(sid) ?? {}), ...(p.anchors ?? {}) };
    for (const [name, a] of Object.entries(merged)) {
      const o = a?.origin;
      if (!o || o.length < 3) continue;
      rows.push({ ref: `${p.id}.${name}`, partId: p.id, kind: a.kind ?? "point", local: new THREE.Vector3(o[0], o[1], o[2]) });
    }
  }
  return rows;
}

/** nhãn chữ nổi trong không gian, để đọc tên điểm neo ngay trên mô hình */
function makeLabel(text: string) {
  const pad = 10;
  const font = 34;
  const probe = document.createElement("canvas").getContext("2d")!;
  probe.font = `600 ${font}px ui-sans-serif, system-ui, sans-serif`;
  const w = Math.ceil(probe.measureText(text).width) + pad * 2;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = font + pad * 2;
  const g = c.getContext("2d")!;
  g.font = `600 ${font}px ui-sans-serif, system-ui, sans-serif`;
  g.fillStyle = "rgba(6,10,16,0.82)";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#bfe9ff";
  g.textBaseline = "middle";
  g.fillText(text, pad, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  const h = 0.011;
  sprite.scale.set((h * c.width) / c.height, h, 1);
  sprite.center.set(0, 0.5);
  sprite.renderOrder = 21;
  return sprite;
}

export default function KichSanThuyLucPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<AssemblyView | null>(null);
  const beamRef = useRef<THREE.Group | null>(null);
  const markerRef = useRef<{
    group: THREE.Group;
    items: { row: AnchorRow; dot: THREE.Mesh; label?: THREE.Sprite; world: THREE.Vector3 }[];
  } | null>(null);
  const readyRef = useRef(false);
  const input = useRef({ pump: false, release: false, kg: 1450, auto: false });
  const [ready, setReady] = useState(false);
  const [loadIndex, setLoadIndex] = useState(1);
  const [auto, setAuto] = useState(false);
  const [showAnchors, setShowAnchors] = useState(false);
  const [anchorHud, setAnchorHud] = useState<{ ref: string; x: number; y: number; z: number }[]>([]);
  const [hud, setHud] = useState({ height: 0, angle: 0, rod: 0, bom: 0, valve: 0, pumps: 0, pressure: 0, handleN: 0, maxKg: 0, relief: false, contact: false });

  const anchorsOn = useRef(false);
  // vòng lặp vẽ đọc các lựa chọn qua ref; đồng bộ sau mỗi lần render, không ghi ref trong lúc render
  useEffect(() => {
    input.current.kg = LOADS[loadIndex].kg;
    input.current.auto = auto;
    anchorsOn.current = showAnchors;
  }, [loadIndex, auto, showAnchors]);

  const setPump = useCallback((on: boolean) => {
    input.current.pump = on;
    if (on) input.current.release = false;
  }, []);
  const setRelease = useCallback((on: boolean) => {
    input.current.release = on;
    if (on) input.current.pump = false;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Space") {
        e.preventDefault();
        setPump(true);
      }
      if (e.code === "KeyX") setRelease(true);
    };
    const offKey = (e: KeyboardEvent) => {
      if (e.code === "Space") setPump(false);
      if (e.code === "KeyX") setRelease(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", offKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", offKey);
    };
  }, [setPump, setRelease]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let stopped = false;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;

    const stage = createStage(renderer);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.004, 40);
    camera.position.set(1.15, 0.62, 1.05);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.35;
    controls.maxDistance = 6;
    controls.maxPolarAngle = Math.PI * 0.495;

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

    /** khối tải: dầm khung xe đặt lên đĩa nâng (tải thử) */
    const makeBeam = () => {
      const g = new THREE.Group();
      const steel = new THREE.MeshStandardMaterial({ color: "#33383f", roughness: 0.52, metalness: 0.78 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.076, 0.16), steel);
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);
      const boltMat = new THREE.MeshStandardMaterial({ color: "#b9bec6", roughness: 0.28, metalness: 1 });
      for (const bx of [-0.27, 0.27]) {
        for (const bz of [-0.045, 0.045]) {
          const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.024, 12), boltMat);
          bolt.position.set(bx, 0.048, bz);
          bolt.castShadow = true;
          g.add(bolt);
        }
      }
      return g;
    };

    // trạng thái dầu và tay: hành trình cán (m), góc tay bơm, góc van xả, vị trí pít-tông bơm lần trước
    let rod = 0;
    let phase = 0;
    let bom = 0;
    let valve = 0;
    let pistonPrev = 0;
    let pumps = 0;
    let strokeOil = 0;
    let since = 0;
    let sinceA = 0;
    let last = performance.now();
    /** bảng hình học đo từ chính mô hình lúc dựng: hành trình cán → mặt đĩa (y, z) và góc cần */
    let table: { rod: number[]; y: number[]; z: number[]; angle: number[] } | null = null;
    const saddleAt = (r: number) => (table ? { y: lerpTable(table.rod, table.y, r), z: lerpTable(table.rod, table.z, r) } : { y: 0, z: 0 });
    /** dh/dL: mặt đĩa lên bao nhiêu khi cán duỗi 1 m (tỉ số đòn bẩy của cơ cấu) */
    const gain = (r: number) => {
      const e = 0.002;
      const a = Math.max(0, Math.min(ROD_MAX - e, r));
      return (saddleAt(a + e).y - saddleAt(a).y) / e;
    };

    renderer.setAnimationLoop((now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const view = viewRef.current;
      if (view && readyRef.current && table) {
        const c = input.current;
        const pumping = (c.pump || c.auto) && !c.release;

        // van xả: vặn mở khi giữ XẢ, tự vặn đóng khi thả
        valve += ((c.release ? 90 : 0) - valve) * Math.min(1, dt * 8);
        const open = valve / 90;

        // tải chỉ đè lên đĩa khi đĩa đã chạm gầm xe
        const top = saddleAt(rod).y;
        const contact = top >= SILL_Y - 0.0005;
        const loadN = (contact ? c.kg : 0) * G + ARM_KG * G;
        // áp suất trong xi lanh chính: lực trên đĩa quy về cán theo công ảo (F_cán·dL = F_đĩa·dh)
        const pressure = (loadN * gain(rod)) / RAM_AREA;
        const relief = pressure >= P_RELIEF;

        // tay bơm: lắc ±12° khi giữ BƠM; quá áp thì van an toàn xả, cán không nhích
        if (pumping) {
          phase += dt * 1.5 * Math.PI * 2;
          bom = PUMP_SWING * Math.sin(phase);
        } else {
          bom += (0 - bom) * Math.min(1, dt * 7);
        }

        view.setPose({ truotCan: rod, bom, vanXa: valve });

        // pít-tông bơm đi xuống thì đẩy dầu qua van một chiều sang xi lanh chính
        const piston = view.solved.values.get("truotBom") ?? 0;
        const down = pistonPrev - piston;
        pistonPrev = piston;
        if (down > 0 && open < 0.05 && !relief && rod < ROD_MAX) {
          const dRod = (down * PUMP_AREA) / RAM_AREA;
          rod = Math.min(ROD_MAX, rod + dRod);
          strokeOil += down;
          if (strokeOil > 0.02) {
            strokeOil = 0;
            pumps += 1;
          }
        }

        // xả: dầu từ xi lanh chính về bình qua lỗ van, Q = Cd·A·√(2p/ρ)
        if (open > 0.02 && rod > 0) {
          const p = Math.max(pressure, (ARM_KG * G * gain(rod)) / RAM_AREA);
          const q = ORIFICE * open * Math.sqrt((2 * p) / OIL_RHO);
          rod = Math.max(0, rod - (q / RAM_AREA) * dt);
        }

        // điểm neo: dời theo bộ phận mỗi khung hình (ma trận thế giới của bộ phận × toạ độ neo)
        const mk = markerRef.current;
        if (mk) {
          mk.group.visible = anchorsOn.current;
          if (mk.group.visible) {
            view.root.updateMatrixWorld(true);
            for (const it of mk.items) {
              const obj = view.parts.get(it.row.partId);
              if (!obj) continue;
              it.world.copy(it.row.local).applyMatrix4(obj.matrixWorld);
              it.dot.position.copy(it.world);
              if (it.label) it.label.position.set(it.world.x, it.world.y + 0.009, it.world.z);
            }
            sinceA += dt;
            if (sinceA > 0.2) {
              sinceA = 0;
              setAnchorHud(mk.items.map((it) => ({ ref: it.row.ref, x: it.world.x, y: it.world.y, z: it.world.z })));
            }
          }
        }

        // dầm gầm xe: nằm yên ở độ cao gầm, đĩa chạm thì bị đẩy lên theo; đĩa lùi ra sau khi cần dựng nên dầm trượt theo z
        const s = saddleAt(rod);
        const beam = beamRef.current;
        if (beam) beam.position.set(0, Math.max(SILL_Y, s.y) + 0.038, s.z);

        since += dt;
        if (since > 0.08) {
          since = 0;
          const g = gain(rod);
          setHud({
            height: s.y,
            angle: lerpTable(table.rod, table.angle, rod),
            rod,
            bom,
            valve,
            pumps,
            pressure,
            // lực tay: áp × diện tích pít-tông bơm, qua đòn tay bơm (85 mm : 1 m)
            handleN: contact ? (pressure * PUMP_AREA * HANDLE_LINK) / HANDLE_ARM : 0,
            // tải lớn nhất trên đĩa ở độ cao này trước khi van an toàn mở
            maxKg: (P_RELIEF * RAM_AREA) / Math.max(1e-6, g) / G - ARM_KG,
            relief,
            contact,
          });
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
        stage.scene.add(view.root);

        // đo hình học thật của cơ cấu một lần: đặt hành trình cán, để bộ giải vòng kín suy ra cần nâng, đọc mặt đĩa
        const pad = view.parts.get("demCaoSu");
        const box = new THREE.Box3();
        const t = { rod: [] as number[], y: [] as number[], z: [] as number[], angle: [] as number[] };
        for (let i = 0; i <= 30; i++) {
          const r = (ROD_MAX * i) / 30;
          view.setPose({ truotCan: r, bom: 0, vanXa: 0 });
          view.root.updateMatrixWorld(true);
          if (pad) box.setFromObject(pad);
          t.rod.push(r);
          t.y.push(box.max.y);
          t.z.push((box.min.z + box.max.z) / 2);
          t.angle.push(view.solved.values.get("nang") ?? 0);
        }
        table = t;
        view.setPose({ truotCan: 0, bom: 0, vanXa: 0 });

        const beam = makeBeam();
        stage.scene.add(beam);
        beamRef.current = beam;

        // lớp hiện điểm neo: chấm màu theo loại + tên cho các neo có khớp/vòng kín
        const rows = collectAnchors(doc);
        const group = new THREE.Group();
        group.visible = false;
        stage.scene.add(group);
        const dotGeo = new THREE.SphereGeometry(0.005, 10, 8);
        const dotMat = {
          axis: new THREE.MeshBasicMaterial({ color: 0x37c8ff, depthTest: false, transparent: true }),
          point: new THREE.MeshBasicMaterial({ color: 0xffc14d, depthTest: false, transparent: true }),
          face: new THREE.MeshBasicMaterial({ color: 0x6fe08a, depthTest: false, transparent: true }),
        } as Record<string, THREE.MeshBasicMaterial>;
        const named = new Set<string>();
        for (const j of (doc.joints ?? []) as unknown as Array<{ axis?: string }>) if (j.axis) named.add(j.axis);
        for (const l of (doc.loops ?? []) as unknown as Array<{ a?: string; b?: string }>) {
          if (l.a) named.add(l.a);
          if (l.b) named.add(l.b);
        }
        const items = rows.map((row) => {
          const dot = new THREE.Mesh(dotGeo, dotMat[row.kind] ?? dotMat.point);
          dot.renderOrder = 20;
          group.add(dot);
          let label: THREE.Sprite | undefined;
          if (named.has(row.ref)) {
            label = makeLabel(row.ref);
            group.add(label);
          }
          return { row, dot, label, world: new THREE.Vector3() };
        });
        markerRef.current = { group, items };

        await stage.applyScene(doc.scene).catch(() => 0);
        viewRef.current = view;

        // ngắm vào thân kích (không lấy tâm khung bao, vì cần bơm dài 1 m làm tâm lệch ra sau)
        controls.target.set(0, 0.17, 0.0);
        camera.position
          .copy(controls.target)
          .add(new THREE.Vector3(0.95, 0.5, 1.1).normalize().multiplyScalar(1.42));
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
      beamRef.current = null;
      markerRef.current = null;
    };
  }, []);

  const heightMm = Math.round(hud.height * 1000);
  const aLoop = anchorHud.find((a) => a.ref === "canDay.dau");
  const bLoop = anchorHud.find((a) => a.ref === "canNang.taiXiLanh");
  const loopGap = aLoop && bLoop ? Math.hypot(aLoop.x - bLoop.x, aLoop.y - bLoop.y, aLoop.z - bLoop.z) * 1000 : NaN;

  return (
    <main className="flex h-dvh flex-col bg-[#12161c] text-[#e9ecf1]">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-white/10 px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Kích sàn thuỷ lực — một tay nâng ô tô</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-[#a4adb9]">
            Giữ <b className="text-[#e9ecf1]">BƠM</b> (hoặc Space): mỗi lần pít-tông bơm Ø18 ép xuống, dầu đẩy cán xi lanh
            chính Ø55 ra (18/55)² × hành trình bơm; cán đẩy tay quay, cần nâng quay lên, thanh giằng giữ đĩa nằm ngang.
            Giữ <b className="text-[#e9ecf1]">XẢ</b> (hoặc X): vặn van, dầu qua lỗ Ø0,8 về bình, cần hạ theo tải.
          </p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-[#a4adb9]">
          Bản lắp ráp <span className="text-[#e9ecf1]">kich-san-thuy-luc</span> · {doc.parts.length} bộ phận · {(doc.loops ?? []).length} vòng kín
        </div>
      </header>

      <section className="relative min-h-0 flex-1">
        <canvas ref={canvasRef} className="block h-full w-full" />

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[#a4adb9]">
            Đang dựng mô hình…
          </div>
        )}

        {/* bảng điều khiển */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2 rounded-xl border border-white/10 bg-black/60 p-3 text-[13px] backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setPump(true);
              }}
              onPointerUp={() => setPump(false)}
              onPointerCancel={() => setPump(false)}
              onPointerLeave={() => setPump(false)}
              className={`min-w-[112px] select-none rounded-lg px-4 py-2.5 font-semibold tracking-wide transition ${
                hud.bom > 1 ? "bg-[#2f7d58] text-white shadow-[0_0_0_1px_rgba(74,222,128,0.35)]" : "bg-[#2f7d58]/85 text-white hover:bg-[#369166]"
              }`}
            >
              BƠM
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setRelease(true);
              }}
              onPointerUp={() => setRelease(false)}
              onPointerCancel={() => setRelease(false)}
              onPointerLeave={() => setRelease(false)}
              className="min-w-[112px] select-none rounded-lg bg-[#7a2f2f]/85 px-4 py-2.5 font-semibold tracking-wide text-white transition hover:bg-[#8d3838]"
            >
              XẢ
            </button>
            <button
              type="button"
              onClick={() => setAuto((v) => !v)}
              className={`rounded-lg px-3 py-2.5 font-medium transition ${auto ? "bg-[#3b5c8a] text-white" : "bg-white/10 text-[#c8d0da] hover:bg-white/20"}`}
            >
              {auto ? "Tự động: bật" : "Tự động"}
            </button>
            <button
              type="button"
              onClick={() => setShowAnchors((v) => !v)}
              className={`rounded-lg px-3 py-2.5 font-medium transition ${showAnchors ? "bg-[#2f6f7d] text-white" : "bg-white/10 text-[#c8d0da] hover:bg-white/20"}`}
            >
              {showAnchors ? "Điểm neo: hiện" : "Điểm neo"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#8f98a3]">Tải</span>
            {LOADS.map((l, i) => (
              <button
                key={l.label}
                type="button"
                onClick={() => setLoadIndex(i)}
                className={`rounded-md px-2 py-1.5 text-[12px] transition ${
                  i === loadIndex ? "bg-[#c0453a] text-white" : "bg-white/10 text-[#c8d0da] hover:bg-white/20"
                }`}
              >
                {l.label} · {l.kg} kg
              </button>
            ))}
          </div>
        </div>

        {/* đồng hồ đo */}
        <div className="absolute right-4 top-4 w-[210px] rounded-xl border border-white/10 bg-black/60 p-3 backdrop-blur">
          <div className="text-[11px] uppercase tracking-wider text-[#8f98a3]">Chiều cao đĩa nâng</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-[26px] font-semibold tabular-nums leading-none">{heightMm}</span>
            <span className="text-[12px] text-[#8f98a3]">mm</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4ea87a] to-[#8fd3a8] transition-[width] duration-100"
              style={{ width: `${(hud.rod / ROD_MAX) * 100}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-[#8f98a3]">
            {hud.relief ? (
              <span className="text-[#ff8a7a]">Quá tải: van an toàn mở, bơm không nâng được</span>
            ) : hud.contact ? (
              <span className="text-[#8fd3a8]">Đĩa đã đỡ gầm xe ({SILL_Y * 1000} mm)</span>
            ) : (
              <>Chưa chạm gầm xe ({SILL_Y * 1000} mm)</>
            )}
          </div>

          <dl className="mt-3 space-y-1.5 text-[12px]">
            <div className="flex justify-between border-t border-white/10 pt-1.5">
              <dt className="text-[#8f98a3]">Cán xi lanh duỗi</dt>
              <dd className="tabular-nums">{(hud.rod * 1000).toFixed(1)} mm</dd>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-1.5">
              <dt className="text-[#8f98a3]">Cần nâng (bộ giải suy ra)</dt>
              <dd className="tabular-nums">{hud.angle.toFixed(1)}°</dd>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-1.5">
              <dt className="text-[#8f98a3]">Áp suất dầu</dt>
              <dd className="tabular-nums">{(hud.pressure / 1e5).toFixed(0)} bar</dd>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-1.5">
              <dt className="text-[#8f98a3]">Lực tay bơm</dt>
              <dd className="tabular-nums">{hud.handleN.toFixed(0)} N</dd>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-1.5">
              <dt className="text-[#8f98a3]">Tải tối đa ở độ cao này</dt>
              <dd className="tabular-nums">{Math.max(0, hud.maxKg / 1000).toFixed(1)} t</dd>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-1.5">
              <dt className="text-[#8f98a3]">Van xả</dt>
              <dd className="tabular-nums">{hud.valve < 3 ? "đóng" : `mở ${hud.valve.toFixed(0)}°`}</dd>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-1.5">
              <dt className="text-[#8f98a3]">Số nhịp bơm</dt>
              <dd className="tabular-nums">{hud.pumps}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[10px] leading-snug text-[#6b7684]">
            Giả thiết: van an toàn 45 MPa, ma sát bỏ qua, tải = {LOADS[loadIndex].kg} kg đè lên đĩa khi chạm gầm.
          </p>
        </div>

        {showAnchors && (
          <div className="absolute left-4 top-4 flex max-h-[56%] w-[330px] flex-col overflow-hidden rounded-xl border border-white/10 bg-black/70 backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[11px] uppercase tracking-wider text-[#8f98a3]">
              <span>Điểm neo · toạ độ thế giới (mm)</span>
              <span className="text-[#6b7684]">{anchorHud.length}</span>
            </div>
            <div className="border-b border-white/10 px-3 py-1.5 text-[11px] text-[#8f98a3]">
              vòng <span className="text-[#c8d0da]">vongNang</span>: dauCan ↔ taiXiLanh{" "}
              <span className="font-mono tabular-nums text-[#e9ecf1]">{Number.isFinite(loopGap) ? loopGap.toFixed(1) : "—"} mm</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
              <table className="w-full text-[11px] leading-relaxed">
                <tbody>
                  {anchorHud.map((a) => (
                    <tr key={a.ref} className="border-b border-white/5 last:border-0">
                      <td className="py-0.5 pr-2 text-[#c8d0da]">{a.ref}</td>
                      <td className="whitespace-nowrap py-0.5 text-right font-mono tabular-nums text-[#8f98a3]">
                        {Math.round(a.x * 1000)} {Math.round(a.y * 1000)} {Math.round(a.z * 1000)}
                      </td>
                    </tr>
                  ))}
                  {anchorHud.length === 0 && <tr><td className="py-2 text-[#6b7684]">Đang đọc…</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 border-t border-white/10 px-3 py-1.5 text-[10px] text-[#8f98a3]">
              <span><span className="text-[#37c8ff]">●</span> trục quay</span>
              <span><span className="text-[#ffc14d]">●</span> điểm</span>
              <span><span className="text-[#6fe08a]">●</span> mặt</span>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 rounded-lg bg-black/50 px-3 py-1.5 text-[12px] text-[#a4adb9] backdrop-blur">
          Kéo để xoay · lăn để phóng · Space bơm · X xả
        </div>
      </section>
    </main>
  );
}
