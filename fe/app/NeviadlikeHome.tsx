"use client";

import { FormEvent, useState } from "react";
import LiteWorkspace from "@/components/lite/LiteWorkspace";
import { useLitePipeline } from "@/components/lite/useLitePipeline";
import Landing from "@/components/workspace/Landing";

/** Trang chủ thử của luồng lite: Landing, rồi LiteWorkspace (kịch bản → vẽ các vật cùng lúc → code agent → thí nghiệm) chạy bởi `useLitePipeline`. */
export default function NeviadlikeHome() {
  const pipeline = useLitePipeline();
  const [prompt, setPrompt] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = prompt.trim();
    if (!value) return;
    setPrompt("");
    void pipeline.start(value);
  }

  if (!pipeline.messages.length && pipeline.phase === "input") return <Landing prompt={prompt} setPrompt={setPrompt} onSubmit={submit} href="/" />;
  return <LiteWorkspace pipeline={pipeline} />;
}
