"use client";

import DrawObjectStatic from "@/components/draw-object-skill/DrawObjectStaticLoader";
import type { ObjectRequest } from "@/lib/lite/api";
import styles from "./lite.module.css";
import type { ObjectState } from "./useLitePipeline";

type Props = {
  objects: ObjectRequest[];
  states: Record<string, ObjectState>;
  /** Việc đang chạy, hiện ở lớp phủ ("Đang vẽ 2/4 vật…", "Agent đang viết engine…"). */
  status: string;
  /** Còn agent đang chạy (hiện vòng quay ở lớp phủ); false khi chỉ còn chờ người dùng vẽ lại một vật. */
  busy?: boolean;
  onRedraw: (id: string) => void;
  /** Lỗi của các tầng code (nếu có) và hàm chạy lại; hiện ngay trên sân khấu vì Preview không có chat. */
  error?: string;
  onRetry?: () => void;
};

/**
 * Preview khi thí nghiệm còn đang được tạo: các vật đã vẽ hiện tĩnh (chỉ hình, không điều khiển), vật chưa xong là khung chờ, vật lỗi là thẻ đỏ
 * có nút vẽ lại; một lớp phủ mờ báo việc đang chạy. Thí nghiệm đầy đủ thay chỗ này khi xong.
 */
export default function Stage({ objects, states, status, busy = true, onRedraw, error, onRetry }: Props) {
  return (
    <div className={styles.stage}>
      <div className={styles.stageScroll}><div className={styles.stageGrid}>
        {objects.map((object) => {
          const state = states[object.id] ?? { status: "idle" as const };
          if (state.status === "ok" && state.item) {
            return <div className={styles.tile} key={object.id}><DrawObjectStatic item={state.item} /><p className={styles.tileTitle}>{object.title}{object.reference ? " · dùng lại từ kho" : ""}</p></div>;
          }
          if (state.status === "failed") {
            return (
              <div className={styles.tileFail} key={object.id}>
                <b>{object.title} chưa vẽ được</b>
                <p>{state.error ?? "Vật chưa qua kiểm tra."}</p>
                <button type="button" className={styles.link} onClick={() => onRedraw(object.id)} style={{ justifySelf: "start" }}>Vẽ lại</button>
              </div>
            );
          }
          return <div className={styles.tile} key={object.id}><div className={styles.tileWait}>{state.status === "drawing" ? `Đang vẽ ${object.title}…` : object.title}</div></div>;
        })}
      </div></div>
      <div className={styles.wash} />
      {error
        ? <div className={styles.stageError}><p>{error}</p>{onRetry && <button type="button" className={styles.link} onClick={onRetry}>Thử lại</button>}</div>
        : <div className={styles.stageNote}><div>{busy && <span className={styles.spinner} />}{status}</div></div>}
    </div>
  );
}
