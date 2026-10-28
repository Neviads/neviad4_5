/**
 * Lưới nướng sẵn: MCP (Node) dựng hình nặng (loft, boolean, bo cạnh, khắc rãnh…) rồi ghi lưới kết quả ra file; trình
 * duyệt tải về và nạp vào cache thay vì dựng lại trên luồng giao diện (dựng lại thân xe mất hàng chục giây).
 *
 * Tệp: [uint32 độ dài header][header JSON][đệm tới bội số 4][position, normal, uv (Float32)][index (Uint32)].
 * Tên tệp là băm của khoá nội dung hình, nên đổi tham số là ra tệp mới, không bao giờ dùng nhầm lưới cũ.
 */

import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BuiltShape } from "./build";

/** Băm 64 bit (hai FNV-1a 32 bit khác hạt giống), dạng 16 ký tự hex. */
export function keyHash(key: string): string {
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x01000193 + 2);
  }
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
}

interface Header {
  key: string;
  bounds: BuiltShape["bounds"];
  anchors: BuiltShape["anchors"];
  featureAnchors?: BuiltShape["anchors"];
  info: string[];
  triangles: number;
  attrs: Record<string, { offset: number; count: number; itemSize: number }>;
  index: { offset: number; count: number };
}

export function encodeShape(s: Omit<BuiltShape, "id">): Uint8Array {
  const src = s.geometry.clone();
  if (!src.attributes.normal) src.computeVertexNormals();
  const g = src.index ? src : mergeVertices(src, 1e-7);
  const names = ["position", "normal", "uv"].filter((n) => g.attributes[n]);
  const parts: ArrayBufferView[] = [];
  const attrs: Header["attrs"] = {};
  let offset = 0;
  for (const n of names) {
    const a = g.attributes[n] as THREE.BufferAttribute;
    const arr = new Float32Array(a.array);
    attrs[n] = { offset, count: arr.length, itemSize: a.itemSize };
    parts.push(arr);
    offset += arr.byteLength;
  }
  const idx = new Uint32Array(g.index!.array);
  const header: Header = { key: s.key, bounds: s.bounds, anchors: s.anchors, featureAnchors: s.featureAnchors, info: s.info, triangles: s.triangles, attrs, index: { offset, count: idx.length } };
  parts.push(idx);
  const head = new TextEncoder().encode(JSON.stringify(header));
  const pad = (4 - ((4 + head.length) % 4)) % 4;
  const out = new Uint8Array(4 + head.length + pad + offset + idx.byteLength);
  new DataView(out.buffer).setUint32(0, head.length, true);
  out.set(head, 4);
  let p = 4 + head.length + pad;
  for (const v of parts) {
    out.set(new Uint8Array(v.buffer, v.byteOffset, v.byteLength), p);
    p += v.byteLength;
  }
  return out;
}

export function decodeShape(buf: ArrayBuffer): Omit<BuiltShape, "id"> {
  const len = new DataView(buf).getUint32(0, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, len))) as Header;
  const base = 4 + len + ((4 - ((4 + len) % 4)) % 4);
  const g = new THREE.BufferGeometry();
  for (const [n, a] of Object.entries(header.attrs)) g.setAttribute(n, new THREE.BufferAttribute(new Float32Array(buf.slice(base + a.offset, base + a.offset + a.count * 4)), a.itemSize));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(buf.slice(base + header.index.offset, base + header.index.offset + header.index.count * 4)), 1));
  g.computeBoundingBox();
  return { geometry: g, bounds: header.bounds, anchors: header.anchors, info: header.info, triangles: header.triangles, key: header.key, featureAnchors: header.featureAnchors ?? {} };
}
