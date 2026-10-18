"use client";

// Bảng tham số sinh từ schema, dựng bằng Tweakpane (imperative → bọc trong React).
// Đưa vào một danh sách ParamDef + giá trị hiện tại; mỗi lần kéo slider gọi onChange.
// Đồng bộ 2 chiều: nếu `values` đổi từ bên ngoài (reset / AI sửa) → panel tự refresh.

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { Pane } from "tweakpane";

// Mọi điều khiển đều giữ giá trị là SỐ (để khớp `Params` của engine). Không ghi `kind` = thanh trượt.
type ParamBase = { key: string; label: string; unit?: string };

/** Thanh trượt kèm ô số (mặc định). */
export type SliderParam = ParamBase & { kind?: "slider"; min: number; max: number; step?: number };
/** Ô nhập số; có thể không giới hạn khoảng. */
export type NumberParam = ParamBase & { kind: "number"; min?: number; max?: number; step?: number };
/** Công tắc bật/tắt: giá trị 0 hoặc 1. */
export type ToggleParam = ParamBase & { kind: "toggle" };
/** Chọn một trong vài lựa chọn: giá trị là `value` của lựa chọn đang chọn. */
export type SelectParam = ParamBase & { kind: "select"; options: { label: string; value: number }[] };
/** Nút bấm: không có giá trị, mỗi lần bấm gọi `onAction(key)`. */
export type ButtonParam = ParamBase & { kind: "button"; title?: string };

export type ParamDef = SliderParam | NumberParam | ToggleParam | SelectParam | ButtonParam;

// Tweakpane mặc định theme tối, lệch tông với giao diện sáng NEVIAD. Set trực
// tiếp biến CSS của Tweakpane bằng inline style (thay vì rule `.tp-rotv` ở
// globals.css) vì rule đó không lọt vào CSS bundle khi build — đặt ở đây để
// chắc chắn luôn được áp dụng. Màu khớp với bảng màu Slide Maker & Lesson
// Editor (#faf9f7, #e8e2d9, #c96545…).
const TWEAKPANE_THEME_VARS = {
  "--tp-base-background-color": "#ffffff",
  "--tp-base-shadow-color": "rgba(43, 41, 38, 0.1)",
  "--tp-button-background-color": "#f5f1ec",
  "--tp-button-background-color-active": "#f0ece5",
  "--tp-button-background-color-focus": "#f6eadf",
  "--tp-button-background-color-hover": "#efe9e2",
  "--tp-button-foreground-color": "#2b2926",
  "--tp-container-background-color": "#faf9f7",
  "--tp-container-background-color-active": "#f0ece5",
  "--tp-container-background-color-focus": "#f5f1ec",
  "--tp-container-background-color-hover": "#f7f3ee",
  "--tp-container-foreground-color": "#4f4943",
  "--tp-groove-foreground-color": "#e8e2d9",
  "--tp-input-background-color": "#f5f1ec",
  "--tp-input-background-color-active": "#ecdfd2",
  "--tp-input-background-color-focus": "#f2e4d5",
  "--tp-input-background-color-hover": "#efe4d8",
  "--tp-input-foreground-color": "#c96545",
  "--tp-label-foreground-color": "#6b6b6b",
  "--tp-monitor-background-color": "#f5f1ec",
  "--tp-monitor-foreground-color": "#4f4943",
  // Phóng to một chút so với mặc định (unit 20px, value width 160px) cho dễ bấm/đọc.
  "--tp-base-border-radius": "8px",
  "--tp-container-unit-size": "26px",
  "--tp-container-horizontal-padding": "8px",
  "--tp-container-vertical-padding": "8px",
  "--tp-container-unit-spacing": "8px",
  "--tp-blade-horizontal-padding": "8px",
  "--tp-blade-value-width": "150px",
} as CSSProperties;

