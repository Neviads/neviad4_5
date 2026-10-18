// "Mắt" của xưởng: chờ trình duyệt của người dùng chụp bản mới nhất của một vật, hoặc dựng ảnh thay thế từ thẻ <svg> tĩnh bằng sharp;
// phóng một vùng của khung chụp. Dùng cho tool object_view của Claude (MCP neviad-code).
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { CAPTURE_H, CAPTURE_W, FE_ROOT, findObject, readState, snapshotFile, snapshotMeta } from "./store.mjs";

const sharp = () => createRequire(join(FE_ROOT, "package.json"))("sharp");

/** Ảnh thay thế khi trình duyệt chưa chụp: dựng thẻ <svg> lớn nhất trong tài liệu, không chạy JS. */
export async function staticSvg(html) {
  const blocks = html.match(/<svg\b[\s\S]*?<\/svg>/gi) ?? [];
  const svg = blocks.sort((a, b) => b.length - a.length)[0];
  if (!svg) return null;
  const open = svg.match(/<svg\b[^>]*>/i)[0];
  const box = open.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  const ratio = box ? Number(box[2]) / Number(box[1]) : CAPTURE_H / CAPTURE_W;
  const width = CAPTURE_W * 2, height = Math.round(width * ratio);
  let tag = open.replace(/\s(width|height)\s*=\s*["'][^"']*["']/gi, "").replace(/<svg\b/i, `<svg width="${width}" height="${height}"`);
  if (!/xmlns=/.test(tag)) tag = tag.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  // CSS của tài liệu thường nằm ngoài <svg> (trong <head>): chép vào trong để các class vẫn có màu.
  const styles = (html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) ?? []).join("");
  return sharp()(Buffer.from(tag + styles + svg.slice(open.length))).flatten({ background: "#0f172a" }).png().toBuffer();
}

/** Ảnh chụp (×2) thu về khung CAPTURE_W, hoặc cắt một vùng (px của khung) ở đúng độ phân giải gốc để soi chi tiết. */
export async function crop(png, region) {
  const image = sharp()(png);
  if (!region) return image.resize({ width: CAPTURE_W }).png().toBuffer();
  const meta = await image.metadata();
  const k = meta.width / CAPTURE_W;
  const left = Math.max(0, Math.round(region.x * k)), top = Math.max(0, Math.round(region.y * k));
  const width = Math.max(1, Math.min(meta.width - left, Math.round(region.width * k))), height = Math.max(1, Math.min(meta.height - top, Math.round(region.height * k)));
  return sharp()(png).extract({ left, top, width, height }).png().toBuffer();
}

/**
 * Xem một vật: chờ tới `waitMs` để trình duyệt chụp bản mới nhất. Trả `{ text, png, rev, fromBrowser }`, hoặc `{ text }` khi không có ảnh nào.
 * `page` là đường dẫn trang cần mở để có ảnh chụp thật (chỉ dùng trong lời nhắn).
 */
export async function viewObject({ id, waitMs = 8000, region, page }) {
  const until = Date.now() + Math.max(0, Math.min(30000, waitMs));
  let object = findObject(readState(), id);
  let meta = snapshotMeta(object);
  while (meta?.rev !== object.rev && Date.now() < until) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    object = findObject(readState(), id);
    meta = snapshotMeta(object);
  }
  const where = region ? `, vùng x=${region.x} y=${region.y} ${region.width}×${region.height}` : "";
  const file = snapshotFile(id);
  if (meta?.rev === object.rev && !meta.error && existsSync(file)) {
    return { text: `Ảnh chụp từ trình duyệt: ${object.id} rev ${object.rev}${where}.`, png: await crop(readFileSync(file), region), rev: object.rev, fromBrowser: true };
  }
  const why = meta?.rev === object.rev && meta.error
    ? `Trình duyệt chụp lỗi: ${meta.error}`
    : `Chưa có ảnh chụp của bản mới nhất (trang ${page} có đang mở không?).`;
  const fallback = await staticSvg(object.html).catch(() => null);
  if (!fallback) return { text: `${why} Cũng không dựng được SVG tĩnh để thay.` };
  return { text: `${why} Đây là ẢNH THAY THẾ dựng từ thẻ <svg> tĩnh: không chạy JS, CSS ngoài thẻ <svg> có thể không áp dụng.`, png: await crop(fallback, region), rev: object.rev, fromBrowser: false };
}
