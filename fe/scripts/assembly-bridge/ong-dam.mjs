// Sửa ba ống gió CHƯA HÀN (ong-gio) để ba ống ĐÂM HẲN vào nhau:
//  - hai ống ngang dài 500 mm, kéo dài về phía mối để mối nối nằm SÂU trong thân ống (≥ 77 mm từ miệng);
//  - ống chéo giữ nguyên, hai đầu của nó chôn trong thân hai ống ngang.
// Có sao lưu bản cũ (chỉ lần đầu). Chạy: node fe/scripts/assembly-bridge/ong-dam.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const FE_ROOT = resolve(here, "../..");
const stateFile = join(FE_ROOT, ".assembly-bridge", "state.json");
const backupFile = join(FE_ROOT, ".assembly-bridge", "backup-ong-gio-360.json");

const state = JSON.parse(readFileSync(stateFile, "utf8"));
const a = state.assemblies.find((x) => x.id === "ong-gio");
if (!a) throw new Error("không có bản ong-gio");

if (!existsSync(backupFile)) {
  writeFileSync(backupFile, JSON.stringify(a, null, 1));
  console.log(`đã sao lưu bản cũ → ${backupFile}`);
}

const HALF = 0.25; // nửa chiều dài ống ngang: 500 mm
const shape = a.doc.shapes.find((s) => s.id === "ongNgang");
for (const p of shape.params.profile.pts) p[1] = Math.sign(p[1] || 1) * HALF;
for (const an of Object.values(shape.anchors ?? {})) an.origin[0] = Math.sign(an.origin[0] || 1) * HALF;

// giữ nguyên một đầu tự do, kéo dài về phía mối nối
const at = { ong1: 0.04, ong3: 0.09 }; // ong1: −0,21…0,29 ; ong3: −0,16…0,34
for (const p of a.doc.parts) if (at[p.id] !== undefined) p.place.at[0] = at[p.id];

a.title = "Ba ống gió — ba ống đâm vào nhau";
a.rev = (a.rev ?? 0) + 1;
a.updatedAt = new Date().toISOString();
state.version = (state.version ?? 0) + 1;
writeFileSync(stateFile, JSON.stringify(state));

const span = (x) => `${(x - HALF).toFixed(3)} … ${(x + HALF).toFixed(3)} m`;
console.log(`ong1: x ${span(0.04)}   → mối ở x = −0,073, cách miệng trái ${Math.round((0.04 - HALF + 0.073) * 1000)} mm`);
console.log(`ong2: chéo 42°, đầu dưới (−0,034, 0,096), đầu trên (0,234, 0,337) — giữ nguyên`);
console.log(`ong3: x ${span(0.09)}   → mối ở x = 0,260, cách miệng phải ${Math.round((0.09 + HALF - 0.26) * 1000)} mm`);
