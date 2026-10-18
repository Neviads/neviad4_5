import type { DrawObjectItem } from "@/components/draw-object-skill/types";
import type { ScenarioData } from "@/components/test-litespec/ScenarioCard";
import type { SmokeResult } from "@/lib/code-fs/engine-smoke";
import { namesOf, notesFilePath, objectFileContent, objectFilePath, slugify } from "@/lib/code-fs/install-objects";
import type { CodeFsStore } from "@/lib/code-fs/store";
import { runCodeLayer, type AgentResult, type CodeLayer, type ObjectInfo } from "./api";

// Ba agent code (engine, renderer, experiment) lần lượt viết vào bản sao của neviadlike_structure trong trình duyệt này; sau mỗi tầng trang kiểm tra
// trong Chrome. Dùng cho trang chủ `/`: phiên live code, bản sao và các vật đã vẽ phải có sẵn.

/** Các bước của phần này, theo thứ tự. */
export type CodeStage = "objects" | "engine" | "smoke" | "renderer" | "scene" | "experiment";

/** Lỗi kèm bước đang chạy, để giao diện đánh dấu đúng bước. */
export class CodeStageError extends Error {
  constructor(readonly stage: CodeStage, message: string) { super(message); }
}

export type CodeAgentRun = {
  codeFs: CodeFsStore;
  runId: string;
  said: string;
  phenomenon: string;
  objects: { id: string; title: string }[];
  /** Vật đã vẽ xong (status "ok", có name và code), theo id. */
  drawn: Record<string, DrawObjectItem>;
  scenario: ScenarioData;
};

export type CodeAgentHooks = {
  stage: (stage: CodeStage, state: "doing" | "done") => void;
  layer: (layer: CodeLayer, result: AgentResult) => void;
  smoke: (result: SmokeResult) => void;
  notes: (text: string) => void;
};

const STAGE_OF_LAYER: Record<CodeLayer, CodeStage> = { engine: "engine", renderer: "renderer", experiment: "experiment" };

/** Ghi các vật vào bản sao, chạy ba tầng và kiểm tra giữa chúng; trả slug của thí nghiệm. Ném `CodeStageError` khi một bước hỏng. */
export async function runCodeAgents(run: CodeAgentRun, hooks: CodeAgentHooks): Promise<{ slug: string }> {
  const { codeFs, runId, said, scenario, objects, drawn } = run;
  let stage: CodeStage = "objects";
  try {
    const slug = slugify(run.phenomenon || said);
    const names = namesOf(slug);

    hooks.stage("objects", "doing");
    const infos: ObjectInfo[] = [];
    for (const [index, object] of objects.entries()) {
      const item = drawn[object.id];
      const path = objectFilePath(slug, index + 1);
      await codeFs.write(runId, path, objectFileContent({ name: item.name, code: item.code, anchor: item.anchor, title: item.title }, `${slug}-${index + 1}.ts`));
      // Hình học của vật (kích thước, neo, điểm, bộ phận) không gửi kèm: backend đọc nó từ objectGeometry của kịch bản, nguồn duy nhất.
      infos.push({ id: object.id, title: object.title, file: path, functionName: item.name ?? "", notes: item.notes ?? "" });
    }
    hooks.stage("objects", "done");

    /** Một tầng: gọi agent, ghi lại kết quả, đọc lại ghi chú chung; ném lỗi nếu agent chưa xong. */
    const runLayer = async (layer: CodeLayer): Promise<void> => {
      stage = STAGE_OF_LAYER[layer];
      hooks.stage(stage, "doing");
      const agent = await runCodeLayer(layer, { runId, slug, request: said, scenario, objects: infos });
      hooks.layer(layer, agent);
      hooks.notes((await codeFs.read(runId, notesFilePath(slug))) ?? "");
      if (agent.status !== "finished") throw new Error(`Agent ${layer} chưa xong sau ${agent.rounds} lượt (chưa gọi finish).${agent.failures?.length ? ` Lỗi: ${agent.failures.join(" | ")}` : ""}`);
      hooks.stage(stage, "done");
    };

    await runLayer("engine");

    stage = "smoke";
    hooks.stage("smoke", "doing");
    // sucrase và konva chỉ nạp khi đến đây (konva cần `window`).
    const [{ createCopyLoader }, { smokeEngine }] = await Promise.all([import("@/lib/code-fs/runtime"), import("@/lib/code-fs/engine-smoke")]);
    const checked = await smokeEngine(async (path) => (await createCopyLoader(codeFs, runId)).load(path), slug,
      objects.map((o) => ({ id: o.id, parts: (scenario.objectGeometry?.find((g) => g.objectId === o.id)?.parts ?? []).map((part) => ({ name: part.name, min: part.min, max: part.max })) })));
    hooks.smoke(checked);
    if (!checked.ok) throw new Error("Engine chạy thử chưa đạt (xem chi tiết bên dưới), nên chưa viết renderer.");
    hooks.stage("smoke", "done");

    await runLayer("renderer");

    stage = "scene";
    hooks.stage("scene", "doing");
    const scene = await (await createCopyLoader(codeFs, runId)).load(`renderers/${slug}/${slug}-scene.tsx`);
    if (typeof scene[`${names.pascal}Scene`] !== "function") throw new Error(`renderers/${slug}/${slug}-scene.tsx phải xuất \`${names.pascal}Scene\`.`);
    hooks.stage("scene", "done");

    await runLayer("experiment");
    return { slug };
  } catch (failure) {
    throw failure instanceof CodeStageError ? failure : new CodeStageError(stage, failure instanceof Error ? failure.message : String(failure));
  }
}
