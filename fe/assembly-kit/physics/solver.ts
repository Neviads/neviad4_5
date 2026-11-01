/**
 * Bộ giải vật rắn XPBD (Müller và cộng sự, "Detailed Rigid Body Simulation with Extended Position Based Dynamics",
 * 2020): mỗi bước chia substep; tích phân vị trí, chiếu ràng buộc vị trí (khớp, tiếp xúc, ma sát tĩnh), suy ra vận
 * tốc, rồi bước vận tốc (ma sát động, phục hồi, động cơ, khớp ghép). Khớp ghép (couple, gồm bánh răng) ràng buộc giá trị
 * hai khớp ở cả mức vị trí và vận tốc, hai chiều; khớp "point" ghim hai vật tại một điểm (vòng kín). Va chạm bao lồi–bao lồi theo kiểu "đỉnh trong
 * bao lồi kia" (nhiều điểm tiếp xúc, ổn định khi nằm yên) và với mặt phẳng y = 0. Không phụ thuộc three.
 */

import type { M4, V3 } from "../core/math";
import { type M3, type Q, invInertiaWorld, m3, poseMatrix, q, v } from "./math";
import type { BodyModel, CoupleModel, JointModel, PhysicsModel } from "./model";

interface Plane {
  n: V3;
  d: number;
}

export interface Body {
  id: string;
  model: BodyModel;
  x: V3;
  q: Q;
  v: V3;
  w: V3;
  px: V3;
  pq: Q;
  mass: number;
  invMass: number;
  inertia: M3;
  invI: M3;
  fixed: boolean;
  verts: V3[];
  /** điểm dò va chạm: đỉnh bao lồi cộng tâm các tam giác (hai mặt áp nhau mà đỉnh nằm đúng trên cạnh vẫn bắt được) */
  probes: V3[];
  planes: Plane[];
  radius: number;
  friction: number;
  restitution: number;
}

interface Contact {
  a: Body;
  b: Body | null;
  /** đỉnh của a trong khung a */
  local: V3;
  /** chiều đẩy a ra (thế giới) */
  n: V3;
  ra: V3;
  rb: V3;
  lambdaN: number;
  vnPre: number;
  /** điểm tiếp xúc trong khung b (để tính trượt cho ma sát tĩnh) */
  localB: V3 | null;
}

export interface ContactEvent {
  a: string;
  b: string | null;
  impulse: number;
  point: V3;
}

interface JointState {
  m: JointModel;
  a: Body;
  b: Body | null;
  /** hướng tương đối ban đầu qB⁻¹·qA (khớp trượt, khớp cố định giữ nguyên) */
  qrel: Q;
  /** giá trị khớp quay cộng dồn (rad) và góc thô ở cuối substep trước, để đếm được nhiều vòng */
  acc: number;
  raw: number;
}

interface CoupleState {
  lead: JointState;
  follow: JointState;
  ratio?: number;
  table?: [number, number][];
}

const wrapPi = (x: number) => x - 2 * Math.PI * Math.round(x / (2 * Math.PI));

/** Nội suy bảng [[x, y], ...] và độ dốc đoạn đang ở (ngoài bảng: giữ mút, dốc 0). */
function tableAt(t: [number, number][], x: number): { y: number; k: number } {
  if (x <= t[0][0]) return { y: t[0][1], k: 0 };
  for (let i = 1; i < t.length; i++) {
    const [x1, y1] = t[i];
    if (x <= x1) {
      const [x0, y0] = t[i - 1];
      const k = (y1 - y0) / (x1 - x0);
      return { y: y0 + k * (x - x0), k };
    }
  }
  return { y: t[t.length - 1][1], k: 0 };
}

const ZERO: V3 = [0, 0, 0];

/** Vật đứng yên (fixed) có khối lượng nghịch đảo 0. */
const invW = (b: Body | null, r: V3, n: V3) => {
  if (!b || b.fixed) return 0;
  const rn = v.cross(r, n);
  return b.invMass + v.dot(rn, invInertiaWorld(b.invI, b.q, rn));
};

