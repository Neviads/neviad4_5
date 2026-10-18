"use client";

// SHARED — thu phóng và kéo cảnh (camera của người xem), dùng chung cho mọi renderer.
//
// Camera nằm SAU `fitView`: nó chỉ đổi cách màn view hiện lên màn hình thật, không đổi toạ độ
// thế giới, `PIXELS_PER_METER` hay engine. Cuộn chuột = thu phóng quanh con trỏ, kéo = dời cảnh,
// bấm đúp = về như cũ. Renderer dùng:
//   const camera = useViewCamera(containerRef);
//   const fit = camera.apply(fitView(container, VIEW_WIDTH, VIEW_HEIGHT));
//   ...và đặt <ViewZoomControls camera={camera} /> trong container của cảnh.
// `fit` sau camera mang `zoom`, `visibleExtents` chuyển nó cho `drawGrid`/`drawAxes` để lưới,
// vạch chia và chữ giữ cỡ trên màn hình khi phóng to hay thu nhỏ.

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export type Fit = { scale: number; offsetX: number; offsetY: number };
export type CameraFit = Fit & { zoom: number };

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 40;

export type ViewCamera = {
  /** Áp camera lên kết quả của `fitView`. Gọi mỗi khung hình; hàm không đổi giữa các lần render, gọi được từ vòng vẽ. */
  apply: (fit: Fit) => CameraFit;
  /** Thu phóng `factor` lần quanh tâm khung (nút bấm). */
  zoomBy: (factor: number) => void;
  reset: () => void;
  /** Mức phóng hiện tại, để hiện lên nút. */
  zoom: number;
};

export function useViewCamera(containerRef: RefObject<HTMLElement | null>): ViewCamera {
  // Màn hình = pan + zoom · (toạ độ sau fitView). Giữ trong ref để vòng vẽ đọc mà không render lại.
  const cam = useRef({ zoom: 1, panX: 0, panY: 0 });
  const [zoom, setZoom] = useState(1);

  const zoomAt = (cx: number, cy: number, factor: number) => {
    const c = cam.current;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.zoom * factor));
    const k = next / c.zoom;
    cam.current = { zoom: next, panX: cx - k * (cx - c.panX), panY: cy - k * (cy - c.panY) };
    setZoom(next);
  };
  const reset = () => {
    cam.current = { zoom: 1, panX: 0, panY: 0 };
    setZoom(1);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    // Nút bấm, ô nhập và vùng có `data-no-pan` giữ thao tác chuột của riêng chúng.
    const ownsPointer = (target: EventTarget | null) =>
      target instanceof Element && target.closest("button, input, select, textarea, [data-no-pan]") !== null;

    const onWheel = (e: WheelEvent) => {
      if (ownsPointer(e.target)) return;
      e.preventDefault();
      const p = local(e);
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015));
    };
    let drag: { id: number; x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || ownsPointer(e.target)) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const c = cam.current;
      cam.current = { ...c, panX: c.panX + e.clientX - drag.x, panY: c.panY + e.clientY - drag.y };
      drag = { ...drag, x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      el.style.cursor = "grab";
    };
    const onDouble = (e: MouseEvent) => {
      if (!ownsPointer(e.target)) reset();
    };

    el.style.cursor = "grab";
    el.style.touchAction = "none";
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("dblclick", onDouble);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("dblclick", onDouble);
    };
  }, [containerRef]);

  const apply = useCallback((fit: Fit): CameraFit => {
    const c = cam.current;
    return {
      scale: fit.scale * c.zoom,
      offsetX: c.panX + c.zoom * fit.offsetX,
      offsetY: c.panY + c.zoom * fit.offsetY,
      zoom: c.zoom,
    };
  }, []);

  return {
    apply,
    zoomBy: (factor) => {
      const el = containerRef.current;
      zoomAt((el?.clientWidth ?? 0) / 2, (el?.clientHeight ?? 0) / 2, factor);
    },
    reset,
    zoom,
  };
}

/** Ba nút thu phóng ở góc dưới-phải của cảnh. Đặt bên trong container đã đưa cho `useViewCamera`. */
export function ViewZoomControls({ camera }: { camera: ViewCamera }) {
  const button = "h-7 min-w-7 px-1.5 text-sm text-slate-100 hover:bg-white/15";
  return (
    <div
      data-no-pan
      className="absolute bottom-3 right-3 flex items-center overflow-hidden rounded-md border border-white/20 bg-slate-900/80 backdrop-blur"
    >
      <button type="button" className={button} onClick={() => camera.zoomBy(1 / 1.25)} title="Thu nhỏ">−</button>
      <button type="button" className={`${button} tabular-nums`} onClick={camera.reset} title="Về như cũ (hoặc bấm đúp vào cảnh)">
        {Math.round(camera.zoom * 100)}%
      </button>
      <button type="button" className={button} onClick={() => camera.zoomBy(1.25)} title="Phóng to">+</button>
    </div>
  );
}
