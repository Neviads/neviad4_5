/**
 * Mô hình vật lý tuần tự hoá được (JSON): MCP dựng từ bản lắp ráp (build-model.ts, cần lưới và lõi manifold),
 * trang chỉ nạp file này rồi chạy solver.ts. Đơn vị SI; khung của vật: gốc ở trọng tâm, trục trùng thế giới lúc t = 0.
 */

import type { M4, V3 } from "../core/math";
import type { M3, Q } from "./math";

export interface BodyModel {
  id: string;
  /** Bộ phận thuộc vật (đường dẫn "xeA" hoặc "xeA/banhTruocT") và ma trận của nó trong khung vật. */
  parts: { path: string; offset: M4 }[];
  mass: number;
  /** Tensor quán tính quanh trọng tâm, khung vật. */
  inertia: M3;
  x0: V3;
  q0: Q;
  fixed: boolean;
  /** Bao lồi va chạm trong khung vật: đỉnh và tam giác (pháp tuyến hướng ra ngoài). */
  hull: { verts: V3[]; tris: [number, number, number][] };
  friction: number;
  restitution: number;
}

export interface JointModel {
  id: string;
  kind: "revolute" | "prismatic" | "fixed";
  /** Vật a (bị dẫn) và vật b (cha); b = null là thế giới. */
  a: string;
  b: string | null;
  /** Điểm khớp và trục trong khung từng vật. */
  pivotA: V3;
  pivotB: V3;
  axisA: V3;
  axisB: V3;
  limits?: [number, number];
  motor?: { kind: "speed" | "torque"; value: number; maxForce?: number };
}

export interface GearModel {
  id: string;
  /** Hai khớp quay: ω_a · ratio + ω_b = 0 (quanh trục của từng khớp, tương đối với vật cha). */
  a: string;
  b: string;
  ratio: number;
}

export interface PhysicsModel {
  version: 1;
  gravity: V3;
  groundPlane: boolean;
  substeps: number;
  bodies: BodyModel[];
  joints: JointModel[];
  gears: GearModel[];
  initial: Record<string, { v?: V3; w?: V3 }>;
  notes: string[];
}

/** Cấu hình vật lý lưu trong tài liệu lắp ráp (doc.physics), agent đặt bằng physics_setup / body_set / initial_set / drive_add. */
export interface PhysicsConfig {
  gravity?: V3;
  groundPlane?: boolean;
  substeps?: number;
  /** Khớp bị bỏ: vật của nó thành tự do (vd xe chạy trên đường thay vì trượt dọc ground.x). */
  free?: string[];
  bodies?: Record<string, { mass?: number; fixed?: boolean; friction?: number; restitution?: number }>;
  initial?: Record<string, { velocity?: V3; angularVelocity?: V3 }>;
  drives?: Record<string, { kind: "speed" | "torque"; value: number; maxForce?: number }>;
  gears?: { a: string; b: string; ratio: number }[];
}