function rotateBy(b: Body, dw: V3) {
  b.q = q.integrate(b.q, dw, 1);
}

/** Dời điểm (a.x + ra) theo `corr` so với điểm (b.x + rb); trả Δλ. */
function applyPositional(a: Body, b: Body | null, ra: V3, rb: V3, corr: V3, compliance: number, h: number): number {
  const c = v.len(corr);
  if (c < 1e-12) return 0;
  const n = v.scale(corr, 1 / c);
  const wa = invW(a, ra, n), wb = invW(b, rb, n);
  const alpha = compliance / (h * h);
  if (wa + wb + alpha <= 0) return 0;
  const dl = c / (wa + wb + alpha);
  const p = v.scale(n, dl);
  if (!a.fixed) {
    a.x = v.addScaled(a.x, p, a.invMass);
    rotateBy(a, invInertiaWorld(a.invI, a.q, v.cross(ra, p)));
  }
  if (b && !b.fixed) {
    b.x = v.addScaled(b.x, p, -b.invMass);
    rotateBy(b, v.scale(invInertiaWorld(b.invI, b.q, v.cross(rb, p)), -1));
  }
  return dl;
}

/** Quay a theo `rot` (véc-tơ quay) so với b. */
function applyAngular(a: Body, b: Body | null, rot: V3) {
  const th = v.len(rot);
  if (th < 1e-12) return;
  const n = v.scale(rot, 1 / th);
  const wa = a.fixed ? 0 : v.dot(n, invInertiaWorld(a.invI, a.q, n));
  const wb = !b || b.fixed ? 0 : v.dot(n, invInertiaWorld(b.invI, b.q, n));
  if (wa + wb <= 0) return;
  const p = v.scale(n, th / (wa + wb));
  if (!a.fixed) rotateBy(a, invInertiaWorld(a.invI, a.q, p));
  if (b && !b.fixed) rotateBy(b, v.scale(invInertiaWorld(b.invI, b.q, p), -1));
}

/** Xung lượng vận tốc tại điểm: a nhận +p, b nhận −p. */
function applyImpulse(a: Body, b: Body | null, ra: V3, rb: V3, p: V3) {
  if (!a.fixed) {
    a.v = v.addScaled(a.v, p, a.invMass);
    a.w = v.add(a.w, invInertiaWorld(a.invI, a.q, v.cross(ra, p)));
  }
  if (b && !b.fixed) {
    b.v = v.addScaled(b.v, p, -b.invMass);
    b.w = v.sub(b.w, invInertiaWorld(b.invI, b.q, v.cross(rb, p)));
  }
}

const pointVel = (b: Body | null, r: V3): V3 => (!b ? ZERO : v.add(b.v, v.cross(b.w, r)));

function hullPlanes(verts: V3[], tris: [number, number, number][]): Plane[] {
  const c = verts.reduce((s, p) => v.add(s, p), [0, 0, 0] as V3).map((x) => x / Math.max(1, verts.length)) as V3;
  const out: Plane[] = [];
  for (const [i, j, k] of tris) {
    let n = v.cross(v.sub(verts[j], verts[i]), v.sub(verts[k], verts[i]));
    if (v.len(n) < 1e-12) continue;
    n = v.norm(n);
    let d = v.dot(n, verts[i]);
    if (v.dot(n, c) - d > 0) {
      n = v.scale(n, -1);
      d = -d;
    }
    // bỏ mặt gần trùng (bao lồi tam giác hoá có nhiều tam giác cùng mặt)
    if (!out.some((o) => v.dot(o.n, n) > 0.99999 && Math.abs(o.d - d) < 1e-7)) out.push({ n, d });
  }
  return out;
}

