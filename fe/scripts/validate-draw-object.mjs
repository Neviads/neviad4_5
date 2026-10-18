// Cổng kiểm tra MỘT vật thể cho backend (DrawObjectAgent): đọc JSON { code, geometry? } từ stdin, in ĐÚNG một dòng JSON
// { problems, report, js, meta, images }.
// Cổng này hỏi code có chạy được không và, khi có geometry, hình có đúng kích thước, bộ phận, điểm không (xem lib/free-object-check.mjs);
// `images` là ảnh vật dựng thật để người vẽ NHÌN (tư thế nghỉ, và bộ phận chuyển động ở mức tối đa). Lỗi bất ngờ cũng thành `problems`,
// không bao giờ thành "đạt"; dựng ảnh hỏng thì chỉ không có ảnh.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
let out;
try {
  const { createFreeChecker } = await import(pathToFileURL(resolve(here, "lib/free-object-check.mjs")).href);
  const parsed = JSON.parse(readFileSync(0, "utf8"));
  const checker = createFreeChecker(resolve(here, ".."));
  const { compiled, ...result } = checker.check(parsed?.code, parsed?.geometry ?? null);
  out = { ...result, images: compiled ? await checker.images(compiled) : [] };
} catch (error) {
  out = { problems: [`Cổng kiểm tra lỗi: ${error instanceof Error ? error.message : String(error)}`], report: [], js: null, meta: null, images: [] };
}
console.log(JSON.stringify(out));
