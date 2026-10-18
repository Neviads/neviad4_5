"use client";

import Konva from "konva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSimulationFontFamily } from "@/components/simulations/shared/typography";
import { applyPose } from "@/neviadlike_structure/shared/object-pose";
import type { ShapeObject } from "@/neviadlike_structure/objects/types";
import type { DrawObjectItem, ObjectInputDef } from "./types";

const STAGE_W = 440;
const STAGE_H = 340;
const FLOOR_Y = 290;
const GRID = 40;
const SWEEP_SECONDS = 5;

type Placement = "floor" | "top" | "middle";
type Vec2 = { x: number; y: number };
type Values = Record<string, number>;
/** Hợp đồng SmartObject của skill `draw-object`. */
type SmartObject = {
  group: Konva.Group;
  pixelsPerMeter: number;
  ports: Record<string, Vec2>;
  inputs: Record<string, { label: string; unit: string; min: number; max: number; default: number }>;
  outputs: Record<string, { label: string; unit: string }>;
  set(values: Values): void;
  get(): Values;
  read(): Values;
};
type Maker = (p: Vec2, radius: number, fill: string, label?: string) => SmartObject;

export const FILLS: [string, string][] = [
  ["Hồng", "#f472b6"],
  ["Xanh trời", "#38bdf8"],
  ["Ngọc", "#2dd4bf"],
  ["Hổ phách", "#fbbf24"],
];

const PLACEMENT_Y: Record<Placement, number> = { floor: FLOOR_Y, top: 56, middle: STAGE_H / 2 };

/** Đoán chỗ đặt điểm neo từ câu mô tả `anchor` của model; có thể đổi tay trên từng thẻ. */
function guessPlacement(anchor?: string | null): Placement {
  const a = (anchor ?? "").toLowerCase();
  if (/(treo|hướng xuống|thân .*xuống|y dương|điểm treo)/.test(a)) return "top";
  if (/(sàn|đáy|chạm|đế|nền)/.test(a)) return "floor";
  return "middle";
}

/**
 * Vật theo hợp đồng hình (`item.size` có mặt): `(p, ppm, fill, label) => { group, parts, points }`, không có vật lý. Thẻ xem trước dựng nó với `ppm`
 * vừa khung, coi các bộ phận chuyển động như đầu vào (thanh trượt gắn tư thế bằng applyPose, như cảnh sẽ làm) và các điểm có tên như port.
 */
const poseInputs = (item: DrawObjectItem): ObjectInputDef[] =>
  (item.moving ?? []).map((part) => ({ name: part.name, label: part.motion === "rotate" ? "quay" : `trượt ${part.axis}`, unit: part.motion === "rotate" ? "°" : "m",
    min: part.min, max: part.max, default: Math.min(part.max, Math.max(part.min, 0)) }));

type ShapeMaker = (p: Vec2, ppm: number, fill: string, label?: string) => ShapeObject;

function shapeMaker(raw: ShapeMaker, size: { width: number; height: number }): Maker {
  return (p, _radius, fill, label) => {
    const ppm = Math.min((0.7 * STAGE_W) / size.width, (0.7 * STAGE_H) / size.height);
    const shape = raw(p, ppm, fill, label);
    let current: Values = {};
    return {
      group: shape.group,
      pixelsPerMeter: ppm,
      ports: { ...(shape.points ?? {}) },
      inputs: {},
      outputs: {},
      set: (values) => { current = { ...current, ...values }; applyPose(shape, values, ppm); },
      get: () => current,
      read: () => ({}),
    };
  };
}