export function ParamPanel({
  schema,
  values,
  onChange,
  onAction,
}: {
  schema: ParamDef[];
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
  /** Gọi khi người dùng bấm một nút (`kind: "button"`). */
  onAction?: (key: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Giá trị mà Tweakpane đọc/ghi trực tiếp (object thường, không phải React state). Công tắc giữ boolean.
  const objRef = useRef<Record<string, number | boolean>>({});
  const schemaRef = useRef(schema);
  const paneRef = useRef<Pane | null>(null);
  const syncingRef = useRef(false);
  // Giữ onChange, onAction mới nhất qua ref để effect tạo Pane không phụ thuộc chúng.
  const onChangeRef = useRef(onChange);
  const onActionRef = useRef(onAction);
  useEffect(() => {
    onChangeRef.current = onChange;
    onActionRef.current = onAction;
  }, [onChange, onAction]);

  // Tạo Pane một lần cho mỗi schema. AI/dev đổi schema (chọn sim khác) → dựng lại.
  useEffect(() => {
    if (!containerRef.current) return;
    schemaRef.current = schema;
    const obj = objRef.current;
    for (const p of schema) {
      if (p.kind === "button" || p.key in obj) continue;
      const v = values[p.key];
      if (p.kind === "toggle") obj[p.key] = (v ?? 0) !== 0;
      else if (p.kind === "select") obj[p.key] = v ?? p.options[0]?.value ?? 0;
      else obj[p.key] = v ?? p.min ?? 0;
    }

    const pane = new Pane({ container: containerRef.current });
    paneRef.current = pane;
    for (const p of schema) {
      const label = p.unit ? `${p.label} (${p.unit})` : p.label;
      if (p.kind === "button") {
        pane.addButton({ title: p.title ?? p.label }).on("click", () => onActionRef.current?.(p.key));
        continue;
      }
      const options =
        p.kind === "toggle"
          ? { label }
          : p.kind === "select"
            ? { label, options: p.options.map((o) => ({ text: o.label, value: o.value })) }
            : { label, min: p.min, max: p.max, step: p.step };
      const binding = pane.addBinding(obj, p.key, options);
      binding.on("change", (ev) => {
        if (syncingRef.current) return;
        onChangeRef.current(p.key, p.kind === "toggle" ? (ev.value ? 1 : 0) : (ev.value as number));
      });
    }
    return () => {
      pane.dispose();
      paneRef.current = null;
    };
    // values cố tình bỏ khỏi deps: panel chỉ dựng lại khi schema đổi; đồng bộ giá
    // trị ngoài xử lý ở effect dưới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  // Đồng bộ khi `values` đổi từ ngoài (reset, AI sửa) → ghi vào obj + refresh panel.
  useEffect(() => {
    const obj = objRef.current;
    let changed = false;
    for (const k in values) {
      const toggle = schemaRef.current.find((p) => p.key === k)?.kind === "toggle";
      const next = toggle ? values[k] !== 0 : values[k]!;
      if (obj[k] !== next) {
        obj[k] = next;
        changed = true;
      }
    }
    if (changed) {
      syncingRef.current = true;
      try {
        paneRef.current?.refresh();
      } finally {
        syncingRef.current = false;
      }
    }
  }, [values]);

  return (
    <div className="neviadtp-panel" style={TWEAKPANE_THEME_VARS}>
      {/* font-size của Tweakpane hardcode 11px trong CSS gốc (không đi qua biến
          CSS), nên không phóng to được bằng inline style var. Selector 2 lớp ở
          đây có độ ưu tiên cao hơn rule gốc của Tweakpane nên luôn thắng, bất
          kể thứ tự nạp stylesheet. */}
      <style>{`.neviadtp-panel .tp-rotv { font-size: 13px; }`}</style>
      <div ref={containerRef} />
    </div>
  );
}

/** Compatibility wrapper for the legacy standalone simulation controls. */
export function ParamRangeField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const schema = useMemo<ParamDef[]>(() => [{ key: "value", label, min, max, step, unit }], [label, min, max, step, unit]);
  const values = useMemo(() => ({ value }), [value]);
  return <ParamPanel schema={schema} values={values} onChange={(_, next) => onChange(next)} />;
}
