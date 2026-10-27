/**
 * Dựng cây tính năng của một tài liệu (doc.shapes) theo thứ tự khai báo: mỗi hình chỉ dùng hình đứng trước làm đầu
 * vào. Kết quả có cache theo nội dung nút nên sửa một hình không dựng lại các hình khác.
 *
 * Mỗi hình có điểm neo chung theo khung bao (top, bottom, left, right, front, back, center), điểm neo riêng của phép
 * dựng (lathe: axis, surface; sweep: start, end…) và điểm neo agent tự đặt (anchor_define), theo thứ tự ghi đè đó.
 */

import * as THREE from "three";
import type { V3 } from "../core/math";
import { AssemblyError } from "../core/solve";
import type { AnchorSpec, AssemblyDoc, Bounds, ShapeNode } from "../core/types";
import { boxFaces, point } from "../parts/_common";
import { type OpResult, extrude, lathe, mirror, pattern, sweep } from "./ops";
import { booleanOp, groove, loft, roundEdges, splitRegion } from "./ops-solid";

export interface BuiltShape {
  id: string;
  geometry: THREE.BufferGeometry;
  bounds: Bounds;
  anchors: Record<string, AnchorSpec>;
  triangles: number;
  info: string[];
  key: string;
}

const ID = /^[A-Za-z0-9_-]{1,40}$/;
const OPS = ["lathe", "extrude", "sweep", "mirror", "pattern", "loft", "boolean", "roundEdges", "groove", "splitRegion"] as const;
const NEEDS_INPUT = new Set(["mirror", "pattern", "roundEdges", "groove", "splitRegion"]);

const cache = new Map<string, BuiltShape>();

function runOp(node: ShapeNode, label: string, inputs: BuiltShape[]): OpResult {
  const p = node.params ?? {};
  switch (node.op) {
    case "lathe":
      return lathe(p, label);
    case "extrude":
      return extrude(p, label);
    case "sweep":
      return sweep(p, label);
    case "mirror":
      return mirror(p, label, inputs[0].geometry);
    case "pattern":
      return pattern(p, label, inputs[0].geometry);
    case "loft":
      return loft(p, label);
    case "boolean":
      return booleanOp(p, label, inputs.map((i) => i.geometry));
    case "roundEdges":
      return roundEdges(p, label, inputs[0].geometry);
    case "groove":
      return groove(p, label, inputs[0].geometry);
    case "splitRegion":
      return splitRegion(p, label, inputs[0].geometry);
    default:
      throw new AssemblyError(`${label}: không có phép "${(node as ShapeNode).op}". Dùng: ${OPS.join(", ")}.`);
  }
}

function transformAnchor(a: AnchorSpec, m: THREE.Matrix4): AnchorSpec {
  const pt = (v: V3) => new THREE.Vector3(...v).applyMatrix4(m).toArray() as V3;
  const dir = (v: V3) => new THREE.Vector3(...v).transformDirection(m).toArray() as V3;
  switch (a.kind) {
    case "face":
      return { ...a, origin: pt(a.origin), normal: dir(a.normal), up: a.up && dir(a.up), uv: a.uv && [dir(a.uv[0]), dir(a.uv[1])] };
    case "axis":
    case "point":
      return { ...a, origin: pt(a.origin), dir: dir(a.dir), up: a.up && dir(a.up) };
    case "surface":
      return { ...a, origin: pt(a.origin), axis: dir(a.axis), ref: dir(a.ref) };
  }
}

const nodeKey = (node: ShapeNode, inputKeys: string[]) => JSON.stringify([node.op, node.params, node.offset, node.rotate, node.anchors, inputKeys]);

/** Nạp sẵn một hình đã dựng (lưới nướng sẵn do MCP ghi) vào cache, để trình duyệt khỏi dựng lại. */
export function seedShape(built: Omit<BuiltShape, "id">): void {
  cache.set(built.key, { ...built, id: "" });
}

export const hasShape = (key: string) => cache.has(key);

