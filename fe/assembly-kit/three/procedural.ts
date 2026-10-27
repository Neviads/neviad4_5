/**
 * Texture thủ tục cho vật liệu PBR (TextureSpec trong core/types.ts): sinh trường độ cao lặp liền (tileable) rồi đổi
 * thành normal map, hoặc dùng thẳng làm ảnh xám cho độ nhám / màu. Chỉ chạy trong trình duyệt.
 */

import * as THREE from "three";
import type { TextureSpec } from "../core/types";

const SIZE = 512;

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/** Nhiễu giá trị nhiều tầng, lặp liền theo cả hai chiều (lưới tuần hoàn). */
function fbm(seed: number, base = 8, octaves = 5): Float32Array {
  const out = new Float32Array(SIZE * SIZE);
  const rand = rng(seed);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const cells = base << o, lattice = new Float32Array(cells * cells).map(() => rand());
    const at = (x: number, y: number) => lattice[((y % cells) + cells) % cells * cells + (((x % cells) + cells) % cells)];
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const fx = (x / SIZE) * cells, fy = (y / SIZE) * cells, ix = Math.floor(fx), iy = Math.floor(fy);
      const tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx, b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
      out[y * SIZE + x] += (a + (b - a) * sy) * amp;
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** Trường độ cao 0..1 cho từng loại. */
function height(spec: TextureSpec): Float32Array {
  const seed = spec.seed ?? 7, rand = rng(seed * 9973 + 1);
  switch (spec.kind) {
    case "noise":
      return fbm(seed, 8, 5);
    case "grain": {
      // vệt kéo dài theo u (chải xước kim loại, thớ): nhiễu dày theo v, rất thưa theo u
      const out = new Float32Array(SIZE * SIZE), n = fbm(seed, 4, 3);
      const rows = new Float32Array(SIZE).map(() => rand());
      for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) out[y * SIZE + x] = 0.65 * rows[y] + 0.35 * n[y * SIZE + x];
      return out;
    }
    case "scratches": {
      const out = new Float32Array(SIZE * SIZE).fill(1);
      for (let k = 0; k < 140; k++) {
        let x = rand() * SIZE, y = rand() * SIZE;
        const ang = rand() * Math.PI, len = 20 + rand() * 160, depth = 0.3 + rand() * 0.5;
        for (let t = 0; t < len; t++) {
          x += Math.cos(ang);
          y += Math.sin(ang);
          const i = ((Math.round(y) % SIZE) + SIZE) % SIZE * SIZE + (((Math.round(x) % SIZE) + SIZE) % SIZE);
          out[i] = Math.min(out[i], 1 - depth);
        }
      }
      return out;
    }
    case "tread": {
      // gai lốp cho một dải tiện riêng: u chạy quanh chu vi (khối gai lặp theo scale), v ngang mặt lốp.
      // 4 rãnh dọc chu vi, rãnh ngang lệch nhau giữa các hàng khối, mép khối hơi vát.
      const out = new Float32Array(SIZE * SIZE);
      const grooves = [0.2, 0.4, 0.6, 0.8];
      for (let y = 0; y < SIZE; y++) {
        const v = y / SIZE;
        const dg = Math.min(...grooves.map((g) => Math.abs(v - g)));
        const row = grooves.filter((g) => v > g).length;
        for (let x = 0; x < SIZE; x++) {
          const u = (x / SIZE + (row % 2) * 0.5 + v * 0.35) % 1;
          const du = Math.min(u, 1 - u);
          const block = Math.min(1, Math.max(0, (dg - 0.012) / 0.012)) * Math.min(1, Math.max(0, (du - 0.04) / 0.05));
          out[y * SIZE + x] = block;
        }
      }
      return out;
    }
    case "flakes": {
      const out = new Float32Array(SIZE * SIZE);
      for (let i = 0; i < out.length; i++) out[i] = rand();
      return out;
    }
  }
}

function toCanvas(fill: (data: Uint8ClampedArray) => void): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const g = c.getContext("2d")!;
  const img = g.createImageData(SIZE, SIZE);
  fill(img.data);
  g.putImageData(img, 0, 0);
  return c;
}

function finish(c: HTMLCanvasElement, spec: TextureSpec, srgb: boolean): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const s = spec.scale ?? 1;
  t.repeat.set(s, spec.kind === "tread" ? 1 : s);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Normal map (không gian tiếp tuyến) từ trường độ cao, đạo hàm lặp liền mép. */
export function normalTexture(spec: TextureSpec): THREE.Texture {
  const k = (spec.strength ?? 1) * 6;
  if (spec.kind === "flakes") {
    // vảy kim loại: pháp tuyến ngẫu nhiên lệch nhẹ từng hạt
    const rand = rng((spec.seed ?? 7) * 31 + 5), amt = Math.min(0.9, 0.35 * (spec.strength ?? 1));
    return finish(toCanvas((d) => {
      for (let i = 0; i < SIZE * SIZE; i++) {
        const a = rand() * Math.PI * 2, r = rand() * amt;
        const nx = Math.cos(a) * r, ny = Math.sin(a) * r, nz = Math.sqrt(1 - r * r);
        d.set([(nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nz * 0.5 + 0.5) * 255, 255], i * 4);
      }
    }), spec, false);
  }
  const h = height(spec), at = (x: number, y: number) => h[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)];
  return finish(toCanvas((d) => {
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * k, dy = (at(x, y + 1) - at(x, y - 1)) * k;
      const l = Math.hypot(dx, dy, 1);
      d.set([(-dx / l * 0.5 + 0.5) * 255, (dy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255, 255], (y * SIZE + x) * 4);
    }
  }), spec, false);
}

/** Ảnh xám (độ nhám hoặc nhân màu): 1 − strength·(1 − h) để strength 0 là trắng (không đổi gì). */
export function grayTexture(spec: TextureSpec, srgb: boolean): THREE.Texture {
  const h = height(spec), s = spec.strength ?? 0.5;
  return finish(toCanvas((d) => {
    for (let i = 0; i < SIZE * SIZE; i++) {
      const v = Math.round((1 - s * (1 - h[i])) * 255);
      d.set([v, v, v, 255], i * 4);
    }
  }), spec, srgb);
}
