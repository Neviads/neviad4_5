"use client";

import { Flask } from "@phosphor-icons/react";
import styles from "@/app/workspace.module.css";

export function ArtifactLoading() { return <article className={styles.loadingArtifact} role="status"><header className={styles.loadingHeader}><span className={styles.loadingBadge}><Flask /></span><div><small>PHYSICS EXPERIMENT</small><strong>NEVIAD4 đang tạo và hoàn thiện mô phỏng</strong></div><span className={styles.loadingSpinner} /></header><div className={styles.loadingBody}><aside className={styles.loadingControls}><p>THÔNG SỐ</p>{[0, 1, 2].map((item) => <div className={styles.loadingControl} key={item}><i /><b /></div>)}</aside><main className={styles.loadingMain}><div className={styles.loadingViewport}><span className={styles.loadingPulse} /><p>AI đang sinh cảnh, vật lý và giao diện…</p></div><div className={styles.loadingChart}><i /><b /></div></main></div></article>; }
