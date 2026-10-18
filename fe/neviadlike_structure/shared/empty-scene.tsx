"use client";

// SHARED — cảnh canvas trống: chỉ có nền tối, lưới và trục Oxy, phủ kín container.
// Dùng làm khung ban đầu; thí nghiệm thật thay bằng renderer của mình
// (renderers/<x>/<x>-scene.tsx) và vẽ vật thể giữa drawGrid và drawAxes.

import { useEffect, useMemo, useRef } from "react";
import { SCENE_COLORS, drawAxes, drawGrid, visibleExtents } from "./draw-axes";
import { useContainerSize } from "./use-container-size";
import { createViewTransform, fitView, type ViewConfig } from "./view-transform";

export function EmptyScene({
  viewWidth,
  viewHeight,
  pixelsPerMeter,
  origin,
}: ViewConfig) {
  const { ref, size } = useContainerSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useMemo(
    () => createViewTransform({ viewWidth, viewHeight, pixelsPerMeter, origin }),
    [viewWidth, viewHeight, pixelsPerMeter, origin],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    const context = canvas.getContext("2d");
    if (!context) return;

    const container = { width: size.width, height: size.height };
    const fit = fitView(container, viewWidth, viewHeight);
    const extents = visibleExtents(container, fit);

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = SCENE_COLORS.background;
    context.fillRect(0, 0, size.width, size.height);
    context.translate(fit.offsetX, fit.offsetY);
    context.scale(fit.scale, fit.scale);
    drawGrid(context, view, extents);
    drawAxes(context, view, { extents });
  }, [size.width, size.height, view, viewWidth, viewHeight]);

  return (
    <div ref={ref} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        style={{ width: size.width, height: size.height }}
        className="block"
      />
    </div>
  );
}
