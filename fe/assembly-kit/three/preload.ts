/**
 * Trước khi dựng một tài liệu trong trình duyệt: tải lưới nướng sẵn (MCP ghi ở .assembly-bridge/meshes) của các hình
 * mà bộ phận dùng, kể cả trong cụm lồng, rồi nạp vào cache hình. Hình nào chưa có tệp thì để buildShapes tự dựng.
 */

import type { AssemblyDoc } from "../core/types";
import { decodeShape, keyHash } from "../shapes/bake";
import { hasShape, seedShape, shapeKeys, usedShapeIds } from "../shapes/build";

export async function preloadMeshes(doc: AssemblyDoc, endpoint = "/api/assembly-bridge"): Promise<number> {
  const keys: string[] = [];
  const walk = (d: AssemblyDoc) => {
    if (d.shapes?.length) {
      const all = shapeKeys(d);
      for (const id of usedShapeIds(d)) {
        const k = all.get(id);
        if (k && !hasShape(k)) keys.push(k);
      }
    }
    for (const t of Object.values(d.types ?? {})) walk(t.doc);
  };
  walk(doc);
  const loaded = await Promise.all(keys.map(async (k) => {
    try {
      const res = await fetch(`${endpoint}?mesh=${keyHash(k)}`);
      if (!res.ok) return 0;
      const s = decodeShape(await res.arrayBuffer());
      if (s.key !== k) return 0; // trùng băm hiếm gặp: bỏ, để tự dựng
      seedShape(s);
      return 1;
    } catch {
      return 0;
    }
  }));
  return loaded.reduce<number>((a, b) => a + b, 0);
}
