"use client";

import styles from "@/app/workspace.module.css";

export type StepProgressItem = { label: string; detail?: string; state: "todo" | "doing" | "done" | "error" };

/** Danh sách bước của một quy trình, cùng dáng với `Progress` của trang `/` (dagProgress) nhưng bước do bên gọi đặt. */
export default function StepProgress({ title, steps }: { title: string; steps: StepProgressItem[] }) {
  const done = steps.filter((step) => step.state === "done").length;
  const marks = { todo: "chờ", doing: "đang chạy", done: "xong", error: "lỗi" } as const;
  return <section className={styles.dagProgress} aria-label={title}><div><strong>{title}</strong><span>{done}/{steps.length} bước</span></div><div className={styles.dagNodes}>{steps.map((step) => <span className={`${styles.dagNode} ${step.state === "done" ? styles.dagDone : step.state === "doing" ? styles.dagRunning : step.state === "error" ? styles.dagFailed : ""}`} key={step.label}><i />{step.label}<small>{step.detail || marks[step.state]}</small></span>)}</div></section>;
}
