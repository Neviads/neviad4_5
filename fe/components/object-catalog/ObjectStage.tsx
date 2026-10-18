"use client";

/**
 * Một vật của kho dựng bằng Konva thật, vừa khung chứa: tỉ lệ (pixel trên mét) chọn từ khung bao của vật, vật được căn giữa, và nếu
 * điểm neo nằm ở đáy (vật đứng trên sàn) thì vẽ thêm đường sàn. `pose` đặt các bộ phận chuyển động như cảnh thật (applyPose).
 */

import Konva from "konva";
import { useEffect, useRef } from "react";
import { useContainerSize } from "@/components/simulations/shared/use-container-size";
import { applyPose } from "@/neviadlike_structure/shared/object-pose";
import type { ShapeObject } from "@/neviadlike_structure/objects/types";
import type { LibraryObject } from "@/lib/object-library";

const BACKGROUND = "#0f172a";
const GRID = "#3a4a68";

export function ObjectStage({ object, pose, fill, fit = 0.72, grid = false, className = "" }: {
  object: LibraryObject;
  pose?: Record<string, number>;
  fill?: string;
  /** Phần khung chứa mà vật chiếm, theo chiều chật hơn. */
  fit?: number;
  grid?: boolean;
  className?: string;
}) {
  const { ref, size } = useContainerSize<HTMLDivElement>();
  const built = useRef<{ shape: ShapeObject; ppm: number; layer: Konva.Layer } | null>(null);
  const poseRef = useRef(pose);
  // Chạy trước hiệu ứng dựng vật (cùng lần commit), để vật dựng lại khi đổi cỡ vẫn giữ tư thế đang chọn.
  useEffect(() => { poseRef.current = pose; });

  useEffect(() => {
    const host = ref.current;
    const { width, height } = size;
    if (!host || width < 10 || height < 10) return;
    const stage = new Konva.Stage({ container: host, width, height, listening: false });
    const layer = new Konva.Layer({ listening: false });
    stage.add(layer);
    layer.add(new Konva.Rect({ width, height, fill: BACKGROUND }));
    if (grid) {
      for (let x = 40; x < width; x += 40) layer.add(new Konva.Line({ points: [x, 0, x, height], stroke: GRID, strokeWidth: 1, opacity: 0.45 }));
      for (let y = 40; y < height; y += 40) layer.add(new Konva.Line({ points: [0, y, width, y], stroke: GRID, strokeWidth: 1, opacity: 0.45 }));
    }

    const { meta } = object;
    const ppm = Math.min((fit * width) / meta.size.width, (fit * height) / meta.size.height);
    let shape: ShapeObject;
    try {
      shape = object.make({ x: 0, y: 0 }, ppm, fill ?? meta.fill ?? "#60758b");
    } catch (error) {
      layer.add(new Konva.Text({ x: 12, y: 12, width: width - 24, text: `Không dựng được vật: ${error instanceof Error ? error.message : String(error)}`, fontSize: 12, fill: "#fca5a5" }));
      layer.draw();
      return () => stage.destroy();
    }
    layer.add(shape.group);
    // Căn giữa theo khung bao ở tư thế nghỉ; vật đứng trên điểm neo ở đáy thì đặt đáy lên một đường sàn.
    const box = shape.group.getClientRect({ relativeTo: layer, skipShadow: true });
    const standing = Math.abs(box.y + box.height) <= 0.04 * box.height;
    const x = width / 2 - (box.x + box.width / 2);
    const y = standing ? height / 2 + box.height / 2 : height / 2 - (box.y + box.height / 2);
    shape.group.position({ x, y });
    if (standing) {
      const floor = new Konva.Line({ points: [0, y, width, y], stroke: "#64748b", strokeWidth: 2 });
      layer.add(floor);
      floor.moveToBottom();
      floor.moveUp();
    }
    applyPose(shape, poseRef.current, ppm);
    layer.draw();
    built.current = { shape, ppm, layer };
    return () => {
      built.current = null;
      stage.destroy();
    };
  }, [object, fill, fit, grid, size, ref]);

  useEffect(() => {
    const current = built.current;
    if (!current || !pose) return;
    applyPose(current.shape, pose, current.ppm);
    current.layer.batchDraw();
  }, [pose]);

  return <div ref={ref} className={`h-full w-full overflow-hidden ${className}`} />;
}
