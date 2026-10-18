import type Konva from "konva";
import type { ShapeObject, Vec2 } from "@/neviadlike_structure/objects/types";
import type { DrawObjectItem } from "@/components/draw-object-skill/types";

// Kho vật thể đã vẽ: collection "objects" trong DB (nạp bằng `npm --prefix fe run push:objects` từ fe/object-library). Mỗi file là một hàm
// dựng vật ở cấp cao nhất theo hợp đồng ShapeObject, kèm khối /* OBJECT-META {...} */ nối vật với một dòng của docs/object-catalog.md.
// Chỉ chạy ở trình duyệt: code của vật được biên dịch bằng sucrase rồi chạy với Konva của trang.

export type ObjectPartMeta = { name: string; label?: string; motion: "slide" | "rotate"; axis?: string; min: number; max: number; description?: string };

export type ObjectMeta = {
  /** Tên vật đúng như cột "Vật" của docs/object-catalog.md. */
  catalog: string;
  title: string;
  anchor: string;
  /** Khung bao ở tư thế nghỉ, mét. */
  size: { width: number; height: number };
  parts: ObjectPartMeta[];
  points: { name: string; description?: string }[];
  /** Màu gợi ý truyền vào `fill` khi xem trước (nghĩa của fill tuỳ vật: thân máy, áo, chất lỏng). */
  fill?: string;
  notes?: string;
  /** Khi nào nên chọn vật này khi duyệt kho (mỗi ý một câu kiểm tra được). */
  useWhen?: string[];
  /** Khi nào KHÔNG nên chọn: vật gần giống nhưng khác loại, thang nhìn, phiên bản. */
  avoidWhen?: string[];
};

export type ShapeMaker = (p: Vec2, ppm: number, fill: string, label?: string) => ShapeObject;

export type LibraryObject = { path: string; meta: ObjectMeta; make: ShapeMaker };

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
const META = /\/\*\s*OBJECT-META\s*([\s\S]*?)\*\//;
const FACTORY = /(?:^|\n)\s*(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)\s*(?:=|\()/g;

/** Tên hàm dựng vật: ưu tiên makeXxx, như scripts/lib/free-object-check.mjs. */
function factoryName(code: string): string | null {
  const names = [...code.matchAll(FACTORY)].map((match) => match[1]);
  return names.find((name) => /^make[A-Z0-9_]/.test(name)) ?? names[0] ?? null;
}

/**
 * Một vật có sẵn trong kho, dưới dạng vật đã vẽ để đưa cho code agent (thay cho bước vẽ). `path` là id agent chọn; code là cả file như trong
 * kho (hàm dựng ở cấp cao nhất), tên hàm lấy như lúc dựng ở trang kho.
 */
export async function loadReferenceItem(path: string, title: string, request: string): Promise<DrawObjectItem> {
  const response = await fetch(`${apiBaseUrl}/api/v1/source/objects/file?path=${encodeURIComponent(path)}`);
  if (!response.ok) throw new Error(`Không lấy được vật tham khảo ${path} (HTTP ${response.status}).`);
  const { content } = await response.json() as { content: string };
  const metaText = META.exec(content)?.[1];
  const meta = metaText ? JSON.parse(metaText) as ObjectMeta : null;
  if (!meta) throw new Error(`Vật tham khảo ${path} thiếu khối OBJECT-META.`);
  const name = factoryName(content.replace(META, ""));
  if (!name) throw new Error(`Vật tham khảo ${path} không có hàm dựng vật.`);
  // Thẻ xem trước (DrawObjectStatic) chạy `js` và dựng theo hợp đồng hình khi có `size`, như với vật vừa vẽ.
  const { transform } = await import("sucrase");
  const js = transform(content, { transforms: ["typescript"], filePath: path }).code;
  return {
    id: 0, title, request, source: "lite", status: "ok", attempts: 0, name, anchor: meta.anchor, notes: meta.notes, code: content, js,
    size: meta.size,
    moving: meta.parts.map((part) => ({ name: part.name, motion: part.motion, axis: part.axis ?? "", min: part.min, max: part.max })),
    points: [],
  };
}

/** Mọi vật trong DB đã dựng được; vật hỏng (thiếu meta, lỗi biên dịch) được bỏ qua và báo trong `errors`. */
export async function fetchObjectLibrary(konva: typeof Konva, fontFamily: () => string): Promise<{ objects: LibraryObject[]; errors: string[] }> {
  const response = await fetch(`${apiBaseUrl}/api/v1/source/objects`);
  if (!response.ok) throw new Error(`Không tải được kho vật thể (HTTP ${response.status}).`);
  const { files } = await response.json() as { files: { path: string; content: string }[] };
  const { transform } = await import("sucrase");
  const objects: LibraryObject[] = [];
  const errors: string[] = [];
  for (const file of files) {
    if (!file.path.endsWith(".ts")) continue;
    try {
      const metaText = META.exec(file.content)?.[1];
      if (!metaText) throw new Error("thiếu khối OBJECT-META");
      const meta = JSON.parse(metaText) as ObjectMeta;
      const name = factoryName(file.content.replace(META, ""));
      if (!name) throw new Error("không thấy hàm dựng vật");
      const js = transform(file.content, { transforms: ["typescript"], filePath: file.path }).code;
      const make = new Function("Konva", "getSimulationFontFamily", `"use strict";\n${js}\nreturn ${name};`)(konva, fontFamily) as ShapeMaker;
      objects.push({ path: file.path, meta, make });
    } catch (error) {
      errors.push(`${file.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { objects, errors };
}
