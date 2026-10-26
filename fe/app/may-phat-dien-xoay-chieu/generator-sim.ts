/**
 * Máy phát điện xoay chiều — phần vật lý, chạy trên Renderoni (Rapier).
 *
 * Rô-to là một vật rắn Rapier chỉ được quay quanh trục x. Mỗi tick (trước
 * bước vật lý) ta đặt lại mô-men:
 *   τ = τ_tay − τ_điện từ − τ_ma sát
 * Khung N vòng, diện tích A, quay trong từ trường đều B (dọc z):
 *   Φ = N·B·A·cos θ  →  e = −dΦ/dt = N·B·A·ω·sin θ
 *   i = e / (R_khung + R_đèn)   (khi công tắc đóng; hở mạch thì i = 0)
 *   τ_điện từ = N·B·A·i·sin θ   (định luật Lenz: luôn cản chiều quay)
 * Đèn 12 V – 6 W (R ≈ 24 Ω); dây tóc có quán tính nhiệt ~60 ms nên độ sáng là
 * công suất đã làm trơn.
 *
 * Chạy được cả trong trình duyệt (visual: true) lẫn headless trong Node
 * (scripts/generator-mcp.mjs) — khi headless thì không dựng hình.
 */

import RAPIER from "@dimforge/rapier3d-compat";
import type { RenderoniEngine } from "renderoni";
import { COIL_HALF_W, COIL_HALF_X, SHAFT_Y, createGeneratorRotor, createGeneratorStator, createMaterials, type StatorHandles } from "./generator-model";

export const PHYS = {
  turns: 200,
  field: 0.3, // T, khe giữa hai má cực
  area: 2 * COIL_HALF_X * 2 * COIL_HALF_W, // m², theo tâm bó dây
  coilOhm: 4,
  lampOhm: 24,
  lampRatedW: 6,
  inertia: 1.2e-3, // kg·m², khung dây + trục + tay quay
  viscous: 4e-3, // N·m·s, ổ bi + chổi than
  drag: 1e-5, // N·m·s², cản gió
  filamentTau: 0.06, // s
};

export interface GeneratorState extends Record<string, unknown> {
  angle: number; // rad, 0 khi mặt khung vuông góc với B
  omega: number; // rad/s
  rpm: number;
  flux: number; // Wb (từ thông qua cả N vòng)
  emf: number; // V
  current: number; // A
  lampPower: number; // W, đã làm trơn
  brightness: number; // 0…1
  driveTorque: number; // N·m
  switchClosed: boolean;
}

export interface Generator {
  rotorId: string;
  state: GeneratorState;
  stator?: StatorHandles;
}

export function buildGenerator(game: RenderoniEngine, opts: { visual: boolean }): Generator {
  const mats = opts.visual ? createMaterials() : null;
  const stator = mats ? createGeneratorStator(mats) : undefined;

  if (stator) game.add((ctx) => ctx.entity({ id: "stator", tags: ["generator"], native: { three: { object: stator.root, ownership: "owned" } } }));

  const state: GeneratorState = {
    angle: 0,
    omega: 0,
    rpm: 0,
    flux: 0,
    emf: 0,
    current: 0,
    lampPower: 0,
    brightness: 0,
    driveTorque: 0.2,
    switchClosed: true,
  };

  let body: RAPIER.RigidBody | null = null;
  game.add((ctx) => {
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, SHAFT_Y, 0)
      .setGravityScale(0)
      .lockTranslations()
      .enabledRotations(true, false, false)
      .setAngularDamping(0)
      .setCanSleep(false)
      .setAdditionalMassProperties(1.1, { x: 0, y: 0, z: 0 }, { x: PHYS.inertia, y: PHYS.inertia, z: PHYS.inertia }, { x: 0, y: 0, z: 0, w: 1 });
    body = ctx.native.world.createRigidBody(desc);
    const rotor = mats ? createGeneratorRotor(mats) : undefined;
    if (rotor) rotor.position.set(0, SHAFT_Y, 0);
    return ctx.entity({
      id: "rotor",
      tags: ["generator", "rotor"],
      state,
      native: {
        three: rotor ? { object: rotor, ownership: "owned" } : undefined,
        rapier: { body, ownership: "owned" },
      },
    });
  });

  const NBA = PHYS.turns * PHYS.field * PHYS.area;
  let prevPhi = 0;

  game.systems.add({
    phase: "prePhysics",
    update: ({ dt }) => {
      if (!body) return;
      const q = body.rotation();
      // quaternion quanh x: (sin θ/2, 0, 0, cos θ/2); quy θ về (−π, π]
      const raw = 2 * Math.atan2(q.x, q.w);
      const theta = Math.atan2(Math.sin(raw), Math.cos(raw));
      const omega = body.angvel().x;
      const emf = NBA * omega * Math.sin(theta);
      const current = state.switchClosed ? emf / (PHYS.coilOhm + PHYS.lampOhm) : 0;
      const tEm = NBA * current * Math.sin(theta);
      const tFric = PHYS.viscous * omega + PHYS.drag * omega * Math.abs(omega);
      body.resetTorques(true);
      body.addTorque({ x: state.driveTorque - tEm - tFric, y: 0, z: 0 }, true);

      const p = current * current * PHYS.lampOhm;
      state.lampPower += (p - state.lampPower) * Math.min(1, dt / PHYS.filamentTau);
      state.brightness = Math.min(1, state.lampPower / PHYS.lampRatedW);
      state.angle = theta;
      state.omega = omega;
      state.rpm = (omega * 60) / (2 * Math.PI);
      state.flux = NBA * Math.cos(theta);
      state.emf = emf;
      state.current = current;

      // một sự kiện mỗi khi khung dây đi qua vị trí từ thông cực đại (θ = 0)
      if (prevPhi < 0 && theta >= 0 && omega > 0) game.events.emit("generator.turn", { rpm: Math.round(state.rpm) });
      prevPhi = theta;
    },
  });

  game.actions.register<{ torque: number }>({
    name: "generator.drive",
    schema: { type: "object", properties: { torque: { type: "number", minimum: 0, maximum: 0.5 } }, required: ["torque"] },
    handle: ({ torque }) => {
      state.driveTorque = Math.max(0, Math.min(0.5, torque));
    },
  });
  game.actions.register<{ closed: boolean }>({
    name: "generator.switch",
    schema: { type: "object", properties: { closed: { type: "boolean" } }, required: ["closed"] },
    handle: ({ closed }) => {
      state.switchClosed = closed;
    },
  });

  return { rotorId: "rotor", state, stator };
}