export class World {
  bodies: Body[] = [];
  byId = new Map<string, Body>();
  joints: JointState[] = [];
  gravity: V3;
  groundPlane: boolean;
  substeps: number;
  t = 0;
  /** sự kiện tiếp xúc của bước vừa chạy */
  events: ContactEvent[] = [];
  private couples: CoupleState[] = [];
  private noCollide = new Set<string>();

  constructor(model: PhysicsModel) {
    this.gravity = model.gravity;
    this.groundPlane = model.groundPlane;
    this.substeps = model.substeps;
    for (const bm of model.bodies) {
      const verts = bm.hull.verts;
      const b: Body = {
        id: bm.id,
        model: bm,
        x: [...bm.x0],
        q: [...bm.q0],
        v: [0, 0, 0],
        w: [0, 0, 0],
        px: [...bm.x0],
        pq: [...bm.q0],
        mass: bm.mass,
        invMass: bm.fixed || bm.mass <= 0 ? 0 : 1 / bm.mass,
        inertia: bm.inertia,
        invI: bm.fixed ? [0, 0, 0, 0, 0, 0, 0, 0, 0] : m3.inverse(bm.inertia),
        fixed: bm.fixed,
        verts,
        probes: [],
        planes: hullPlanes(verts, bm.hull.tris),
        radius: Math.max(0, ...verts.map((p) => v.len(p))),
        friction: bm.friction,
        restitution: bm.restitution,
      };
      // tâm mỗi mặt phẳng của bao lồi (trung bình các đỉnh nằm trên mặt): đối xứng, không sinh mô-men giả
      b.probes = [...verts, ...b.planes.map((pl) => {
        const on = verts.filter((p) => Math.abs(v.dot(pl.n, p) - pl.d) < 1e-6 * (1 + b.radius));
        return v.scale(on.reduce((s2, p) => v.add(s2, p), [0, 0, 0] as V3), 1 / Math.max(1, on.length));
      })];
      this.bodies.push(b);
      this.byId.set(b.id, b);
    }
    for (const jm of model.joints) {
      const a = this.byId.get(jm.a)!, b = jm.b ? this.byId.get(jm.b)! : null;
      this.joints.push({ m: jm, a, b, qrel: q.mul(q.conj(b ? b.q : q.identity()), a.q), acc: 0, raw: 0 });
      // hai vật nối bằng khớp không va chạm nhau (bánh và thân xe chồng khung bao)
      if (b) this.noCollide.add([a.id, b.id].sort().join("|"));
    }
    // bánh răng của mô hình bản 1 (ratio·ωa + ωb = 0) là khớp ghép b = −ratio·a
    const couples: CoupleModel[] = [...(model.couples ?? []), ...(model.gears ?? []).map((g) => ({ id: g.id, lead: g.a, follow: g.b, ratio: -g.ratio }))];
    for (const c of couples) {
      const lead = this.joints.find((j) => j.m.id === c.lead), follow = this.joints.find((j) => j.m.id === c.follow);
      if (lead && follow && lead.m.kind !== "point" && follow.m.kind !== "point") this.couples.push({ lead, follow, ratio: c.ratio, table: c.table });
    }
    for (const [id, init] of Object.entries(model.initial)) this.setVelocity(id, init.v, init.w);
  }

  setVelocity(id: string, lin?: V3, ang?: V3) {
    const b = this.byId.get(id);
    if (!b || b.fixed) return;
    if (lin) b.v = [...lin];
    if (ang) b.w = [...ang];
  }

  /** Đổi khối lượng, giữ nguyên phân bố (tensor quán tính co giãn theo). */
  setMass(id: string, mass: number) {
    const b = this.byId.get(id);
    if (!b || b.fixed || mass <= 0) return;
    const k = mass / b.mass;
    b.mass = mass;
    b.invMass = 1 / mass;
    b.inertia = b.inertia.map((x) => x * k);
    b.invI = m3.inverse(b.inertia);
  }

  matrix(b: Body): M4 {
    return poseMatrix(b.x, b.q);
  }

