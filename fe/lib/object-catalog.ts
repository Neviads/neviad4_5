// Danh mục vật thể (docs/object-catalog.md) đọc thành dữ liệu cho trang /vat-the-mo-phong.
// Thuần: không đọc file, không dùng API trình duyệt; trang đọc file rồi đưa nội dung vào đây.

export type ObjectPriority = "P1" | "P2" | "P3";

export type CatalogObject = {
  id: string;
  name: string;
  usedIn: string;
  movingParts: string;
  anchor: string;
  priority: ObjectPriority;
  reference: string;
};

export type CatalogGroup = {
  /** Số mục trong file (1, 2, ...). */
  index: number;
  title: string;
  /** Đoạn ghi chú ngay dưới tiêu đề mục, nếu có. */
  note: string;
  objects: CatalogObject[];
};

const GROUP_HEADING = /^## (\d+)\.\s+(.+)$/;
const SEPARATOR = /^\|[\s|:-]+\|$/;
const PRIORITY = /^P[123]$/;

const cells = (line: string): string[] => line.slice(1, line.endsWith("|") ? -1 : undefined).split("|").map((cell) => cell.trim());

/**
 * Các mục đánh số (`## 1. ...`) và bảng vật của chúng, theo đúng thứ tự trong file. Bảng phải có 6 cột: Vật, Dùng ở, Bộ phận chuyển
 * động, Điểm neo, Ưu tiên, Tham khảo. Dòng không đủ cột hay ưu tiên không phải P1–P3 bị bỏ qua; các mục không đánh số (cách đọc,
 * hiện tượng, thứ tự làm) không phải vật nên không được đọc.
 */
export function parseObjectCatalog(markdown: string): CatalogGroup[] {
  const groups: CatalogGroup[] = [];
  let current: CatalogGroup | null = null;
  let tableStarted = false;
  for (const raw of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (line.startsWith("## ")) {
      const heading = GROUP_HEADING.exec(line);
      current = heading ? { index: Number(heading[1]), title: heading[2].trim(), note: "", objects: [] } : null;
      if (current) groups.push(current);
      tableStarted = false;
      continue;
    }
    if (!current) continue;
    if (!line.startsWith("|")) {
      if (line && !tableStarted && !current.note) current.note = line;
      continue;
    }
    if (SEPARATOR.test(line)) continue;
    const row = cells(line);
    if (!tableStarted) { tableStarted = true; continue; } // dòng tiêu đề của bảng
    const [name, usedIn, movingParts, anchor, priority, reference] = row;
    if (row.length < 6 || !name || !PRIORITY.test(priority)) continue;
    current.objects.push({
      id: `${current.index}-${current.objects.length + 1}`,
      name, usedIn, movingParts, anchor, priority: priority as ObjectPriority, reference,
    });
  }
  return groups.filter((group) => group.objects.length > 0);
}
