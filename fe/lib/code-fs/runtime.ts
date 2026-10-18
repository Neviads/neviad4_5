import Konva from "konva";
import * as KonvaModule from "konva";
import * as Lucide from "lucide-react";
import * as React from "react";
import * as JsxRuntime from "react/jsx-runtime";
import * as Tweakpane from "tweakpane";
import type { ComponentType } from "react";
import { createModuleLoader, ModuleLoadError, type HostModules, type Loader, type Transform } from "./loader";
import type { CodeFsStore } from "./store";

// Chạy thí nghiệm ngay từ bản sao trong Chrome: sucrase đổi TS/TSX thành JS ở trình duyệt, còn các thư viện là bản mà chính trang này
// đã có (cùng một React, nên hook dùng chung). Chỉ client: sucrase được nạp lười ở lần chạy đầu.

/** `next/link` của trang cần bối cảnh của Next; trong bản sao chỉ cần một đường dẫn bình thường. */
function LinkStub({ href, children, ...rest }: { href?: unknown; children?: React.ReactNode } & Record<string, unknown>) {
  return React.createElement("a", { ...rest, href: typeof href === "string" ? href : "#" }, children);
}

/** Thư viện mà code trong bản sao được import (khoá là chuỗi import). `default` cho `import X from "..."`. */
export const HOST_MODULES: HostModules = {
  react: React,
  "react/jsx-runtime": JsxRuntime,
  konva: { ...KonvaModule, default: Konva, __esModule: true },
  "lucide-react": Lucide,
  tweakpane: Tweakpane,
  "next/link": { default: LinkStub, __esModule: true },
};

/** Sucrase nạp lười; file `.tsx` có JSX, file `.ts` thì không (để `<T>x` không bị hiểu thành thẻ). */
export async function createTransform(): Promise<Transform> {
  const { transform } = await import("sucrase");
  return (code, path) => transform(code, {
    transforms: path.endsWith(".tsx") ? ["typescript", "jsx", "imports"] : ["typescript", "imports"],
    jsxRuntime: "automatic",
    production: true,
    filePath: path,
  }).code;
}

export type PresetLike = { id: string; title: string; kind: string } & Record<string, unknown>;
export type ExperimentComponent = ComponentType<{ preset: PresetLike }>;

export type OpenedCopy = {
  presets: PresetLike[];
  /** Component của thí nghiệm có `kind` đó: `experiments/<Pascal(kind)>Experiment.tsx` xuất `<Pascal(kind)>Experiment`. */
  componentFor: (kind: string) => Promise<ExperimentComponent>;
};

/** "hydraulic-lift" thành "HydraulicLift". */
export function pascalOf(kind: string): string {
  return kind.split(/[^A-Za-z0-9]+/).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join("");
}

/** Bộ nạp module cho bản sao của một run: đọc file từ IndexedDB, biên dịch bằng sucrase, thư viện lấy từ trang. */
export async function createCopyLoader(codeFs: CodeFsStore, runId: string): Promise<Loader> {
  return createModuleLoader({ read: (path) => codeFs.read(runId, path), transform: await createTransform(), host: HOST_MODULES });
}

/** Nạp `presets/index.ts` của bản sao và trả về danh sách thí nghiệm cùng cách lấy component của chúng. */
export async function openCopy(codeFs: CodeFsStore, runId: string): Promise<OpenedCopy> {
  const loader = await createCopyLoader(codeFs, runId);
  const registry = await loader.load("presets/index.ts");
  const presets = registry.PRESETS;
  if (!Array.isArray(presets)) throw new ModuleLoadError("presets/index.ts phải xuất `PRESETS` là một mảng.");
  return {
    presets: presets as PresetLike[],
    async componentFor(kind: string): Promise<ExperimentComponent> {
      const pascal = pascalOf(kind);
      if (!pascal) throw new ModuleLoadError(`kind "${kind}" không hợp lệ.`);
      const exported = await loader.load(`experiments/${pascal}Experiment.tsx`);
      const component = exported[`${pascal}Experiment`];
      if (typeof component !== "function") throw new ModuleLoadError(`experiments/${pascal}Experiment.tsx phải xuất \`${pascal}Experiment\`.`);
      return component as ExperimentComponent;
    },
  };
}