function buildNode(node: ShapeNode, inputs: BuiltShape[], key: string): BuiltShape {
  const label = `[hình ${node.id}]`;

  let res: OpResult;
  try {
    res = runOp(node, label, inputs);
  } catch (e) {
    // lỗi từ tầng hình học chưa có tên hình thì gắn thêm để agent biết hình nào hỏng
    if (e instanceof AssemblyError && !e.message.startsWith("[")) throw new AssemblyError(`${label} ${e.message}`);
    throw e;
  }
  const g = res.geometry;
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...(node.offset ?? [0, 0, 0])),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...((node.rotate ?? [0, 0, 0]).map((d) => (d * Math.PI) / 180) as V3), "XYZ")),
    new THREE.Vector3(1, 1, 1),
  );
  g.applyMatrix4(m);
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  if (bb.isEmpty() || ![...bb.min.toArray(), ...bb.max.toArray()].every(Number.isFinite)) throw new AssemblyError(`${label}: hình rỗng hoặc có toạ độ không hợp lệ.`);
  const bounds: Bounds = { min: bb.min.toArray() as V3, max: bb.max.toArray() as V3 };
  const size = bb.getSize(new THREE.Vector3()).toArray() as V3, center = bb.getCenter(new THREE.Vector3()).toArray() as V3;
  const opAnchors = Object.fromEntries(Object.entries(res.anchors).map(([k, a]) => [k, transformAnchor(a, m)]));
  const anchors: Record<string, AnchorSpec> = {
    ...boxFaces(size, center),
    center: point(center, [0, 1, 0], "tâm khung bao"),
    ...opAnchors,
    ...(node.anchors ?? {}),
  };
  const triangles = (g.index ? g.index.count : g.attributes.position.count) / 3;
  const built: BuiltShape = { id: node.id, geometry: g, bounds, anchors, triangles, info: res.info, key };
  if (cache.size > 300) cache.clear();
  cache.set(key, built);
  return built;
}

/** Kiểm tra cấu trúc cây hình và tính khoá nội dung từng hình (không dựng gì). */
export function shapeKeys(doc: AssemblyDoc): Map<string, string> {
  const keys = new Map<string, string>();
  for (const node of doc.shapes ?? []) {
    if (!ID.test(node.id)) throw new AssemblyError(`id hình "${node.id}" không hợp lệ (chữ, số, _ và -).`);
    if (keys.has(node.id)) throw new AssemblyError(`Trùng id hình "${node.id}".`);
    if (!OPS.includes(node.op)) throw new AssemblyError(`[hình ${node.id}] không có phép "${node.op}". Dùng: ${OPS.join(", ")}.`);
    const ins = node.inputs ?? [];
    if (NEEDS_INPUT.has(node.op) && ins.length !== 1) throw new AssemblyError(`[hình ${node.id}] ${node.op} cần đúng 1 hình đầu vào (input).`);
    if (node.op === "boolean" && ins.length < 2) throw new AssemblyError(`[hình ${node.id}] boolean cần input và ít nhất một hình trong tools.`);
    const inputKeys = ins.map((id) => {
      const k = keys.get(id);
      if (k === undefined) throw new AssemblyError(`[hình ${node.id}] chưa có hình "${id}" (hoặc nó đứng sau). Có: ${[...keys.keys()].join(", ") || "(chưa có)"}.`);
      return k;
    });
    keys.set(node.id, nodeKey(node, inputKeys));
  }
  return keys;
}

/** Hình mà các bộ phận của tài liệu dùng trực tiếp (type "shape:<id>"). */
export const usedShapeIds = (doc: AssemblyDoc) => [...new Set(doc.parts.filter((p) => p.type.startsWith("shape:")).map((p) => p.type.slice(6)))];

/**
 * Dựng các hình của tài liệu (mặc định tất cả; `only` = chỉ những hình này và đầu vào của chúng khi chưa có trong cache).
 * Hình đã có trong cache (kể cả lưới nướng sẵn) thì không dựng lại, kể cả đầu vào của nó. Ném AssemblyError có tên hình.
 */
export function buildShapes(doc: AssemblyDoc, only?: Iterable<string>): Map<string, BuiltShape> {
  const keys = shapeKeys(doc);
  const byId = new Map((doc.shapes ?? []).map((n) => [n.id, n]));
  const out = new Map<string, BuiltShape>();
  const get = (id: string): BuiltShape => {
    const done = out.get(id);
    if (done) return done;
    const key = keys.get(id);
    if (key === undefined) throw new AssemblyError(`Chưa có hình "${id}".`);
    const hit = cache.get(key);
    const built = hit ? { ...hit, id } : buildNode(byId.get(id)!, (byId.get(id)!.inputs ?? []).map(get), key);
    out.set(id, built);
    return built;
  };
  for (const id of only ?? keys.keys()) get(id);
  return out;
}
