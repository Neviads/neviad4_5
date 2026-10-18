// TẦNG PRESET — registry. Thí nghiệm không được đăng ký ở đây sẽ KHÔNG xuất hiện.
//
// Thêm thí nghiệm: import preset rồi đưa vào mảng, ví dụ
//   import { myExperiment } from "./my-experiment";
//   export const PRESETS: Preset[] = [myExperiment];

import { templateExperimentPreset } from "./template-experiment";
import type { Preset } from "./types";

export const PRESETS: Preset[] = [templateExperimentPreset];