  momentum(ids?: string[]): V3 {
    return this.bodies.filter((b) => !b.fixed && (!ids || ids.includes(b.id))).reduce((s, b) => v.addScaled(s, b.v, b.mass), [0, 0, 0] as V3);
  }

  kineticEnergy(ids?: string[]): number {
    let e = 0;
    for (const b of this.bodies) {
      if (b.fixed || (ids && !ids.includes(b.id))) continue;
      const wl = q.rotate(q.conj(b.q), b.w);
      e += 0.5 * b.mass * v.dot(b.v, b.v) + 0.5 * v.dot(wl, m3.mulV(b.inertia, wl));
    }
    return e;
  }

  /** Các cặp (đỉnh của a, vật b) có thể chạm trong bước này: lọc bằng mặt cầu bao, nới theo quãng đi được. */
  private candidates(dt: number): { a: Body; b: Body | null; local: V3 }[] {
    const out: { a: Body; b: Body | null; local: V3 }[] = [];
    const moving = this.bodies.filter((b) => !b.fixed);
    for (const a of moving) {
      const margin = v.len(a.v) * dt * 2 + 0.01;
      if (this.groundPlane && a.x[1] - a.radius < margin) {
        for (const p of a.probes) if (a.x[1] + q.rotate(a.q, p)[1] < margin) out.push({ a, b: null, local: p });
      }
      for (const b of this.bodies) {
        if (b === a || this.noCollide.has([a.id, b.id].sort().join("|"))) continue;
        const reach = a.radius + b.radius + margin + v.len(b.v) * dt * 2;
        if (v.len(v.sub(a.x, b.x)) > reach) continue;
        // đỉnh của a nằm gần vật b (trong mặt cầu bao của b nới ra)
        for (const p of a.probes) {
          const wp = v.add(a.x, q.rotate(a.q, p));
          if (v.len(v.sub(wp, b.x)) < b.radius + margin) out.push({ a, b, local: p });
        }
      }
    }
    return out;
  }

  /** Độ xuyên của điểm thế giới vào vật b: mặt bao lồi có khoảng cách lớn nhất (gần nhất từ trong). */
  private penetration(b: Body, wp: V3): { depth: number; n: V3 } | null {
    const lp = q.rotate(q.conj(b.q), v.sub(wp, b.x));
    let best = -Infinity, bn: V3 | null = null;
    for (const pl of b.planes) {
      const d = v.dot(pl.n, lp) - pl.d;
      if (d > 1e-6) return null;
      if (d > best) {
        best = d;
        bn = pl.n;
      }
    }
    return bn ? { depth: -best, n: q.rotate(b.q, bn) } : null;
  }

