"use client";

import { FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Flask } from "@phosphor-icons/react";
import { AutoTextarea } from "@/components/auto-textarea";
import styles from "@/app/workspace.module.css";
import NeviadMark from "./NeviadMark";

export const EXAMPLES = ["Mô phỏng vật rơi tự do từ độ cao 100m", "Mô phỏng con lắc đơn dao động với chiều dài 1m", "Mô phỏng chuyển động ném xiên với góc 45°", "Mô phỏng hai vật va chạm đàn hồi"];

/** Trang đầu: ô nhập yêu cầu và vài câu ví dụ. `href` là địa chỉ trang chủ của luồng đang dùng nó. */
export default function Landing({ prompt, setPrompt, onSubmit, busy = false, href = "/" }: { prompt: string; setPrompt: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; busy?: boolean; href?: string }) { return <main className={styles.landing}><header className={styles.landingNav}><Link className={styles.landingBrand} href={href}><NeviadMark />neviad4</Link><nav><Link href="/mo-phong-vat-ly">Những thí nghiệm vật lý có sẵn</Link></nav></header><section className={styles.launchHero}><h1>Tạo thứ gì đó tuyệt vời.</h1><p className={styles.launchSub}>Tạo thí nghiệm trực quan cho bài giảng vật lý.</p><form className={styles.launchPrompt} onSubmit={onSubmit}><AutoTextarea submitOnEnter rows={2} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ví dụ: con lắc đơn dài 1 m, để học sinh tự đổi góc lệch ban đầu và xem chu kỳ thay đổi..." disabled={busy} /><div><span><Flask /> {busy ? "Đang phân tích" : "Build"}</span><button className={styles.launchSend} type="submit" disabled={busy || !prompt.trim()}><ArrowRight /></button></div></form><div className={styles.launchIdeas}>{EXAMPLES.map((example) => <button type="button" key={example} onClick={() => setPrompt(example)}>{example}</button>)}</div></section><div className={styles.orbitOne} /><div className={styles.orbitTwo} /><div className={styles.gridGlow} /></main>; }
