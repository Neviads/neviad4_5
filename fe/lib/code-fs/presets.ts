// Chọn thí nghiệm nào trong `PRESETS` của bản sao sẽ được chạy. Thuần: không import tương đối, để Node nạp được khi kiểm thử.
//
// Bản sao luôn còn các thí nghiệm mẫu của khung (template-experiment), nên `PRESETS[0]` thường KHÔNG phải thí nghiệm agent vừa tạo:
// thí nghiệm của agent có `kind` bằng slug của nó, và được ưu tiên.

export type PickablePreset = { id: string; kind: string };

/** Preset có `kind` đúng bằng `preferKind` nếu có; không thì phần tử đầu tiên; mảng rỗng thì undefined. */
export function pickPreset<T extends PickablePreset>(presets: T[], preferKind?: string | null): T | undefined {
  if (preferKind) {
    const preferred = presets.find((preset) => preset.kind === preferKind);
    if (preferred) return preferred;
  }
  return presets[0];
}