  step(dt: number) {
    const n = this.substeps, h = dt / n;
    const cands = this.candidates(dt);
    const impulses = new Map<string, ContactEvent>();
    for (let s = 0; s < n; s++) {
      // giá trị đầu substep của khớp có động cơ tốc độ: đích của phần vị trí là giá trị này + tốc độ × h
      const speedStart = new Map<JointState, number>();
      for (const j of this.joints) if (j.m.motor?.kind === "speed" && j.m.kind !== "point" && j.m.kind !== "fixed") speedStart.set(j, this.jointValue(j));
      // tích phân
      for (const b of this.bodies) {
        if (b.fixed) continue;
        b.px = [...b.x];
        b.pq = [...b.q];
        b.v = v.addScaled(b.v, this.gravity, h);
        for (const j of this.joints) {
          if (j.m.motor?.kind === "torque") {
            const ax = q.rotate(j.a.q, j.m.axisA);
            if (j.a === b) b.w = v.add(b.w, v.scale(invInertiaWorld(b.invI, b.q, ax), j.m.motor.value * h));
            if (j.b === b) b.w = v.sub(b.w, v.scale(invInertiaWorld(b.invI, b.q, ax), j.m.motor.value * h));
          }
        }
        b.x = v.addScaled(b.x, b.v, h);
        b.q = q.integrate(b.q, b.w, h);
      }
      // khớp
      for (const j of this.joints) this.solveJoint(j, h);
      for (const c of this.couples) this.solveCouplePosition(c);
      for (const [j, v0] of speedStart) this.solveMotorPosition(j, v0, h);
      // tiếp xúc
      const active: Contact[] = [];
      for (const c of cands) {
        const a = c.a, b = c.b;
        const wp = v.add(a.x, q.rotate(a.q, c.local));
        let depth: number, nrm: V3;
        if (!b) {
          if (wp[1] >= 0) continue;
          depth = -wp[1];
          nrm = [0, 1, 0];
        } else {
          const pen = this.penetration(b, wp);
          if (!pen) continue;
          depth = pen.depth;
          nrm = pen.n;
        }
        const ra = v.sub(wp, a.x), rb = b ? v.sub(wp, b.x) : wp;
        const vrel = v.sub(pointVel(a, q.rotate(a.pq, c.local)), b ? pointVel(b, rb) : ZERO);
        const vnPre = v.dot(nrm, vrel);
        const dl = applyPositional(a, b, ra, rb, v.scale(nrm, depth), 0, h);
        const localB = b ? q.rotate(q.conj(b.q), rb) : wp;
        const ct: Contact = { a, b, local: c.local, n: nrm, ra, rb, lambdaN: dl, vnPre, localB };
        // ma sát tĩnh: giữ điểm tiếp xúc không trượt nếu lực ma sát cần ≤ μ·lực pháp tuyến
        const mu = Math.sqrt(a.friction * (b ? b.friction : a.friction));
        if (mu > 0) {
          const pa = v.add(a.x, q.rotate(a.q, c.local)), paPrev = v.add(a.px, q.rotate(a.pq, c.local));
          const pb = b ? v.add(b.x, q.rotate(b.q, localB)) : wp, pbPrev = b ? v.add(b.px, q.rotate(b.pq, localB)) : wp;
          const dp = v.sub(v.sub(pa, paPrev), v.sub(pb, pbPrev));
          const dpt = v.sub(dp, v.scale(nrm, v.dot(nrm, dp)));
          const lt = v.len(dpt);
          if (lt > 1e-12) {
            const wt = invW(a, ra, v.scale(dpt, 1 / lt)) + invW(b, rb, v.scale(dpt, 1 / lt));
            if (wt > 0 && lt / wt < mu * dl) applyPositional(a, b, v.sub(pa, a.x), b ? v.sub(pb, b.x) : pb, v.scale(dpt, -1), 0, h);
          }
        }
        active.push(ct);
        const key = `${a.id}|${b?.id ?? "ground"}`;
        const ev = impulses.get(key);
        if (ev) ev.impulse += dl / h;
        else impulses.set(key, { a: a.id, b: b?.id ?? null, impulse: dl / h, point: wp });
      }
      // vận tốc từ vị trí
      for (const b of this.bodies) {
        if (b.fixed) continue;
        b.v = v.scale(v.sub(b.x, b.px), 1 / h);
        const dq = q.mul(b.q, q.conj(b.pq));
        const w = v.scale([dq[0], dq[1], dq[2]], 2 / h);
        b.w = dq[3] >= 0 ? w : v.scale(w, -1);
      }
      // bước vận tốc: ma sát động, phục hồi
      for (const c of active) {
        const { a, b } = c;
        const wp = v.add(a.x, q.rotate(a.q, c.local));
        const ra = v.sub(wp, a.x), rb = b ? v.sub(wp, b.x) : wp;
        const vrel = v.sub(pointVel(a, ra), b ? pointVel(b, rb) : ZERO);
        const vn = v.dot(c.n, vrel);
        const vt = v.sub(vrel, v.scale(c.n, vn));
        let dv: V3 = [0, 0, 0];
        const mu = Math.sqrt(a.friction * (b ? b.friction : a.friction));
        const vtl = v.len(vt);
        if (vtl > 1e-9 && mu > 0) {
          const fn = c.lambdaN / (h * h);
          dv = v.scale(vt, -Math.min(h * mu * fn, vtl) / vtl);
        }
        let e = b ? (a.restitution + b.restitution) / 2 : a.restitution;
        if (Math.abs(c.vnPre) <= 2 * v.len(this.gravity) * h) e = 0;
        dv = v.addScaled(dv, c.n, -vn + Math.max(-e * c.vnPre, 0));
        const dvl = v.len(dv);
        if (dvl < 1e-12) continue;
        const dir = v.scale(dv, 1 / dvl);
        const w = invW(a, ra, dir) + invW(b, rb, dir);
        if (w > 0) applyImpulse(a, b, ra, rb, v.scale(dir, dvl / w));
      }
      // động cơ tốc độ, bánh răng (mức vận tốc)
      for (const j of this.joints) if (j.m.motor?.kind === "speed") this.solveMotor(j, h);
      for (const c of this.couples) this.solveCoupleVelocity(c);
      for (const j of this.joints) {
        if (j.m.kind !== "revolute") continue;
        const r = this.rawAngle(j);
        j.acc += wrapPi(r - j.raw);
        j.raw = r;
      }
      this.t += h;
    }
    this.events = [...impulses.values()];
  }

