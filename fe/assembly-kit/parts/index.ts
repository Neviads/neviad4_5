/**
 * Không còn thư viện bộ phận viết sẵn: mọi bộ phận là hình tự dựng ("shape:<id>") hoặc cụm agent đã lưu
 * (part_save_as_type), cả hai do registryFor (shapes/registry.ts) thêm vào. PARTS giữ làm registry gốc rỗng.
 */

import type { Registry } from "../core/solve";

export const PARTS: Registry = {};
