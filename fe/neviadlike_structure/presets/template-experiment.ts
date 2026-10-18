// TẦNG PRESET — một file / một thí nghiệm. Chỉ khai báo, KHÔNG có công thức.
//
// `params` là hằng số mức module: ParamPanel dựng lại Tweakpane mỗi khi `schema` đổi tham chiếu,
// nên đừng tạo mảng mới trong lúc render. `default` phải khớp DEFAULT_<X>_PARAMS của engine.

import type { TemplateExperimentPreset } from "./types";

// `kind` quyết định file trang: khung nạp `experiments/<Pascal(kind)>Experiment.tsx` và lấy export
// cùng tên. Ở đây kind "template" ↔ `experiments/TemplateExperiment.tsx` xuất `TemplateExperiment`.
// Thí nghiệm do agent sinh đặt kind ĐÚNG BẰNG slug của nó, ví dụ slug "nem-xien" ↔ `NemXienExperiment.tsx`.
export const templateExperimentPreset: TemplateExperimentPreset = {
  id: "template-experiment",
  kind: "template",
  title: "Ném xiên: máy bắn",
  domain: "Cơ học",
  grade: 10,
  desc: "Máy bắn nhả đạn theo nhịp đều; đạn bay theo quỹ đạo parabol rồi rơi xuống đất.",
  objective: "Thấy tầm xa và độ cao cực đại đổi thế nào theo tốc độ rời nòng và góc ngẩng.",
  params: [
    { key: "launchSpeed", label: "Tốc độ rời nòng", unit: "m/s", min: 3, max: 11, step: 0.5, default: 7 },
    { key: "launchAngle", label: "Góc ngẩng", unit: "°", min: 10, max: 80, step: 1, default: 45 },
  ],
  applyParams: () => ({}),
};
