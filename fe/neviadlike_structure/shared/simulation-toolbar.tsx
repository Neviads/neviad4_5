"use client";

// SHARED — thanh điều khiển Play/Pause, Reset, tốc độ.
// Kiểu dáng và vị trí (giữa-trên khung canvas) giống các thí nghiệm gốc.

import { Pause, Play, RotateCcw } from "lucide-react";

const SPEEDS = [0.5, 1, 2];

type Props = {
  running: boolean;
  speed: number;
  onRunningChange: (next: boolean) => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
};

export function SimulationToolbar({
  running,
  speed,
  onRunningChange,
  onReset,
  onSpeedChange,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-[11px] border border-[#e8e2d9] bg-white p-1 shadow-[0_8px_24px_rgba(43,41,38,0.12),0_2px_8px_rgba(43,41,38,0.08)]">
        <button
          type="button"
          onClick={() => onRunningChange(!running)}
          title={running ? "Tạm dừng" : "Bắt đầu"}
          aria-label={running ? "Tạm dừng" : "Bắt đầu"}
          className={`flex h-8 w-8 items-center justify-center rounded-[9px] ${running ? "bg-[#e8724a] text-white hover:bg-[#d96a42]" : "text-[#4f4943] hover:bg-[#f7f3ee]"}`}
        >
          {running ? (
            <Pause className="h-4 w-4" strokeWidth={2} />
          ) : (
            <Play className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
        <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />
        <button
          type="button"
          onClick={onReset}
          title="Đặt lại"
          aria-label="Đặt lại"
          className="flex h-8 w-8 items-center justify-center rounded-[9px] text-[#4f4943] hover:bg-[#f7f3ee]"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="mx-0.5 h-4 w-px shrink-0 bg-black/10" />
        <div className="flex items-center gap-0.5 rounded-[9px] bg-[#f5f1ec] p-0.5">
          {SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onSpeedChange(value)}
              title={`Tốc độ ${value}×`}
              className={`h-6 rounded-[7px] px-1.5 text-[11px] font-semibold ${speed === value ? "bg-[#e8724a] text-white" : "text-[#6b6b6b] hover:bg-white hover:text-[#171717]"}`}
            >
              {value}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