  private worldPivot(j: JointState) {
    const pa = v.add(j.a.x, q.rotate(j.a.q, j.m.pivotA));
    const pb = j.b ? v.add(j.b.x, q.rotate(j.b.q, j.m.pivotB)) : j.m.pivotB;
    return { pa, pb, ra: v.sub(pa, j.a.x), rb: j.b ? v.sub(pb, j.b.x) : pb };
  }

  private solveJoint(j: JointState, h: number) {
    const { a, b, m } = j;
    if (m.kind === "point") {
      const { pa, pb, ra, rb } = this.worldPivot(j);
      applyPositional(a, b, ra, rb, v.sub(pb, pa), 0, h);
      return;
    }
    if (m.kind === "revolute") {
      const a1 = q.rotate(a.q, m.axisA), a2 = b ? q.rotate(b.q, m.axisB) : m.axisB;
      applyAngular(a, b, v.cross(a1, a2));
    } else {
      // giữ hướng tương đối ban đầu: hướng đích của a là qB·qrel
      const target = q.mul(b ? b.q : q.identity(), j.qrel);
      const dq = q.mul(target, q.conj(a.q));
      const rot = v.scale([dq[0], dq[1], dq[2]], dq[3] >= 0 ? 2 : -2);
      applyAngular(a, b, rot);
    }
    const { pa, pb, ra, rb } = this.worldPivot(j);
    let d = v.sub(pb, pa);
    if (m.kind === "prismatic") {
      const ax = b ? q.rotate(b.q, m.axisB) : m.axisB;
      d = v.sub(d, v.scale(ax, v.dot(ax, d)));
    }
    applyPositional(a, b, ra, rb, d, 0, h);
  }

  private solveMotor(j: JointState, h: number) {
    const { a, b, m } = j;
    const target = m.motor!.value;
    if (m.kind === "revolute") {
      const ax = q.rotate(a.q, m.axisA);
      const rel = v.dot(v.sub(a.w, b ? b.w : ZERO), ax);
      const ka = a.fixed ? 0 : v.dot(ax, invInertiaWorld(a.invI, a.q, ax)), kb = !b || b.fixed ? 0 : v.dot(ax, invInertiaWorld(b.invI, b.q, ax));
      if (ka + kb <= 0) return;
      let dl = (target - rel) / (ka + kb);
      if (m.motor!.maxForce !== undefined) dl = Math.max(-m.motor!.maxForce * h, Math.min(m.motor!.maxForce * h, dl));
      if (!a.fixed) a.w = v.add(a.w, v.scale(invInertiaWorld(a.invI, a.q, ax), dl));
      if (b && !b.fixed) b.w = v.sub(b.w, v.scale(invInertiaWorld(b.invI, b.q, ax), dl));
    } else if (m.kind === "prismatic") {
      const f = this.jointFrame(j);
      const rel = this.jointRate(j, f);
      if (f.w <= 0) return;
      let dl = (target - rel) / f.w;
      if (m.motor!.maxForce !== undefined) dl = Math.max(-m.motor!.maxForce * h, Math.min(m.motor!.maxForce * h, dl));
      this.kickJoint(j, f, dl);
    }
  }

