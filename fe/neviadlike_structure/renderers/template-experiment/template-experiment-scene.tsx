"use client";

// TẦNG RENDERER — cảnh của thí nghiệm mẫu. CHỈ VẼ: không một công thức vật lý nào ở đây.
//
// Cảnh gồm HAI lớp chồng nhau, mỗi lớp một việc:
//   1. `<canvas>` nền  — lưới, trục, mặt sàn, và HIỆN TƯỢNG (`metrics.items`) vẽ bằng `drawItems`.
//                        Số lượng hiện tượng đổi từng khung hình nên vẽ thẳng lên canvas là đúng.
//   2. `Konva.Stage`   — các VẬT (khí cụ). Dựng một lần, rồi mỗi khung hình chỉ đặt lại vị trí
//                        (`placeObject`) và tư thế bộ phận (`applyPose`). Không dựng lại hình.
//
// Vòng `requestAnimationFrame` là nơi duy nhất gọi engine. Mọi prop và state giữ trong `ref`
// để vòng lặp không phải dựng lại khi React render.

import { useEffect, useMemo, useRef } from "react";
import Konva from "konva";

import {
  applyTemplateExperimentCommand,
  createTemplateExperimentState,
  stepTemplateExperiment,
  templateExperimentMetrics,
  type TemplateExperimentCommand,
  type TemplateExperimentMetrics,
  type TemplateExperimentParams,
  type TemplateExperimentState,
} from "../../engines/template-experiment/engine";
import { makeTemplateExperimentDevice1 } from "../../objects/template-experiment-1";
import { drawAxes, drawGrid, drawScaleNote, SCENE_COLORS, visibleExtents } from "../../shared/draw-axes";
import { drawItems, groupByKind } from "../../shared/draw-items";
import { applyPose, placeObject, setObjectVisible } from "../../shared/object-pose";
import { useContainerSize } from "../../shared/use-container-size";
import { useViewCamera, ViewZoomControls } from "../../shared/view-camera";
import { createViewTransform, fitView, magnifyFor } from "../../shared/view-transform";
import { DEVICE_FILL, OBJECT_SIZES, ORIGIN, PIXELS_PER_METER, VIEW_HEIGHT, VIEW_WIDTH } from "./view-constants";

export type TemplateExperimentSceneProps = {
  params: TemplateExperimentParams;
  running: boolean;
  speed: number;
  resetSignal: number;
  command: { type: TemplateExperimentCommand; token: number };
  onData: (metrics: TemplateExperimentMetrics) => void;
  onComplete: () => void;
};

/** Mỗi hiện tượng của kịch bản một kiểu hình và màu riêng, tra theo `kind`. */
const ITEM_STYLES = {
  pellet: { shape: "shard" as const, fill: "#fbbf24", stroke: "#fde68a", size: 0.05 },
};

