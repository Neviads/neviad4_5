"use client";

/**
 * /may-phat-dien-babylon — máy phát điện xoay chiều quay tay dựng bằng Babylon.js.
 *
 * Toàn bộ hình học là đồ thị Node Geometry do AI dựng qua các tool của server
 * MCP `nge` (@babylonjs/mcp-servers), xem scripts/nge-generator/. Trang này chỉ
 * nạp 4 file JSON trong ./graphs, gắn vật liệu PBR theo material ID, và cho
 * rô-to quay theo cùng mô hình điện từ như /may-phat-dien-xoay-chieu.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import styles from "../may-phat-dien-xoay-chieu/generator.module.css";

const fmt = (v: number, d = 0) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);

// Cùng thông số với generator-sim.ts của bản three.js (khung 200 vòng, 110 × 84 mm, B = 0,3 T)
const PHYS = {
  NBA: 200 * 0.3 * (0.11 * 0.084),
  coilOhm: 4,
  lampOhm: 24,
  lampRatedW: 6,
  inertia: 1.2e-3,
  viscous: 4e-3,
  drag: 1e-5,
  filamentTau: 0.06,
};
const SHAFT_Y = 0.135;
const NEEDLE_PIVOT = [0.285, 0.0196, -0.0318] as const;
const LEVER_BASE = [0.27, 0.012, 0.05] as const;
const LAMP = [0.205, 0.056, -0.07] as const;

interface Readout {
  rpm: number;
  emfPeak: number;
  lampPower: number;
}

export default function BabylonGeneratorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scopeRef = useRef<HTMLCanvasElement>(null);
  const ctrl = useRef({ drive: 0.2, closed: true });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torque, setTorque] = useState(0.2);
  const [cranking, setCranking] = useState(true);
  const [closed, setClosed] = useState(true);
  const [read, setRead] = useState<Readout>({ rpm: 0, emfPeak: 0, lampPower: 0 });

  useEffect(() => {
    ctrl.current.drive = cranking ? torque : 0;
    ctrl.current.closed = closed;
  }, [torque, cranking, closed]);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const B = await import("@babylonjs/core");
      // Babylon 9 tách bản "pure": phải chạy phần đăng ký lớp Vector3/Matrix để NodeGeometry.Parse dựng lại hằng số
      await import("@babylonjs/core/Maths/math.vector.js");
      const [stator, rotor, needle, lever, materialNames] = await Promise.all([
        import("./graphs/stator.json").then((m) => m.default),
        import("./graphs/rotor.json").then((m) => m.default),
        import("./graphs/needle.json").then((m) => m.default),
        import("./graphs/lever.json").then((m) => m.default),
        import("./graphs/materials.json").then((m) => m.default as string[]),
      ]);
      if (disposed) return;

      const canvas = canvasRef.current!;
      const engine = new B.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
      const scene = new B.Scene(engine);
      scene.useRightHandedSystem = true; // số liệu dựng theo hệ tay phải, y lên
      scene.clearColor = new B.Color4(0.114, 0.129, 0.161, 1);
      scene.imageProcessingConfiguration.toneMappingEnabled = true;
      scene.imageProcessingConfiguration.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES;
      scene.imageProcessingConfiguration.exposure = 1.1;

      const camera = new B.ArcRotateCamera("cam", 1.2, 1.12, 0.86, new B.Vector3(0.05, 0.07, 0), scene);
      camera.fov = 0.56;
      camera.minZ = 0.01;
      camera.lowerRadiusLimit = 0.18;
      camera.upperRadiusLimit = 1.6;
      camera.upperBetaLimit = Math.PI * 0.49;
      camera.wheelDeltaPercentage = 0.01;
      camera.panningSensibility = 4000;
      camera.attachControl(canvas, true);

      // Môi trường phản chiếu cho kim loại: ảnh toàn cảnh vẽ trên canvas (vòm trời gradient,
      // hai tấm đèn studio, sàn tối) nạp làm cube map — không tải file HDR nào từ mạng
      const envCanvas = document.createElement("canvas");
      envCanvas.width = 1024;
      envCanvas.height = 512;
      {
        const g = envCanvas.getContext("2d")!;
        const grad = g.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0, "#d5dde8");
        grad.addColorStop(0.47, "#6b7380");
        grad.addColorStop(0.53, "#2a2d33");
        grad.addColorStop(1, "#141619");
        g.fillStyle = grad;
        g.fillRect(0, 0, 1024, 512);
        g.fillStyle = "#ffffff";
        g.fillRect(140, 70, 190, 110);
        g.fillRect(640, 150, 120, 80);
        g.fillStyle = "#fff4e0";
        g.fillRect(430, 30, 160, 50);
      }
      const env = new B.EquiRectangularCubeTexture(envCanvas.toDataURL(), scene, 256);
      scene.environmentTexture = env;
      scene.environmentIntensity = 0.9;

      const hemi = new B.HemisphericLight("hemi", new B.Vector3(0, 1, 0), scene);
      hemi.intensity = 0.35;
      hemi.groundColor = new B.Color3(0.23, 0.16, 0.11);
      const sun = new B.DirectionalLight("sun", new B.Vector3(-0.5, -0.9, -0.6), scene);
      sun.position = new B.Vector3(0.5, 0.9, 0.6);
      sun.intensity = 2.4;
      const shadows = new B.ShadowGenerator(2048, sun);
      shadows.usePercentageCloserFiltering = true;
      shadows.bias = 0.0004;
      shadows.normalBias = 0.002;

      const table = B.MeshBuilder.CreateDisc("table", { radius: 2.5, tessellation: 64 }, scene);
      table.rotation.x = Math.PI / 2;
      table.position.y = -0.0285;
      const tableMat = new B.PBRMaterial("tableMat", scene);
      tableMat.albedoColor = B.Color3.FromHexString("#2c3139");
      tableMat.metallic = 0;
      tableMat.roughness = 0.85;
      table.material = tableMat;
      table.receiveShadows = true;

      // ───── vật liệu theo material ID (thứ tự trong materials.json) ─────
      const tex = (name: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
        const t = new B.DynamicTexture(name, { width: w, height: h }, scene, true);
        draw(t.getContext() as unknown as CanvasRenderingContext2D);
        t.update();
        t.wrapU = t.wrapV = B.Texture.WRAP_ADDRESSMODE;
        t.anisotropicFilteringLevel = 8;
        return t;
      };
      const pbr = (name: string, hex: string, metallic: number, roughness: number, extra?: (m: InstanceType<typeof B.PBRMaterial>) => void) => {
        const m = new B.PBRMaterial(name, scene);
        m.albedoColor = B.Color3.FromHexString(hex).toLinearSpace();
        m.metallic = metallic;
        m.roughness = roughness;
        extra?.(m);
        return m;
      };
      const woodTex = tex("wood", 1024, 256, (g) => {
        g.fillStyle = "#9a6338";
        g.fillRect(0, 0, 1024, 256);
        for (let i = 0; i < 160; i++) {
          const y = Math.random() * 256, a = 0.05 + Math.random() * 0.12;
          g.strokeStyle = Math.random() < 0.5 ? `rgba(60,30,12,${a})` : `rgba(210,150,95,${a * 0.7})`;
          g.lineWidth = 0.6 + Math.random() * 2;
          g.beginPath();
          g.moveTo(0, y);
          for (let x = 0; x <= 1024; x += 32) g.lineTo(x, y + Math.sin(x / 140 + i) * 2.5);
          g.stroke();
        }
      });
      // sợi dây men chạy dọc bó dây: sọc theo chu vi (u), lặp nhiều lần
      const windingTex = tex("winding", 64, 8, (g) => {
        g.fillStyle = "#c97a45";
        g.fillRect(0, 0, 64, 8);
        for (let x = 0; x < 64; x += 4) {
          const grad = g.createLinearGradient(x, 0, x + 4, 0);
          grad.addColorStop(0, "rgba(70,25,8,.85)");
          grad.addColorStop(0.4, "rgba(255,190,130,.45)");
          grad.addColorStop(1, "rgba(70,25,8,.6)");
          g.fillStyle = grad;
          g.fillRect(x, 0, 4, 8);
        }
      });
      windingTex.uScale = 6;
      const dialTex = tex("dial", 512, 384, (g) => {
        g.fillStyle = "#f4efe2";
        g.fillRect(0, 0, 512, 384);
        const cx = 256, cy = 330, r = 220;
        g.strokeStyle = g.fillStyle = "#222";
        g.lineWidth = 3;
        g.beginPath();
        g.arc(cx, cy, r, Math.PI * 1.25, Math.PI * 1.75);
        g.stroke();
        g.font = "26px Arial, sans-serif";
        g.textAlign = "center";
        for (let i = -10; i <= 10; i++) {
          const a = -Math.PI / 2 + (i / 10) * (Math.PI / 4), long = i % 5 === 0, r1 = r - (long ? 26 : 13);
          g.lineWidth = long ? 3 : 1.6;
          g.beginPath();
          g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          g.stroke();
          if (long) g.fillText(String(Math.abs(i) * 2), cx + Math.cos(a) * (r1 - 22), cy + Math.sin(a) * (r1 - 22) + 8);
        }
        g.font = "bold 40px Arial, sans-serif";
        g.fillText("V", cx, 250);
      });
      const letter = (ch: string) => {
        const t = tex(`letter${ch}`, 128, 128, (g) => {
          g.clearRect(0, 0, 128, 128);
          g.fillStyle = "white";
          g.font = "bold 92px Arial, sans-serif";
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillText(ch, 64, 70);
        });
        t.wAng = -Math.PI / 2;
        t.vScale = -1;
        return t;
      };

      // PlaneBlock của NGE đặt UV hoán vị (u↔v) so với hình vẽ: xoay 90° rồi lật dọc để bù
      for (const t of [dialTex]) {
        t.wAng = -Math.PI / 2;
        t.vScale = -1;
      }
      const filament = pbr("filament", "#3a3a3a", 0.2, 0.5);
      const byName: Record<string, InstanceType<typeof B.Material>> = {
        wood: pbr("wood", "#ffffff", 0, 0.45, (m) => {
          m.albedoTexture = woodTex;
          m.clearCoat.isEnabled = true;
          m.clearCoat.intensity = 0.6;
          m.clearCoat.roughness = 0.25;
        }),
        felt: pbr("felt", "#2b2b2b", 0, 1),
        redPaint: pbr("redPaint", "#c0262b", 0, 0.35, (m) => (m.clearCoat.isEnabled = true)),
        bluePaint: pbr("bluePaint", "#1f4fa6", 0, 0.35, (m) => (m.clearCoat.isEnabled = true)),
        iron: pbr("iron", "#8b9199", 0.9, 0.38),
        aluminium: pbr("aluminium", "#c9ccd1", 1, 0.32),
        steel: pbr("steel", "#dcdfe3", 1, 0.18),
        bakelite: pbr("bakelite", "#2a1c15", 0, 0.4, (m) => (m.clearCoat.isEnabled = true)),
        brass: pbr("brass", "#d2ac55", 1, 0.28),
        carbon: pbr("carbon", "#1d1d1f", 0, 0.85),
        copper: pbr("copper", "#e0956a", 1, 0.22),
        winding: pbr("winding", "#ffffff", 0.75, 0.38, (m) => (m.albedoTexture = windingTex)),
        wireRed: pbr("wireRed", "#b3201f", 0, 0.5),
        wireBlack: pbr("wireBlack", "#1e1e1e", 0, 0.5),
        tape: pbr("tape", "#e8dcc0", 0, 0.9),
        enamel: pbr("enamel", "#a8431c", 0.6, 0.3),
        glass: pbr("glass", "#ffffff", 0, 0.04, (m) => {
          m.alpha = 0.18;
          m.backFaceCulling = false;
        }),
        dial: pbr("dial", "#ffffff", 0, 0.6, (m) => {
          m.albedoTexture = dialTex;
          m.emissiveTexture = dialTex;
          m.emissiveColor = new B.Color3(0.08, 0.08, 0.08);
        }),
        coverGlass: pbr("coverGlass", "#ffffff", 0, 0.02, (m) => (m.alpha = 0.08)),
        filament,
        letterN: pbr("letterN", "#ffffff", 0, 0.5, (m) => {
          m.albedoTexture = letter("N");
          m.albedoTexture.hasAlpha = true;
          m.useAlphaFromAlbedoTexture = true;
        }),
        letterS: pbr("letterS", "#ffffff", 0, 0.5, (m) => {
          m.albedoTexture = letter("S");
          m.albedoTexture.hasAlpha = true;
          m.useAlphaFromAlbedoTexture = true;
        }),
      };
      const multi = new B.MultiMaterial("generator", scene);
      multi.subMaterials = materialNames.map((n) => byName[n]);

      const build = (name: string, json: unknown) => {
        const ng = B.NodeGeometry.Parse(json);
        ng.build();
        const mesh = ng.createMesh(name, scene)!;
        mesh.material = multi;
        mesh.receiveShadows = true;
        shadows.addShadowCaster(mesh);
        return mesh;
      };
      build("stator", stator);
      const rotorMesh = build("rotor", rotor);
      rotorMesh.position.set(0, SHAFT_Y, 0);
      const needleMesh = build("needle", needle);
      needleMesh.position.set(...NEEDLE_PIVOT);
      const leverMesh = build("lever", lever);
      leverMesh.position.set(...LEVER_BASE);

      const glow = new B.GlowLayer("glow", scene, { blurKernelSize: 32 });
      glow.intensity = 0.9;
      const lampLight = new B.PointLight("lamp", new B.Vector3(...LAMP), scene);
      lampLight.diffuse = B.Color3.FromHexString("#ffb357");
      lampLight.range = 0.35;
      lampLight.intensity = 0;

      // ───── vật lý: tích phân bước cố định 1/240 s ─────
      const DT = 1 / 240;
      const hist = new Float32Array(480);
      let theta = 0, omega = 0, lampPower = 0, acc = 0, head = 0, peak = 0;
      let needlePos = 0, needleVel = 0, uiT = 0, emf = 0;
      const step = () => {
        emf = PHYS.NBA * omega * Math.sin(theta);
        const i = ctrl.current.closed ? emf / (PHYS.coilOhm + PHYS.lampOhm) : 0;
        const torqueNet = ctrl.current.drive - PHYS.NBA * i * Math.sin(theta) - PHYS.viscous * omega - PHYS.drag * omega * Math.abs(omega);
        omega += (torqueNet / PHYS.inertia) * DT;
        theta = (theta + omega * DT) % (2 * Math.PI);
        lampPower += (i * i * PHYS.lampOhm - lampPower) * Math.min(1, DT / PHYS.filamentTau);
        hist[head] = emf;
        head = (head + 1) % hist.length;
        peak = Math.max(peak * 0.9993, Math.abs(emf));
      };

      const scope = scopeRef.current!;
      const sctx = scope.getContext("2d")!;
      const drawScope = () => {
        const w = scope.width, h = scope.height;
        sctx.clearRect(0, 0, w, h);
        sctx.strokeStyle = "rgba(255,255,255,.12)";
        sctx.lineWidth = 1;
        for (let k = 1; k < 4; k++) {
          sctx.beginPath();
          sctx.moveTo(0, (h * k) / 4);
          sctx.lineTo(w, (h * k) / 4);
          sctx.stroke();
        }
        sctx.strokeStyle = "#7ee0a1";
        sctx.lineWidth = 2;
        sctx.beginPath();
        for (let k = 0; k < hist.length; k++) {
          const v = hist[(head + k) % hist.length];
          const x = (k / (hist.length - 1)) * w, y = h / 2 - (v / 30) * (h / 2);
          if (k) sctx.lineTo(x, y);
          else sctx.moveTo(x, y);
        }
        sctx.stroke();
      };

      // trên màn rộng, lệch tâm khung hình sang trái để bảng điều khiển không che máy
      const fitView = () => {
        const w = engine.getRenderWidth();
        camera.targetScreenOffset.x = w > 720 * engine.getHardwareScalingLevel() ? -0.09 : 0;
      };
      fitView();

      scene.onBeforeRenderObservable.add(() => {
        const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
        acc += dt;
        while (acc >= DT) {
          step();
          acc -= DT;
        }
        rotorMesh.rotation.x = theta;
        // kim: dao động tắt dần bậc hai, toàn thang ±20 V = ±45°
        const target = Math.max(-1.08, Math.min(1.08, emf / 20));
        needleVel += (900 * (target - needlePos) - 38 * needleVel) * dt;
        needlePos += needleVel * dt;
        needleMesh.rotation.z = -needlePos * (Math.PI / 4);
        leverMesh.rotation.z = ctrl.current.closed ? -0.45 : 0.45;
        const b = Math.min(1, lampPower / PHYS.lampRatedW), gl = Math.sqrt(b);
        filament.emissiveColor = new B.Color3(1, 0.25 + 0.6 * b, 0.04 + 0.45 * b * b).scale(b > 0.005 ? 0.6 + gl * 3 : 0);
        lampLight.intensity = b * 0.08;
        drawScope();
        uiT += dt;
        if (uiT > 0.12) {
          uiT = 0;
          setRead({ rpm: (omega * 60) / (2 * Math.PI), emfPeak: peak, lampPower });
        }
      });

      engine.runRenderLoop(() => scene.render());
      const onResize = () => {
        engine.resize();
        fitView();
      };
      window.addEventListener("resize", onResize);
      setReady(true);
      cleanup = () => {
        window.removeEventListener("resize", onResize);
        engine.dispose();
      };
    })().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  const pct = (torque / 0.4) * 100;

  return (
    <main className={styles.page}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Mô hình 3D máy phát điện xoay chiều (Babylon.js)" />

      <header className={styles.header}>
        <Link href="/" className={styles.back}>← Trang chủ</Link>
        <h1>Máy phát điện xoay chiều · Babylon.js</h1>
        <p>Hình dựng hoàn toàn bằng đồ thị Node Geometry qua MCP của Babylon. Kéo để xoay, cuộn để phóng to.</p>
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

      {!ready && !error && <div className={styles.loading}>Đang dựng Node Geometry…</div>}
      {error && <div className={styles.loading}>Lỗi: {error}</div>}
    </main>
  );
}
