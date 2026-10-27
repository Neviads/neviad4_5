/**
 * Lõi hình khối kín (manifold-3d, WASM) cho boolean và các phép cần lưới kín (khắc rãnh). Nạp bất đồng bộ một lần;
 * sau đó mọi phép đều đồng bộ nên buildShapes vẫn sync. Không import tĩnh manifold-3d: Node (MCP) nạp gói npm, trình
 * duyệt nạp bản trong public/wasm (three/kernel-browser.ts), để bundler không phải đóng gói WASM.
 */

import type { Manifold, ManifoldToplevel } from "manifold-3d";
import * as THREE from "three";
import { mergeVertices, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { AssemblyError } from "../core/solve";

type Loader = () => Promise<{ default: (cfg?: { locateFile: () => string }) => Promise<ManifoldToplevel> }>;

let wasm: ManifoldToplevel | null = null;
let loading: Promise<ManifoldToplevel> | null = null;

export function initKernel(load: Loader): Promise<ManifoldToplevel> {
  if (wasm) return Promise.resolve(wasm);
  loading ??= load()
    .then((m) => m.default())
    .then((w) => {
      w.setup();
      wasm = w;
      return w;
    });
  return loading;
}

export const kernelReady = () => wasm !== null;

export function kernel(): ManifoldToplevel {
  if (!wasm) throw new AssemblyError("Lõi hình khối (manifold) chưa nạp: gọi initKernel() trước khi dựng hình có boolean / groove.");
  return wasm;
}

/** Lưới three → Manifold. Hàn đỉnh trùng vị trí (bỏ UV và pháp tuyến) để lưới kín; hở thì báo lỗi kèm gợi ý. */
export function toManifold(g: THREE.BufferGeometry, label: string): Manifold {
  const { Manifold, Mesh } = kernel();
  const pos = new THREE.BufferGeometry();
  pos.setAttribute("position", g.attributes.position.clone());
  if (g.index) pos.setIndex(g.index.clone());
  const welded = mergeVertices(pos.index ? pos.toNonIndexed() : pos, 1e-6);
  const mesh = new Mesh({
    numProp: 3,
    vertProperties: new Float32Array(welded.attributes.position.array),
    triVerts: new Uint32Array(welded.index!.array),
  });
  mesh.merge();
  try {
    const m = new Manifold(mesh);
    if (m.isEmpty()) throw new Error("rỗng");
    return m;
  } catch {
    throw new AssemblyError(`${label}: hình không kín nên không làm boolean / khắc được. Tiện thì cho biên dạng bắt đầu và kết thúc ở trục (x = 0) hoặc dùng wall; quét thì bật caps; loft thì caps khác "open".`);
  }
}

/** Manifold → lưới three có index, chỉ vị trí (đỉnh dùng chung, để xử lý lưới tiếp). */
export function fromManifoldIndexed(m: Manifold): THREE.BufferGeometry {
  const mesh = m.getMesh();
  const g = new THREE.BufferGeometry();
  const n = mesh.numProp;
  const pos = new Float32Array((mesh.vertProperties.length / n) * 3);
  for (let i = 0, j = 0; i < mesh.vertProperties.length; i += n, j += 3) pos.set(mesh.vertProperties.subarray(i, i + 3), j);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(mesh.triVerts), 1));
  return g;
}

/** Manifold → lưới three, pháp tuyến mượt trong vùng cong, gãy ở cạnh > 30°. */
export const fromManifold = (m: Manifold): THREE.BufferGeometry => toCreasedNormals(fromManifoldIndexed(m), (30 * Math.PI) / 180);
