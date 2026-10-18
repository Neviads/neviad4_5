// Cổng kiểm tra LẮP RÁP cho backend (AssemblyAgent): stdin = { plan, components: [{ id, name, js }] }
// (plan theo lib/assembly/assemble.ts; mỗi vật con đã qua cổng của riêng nó). In MỘT dòng JSON { problems: string[], steps: number }.
// Lỗi bất ngờ cũng thành `problems`, không bao giờ thành "đạt".
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { instantiate } = await import(pathToFileURL(resolve(here, "lib/object-runner.mjs")).href);
const { applyMachineInput, layout } = await import(pathToFileURL(resolve(here, "../lib/assembly/assemble.ts")).href);

const RADIUS = 30; // cùng bán kính cho mọi vật con (trang cũng dựng với bán kính này)
const STEPS = 9;
const finite = (v) => typeof v === "number" && Number.isFinite(v);

function check({ plan, components }) {
  const problems = [];
  const add = (m) => { if (!problems.includes(m)) problems.push(m); };
  const byId = Object.fromEntries(plan.components.map((c) => [c.id, c]));

  const parts = {};
  for (const c of components) {
    try { parts[c.id] = instantiate(c.js, c.name, RADIUS).obj; }
    catch (e) { add(`Vật con "${c.id}" không dựng được: ${e instanceof Error ? e.message : String(e)}`); }
  }
  for (const c of plan.components) if (!parts[c.id]) add(`Thiếu vật con "${c.id}".`);
  if (problems.length) return problems;

  // Cây nối: mỗi vật con (trừ gốc) có đúng một cha, port của hai phía tồn tại, đi từ gốc tới được mọi vật.
  const parentOf = {};
  for (const a of plan.attachments) {
    if (!byId[a.parent] || !byId[a.child]) { add(`Nối "${a.parent}.${a.parentPort}" với "${a.child}.${a.childPort}" nhắc tới vật không có trong plan.`); continue; }
    if (a.child === plan.root) add(`Vật gốc "${plan.root}" không được là con của vật nào.`);
    if (parentOf[a.child]) add(`Vật "${a.child}" có hơn một cha.`);
    parentOf[a.child] = a.parent;
    if (!(a.parentPort in parts[a.parent].ports)) add(`Vật "${a.parent}" không có port "${a.parentPort}" (có: ${Object.keys(parts[a.parent].ports).join(", ")}).`);
    if (!(a.childPort in parts[a.child].ports)) add(`Vật "${a.child}" không có port "${a.childPort}" (có: ${Object.keys(parts[a.child].ports).join(", ")}).`);
  }
  for (const c of plan.components) {
    if (c.id === plan.root) continue;
    let cur = c.id, hops = 0;
    while (cur !== plan.root && parentOf[cur] && hops++ < 20) cur = parentOf[cur];
    if (cur !== plan.root) add(`Vật "${c.id}" không nối được tới vật gốc "${plan.root}".`);
  }
  for (const c of plan.components) {
    if (c.moving && !c.driver) add(`Vật động "${c.id}" thiếu driver.`);
    if (c.driver && !(c.driver.input in parts[c.id].inputs)) add(`Driver của "${c.id}" dùng đầu vào "${c.driver.input}" mà vật không có (có: ${Object.keys(parts[c.id].inputs).join(", ") || "không"}).`);
  }
  if (problems.length) return problems;

  // Quét đầu vào của máy: driver nằm trong khoảng của đầu vào vật con, mọi port hữu hạn, mọi vị trí hữu hạn.
  const { min, max } = plan.input;
  const moved = {};
  for (let i = 0; i <= STEPS; i += 1) {
    const u = min + ((max - min) * i) / STEPS;
    try { applyMachineInput(plan, parts, u); } catch (e) { add(e instanceof Error ? e.message : String(e)); break; }
    for (const c of plan.components) {
      if (!c.driver) continue;
      const range = parts[c.id].inputs[c.driver.input];
      const got = parts[c.id].get()[c.driver.input];
      const wanted = Function("u", `"use strict"; return (${c.driver.expr});`)(u);
      if (finite(wanted) && Math.abs(wanted - got) > 1e-9 + Math.abs(wanted) * 1e-9) add(`Driver "${c.driver.expr}" của "${c.id}" ra ${wanted} khi u=${u} nhưng vật chỉ nhận trong [${range.min}, ${range.max}] (đã bị kẹp thành ${got}).`);
    }
    let at;
    try { at = layout(plan, parts); } catch (e) { add(`Không xếp được vị trí: ${e instanceof Error ? e.message : String(e)}`); break; }
    for (const [id, p] of Object.entries(at)) {
      if (!finite(p.x) || !finite(p.y)) add(`Vị trí của "${id}" không hữu hạn khi u=${u}.`);
    }
    moved[JSON.stringify(at)] = true;
  }
  if (!problems.length && Object.keys(moved).length < 2) add("Khi đổi đầu vào của máy, không vật con nào đổi vị trí: máy không chuyển động.");
  return problems;
}

let out;
try {
  out = { problems: check(JSON.parse(readFileSync(0, "utf8"))), steps: STEPS };
} catch (error) {
  out = { problems: [`Cổng lắp ráp lỗi: ${error instanceof Error ? error.message : String(error)}`], steps: 0 };
}
console.log(JSON.stringify(out));
