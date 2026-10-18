// TẦNG PRESET — types.ts
// Mô tả một thí nghiệm "đã kiểm duyệt": metadata + schema tham số + applyParams.
// Mỗi thí nghiệm có `kind` riêng; thêm kiểu mới vào union `Preset` bên dưới.

import type { TemplateExperimentScene } from "../engines/template-experiment/engine";
import type { ParamDef } from "../shared/param-panel";

export type Domain =
  | "Cơ học"
  | "Dao động & Sóng"
  | "Quang học"
  | "Điện & Từ"
  | "Nhiệt & Khí"
  | "Hạt nhân";

export type PresetParam = ParamDef & { default: number };

export type PresetBase = {
  id: string;
  title: string;
  domain: Domain;
  grade: 10 | 11 | 12;
  desc: string;
  objective: string;
  sgkRef?: string;
  params: PresetParam[];
};

// Thêm một kiểu preset cho mỗi thí nghiệm, ví dụ:
//   export type MyExperimentPreset = PresetBase & {
//     kind: "my-experiment";
//     applyParams: (p: Record<string, number>) => MyExperimentScene;
//   };
// rồi gộp vào union:  export type Preset = MyExperimentPreset | OtherPreset;
// (`MyExperimentScene` khai báo trong phần kiểu của engines/<x>/engine.ts.)

export type TemplateExperimentPreset = PresetBase & {
  /** Khung nạp `experiments/<Pascal(kind)>Experiment.tsx`; thí nghiệm sinh ra đặt kind đúng bằng slug. */
  kind: "template";
  applyParams: (p: Record<string, number>) => TemplateExperimentScene;
};

export type Preset = TemplateExperimentPreset;