  /** Góc thô của khớp quay quanh trục (−π, π], so với lúc t = 0. */
  private rawAngle(j: JointState): number {
    const rel = q.mul(q.conj(j.b ? j.b.q : q.identity()), j.a.q);
    const dq = q.mul(rel, q.conj(j.qrel)); // phép quay tương đối trong khung của b (khung vật trùng thế giới lúc t = 0)
    return 2 * Math.atan2(v.dot([dq[0], dq[1], dq[2]], j.m.axisB), dq[3]);
  }

  /** Giá trị khớp (rad hoặc m) so với lúc t = 0; khớp quay cộng dồn qua nhiều vòng. */
  jointValue(j: JointState): number {
    if (j.m.kind === "revolute") return j.acc + wrapPi(this.rawAngle(j) - j.raw);
    const { pa, pb } = this.worldPivot(j);
    const ax = j.b ? q.rotate(j.b.q, j.m.axisB) : j.m.axisB;
    return v.dot(v.sub(pa, pb), ax);
  }

  /** Giá trị khớp theo id (rad hoặc m), cho selftest và trang. */
  jointValueOf(id: string): number | undefined {
    const j = this.joints.find((x) => x.m.id === id);
    return j && j.m.kind !== "point" && j.m.kind !== "fixed" ? this.jointValue(j) : undefined;
  }

  /** Trục thế giới của khớp, khối lượng nghịch đảo theo toạ độ khớp, và hai cánh tay đòn (khớp trượt). */
  private jointFrame(j: JointState): { n: V3; w: number; ra: V3; rb: V3 } {
    if (j.m.kind === "revolute") {
      const n = q.rotate(j.a.q, j.m.axisA);
      const w = (j.a.fixed ? 0 : v.dot(n, invInertiaWorld(j.a.invI, j.a.q, n))) + (!j.b || j.b.fixed ? 0 : v.dot(n, invInertiaWorld(j.b.invI, j.b.q, n)));
      return { n, w, ra: ZERO, rb: ZERO };
    }
    // khớp trượt: đổi toạ độ bằng tịnh tiến thuần (khoá góc của khớp giữ hai vật cùng hướng, đẩy lệch tâm chỉ sinh
    // mô-men mà khoá góc lại phải triệt, làm khâu nhẹ rung)
    const n = j.b ? q.rotate(j.b.q, j.m.axisB) : j.m.axisB;
    const { ra, rb } = this.worldPivot(j);
    return { n, w: (j.a.fixed ? 0 : j.a.invMass) + (!j.b || j.b.fixed ? 0 : j.b.invMass), ra, rb };
  }

  /** Dời toạ độ khớp theo "xung" tổng quát p ở mức vị trí: a nhận +p, vật cha b nhận −p. */
  private shiftJoint(j: JointState, f: { n: V3; ra: V3; rb: V3 }, p: number) {
    const { a, b } = j;
    if (j.m.kind === "revolute") {
      if (!a.fixed) rotateBy(a, invInertiaWorld(a.invI, a.q, v.scale(f.n, p)));
      if (b && !b.fixed) rotateBy(b, invInertiaWorld(b.invI, b.q, v.scale(f.n, -p)));
      return;
    }
    if (!a.fixed) a.x = v.addScaled(a.x, f.n, p * a.invMass);
    if (b && !b.fixed) b.x = v.addScaled(b.x, f.n, -p * b.invMass);
  }

