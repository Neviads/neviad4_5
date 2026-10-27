/**
 * Thư viện bộ phận của assembly-kit. Thêm loại mới: viết PartType trong một file ở thư mục này rồi khai báo ở đây.
 */

import type { Registry } from "../core/solve";
import { analogMeter, bindingPost, bulb, carbonBrush, coil, horseshoeMagnet, needle, slipRing, toggleSwitch } from "./electrical";
import { basePlate, bearingBlock, crank } from "./mechanical";
import { block, collar, disc, rod, shaft, tube } from "./primitives";

export const PARTS: Registry = Object.fromEntries(
  [block, rod, tube, disc, shaft, collar, basePlate, bearingBlock, crank, coil, slipRing, carbonBrush, horseshoeMagnet, bindingPost, bulb, analogMeter, needle, toggleSwitch].map((t) => [t.type, t]),
);
