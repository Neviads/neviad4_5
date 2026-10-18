import { matchExperiments, type CatalogEntry } from "./api";

// Mục lục thư viện thí nghiệm có sẵn (`components/simulations/presets/`, trang `/mo-phong-vat-ly`) cho bước so khớp trước luồng lite.
// Nạp động: trang chủ không kéo 58 preset (cùng các hàm cảnh của chúng) vào gói đầu, chỉ khi giáo viên gửi yêu cầu.

export type MatchedExperiment = CatalogEntry & { reason: string };

let catalog: Promise<CatalogEntry[]> | null = null;

function loadCatalog(): Promise<CatalogEntry[]> {
  catalog ??= import("@/components/simulations/presets")
    .then(({ PRESETS }) => PRESETS.map(({ id, title, domain, grade, desc, objective }) => ({ id, title, domain, grade, desc, objective })))
    .catch((error) => { catalog = null; throw error; });
  return catalog;
}

/** Các thí nghiệm có sẵn mà yêu cầu khớp, tốt nhất trước; lỗi (be, mạng) thì rỗng: việc so khớp không bao giờ chặn luồng tạo mới. */
export async function findExperiments(request: string): Promise<MatchedExperiment[]> {
  try {
    const entries = await loadCatalog();
    const { matches } = await matchExperiments(request, entries);
    return matches.flatMap((match) => {
      const entry = entries.find((item) => item.id === match.id);
      return entry ? [{ ...entry, reason: match.reason }] : [];
    });
  } catch {
    return [];
  }
}