  /** Như shiftJoint nhưng ở mức vận tốc. */
  private kickJoint(j: JointState, f: { n: V3; ra: V3; rb: V3 }, p: number) {
    const { a, b } = j;
    if (j.m.kind === "revolute") {
      if (!a.fixed) a.w = v.add(a.w, invInertiaWorld(a.invI, a.q, v.scale(f.n, p)));
      if (b && !b.fixed) b.w = v.sub(b.w, invInertiaWorld(b.invI, b.q, v.scale(f.n, p)));
      return;
    }
    if (!a.fixed) a.v = v.addScaled(a.v, f.n, p * a.invMass);
    if (b && !b.fixed) b.v = v.addScaled(b.v, f.n, -p * b.invMass);
  }

  private jointRate(j: JointState, f: { n: V3; ra: V3; rb: V3 }): number {
    if (j.m.kind === "revolute") return v.dot(v.sub(j.a.w, j.b ? j.b.w : ZERO), f.n);
    return v.dot(v.sub(pointVel(j.a, f.ra), j.b ? pointVel(j.b, f.rb) : ZERO), f.n);
  }

  /**
   * Phần vị trí của động cơ tốc độ: kéo giá trị khớp về (đầu substep + tốc độ·h), lực giới hạn bởi maxForce (λ ≤ F·h²).
   * Chỉ mức vận tốc thì tải nặng nối qua vòng kín (thùng trên cán piston) đè được khớp: hiệu chỉnh vị trí của chốt chia
   * theo khối lượng nên khâu nhẹ bị đẩy lùi trước khi động cơ kịp tác dụng.
   */
  private solveMotorPosition(j: JointState, v0: number, h: number) {
    const C = this.jointValue(j) - (v0 + j.m.motor!.value * h);
    if (Math.abs(C) < 1e-12) return;
    const f = this.jointFrame(j);
    if (f.w <= 0) return;
    let dl = -C / f.w;
    const max = j.m.motor!.maxForce;
    if (max !== undefined) dl = Math.max(-max * h * h, Math.min(max * h * h, dl));
    this.shiftJoint(j, f, dl);
  }

  /** f(lead) và độ dốc k = df/dlead của khớp ghép. */
  private coupleMap(c: CoupleState, lead: number): { y: number; k: number } {
    return c.table ? tableAt(c.table, lead) : { y: (c.ratio ?? 0) * lead, k: c.ratio ?? 0 };
  }

  /** C = follow − f(lead) = 0, chiếu ở mức vị trí (XPBD, cứng tuyệt đối): đẩy khớp nào thì khớp kia cũng chạy. */
  private solveCouplePosition(c: CoupleState) {
    const { y, k } = this.coupleMap(c, this.jointValue(c.lead));
    const C = this.jointValue(c.follow) - y;
    if (Math.abs(C) < 1e-12) return;
    const fl = this.jointFrame(c.lead), ff = this.jointFrame(c.follow);
    const den = ff.w + k * k * fl.w;
    if (den <= 0) return;
    const dl = -C / den;
    this.shiftJoint(c.follow, ff, dl);
    this.shiftJoint(c.lead, fl, -k * dl);
  }

  /** rate(follow) = k·rate(lead) ở mức vận tốc, sau động cơ (vận tốc khớp đúng tỉ số ngay trong bước). */
  private solveCoupleVelocity(c: CoupleState) {
    const { k } = this.coupleMap(c, this.jointValue(c.lead));
    const fl = this.jointFrame(c.lead), ff = this.jointFrame(c.follow);
    const C = this.jointRate(c.follow, ff) - k * this.jointRate(c.lead, fl);
    const den = ff.w + k * k * fl.w;
    if (den <= 0 || Math.abs(C) < 1e-14) return;
    const dl = -C / den;
    this.kickJoint(c.follow, ff, dl);
    this.kickJoint(c.lead, fl, -k * dl);
  }
}
