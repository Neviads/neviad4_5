import type { AgentActivity } from "@/lib/agents";

export type Message = { role: "user" | "assistant" | "error" | "progress"; content: string; suggestions?: string[];
  /** Tin này mở một việc của agent: nhật ký các bước của việc đó hiện nhỏ ngay dưới tin (chat của trang chủ). */
  group?: "analyzing" | "drawing" | "coding" | "reuse" | "match";
  /** Các bước của việc này đã chốt khi nó kết thúc, để một lượt hỏi lại sau đó không làm các tin cũ hiện nhật ký của lượt mới. */
  steps?: AgentActivity[];
};
