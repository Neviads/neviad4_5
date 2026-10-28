/**
 * Khoá của mô hình vật lý một tài liệu: băm mọi thứ ảnh hưởng tới nó. MCP ghi mô hình đã tính vào
 * .assembly-bridge/physics/<khoá>.json; trang /lap-rap-3d tính cùng khoá để tải đúng bản, không dựng lại.
 */

import type { AssemblyDoc } from "../core/types";
import { keyHash } from "../shapes/bake";

export const physicsKey = (doc: AssemblyDoc) => keyHash(JSON.stringify([doc.parts, doc.joints, doc.shapes, doc.types, doc.materials, doc.physics]));
