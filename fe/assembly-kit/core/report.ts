/**
 * Báo cáo dạng chữ cho agent: danh sách loại bộ phận, thông tin một loại, kết quả sau khi đặt một bộ phận
 * (tư thế, khung bao, điểm neo ở toạ độ thế giới) và cây lắp ráp.
 */

import { eulerXYZDeg, round, roundV } from "./math";
import { solveRoute } from "./route";
import { type Registry, type Solved, describeAnchors, fmtV3, getType, worldBounds, worldOrigin } from "./solve";
import type { AssemblyDoc, ParamSpec } from "./types";

export function typeList(registry: Registry): string {
  const groups = new Map<string, string[]>();
  for (const t of Object.values(registry)) {
    const list = groups.get(t.category) ?? [];
    list.push(`- ${t.type}: ${t.description}`);
    groups.set(t.category, list);
  }
  return [...groups].map(([cat, list]) => `## ${cat}\n${list.join("\n")}`).join("\n\n");
}

const paramLine = (name: string, s: ParamSpec) => {
  const range = "min" in s && (s.min !== undefined || s.max !== undefined) ? `, miền [${s.min ?? "−∞"}, ${s.max ?? "∞"}]` : "";
  const opts = s.type === "enum" ? `, chọn: ${s.options.join(" | ")}` : "";
  const unit = "unit" in s && s.unit ? ` ${s.unit}` : "";
  return `- ${name} (${s.type}${unit}) = ${JSON.stringify(s.default)}${range}${opts} — ${s.desc}`;
};

export function typeInfo(registry: Registry, type: string): string {
  const t = getType(registry, type);
  const defaults = Object.fromEntries(Object.entries(t.params).map(([k, s]) => [k, s.default]));
  const anchors = t.anchors(defaults as never);
  return [
    `# ${t.type} (${t.category})`,
    t.description,
    `\n## Tham số`,
    ...Object.entries(t.params).map(([k, s]) => paramLine(k, s)),
    `\n## Điểm neo (khung của bộ phận, với tham số mặc định)`,
    ...Object.entries(anchors).map(([k, a]) => {
      if (a.kind === "surface") return `- ${k} (surface, R ${a.radius}): ${a.desc}. Chọn điểm: ${k}@bottom|top|front|back|left|right hoặc ${k}@angle=độ`;
      const d = a.kind === "face" ? a.normal : a.dir;
      return `- ${k} (${a.kind}) gốc ${fmtV3(a.origin)} hướng ${fmtV3(d)}${a.kind === "axis" && a.radius ? `, R ${a.radius}` : ""}: ${a.desc}`;
    }),
  ].join("\n");
}

export function partReport(registry: Registry, solved: Solved, id: string): string {
  const part = solved.parts.get(id)!;
  const b = worldBounds(registry, part);
  return [
    `${id} (${part.type}) đặt vào ${part.parent}${part.follow ? "" : " (không chạy theo khớp của bộ phận cha)"}`,
    `gốc ${fmtV3(worldOrigin(part))}, xoay XYZ ${fmtV3(roundV(eulerXYZDeg(part.world), 2))}°`,
    `khung bao ${fmtV3(b.min)} → ${fmtV3(b.max)}`,
    `điểm neo (thế giới):`,
    ...describeAnchors(registry, part).map((l) => `  ${l}`),
  ].join("\n");
}

export function describeTree(doc: AssemblyDoc, solved: Solved, registry: Registry): string {
  const children = new Map<string, string[]>();
  for (const id of solved.order) {
    const parent = solved.parts.get(id)!.parent;
    children.set(parent, [...(children.get(parent) ?? []), id]);
  }
  const byId = new Map(doc.parts.map((p) => [p.id, p]));
  const lines: string[] = [`# ${doc.title} (${doc.id}) — ${doc.parts.length} bộ phận, ${doc.joints.length} khớp, ${doc.routes.length} dây`, "ground"];
  const walk = (id: string, depth: number) => {
    for (const c of children.get(id) ?? []) {
      const inst = byId.get(c)!, pl = inst.place;
      const n = (v: number) => round(v, 5);
      const extra = [pl.at ? `at [${pl.at.map(n).join(", ")}]` : "", pl.offset ? `offset ${n(pl.offset)}` : "", pl.angle ? `angle ${n(pl.angle)}°` : "", pl.flip ? "flip" : "", pl.shift ? `shift [${pl.shift.map(n).join(", ")}]` : "", pl.follow === false ? "follow: false" : ""].filter(Boolean).join(", ");
      const o = worldOrigin(solved.parts.get(c)!);
      lines.push(`${"  ".repeat(depth)}└ ${c} (${inst.type}) ${pl.kind}(${pl.a} → ${pl.b})${extra ? ` [${extra}]` : ""} @ ${fmtV3(o)}`);
      walk(c, depth + 1);
    }
  };
  walk("ground", 1);
  if (doc.joints.length) {
    lines.push("", "## Khớp");
    for (const j of doc.joints) lines.push(`- ${j.id}: ${j.kind} quanh ${j.axis}, giá trị ${j.value ?? 0}${j.kind === "revolute" ? "°" : " m"}${j.couple ? `, ghép theo ${j.couple.joint}${j.couple.table ? ` theo bảng ${JSON.stringify(j.couple.table)}` : j.couple.ratio !== undefined ? ` × ${j.couple.ratio}` : " (lăn)"}` : ""}${j.limits ? `, giới hạn ${JSON.stringify(j.limits)}` : ""}; kéo theo: ${(solved.clusters.get(j.id) ?? []).join(", ")}`);
  }
  if (doc.routes.length) {
    lines.push("", "## Dây");
    for (const r of doc.routes) {
      const s = solveRoute(r, solved, registry);
      lines.push(`- ${r.id}: ${r.from} → ${r.to}${r.via?.length ? ` qua ${r.via.map((v) => v.on).join(", ")}` : ""}, ${r.material}, dài ${round(s.length, 3)} m`);
    }
  }
  return lines.join("\n");
}
