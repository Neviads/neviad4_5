// Đưa các vật đã vẽ (kết quả của skill draw-object) vào bản sao của neviadlike_structure, và các tên suy ra từ slug của thí nghiệm.
// Thuần: không import tương đối và không API trình duyệt, để Node cũng nạp thẳng được khi kiểm thử.

/** Cùng luật với `PipelineNames.slugify` của backend: bỏ dấu, `đ` thành `d`, gạch ngang, tối đa 40 ký tự, ít nhất 3 ký tự. */
export function slugify(title: string): string {
  const MAX = 40;
  let text = (title ?? "").replace(/đ/g, "d").replace(/Đ/g, "D").normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
  text = text.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (text.length > MAX) text = text.slice(0, MAX).replace(/-+$/, "");
  return text.length < 3 ? "thi-nghiem" : text;
}

export type ExperimentNames = { slug: string; pascal: string; camel: string; snake: string };

/** Cùng luật với `PipelineNames.of` của backend. */
export function namesOf(slug: string): ExperimentNames {
  let pascal = slug.split("-").filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join("");
  if (/^[0-9]/.test(pascal)) pascal = `E${pascal}`; // một định danh TypeScript không bắt đầu bằng chữ số
  return { slug, pascal, camel: pascal[0].toLowerCase() + pascal.slice(1), snake: slug.toUpperCase().replace(/-/g, "_") };
}

export const engineFiles = (slug: string): string[] => [`engines/${slug}/engine.ts`];

/** Vật được đánh số từ 1. */
export const objectFilePath = (slug: string, device: number): string => `objects/${slug}-${device}.ts`;

export const notesFilePath = (slug: string): string => `_notes/${slug}.md`;

/** Phần của một vật đã vẽ mà file vật cần. */
export type DrawnObject = { name?: string; code?: string; anchor?: string | null; title?: string };

/**
 * Nội dung file `objects/<slug>-<n>.ts`: đầu file (kiểu `ShapeObject`, bảng token màu và font của khung) + code TypeScript của vật + `export`.
 * Cùng khung với các vật có sẵn trong neviadlike_structure/objects.
 */
export function objectFileContent(item: DrawnObject, fileName: string): string {
  if (!item.name || !item.code) throw new Error("Vật chưa có code để ghi vào bản sao.");
  return [
    `// TẦNG OBJECTS — ${fileName}`,
    `// Sinh bởi skill draw-object${item.title ? ` từ vật "${item.title}"` : ""}. Chỉ là hình, không có vật lý: (p, ppm, fill, label) => { group, parts, points }.`,
    item.anchor ? `// Điểm neo: ${item.anchor.replace(/\s+/g, " ")}` : "",
    `import Konva from "konva";`,
    `import { objectFontFamily } from "./palette";`,
    `import type { MovingPart, ShapeObject, Vec2 } from "./types";`,
    ``,
    `const getSimulationFontFamily = (): string => objectFontFamily();`,
    ``,
    item.code.trim(),
    ``,
    `export { ${item.name} };`,
    ``,
  ].filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
}
