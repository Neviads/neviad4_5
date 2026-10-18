"use client";

import { useLayoutEffect, useRef, type KeyboardEvent, type TextareaHTMLAttributes } from "react";

type AutoTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Called on Enter (Shift+Enter inserts a newline). Defaults to submitting the enclosing form. */
  onEnterSubmit?: () => void;
  /** Enable Enter-to-submit. Auto-enabled when onEnterSubmit is given. */
  submitOnEnter?: boolean;
};

/** Textarea that grows with its content (no scrollbar) and optionally submits on Enter. */
export function AutoTextarea({ onEnterSubmit, submitOnEnter, onKeyDown, style, value, ...props }: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (!(submitOnEnter || onEnterSubmit)) return;
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (event.currentTarget.disabled) return;
    if (onEnterSubmit) onEnterSubmit();
    else event.currentTarget.form?.requestSubmit();
  }

  return <textarea {...props} ref={ref} value={value} style={{ overflow: "hidden", ...style }} onKeyDown={handleKeyDown} />;
}
