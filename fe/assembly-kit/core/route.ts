/**
 * Dây nối, ống, dây đai: đường đi giữa hai điểm neo. Agent chỉ nói đi từ đâu tới đâu, có bám mặt nào không;
 * đường đi ra theo hướng của điểm neo đầu, nằm sát các mặt `via`, rồi đi vào theo hướng của điểm neo cuối.
 * Trả về các điểm khống chế; trang nối chúng bằng đường cong Catmull-Rom.
 */

import { type V3, add, dot, length, scale, sub, transformDir, transformPoint } from "./math";
import { AssemblyError, type Registry, type Solved, anchorFrame } from "./solve";
import type { Route } from "./types";

export interface SolvedRoute {
  id: string;
  points: V3[];
  radius: number;
  material: string;
  length: number;
}

export function solveRoute(route: Route, solved: Solved, registry: Registry): SolvedRoute {
  if (!(route.radius > 0 && route.radius < 0.05)) throw new AssemblyError(`[dây ${route.id}] radius phải trong (0, 0,05) m.`);
  const end = (ref: string) => {
    const { frame, world } = anchorFrame(registry, solved.parts, ref, "world");
    if (frame.kind === "axis") throw new AssemblyError(`[dây ${route.id}] ${ref} là trục; dây cần một điểm hoặc một mặt.`);
    return { p: transformPoint(world, frame.origin), d: transformDir(world, frame.dir) };
  };
  const a = end(route.from), b = end(route.to);
  const lead = Math.max(0.006, route.radius * 5);
  const pa = add(a.p, scale(a.d, lead)), pb = add(b.p, scale(b.d, lead));
  const pts: V3[] = [a.p, pa];
  for (const v of route.via ?? []) {
    const { frame, world } = anchorFrame(registry, solved.parts, v.on, "world");
    if (frame.kind !== "face") throw new AssemblyError(`[dây ${route.id}] via.on "${v.on}" phải là một mặt.`);
    const o = transformPoint(world, frame.origin), n = transformDir(world, frame.dir);
    // chiếu hai đầu xuống mặt, nâng lên một bán kính; thêm điểm giữa để dây nằm sát mặt
    const onPlane = (p: V3) => add(sub(p, scale(n, dot(sub(p, o), n))), scale(n, route.radius));
    const qa = onPlane(pa), qb = onPlane(pb);
    pts.push(qa, scale(add(qa, qb), 0.5), qb);
  }
  pts.push(pb, b.p);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += length(sub(pts[i], pts[i - 1]));
  return { id: route.id, points: pts, radius: route.radius, material: route.material, length: len };
}