export function TemplateExperimentScene({
  params,
  running,
  speed,
  resetSignal,
  command,
  onData,
  onComplete,
}: TemplateExperimentSceneProps) {
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();
  // Người xem thu phóng (cuộn chuột, nút) và kéo cảnh; chỉ đổi cách hiện, không đổi toạ độ hay PIXELS_PER_METER.
  const camera = useViewCamera(containerRef);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const konvaHostRef = useRef<HTMLDivElement>(null);

  const launcherRef = useRef<ReturnType<typeof makeTemplateExperimentDevice1> | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);

  const stateRef = useRef<TemplateExperimentState>(createTemplateExperimentState(params));
  const paramsRef = useRef(params);
  const runningRef = useRef(running);
  const speedRef = useRef(speed);
  const onDataRef = useRef(onData);
  const onCompleteRef = useRef(onComplete);
  const lastCommandTokenRef = useRef(0);

  const view = useMemo(
    () => createViewTransform({
      viewWidth: VIEW_WIDTH,
      viewHeight: VIEW_HEIGHT,
      pixelsPerMeter: PIXELS_PER_METER,
      origin: ORIGIN,
    }),
    [],
  );

  useEffect(() => {
    paramsRef.current = params;
    runningRef.current = running;
    speedRef.current = speed;
    onDataRef.current = onData;
    onCompleteRef.current = onComplete;
  }, [params, running, speed, onData, onComplete]);

  /** Gắn số của engine vào các vật. Gọi cả khi chưa chạy, để trạng thái đầu cũng vẽ đúng. */
  const applyMetrics = (metrics: TemplateExperimentMetrics) => {
    const launcher = launcherRef.current;
    if (!launcher) return;
    const pose = metrics.objects.launcher;
    if (!pose) return;
    placeObject(launcher, view.toView(pose.x, pose.y));
    setObjectVisible(launcher, pose.visible);
    // Engine cho góc NGẨNG LÊN; trục y của Konva hướng xuống nên quay theo giá trị âm.
    applyPose(launcher, { barrel: -pose.parts.barrel }, PIXELS_PER_METER);
  };

  // Đặt lại: dựng state mới, vẽ lại trạng thái đầu, báo cho trang.
  useEffect(() => {
    stateRef.current = createTemplateExperimentState(paramsRef.current);
    const metrics = templateExperimentMetrics(stateRef.current, paramsRef.current);
    applyMetrics(metrics);
    layerRef.current?.batchDraw();
    onDataRef.current(metrics);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  // Lệnh từ thanh công cụ. Token 0 là "chưa có lệnh nào".
  useEffect(() => {
    if (command.token === 0 || command.token === lastCommandTokenRef.current) return;
    lastCommandTokenRef.current = command.token;
    stateRef.current = applyTemplateExperimentCommand(stateRef.current, command.type);
    const metrics = templateExperimentMetrics(stateRef.current, paramsRef.current);
    applyMetrics(metrics);
    layerRef.current?.batchDraw();
    onDataRef.current(metrics);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command]);

  useEffect(() => {
    const host = konvaHostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas || size.width <= 0 || size.height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    const context = canvas.getContext("2d");
    if (!context) return;

    const stage = new Konva.Stage({ container: host, width: size.width, height: size.height });
    const layer = new Konva.Layer();
    const launcher = makeTemplateExperimentDevice1({ x: 0, y: 0 }, PIXELS_PER_METER, DEVICE_FILL, "Máy bắn");
    // Vật ĐỘNG nhỏ hơn MIN_OBJECT_PX thì phóng hình quanh điểm neo (máy bắn đứng yên và đủ lớn nên k = 1).
    const k = magnifyFor(OBJECT_SIZES.launcher, PIXELS_PER_METER);
    launcher.group.scale({ x: k, y: k });
    const magnified = k > 1;
    layer.add(launcher.group);
    stage.add(layer);
    layerRef.current = layer;
    launcherRef.current = launcher;

    applyMetrics(templateExperimentMetrics(stateRef.current, paramsRef.current));

    let frame = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const elapsed = Math.max(0, (now - last) / 1000);
      last = now;

      if (runningRef.current) {
        const result = stepTemplateExperiment(
          stateRef.current,
          paramsRef.current,
          Math.min(1 / 30, elapsed * Math.max(0, speedRef.current)),
        );
        stateRef.current = result.state;
        if (result.completed) onCompleteRef.current();
      }

      const metrics = templateExperimentMetrics(stateRef.current, paramsRef.current);
      if (runningRef.current) onDataRef.current(metrics);
      applyMetrics(metrics);

      const container = { width: size.width, height: size.height };
      const fit = camera.apply(fitView(container, VIEW_WIDTH, VIEW_HEIGHT));
      const extents = visibleExtents(container, fit);

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = SCENE_COLORS.background;
      context.fillRect(0, 0, size.width, size.height);
      context.translate(fit.offsetX, fit.offsetY);
      context.scale(fit.scale, fit.scale);

      // Bước lưới và vạch chia tự tính (~1/10 khung nhìn, số đẹp): không truyền bước.
      drawGrid(context, view, extents);

      // Mặt sàn y = 0.
      const floorY = view.toView(0, 0).y;
      context.strokeStyle = SCENE_COLORS.groundLine;
      context.lineWidth = 2 / fit.zoom;
      context.beginPath();
      context.moveTo(view.toView(extents.x0, 0).x, floorY);
      context.lineTo(view.toView(extents.x1, 0).x, floorY);
      context.stroke();

      drawAxes(context, view, { extents });

      // HIỆN TƯỢNG: đọc `metrics.items` mỗi khung hình, nhóm theo `kind`, vẽ theo style của loại đó.
      // Danh sách rỗng thì không vẽ gì thêm — cảnh không bịa ra thứ engine không phát.
      for (const [kind, items] of groupByKind(metrics.items)) {
        drawItems(context, view, items, ITEM_STYLES[kind as keyof typeof ITEM_STYLES]);
      }
      if (magnified) drawScaleNote(context, extents);

      // Konva đặt chồng lên canvas, dùng đúng phép co và lề của canvas để hai lớp khớp nhau.
      stage.scale({ x: fit.scale, y: fit.scale });
      stage.position({ x: fit.offsetX, y: fit.offsetY });
      layer.batchDraw();

      frame = window.requestAnimationFrame(draw);
    };

    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      stage.destroy();
      layerRef.current = null;
      launcherRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, view]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 block" />
      <div ref={konvaHostRef} className="absolute inset-0" style={{ pointerEvents: "none" }} />
      <ViewZoomControls camera={camera} />
    </div>
  );
}
