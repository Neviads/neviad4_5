"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import styles from "@/app/workspace.module.css";
import type { Message } from "./types";

/** Avatar của NEVIAD4 trong chat: logo của web, lấp đầy vòng tròn. */
function Avatar() {
  return <Image src="/neviad-logo-round.png" alt="" aria-hidden="true" width={1254} height={1254} style={{ width: "100%", height: "100%" }} />;
}

export function Dots() {
  return <span className={styles.dots} aria-hidden="true"><b /><b /><b /></span>;
}

/** Ô nhập câu trả lời khác, ngay dưới các đáp án gợi ý của câu hỏi cuối (thay cho khung nhập ở đáy khi đang được hỏi lại). */
function AnswerBox({ onAnswer, disabled }: { onAnswer: (value: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const send = () => {
    const value = text.trim();
    if (!value || disabled) return;
    setText("");
    onAnswer(value);
  };
  return <form className={styles.answerBox} onSubmit={(event) => { event.preventDefault(); send(); }}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Hoặc nhập câu trả lời khác..." aria-label="Câu trả lời khác" disabled={disabled} /><button className={styles.send} type="submit" aria-label="Gửi câu trả lời" disabled={disabled || !text.trim()}><PaperPlaneTilt /></button></form>;
}

/** `onAnswer`: khi có, câu hỏi cuối (tin có `suggestions`, kể cả rỗng) hiện thêm ô nhập câu trả lời khác dưới các đáp án. */
export function ChatMessages({ messages, onPick, onAnswer, disabled, after, tail }: { messages: Message[]; onPick?: (value: string) => void; onAnswer?: (value: string) => void; disabled?: boolean; after?: (message: Message, index: number) => ReactNode; tail?: ReactNode }) {
  return <div className={styles.conversation}>{messages.map((message, index) => <div className={`${styles.message} ${message.role === "error" ? styles.errorMessage : ""} ${message.role === "user" ? styles.userMessage : ""}`} key={`${message.role}-${index}`}><i>{message.role === "user" ? "GV" : <Avatar />}</i><div className={styles.messageBody}><p>{message.content}</p>{after?.(message, index)}{onPick && message.suggestions?.length && index === messages.length - 1 ? <div className={styles.suggestions} role="group" aria-label="Đáp án gợi ý"><span>Gợi ý</span>{message.suggestions.map((option) => <button type="button" key={option} disabled={disabled} onClick={() => onPick(option)}>{option}</button>)}</div> : null}{onAnswer && message.suggestions && index === messages.length - 1 ? <AnswerBox onAnswer={onAnswer} disabled={disabled} /> : null}</div></div>)}{tail}{disabled ? <div className={styles.message} role="status" aria-label="NEVIAD4 đang xử lý"><i><Avatar /></i><div className={styles.messageBody}><p><Dots /></p></div></div> : null}</div>;
}
