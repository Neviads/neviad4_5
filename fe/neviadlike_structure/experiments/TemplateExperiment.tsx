"use client";

// TẦNG EXPERIMENT — trang chi tiết của một thí nghiệm: ghép khung + renderer + panel.
// Giữ state UI ở đây (params, running, speed, command, metrics); KHÔNG chứa công thức vật lý
// (thuộc engines) và KHÔNG tự vẽ canvas (thuộc renderers).
// KHÔNG tự viết header / bố cục / tab: dùng `ExperimentFrame` trong ../shared.
//
// Lưu ý: `preset.params` phải là tham chiếu ổn định (hằng module), vì ParamPanel dựng lại
// Tweakpane mỗi khi `schema` đổi tham chiếu.

import { useState } from "react";

import {
  createTemplateExperimentState,
  DEFAULT_TEMPLATE_EXPERIMENT_PARAMS,
  TEMPLATE_EXPERIMENT_PHASE_LABELS,
  templateExperimentMetrics,
  type TemplateExperimentCommand,
} from "../engines/template-experiment/engine";
import type { TemplateExperimentPreset } from "../presets/types";
import { TemplateExperimentScene } from "../renderers/template-experiment/template-experiment-scene";
import { ExperimentFrame, Metric } from "../shared/experiment-frame";
import { ParamPanel } from "../shared/param-panel";
import { SimulationToolbar } from "../shared/simulation-toolbar";

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

export function TemplateExperiment({ preset }: { preset: TemplateExperimentPreset }) {
  const [params, setParams] = useState(DEFAULT_TEMPLATE_EXPERIMENT_PARAMS);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [resetSignal, setResetSignal] = useState(0);
  const [command, setCommand] = useState({ type: "start" as TemplateExperimentCommand, token: 0 });
  const [metrics, setMetrics] = useState(() =>
    templateExperimentMetrics(
      createTemplateExperimentState(DEFAULT_TEMPLATE_EXPERIMENT_PARAMS),
      DEFAULT_TEMPLATE_EXPERIMENT_PARAMS,
    ));

  const sendCommand = (type: TemplateExperimentCommand) =>
    setCommand((current) => ({ type, token: current.token + 1 }));

  const reset = () => {
    setRunning(false);
    setResetSignal((value) => value + 1);
  };

  const changeRunning = (next: boolean) => {
    if (next) sendCommand(metrics.phase === "paused" ? "resume" : "start");
    else sendCommand("pause");
    setRunning(next);
  };

  return (
    <ExperimentFrame
      title={preset.title}
      badge={`${preset.domain} · Lớp ${preset.grade}`}
      objective={preset.objective}
      scene={(
        <TemplateExperimentScene
          params={params}
          running={running}
          speed={speed}
          resetSignal={resetSignal}
          command={command}
          onData={setMetrics}
          onComplete={() => setRunning(false)}
        />
      )}
      toolbar={(
        <SimulationToolbar
          running={running}
          speed={speed}
          onRunningChange={changeRunning}
          onReset={reset}
          onSpeedChange={setSpeed}
        />
      )}
      params={(
        <>
          <div className="rounded-[10px] bg-[#faf9f7] p-3 text-[11px] leading-relaxed text-[#6b6b6b]">
            Máy bắn nhả đạn theo nhịp đều. Đổi tốc độ rời nòng hoặc góc ngẩng để thấy tầm xa và
            độ cao cực đại đổi theo.
          </div>
          <ParamPanel
            schema={preset.params}
            values={{ ...params }}
            onChange={(key, value) => {
              setParams((current) => ({ ...current, [key]: value }));
              reset();
            }}
          />
        </>
      )}
      analysis={(
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Tầm xa" value={`${round(metrics.values.range)} m`} />
            <Metric label="Độ cao cực đại" value={`${round(metrics.values.peakHeight)} m`} />
            <Metric label="Thời gian bay" value={`${round(metrics.values.flightTime)} s`} />
            <Metric label="Đã chạm đất" value={`${metrics.values.landedCount} viên`} />
          </div>
          <div className="rounded-[10px] bg-[#faf9f7] p-3 text-[11px] leading-relaxed text-[#6b6b6b]">
            <p>Tầm xa: R = v²·sin(2θ) / g</p>
            <p>Độ cao cực đại: H = v²·sin²θ / (2g)</p>
            <p>Thời gian bay: T = 2v·sinθ / g</p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a8178]">
              Tiến trình
            </p>
            <p className="text-[12px] text-[#171717]">
              {TEMPLATE_EXPERIMENT_PHASE_LABELS[metrics.phase]} · {round(metrics.time, 1)} s
            </p>
          </div>
        </div>
      )}
    />
  );
}