/** Biên dịch JS của model thành hàm dựng vật. Chỉ chạy sau khi script sinh đã quét token cấm; dùng trong môi trường dev. */
function compile(item: DrawObjectItem): { make: Maker | null; error: string | null } {
  if (!item.js || !item.name) return { make: null, error: "Không có code để chạy." };
  try {
    const factory = new Function("Konva", "getSimulationFontFamily", `"use strict";\n${item.js}\nreturn ${item.name};`);
    const raw = factory(Konva, getSimulationFontFamily) as (...args: Parameters<Maker>) => Partial<SmartObject> | Konva.Group;
    if (typeof raw !== "function") return { make: null, error: "Code không trả về hàm." };
    if (item.size && item.size.width > 0 && item.size.height > 0) return { make: shapeMaker(raw as unknown as ShapeMaker, item.size), error: null };
    // Vật được vẽ tự do: chỉ cần trả về một Konva.Group (hoặc { group, ... }); những gì thiếu (đầu vào, port, set/get/read) được điền rỗng.
    const make: Maker = (p, radius, fill, label) => {
      const out = raw(p, radius, fill, label);
      const full = (out && "group" in out ? out : { group: out as Konva.Group }) as Partial<SmartObject> & { group: Konva.Group };
      return {
        group: full.group,
        pixelsPerMeter: full.pixelsPerMeter ?? 1,
        ports: full.ports ?? {},
        inputs: full.inputs ?? {},
        outputs: full.outputs ?? {},
        set: (values) => full.set?.(values),
        get: () => full.get?.() ?? {},
        read: () => full.read?.() ?? {},
      };
    };
    return { make, error: null };
  } catch (error) {
    return { make: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function drawBackdrop(layer: Konva.Layer) {
  layer.add(new Konva.Rect({ x: 0, y: 0, width: STAGE_W, height: STAGE_H, fill: "#0f172a", listening: false }));
  for (let x = GRID; x < STAGE_W; x += GRID) layer.add(new Konva.Line({ points: [x, 0, x, STAGE_H], stroke: "#3a4a68", strokeWidth: 1, opacity: 0.55, listening: false }));
  for (let y = FLOOR_Y % GRID; y < STAGE_H; y += GRID) layer.add(new Konva.Line({ points: [0, y, STAGE_W, y], stroke: "#3a4a68", strokeWidth: 1, opacity: 0.55, listening: false }));
  layer.add(new Konva.Rect({ x: 0, y: FLOOR_Y, width: STAGE_W, height: STAGE_H - FLOOR_Y, fill: "#0b1220", listening: false }));
  layer.add(new Konva.Line({ points: [0, FLOOR_Y, STAGE_W, FLOOR_Y], stroke: "#64748b", strokeWidth: 3, listening: false }));
}

function fmt(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  const abs = Math.abs(value);
  return abs >= 10000 || abs < 0.01 ? value.toExponential(3) : Number(value.toPrecision(4)).toString();
}

export type Controls = { radius: number; fill: string; showPorts: boolean; showPortNames: boolean };

const DEFAULT_CONTROLS: Controls = { radius: 30, fill: FILLS[0][1], showPorts: false, showPortNames: false };

/** Chỉ hình của MỘT vật (không tiêu đề, nút, thanh trượt hay chi tiết): để xem trước vật trong lúc thí nghiệm còn đang được tạo. */
export function DrawObjectStatic({ item }: { item: DrawObjectItem }) {
  return <ObjectCard item={item} controls={DEFAULT_CONTROLS} bare />;
}

export function ObjectCard({ item, controls, bare = false }: { item: DrawObjectItem; controls: Controls; bare?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const objRef = useRef<SmartObject | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const markersRef = useRef<Konva.Group | null>(null);
  const showPortsRef = useRef(controls.showPorts);
  const showPortNamesRef = useRef(controls.showPortNames);
  // Vật theo hợp đồng hình không có đầu vào: thanh trượt dựng từ các bộ phận chuyển động của nó.
  const inputs = useMemo<ObjectInputDef[]>(() => (item.size ? poseInputs(item) : item.inputs ?? []), [item]);
  const defaults = useMemo<Values>(() => Object.fromEntries(inputs.map((input) => [input.name, input.default])), [inputs]);
  const valuesRef = useRef<Values>(defaults);
  const [values, setValues] = useState<Values>(defaults);
  const [outputs, setOutputs] = useState<Values>({});
  const [playing, setPlaying] = useState(false);
  const [placement, setPlacement] = useState<Placement>(() => guessPlacement(item.anchor));
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const compiled = useMemo(() => compile(item), [item]);
  const placementRef = useRef(placement);

  /** Đặt lại các điểm nối (chấm cam + tên) theo `ports` hiện tại của vật. */
  const syncPorts = useCallback(() => {
    const obj = objRef.current;
    const markers = markersRef.current;
    if (!obj || !markers) return;
    markers.visible(showPortsRef.current);
    markers.find("Text").forEach((text) => text.visible(showPortNamesRef.current));
    markers.getChildren().forEach((node) => {
      const name = node.name();
      const port = obj.ports[name];
      if (port) node.position({ x: STAGE_W / 2 + port.x, y: PLACEMENT_Y[placementRef.current] + port.y });
    });
  }, []);
  useEffect(() => { placementRef.current = placement; }, [placement]);

  /** Đặt đầu vào, cập nhật hình/ports ngay và đọc lại đầu ra. */
  const apply = useCallback((next: Values, publish: boolean) => {
    const obj = objRef.current;
    valuesRef.current = next;
    if (!obj) return;
    try {
      obj.set(next);
      syncPorts();
      layerRef.current?.batchDraw();
      if (publish) {
        setValues({ ...obj.get() });
        setOutputs({ ...obj.read() });
      }
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : String(error));
    }
  }, [syncPorts]);

  // Dựng lại cả cảnh khi đổi vật, bán kính, màu thân hoặc chỗ đặt điểm neo.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !compiled.make) return;
    const stage = new Konva.Stage({ container: host, width: STAGE_W, height: STAGE_H });
    const layer = new Konva.Layer();
    stage.add(layer);
    layerRef.current = layer;
    drawBackdrop(layer);
    let failure: string | null = null;
    let initialOutputs: Values = {};
    objRef.current = null;
    markersRef.current = null;
    try {
      const obj = compiled.make({ x: STAGE_W / 2, y: PLACEMENT_Y[placement] }, controls.radius, controls.fill);
      objRef.current = obj;
      layer.add(obj.group);
      obj.set(valuesRef.current);
      // Điểm neo (0,0) là chấm đỏ; các port là chấm cam kèm tên, chỉ hiện khi bật "Hiện điểm nối".
      layer.add(new Konva.Circle({ x: STAGE_W / 2, y: PLACEMENT_Y[placement], radius: 2.5, fill: "#ef4444", listening: false }));
      const markers = new Konva.Group({ listening: false });
      for (const name of Object.keys(obj.ports)) {
        const marker = new Konva.Group({ name, listening: false });
        marker.add(
          new Konva.Circle({ radius: 4, fill: "#fb923c", stroke: "#0f172a", strokeWidth: 1.5 }),
          new Konva.Text({ x: 7, y: -6, text: name, fontSize: 10, fontFamily: getSimulationFontFamily(), fill: "#fdba74" }),
        );
        markers.add(marker);
      }
      layer.add(markers);
      markersRef.current = markers;
      syncPorts();
      initialOutputs = { ...obj.read() };
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
    layer.draw();
    queueMicrotask(() => {
      setRuntimeError(failure);
      setOutputs(initialOutputs);
    });
    return () => {
      objRef.current = null;
      markersRef.current = null;
      layerRef.current = null;
      stage.destroy();
    };
  }, [compiled, controls.radius, controls.fill, placement, syncPorts]);

  useEffect(() => {
    showPortsRef.current = controls.showPorts;
    showPortNamesRef.current = controls.showPortNames;
    syncPorts();
    layerRef.current?.batchDraw();
  }, [controls.showPorts, controls.showPortNames, syncPorts]);

  // Chế độ tự chạy: quét mọi đầu vào qua lại giữa min và max (mỗi đầu vào lệch pha một chút).
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let lastPublish = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const next: Values = {};
      inputs.forEach((input, index) => {
        const phase = (2 * Math.PI * t) / SWEEP_SECONDS - index * 0.9;
        next[input.name] = input.min + (input.max - input.min) * (0.5 - 0.5 * Math.cos(phase));
      });
      const publish = now - lastPublish > 90;
      if (publish) lastPublish = now;
      apply(next, publish);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, inputs, apply]);

  const error = compiled.error ?? runtimeError;
  const failedLines = (item.selfTestReport ?? []).filter((line) => line.startsWith("✗")).length;

  if (bare) {
    return <div className="relative overflow-hidden rounded-[12px] bg-[#0f172a] shadow-[0_10px_28px_#4c477122]">
      <div ref={hostRef} style={{ width: STAGE_W, height: STAGE_H, maxWidth: "100%" }} className="mx-auto" />
      {error ? <p className="absolute inset-x-3 bottom-3 rounded-md bg-red-950/90 p-2 text-[11px] leading-snug text-red-200">Lỗi chạy: {error}</p> : null}
    </div>;
  }

  return <article className="flex flex-col overflow-hidden rounded-[14px] border border-[#e8e2d9] bg-white shadow-sm">
    <header className="flex items-center gap-2 border-b border-[#e8e2d9] px-4 py-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#f5f1ec] text-[11px] font-semibold text-[#c96545]">{item.id}</span>
      <strong className="truncate text-[14px] text-[#171717]">{item.title}</strong>
      <span className={`ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${item.status === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
        {item.status === "ok" ? "Đạt kiểm tra" : "Không đạt"}{item.attempts > 1 ? ` · ${item.attempts} lần` : ""}
      </span>
    </header>

    <div className="relative bg-[#0f172a]">
      <div ref={hostRef} style={{ width: STAGE_W, height: STAGE_H, maxWidth: "100%" }} className="mx-auto" />
      <div className="absolute right-2 top-2 flex gap-1">
        {(["top", "middle", "floor"] as Placement[]).map((value) => (
          <button key={value} type="button" onClick={() => setPlacement(value)} title="Đổi chỗ đặt điểm neo"
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${placement === value ? "bg-[#e8724a] text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"}`}>
            {value === "top" ? "neo trên" : value === "middle" ? "neo giữa" : "neo sàn"}
          </button>
        ))}
      </div>
      {error ? <p className="absolute inset-x-3 bottom-3 rounded-md bg-red-950/90 p-2 text-[11px] leading-snug text-red-200">Lỗi chạy: {error}</p> : null}
      {!compiled.make && !item.js ? <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-[12px] text-slate-400">Model chưa trả về code hợp lệ.</p> : null}
    </div>

    {inputs.length ? <div className="space-y-2 border-b border-[#e8e2d9] bg-[#faf9f7] px-4 py-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setPlaying((current) => !current)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${playing ? "bg-[#e8724a] text-white" : "border border-[#e8e2d9] bg-white text-[#4f4943] hover:bg-[#f7f3ee]"}`}>
          {playing ? "Dừng tự chạy" : "Tự chạy"}
        </button>
        <button type="button" onClick={() => { setPlaying(false); apply({ ...defaults }, true); }}
          className="rounded-md border border-[#e8e2d9] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#4f4943] hover:bg-[#f7f3ee]">Đặt lại</button>
        <span className="ml-auto text-[10px] text-[#8a8178]">{item.size ? "Tư thế bộ phận (engine sẽ cấp)" : "Đầu vào điều khiển"}</span>
      </div>
      {inputs.map((input) => (
        <label key={input.name} className="block text-[11px] text-[#4f4943]">
          <span className="flex items-baseline justify-between"><span><b className="text-[#171717]">{input.label}</b> <code className="text-[#8a8178]">{input.name}</code></span><span className="tabular-nums">{fmt(values[input.name])} {input.unit}</span></span>
          <input type="range" className="mt-0.5 w-full accent-[#e8724a]" min={input.min} max={input.max} step={(input.max - input.min) / 400}
            value={values[input.name] ?? input.default} onChange={(event) => { setPlaying(false); apply({ ...valuesRef.current, [input.name]: Number(event.target.value) }, true); }} />
        </label>
      ))}
    </div> : null}

    {item.outputs?.length ? <div className="border-b border-[#e8e2d9] px-4 py-3">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#8a8178]">Đại lượng đọc ra (read)</p>
      <div className="grid grid-cols-2 gap-2">
        {item.outputs.map((output) => (
          <div key={output.name} className="rounded-[8px] bg-[#faf9f7] p-2">
            <p className="text-[10px] text-[#8a8178]">{output.label} <code>{output.name}</code></p>
            <p className="mt-0.5 text-[12px] font-semibold tabular-nums text-[#171717]">{fmt(outputs[output.name])} <span className="font-normal text-[#8a8178]">{output.unit}</span></p>
          </div>
        ))}
      </div>
    </div> : null}

    <div className="space-y-3 p-4 text-[12px] leading-relaxed text-[#4f4943]">
      <p className="text-[#6b6b6b]">{item.source === "spec" ? <><b className="text-[#171717]">Giáo viên nói:</b> “{item.request}”</> : item.request}</p>
      {item.size ? <p><b className="text-[#171717]">Kích thước đo được:</b> {fmt(item.size.width)} m × {fmt(item.size.height)} m</p> : null}
      {item.anchor ? <p><b className="text-[#171717]">Điểm neo:</b> {item.anchor}</p> : null}
      {item.points?.length ? <p><b className="text-[#171717]">Điểm có tên:</b> {item.points.map((point) => point.name).join(" · ")}</p> : null}
      {item.ports?.length ? <p><b className="text-[#171717]">Điểm nối:</b> {item.ports.map((port) => `${port.name}${port.description ? ` (${port.description})` : ""}`).join(" · ")}</p> : null}
      {item.parts?.length ? <ul className="list-disc space-y-0.5 pl-4 text-[#6b6b6b]">{item.parts.map((part) => <li key={part}>{part}</li>)}</ul> : null}
      {item.notes ? <p className="rounded-[8px] bg-[#faf9f7] p-2 text-[#6b6b6b]"><b className="text-[#171717]">Ghi chú:</b> {item.notes}</p> : null}
      {item.selfTestReport?.length ? <details className="rounded-[8px] border border-[#e8e2d9]">
        <summary className="cursor-pointer px-3 py-2 text-[12px] font-semibold text-[#171717]">Ca tự kiểm tra lúc sinh ({item.selfTestReport.length - failedLines}/{item.selfTestReport.length} đạt)</summary>
        <ul className="space-y-0.5 p-3 font-mono text-[11px] text-[#4f4943]">{item.selfTestReport.map((line) => <li key={line} className={line.startsWith("✗") ? "text-red-700" : ""}>{line}</li>)}</ul>
      </details> : null}
      {item.problems?.length ? <p className="rounded-[8px] bg-red-50 p-2 text-red-700"><b>Vấn đề khi kiểm tra:</b> {item.problems.join(" | ")}</p> : null}
      {item.spec ? <details className="rounded-[8px] border border-[#e8e2d9]">
        <summary className="cursor-pointer px-3 py-2 text-[12px] font-semibold text-[#171717]">Thiết bị trong spec, đầu vào của skill ({JSON.stringify(item.spec).length.toLocaleString("vi-VN")} ký tự)</summary>
        <pre className="max-h-72 overflow-auto bg-[#1b1a1f] p-3 text-[11px] leading-[1.55] text-[#e8e6ef]">{JSON.stringify(item.spec, null, 2)}</pre>
      </details> : null}
      {item.code ? <details className="rounded-[8px] border border-[#e8e2d9]">
        <summary className="cursor-pointer px-3 py-2 text-[12px] font-semibold text-[#171717]">Xem code ({item.code.split("\n").length} dòng)</summary>
        <pre className="max-h-72 overflow-auto bg-[#1b1a1f] p-3 text-[11px] leading-[1.55] text-[#e8e6ef]">{item.code}</pre>
      </details> : null}
      {item.usage ? <p className="text-[10px] text-[#8a8178]">{item.usage.prompt_tokens} token vào · {item.usage.completion_tokens} token ra</p> : null}
    </div>
  </article>;
}
