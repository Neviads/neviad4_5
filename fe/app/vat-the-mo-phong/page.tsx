import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ObjectCatalog } from "@/components/object-catalog/ObjectCatalog";
import { parseObjectCatalog } from "@/lib/object-catalog";

// Kho vật thể mô phỏng: đọc docs/object-catalog.md mỗi lần mở trang, nên sửa danh mục là thấy ngay.
export const dynamic = "force-dynamic";

const CATALOG = existsSync(resolve(process.cwd(), "docs/object-catalog.md"))
  ? resolve(process.cwd(), "docs/object-catalog.md")
  : resolve(process.cwd(), "../docs/object-catalog.md");

export default function VatTheMoPhongPage() {
  if (!existsSync(CATALOG)) return <ObjectCatalog groups={[]} error="Không tìm thấy docs/object-catalog.md." />;
  return <ObjectCatalog groups={parseObjectCatalog(readFileSync(CATALOG, "utf8"))} />;
}
