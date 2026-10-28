/**
 * Điểm vào cho server MCP neviad-assembly (đóng gói bằng esbuild, chạy trong Node): thư viện bộ phận, bộ giải,
 * dây nối, báo cáo, cây tính năng hình (shapes/), danh mục vật liệu. Không gọi tới phần dựng cảnh nên không cần document.
 */

export { PARTS } from "./parts";
export { AssemblyError, anchorFrame, parseRef, solve, transformAnchorSpec, transformBounds, worldBounds, worldOrigin } from "./core/solve";
export { chain, invertRigid } from "./core/math";
export { solveRoute } from "./core/route";
export { describeTree, partReport, typeInfo, typeList } from "./core/report";
export { MATERIAL_NAMES } from "./core/types";
export { PRESETS, TEXTURE_KINDS, checkMaterialRef } from "./core/materials";
export { buildShapes, shapeKeys, usedShapeIds } from "./shapes/build";
export { sand } from "./shapes/sand";
export { encodeShape, keyHash } from "./shapes/bake";
export { initKernel } from "./shapes/kernel";
export { SHAPE_PREFIX, checkDocExtras, checkTypeName, registryFor } from "./shapes/registry";
export { buildPhysicsModel, bodyOfPart } from "./physics/build-model";
export { World } from "./physics/solver";
export { descendants, flatten, partOrCluster, worldGeometry } from "./physics/geometry";
export { kernel, toManifold } from "./shapes/kernel";
export { physicsKey } from "./physics/key";
