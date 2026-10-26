#!/usr/bin/env node
/**
 * Dựng máy phát điện xoay chiều quay tay bằng các tool của server MCP `nge`
 * (Babylon.js Node Geometry), xuất 4 đồ thị JSON cho trang /may-phat-dien-babylon:
 *   stator.json  — mọi phần đứng yên (đế, nam châm, gối đỡ, chổi than, đèn, vôn kế, dây)
 *   rotor.json   — phần quay, gốc ở tâm trục (khung dây, trục, vành trượt, tay quay)
 *   needle.json  — kim vôn kế, gốc ở trục kim
 *   lever.json   — cần công tắc, gốc ở chân cần
 * Mỗi bộ phận mang một material ID (SetMaterialIDBlock); bảng tên ở materials.json.
 *
 *   node scripts/nge-generator/build-ac-generator.mjs
 *
 * Đơn vị mét, y hướng lên, trục quay dọc x ở độ cao SY. Kích thước thật như máy
 * mẫu phòng thí nghiệm: đế 580 × 280 × 24 mm, khung dây 110 × 84 mm (200 vòng),
 * má cực lõm R 58 mm ôm ±46°, vành trượt Ø34 mm, tay quay 65 mm.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openServer } from "./mcp-client.mjs";
import { Graph } from "./graph.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../app/may-phat-dien-babylon/graphs");
const PI = Math.PI;

export const MATERIALS = [
  "wood", "felt", "redPaint", "bluePaint", "iron", "aluminium", "steel", "bakelite", "brass", "carbon",
  "copper", "winding", "wireRed", "wireBlack", "tape", "enamel", "glass", "dial", "coverGlass", "filament", "letterN", "letterS",
];
const M = Object.fromEntries(MATERIALS.map((n, i) => [n, i]));

const SY = 0.135; // tâm trục
const CX = 0.055, CW = 0.042; // nửa dài, nửa rộng khung dây (tâm bó dây)
const RING_X = [0.128, 0.154];
const UPRIGHT_X = 0.098;
const LAMP = [0.205, -0.07];
const METER = [0.285, -0.05];
const SWITCH = [0.27, 0.05];
const POSTS = [[0.205, 0.105], [0.245, 0.105]];

const rotZ = [0, 0, PI / 2]; // trụ (dọc y) → nằm dọc x
const rotX = [PI / 2, 0, 0]; // trụ (dọc y) → nằm dọc z

function stator(g) {
  const parts = [];
  const put = (geo, id) => parts.push(g.mat(geo, id));

  // Đế gỗ bo cạnh + bốn chân dạ
  put(g.xf(g.bevel(g.box(0.58, 0.024, 0.28), 0.003, 2), { t: [0.04, -0.012, 0] }), M.wood);
  for (const x of [-0.22, 0.3]) for (const z of [-0.11, 0.11]) put(g.xf(g.cyl(0.004, 0.024, 20), { t: [x, -0.026, z] }), M.felt);

  // Nam châm móng ngựa: nửa N (z+) đỏ, nửa S (z−) xanh; mỗi nửa = đáy + cánh
  for (const s of [1, -1]) {
    const paint = s > 0 ? M.redPaint : M.bluePaint;
    put(g.xf(g.bevel(g.box(0.088, 0.024, 0.104), 0.002, 2), { t: [0, 0.012, s * 0.052] }), paint);
    put(g.xf(g.bevel(g.box(0.088, SY + 0.046, 0.022), 0.002, 2), { t: [0, (SY + 0.046) / 2, s * 0.093] }), paint);
    // má cực sắt non, mặt lõm R 58 mm ôm ±46° (không dùng CSG):
    // các lát nằm ngang lấp từ cung ra tới cánh nam châm, mặt lõm phủ bằng tấm mỏng xếp theo cung
    const n = 11, half = (46 * PI) / 180, step = (2 * half) / n, R = 0.058;
    const w = 2 * R * Math.tan(step / 2) * 1.06;
    for (let k = 0; k < n; k++) {
      const a = -half + (k + 0.5) * step;
      const y0 = R * Math.sin(a - step / 2), y1 = R * Math.sin(a + step / 2);
      const z0 = R * Math.cos(a) + 0.002, z1 = 0.083;
      put(g.xf(g.box(0.086, y1 - y0, z1 - z0), { t: [0, SY + (y0 + y1) / 2, s * (z0 + z1) / 2] }), M.iron);
      put(g.aim(g.box(0.086, 0.004, w), [0, Math.sin(a), s * Math.cos(a)], [0, SY + (R + 0.002) * Math.sin(a), s * (R + 0.002) * Math.cos(a)]), M.iron);
    }
    // chữ N / S sơn trên mặt ngoài cánh (mặt phẳng mang texture chữ)
    put(g.xf(g.plane(0.05, 0.05), { t: [0, SY + 0.01, s * 0.1065], r: [0, s > 0 ? PI : 0, 0] }), s > 0 ? M.letterN : M.letterS);
    // vít bắt nam châm
    for (const x of [-0.03, 0.03]) put(g.xf(g.sphere(0.0084, 12, undefined, 0.0046), { t: [x, 0.026, s * 0.04] }), M.steel);
  }

  // Hai gối đỡ nhôm: chân, thân, đầu tròn; ổ bi thép
  for (const gx of [-UPRIGHT_X, UPRIGHT_X]) {
    put(g.xf(g.bevel(g.box(0.012, 0.008, 0.072), 0.0015, 2), { t: [gx, 0.004, 0] }), M.aluminium);
    put(g.xf(g.bevel(g.box(0.012, SY, 0.034), 0.0015, 2), { t: [gx, SY / 2, 0] }), M.aluminium);
    put(g.xf(g.cyl(0.012, 0.036, 40), { t: [gx, SY, 0], r: rotZ }), M.aluminium);
    put(g.xf(g.torus(0.0196, 0.0056, 32), { t: [gx, SY, 0], r: rotZ, s: [1, 2.6, 1] }), M.steel);
    for (const z of [-0.026, 0.026]) put(g.xf(g.sphere(0.0084, 12, undefined, 0.0046), { t: [gx, 0.0095, z] }), M.steel);
  }

  // Cụm chổi than: cột bakelite, hộp đồng thau, thỏi than tì vào đáy vành trượt, lò xo, vít đấu dây
  put(g.xf(g.bevel(g.box(0.044, 0.072, 0.026), 0.0015, 2), { t: [0.141, 0.036, 0] }), M.bakelite);
  const ringBottom = SY - 0.017;
  for (const rx of RING_X) {
    put(g.xf(g.box(0.011, 0.026, 0.015), { t: [rx, 0.085, 0] }), M.brass);
    put(g.xf(g.box(0.0082, ringBottom - 0.098, 0.0105), { t: [rx, (0.098 + ringBottom) / 2, 0] }), M.carbon);
    put(g.linear(g.xf(g.torus(0.0052, 0.001, 12), { t: [rx, 0.089, 0.0105] }), 8, [0, 0.0028, 0]), M.steel);
    put(g.xf(g.cyl(0.003, 0.0064, 16), { t: [rx, 0.08, 0.0088], r: rotX }), M.steel);
  }

  // Cọc đấu dây đỏ / đen
  POSTS.forEach(([px, pz], i) => {
    put(g.xf(g.cyl(0.006, 0.016, 24, 0.015, 0.018), { t: [px, 0.003, pz] }), M.bakelite);
    put(g.xf(g.cyl(0.03, 0.0056, 12), { t: [px, 0.018, pz] }), M.brass);
    put(g.xf(g.cyl(0.016, 0.017, 24), { t: [px, 0.024, pz] }), i === 0 ? M.redPaint : M.wireBlack);
    put(g.xf(g.cyl(0.004, 0.0104, 16), { t: [px, 0.034, pz] }), M.brass);
  });

  // Bóng đèn 12 V: đui bakelite, đuôi xoáy đồng thau, bóng thuỷ tinh, dây tóc
  const [LX, LZ] = LAMP;
  put(g.xf(g.cyl(0.02, 0.04, 32, 0.038, 0.044), { t: [LX, 0.01, LZ] }), M.bakelite);
  put(g.xf(g.cyl(0.012, 0.0176, 32), { t: [LX, 0.026, LZ] }), M.brass);
  put(g.linear(g.xf(g.torus(0.0178, 0.0016, 24), { t: [LX, 0.0215, LZ] }), 4, [0, 0.0028, 0]), M.brass);
  put(g.xf(g.cyl(0.01, 0.0176, 32, 0.022, 0.0176), { t: [LX, 0.037, LZ] }), M.glass);
  put(g.xf(g.sphere(0.038, 32), { t: [LX, 0.056, LZ] }), M.glass);
  for (const dx of [-0.005, 0.005]) put(g.tube([[LX + dx * 0.6, 0.034, LZ], [LX + dx, 0.05, LZ], [LX + dx, 0.058, LZ]], 0.00035, 4, 6), M.steel);
  put(g.linear(g.xf(g.torus(0.0018, 0.0005, 10), { t: [LX - 0.005, 0.058, LZ], r: rotZ }), 13, [0.00083, 0, 0]), M.filament);

  // Vôn kế số 0 ở giữa: vỏ bakelite, mặt số, mặt kính, hai cọc trên nóc
  const [MX, MZ] = METER;
  put(g.xf(g.bevel(g.box(0.08, 0.072, 0.034), 0.002, 2), { t: [MX, 0.036, MZ] }), M.bakelite);
  put(g.xf(g.plane(0.068, 0.051), { t: [MX, 0.038, MZ + 0.0175], r: [0, PI, 0] }), M.dial);
  put(g.xf(g.plane(0.07, 0.054), { t: [MX, 0.038, MZ + 0.0195], r: [0, PI, 0] }), M.coverGlass);
  put(g.xf(g.cyl(0.008, 0.007, 16), { t: [MX - 0.015, 0.076, MZ - 0.004] }), M.redPaint);
  put(g.xf(g.cyl(0.008, 0.007, 16), { t: [MX + 0.015, 0.076, MZ - 0.004] }), M.wireBlack);

  // Đế công tắc lẫy
  const [SX, SZ] = SWITCH;
  put(g.xf(g.bevel(g.box(0.03, 0.012, 0.022), 0.0015, 2), { t: [SX, 0.006, SZ] }), M.bakelite);

  // Dây nối nằm trên mặt đế
  const y = 0.0022;
  const wires = [
    [M.wireRed, 0.0016, [[RING_X[0], 0.08, 0.0098], [RING_X[0], 0.07, 0.03], [0.16, y + 0.002, 0.07], [0.2, y, 0.1], [0.205, 0.02, 0.105]]],
    [M.wireBlack, 0.0016, [[RING_X[1], 0.08, 0.0098], [RING_X[1], 0.065, 0.03], [0.19, y + 0.002, 0.06], [0.24, y, 0.095], [0.245, 0.02, 0.105]]],
    [M.wireRed, 0.0014, [[0.205, 0.02, 0.105], [0.19, y, 0.07], [0.185, y, -0.02], [0.195, y, -0.06], [LX - 0.012, 0.012, LZ]]],
    [M.wireBlack, 0.0014, [[LX + 0.012, 0.012, LZ], [0.23, y, -0.04], [0.255, y, 0.02], [SX - 0.012, 0.008, SZ]]],
    [M.wireBlack, 0.0014, [[SX + 0.012, 0.008, SZ], [0.275, y, 0.09], [0.25, y, 0.11], [0.245, 0.02, 0.105]]],
    // vôn kế: vòng ra sau vỏ rồi lên cọc trên nóc, không vắt qua mặt số
    [M.wireRed, 0.0012, [[0.205, 0.02, 0.105], [0.22, y, 0.07], [0.238, y, -0.02], [0.24, y, -0.082], [0.262, 0.05, -0.08], [0.27, 0.088, -0.066], [0.27, 0.08, -0.054]]],
    [M.wireBlack, 0.0012, [[0.245, 0.02, 0.105], [0.318, y, 0.06], [0.33, y, -0.03], [0.322, y, -0.082], [0.305, 0.05, -0.08], [0.3, 0.088, -0.066], [0.3, 0.08, -0.054]]],
  ];
  for (const [id, r, pts] of wires) put(g.tube(pts, r, 14), id);

  g.output(g.merge(parts));
}

function rotor(g) {
  const parts = [];
  const put = (geo, id) => parts.push(g.mat(geo, id));
  const r = 0.0065;

  // Khung dây: 2 cạnh dài (cắt từ trường) + 2 cạnh ngắn + 4 góc, dẹt theo z (dày 21 mm)
  const coil = [];
  for (const yy of [-CW, CW]) coil.push(g.xf(g.cyl(2 * CX, 2 * r, 24), { t: [0, yy, 0], r: rotZ }));
  for (const xx of [-CX, CX]) coil.push(g.xf(g.cyl(2 * CW, 2 * r, 24), { t: [xx, 0, 0] }));
  for (const xx of [-CX, CX]) for (const yy of [-CW, CW]) coil.push(g.xf(g.sphere(2 * r, 20), { t: [xx, yy, 0] }));
  put(g.xf(g.merge(coil), { s: [1, 1, 1.6] }), M.winding);
  // băng vải cách điện trên hai cạnh dài
  for (const xx of [-0.0385, 0.0385]) for (const yy of [-CW, CW]) put(g.xf(g.cyl(0.008, 2 * r * 1.18, 20), { t: [xx, yy, 0], r: rotZ, s: [1, 1, 1.6] }), M.tape);

  // Má kẹp bakelite giữ cạnh ngắn; trục thép bắt vào má kẹp
  for (const s of [-1, 1]) {
    put(g.xf(g.bevel(g.box(0.016, 0.024, 0.03), 0.0015, 2), { t: [s * (CX + 0.004), 0, 0] }), M.bakelite);
    put(g.xf(g.sphere(0.0084, 12, undefined, 0.0046), { t: [s * (CX + 0.004), 0.012, 0] }), M.steel);
  }
  put(g.xf(g.cyl(0.155, 0.012, 24), { t: [-0.1445, 0, 0], r: rotZ }), M.steel);
  put(g.xf(g.cyl(0.123, 0.012, 24), { t: [0.1285, 0, 0], r: rotZ }), M.steel);
  for (const x of [-UPRIGHT_X - 0.011, -UPRIGHT_X + 0.011, UPRIGHT_X - 0.011, UPRIGHT_X + 0.011]) put(g.xf(g.cyl(0.006, 0.019, 24), { t: [x, 0, 0], r: rotZ }), M.steel);

  // Vành trượt: ống cách điện, hai vành đồng, gờ ngăn, đai ốc đầu trục
  put(g.xf(g.cyl(0.058, 0.022, 32), { t: [0.141, 0, 0], r: rotZ }), M.bakelite);
  for (const x of RING_X) put(g.xf(g.cyl(0.011, 0.034, 48), { t: [x, 0, 0], r: rotZ }), M.copper);
  for (const x of [0.115, 0.141, 0.167]) put(g.xf(g.cyl(0.003, 0.027, 40), { t: [x, 0, 0], r: rotZ }), M.bakelite);
  put(g.xf(g.cyl(0.006, 0.018, 6), { t: [0.193, 0, 0], r: rotZ }), M.steel);

  // Hai đầu dây khung dây chạy dọc trục tới từng vành
  put(g.tube([[CX - 0.004, 0.006, 0.01], [0.07, 0.0085, 0.006], [0.1, 0.0075, 0.0035], [RING_X[0] - 0.008, 0.0115, 0.002], [RING_X[0] - 0.004, 0.015, 0.0015]], 0.0009, 10, 6), M.enamel);
  put(g.tube([[CX - 0.004, -0.006, -0.01], [0.07, -0.0085, -0.006], [0.1, -0.0075, -0.0035], [RING_X[1] - 0.008, -0.0115, -0.002], [RING_X[1] - 0.004, -0.015, -0.0015]], 0.0009, 10, 6), M.enamel);

  // Tay quay: moay-ơ, cần nhôm hai đầu tròn, chốt thép, núm gỗ
  const HX = -0.214;
  put(g.xf(g.cyl(0.016, 0.024, 32), { t: [HX, 0, 0], r: rotZ }), M.aluminium);
  put(g.xf(g.bevel(g.box(0.008, 0.065, 0.018), 0.001, 1), { t: [HX - 0.012, 0.0325, 0] }), M.aluminium);
  for (const yy of [0, 0.065]) put(g.xf(g.cyl(0.008, 0.018, 24), { t: [HX - 0.012, yy, 0], r: rotZ }), M.aluminium);
  put(g.xf(g.cyl(0.04, 0.0056, 12), { t: [-0.25, 0.065, 0], r: rotZ }), M.steel);
  put(g.xf(g.capsule(0.046, 0.0092, 20), { t: [-0.254, 0.065, 0], r: rotZ }), M.wood);

  g.output(g.merge(parts));
}

function needle(g) {
  // gốc tại trục kim; kim dài 29 mm hướng lên, nắp trục tròn
  g.output(g.merge([
    g.mat(g.xf(g.box(0.0009, 0.029, 0.0006), { t: [0, 0.0145, 0] }), M.redPaint),
    g.mat(g.xf(g.cyl(0.002, 0.0044, 16), { t: [0, 0, 0.0008], r: rotX }), M.bakelite),
  ]));
}

function lever(g) {
  // gốc tại chân cần; cần thép côn + núm đỏ
  g.output(g.merge([
    g.mat(g.xf(g.cyl(0.022, 0.0044, 12, 0.0044, 0.0056), { t: [0, 0.011, 0] }), M.steel),
    g.mat(g.xf(g.sphere(0.008, 16), { t: [0, 0.023, 0] }), M.redPaint),
  ]));
}

const client = await openServer("nge");
try {
  for (const [name, fn] of [["stator", stator], ["rotor", rotor], ["needle", needle], ["lever", lever]]) {
    const g = new Graph(client, `ac-generator-${name}`);
    fn(g);
    const res = await g.commit(join(OUT, `${name}.json`));
    console.log(`${name}: ${res.blocks} block, ${res.links} kết nối — ${res.validate}`);
  }
  writeFileSync(join(OUT, "materials.json"), JSON.stringify(MATERIALS) + "\n");
} finally {
  client.close();
}
