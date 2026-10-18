// TẦNG OBJECTS — palette.ts
// Bảng token màu, nét và hiệu ứng cho mọi vật thể: nguồn duy nhất, khớp bảng trong SKILL.md.
// Màu thân của vật do bên gọi truyền vào (`fill`); mọi màu khác lấy từ đây.
// Nền cảnh (#0f172a, lưới, sàn) thuộc shared/draw-axes.ts (SCENE_COLORS), không thuộc vật thể.

export const COLOR = {
  // Vật cố định, nền sẫm.
  deep: "#0f172a",
  deeper: "#111827",
  fixed: "#1e293b",
  // Kim loại, nét máy (thang slate).
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate300: "#cbd5e1",
  slate200: "#e2e8f0",
  // Viền sáng cùng tông với thân màu.
  rimSky: "#bae6fd",
  rimTeal: "#99f6e4",
  rimTealDeep: "#5eead4",
  // Điểm sáng rất nhạt.
  glintSky: "#e0f2fe",
  glintTeal: "#ccfbf1",
  glintWhite: "#f8fafc",
  // Cung/bóng tối cùng tông.
  shadeTeal: "#0f766e",
  // Kim đo, mốc, nhấn.
  needle: "#ef4444",
  mark: "#38bdf8",
  accent: "#fb923c",
  // Chữ.
  inkOnFill: "#082f49",
  inkOnTeal: "#042f2e",
  inkOnDark: "#e2e8f0",
  // Bóng đổ.
  shadow: "#020617",
} as const;

export const STROKE = {
  /** Viền thân chính. */
  body: 2.5,
  /** Viền chi tiết nhỏ. */
  detail: 1.2,
  /** Thanh, dây nối. */
  link: 4,
} as const;

/** Bóng đổ của thân chính — chỉ đặt lên thân chính, không rải lên chi tiết nhỏ. */
export const BODY_SHADOW = {
  shadowBlur: 10,
  shadowColor: COLOR.shadow,
  shadowOpacity: 0.46,
  shadowOffset: { x: 3, y: 5 },
} as const;

/** Kẹp giá trị vào [min, max]; dùng cho mọi kích thước suy từ `radius`. */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const FALLBACK_FONT_FAMILY = "Arial, Helvetica, sans-serif";
let cachedFontFamily: string | null = null;

/** Font cho Konva.Text. Canvas không kế thừa font từ DOM nên đọc family thật từ biến CSS `--font-inter`. */
export function objectFontFamily(): string {
  if (typeof window === "undefined") return FALLBACK_FONT_FAMILY;
  if (cachedFontFamily) return cachedFontFamily;
  cachedFontFamily =
    window.getComputedStyle(document.documentElement).getPropertyValue("--font-inter").trim() ||
    FALLBACK_FONT_FAMILY;
  return cachedFontFamily;
}
