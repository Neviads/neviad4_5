/**
 * Khối cơ bản để dựng thứ chưa có trong thư viện: hộp, thanh tròn (trục), ống, đĩa / vòng chặn.
 * Vật tròn xoay có trục dọc y của khung bộ phận, tâm ở gốc.
 */

import * as THREE from "three";
import { MATERIAL_NAMES, type PartType } from "../core/types";
import { RoundedBox } from "../three/geo";
import { axis, boxFaces, hface, kitOf, num, point, ringLathe, shadowed, str, surface, vec } from "./_common";

const material = (def: string) => ({ type: "enum" as const, options: MATERIAL_NAMES, default: def, desc: "vật liệu" });

export const block: PartType = {
  type: "block",
  category: "primitive",
  description: "Hộp chữ nhật bo cạnh, tâm ở gốc (đế, cột, giá, nắp…).",
  params: {
    size: { type: "vec3", unit: "m", default: [0.1, 0.05, 0.1], min: 0.001, max: 50, desc: "[rộng x, cao y, sâu z]" },
    bevel: { type: "number", unit: "m", default: 0.0015, min: 0, max: 0.3, desc: "bán kính bo cạnh" },
    material: material("aluminium"),
  },
  anchors: (p) => ({
    ...boxFaces(vec(p, "size")),
    center: point([0, 0, 0], [0, 1, 0], "tâm hộp"),
    axisX: axis([0, 0, 0], [1, 0, 0], [0, 1, 0], "trục +x qua tâm (dọc chiều rộng)"),
    axisY: axis([0, 0, 0], [0, 1, 0], [0, 0, 1], "trục +y qua tâm (thẳng đứng)"),
    axisZ: axis([0, 0, 0], [0, 0, 1], [0, 1, 0], "trục +z qua tâm (dọc chiều sâu)"),
  }),
  bounds: (p) => {
    const [w, h, d] = vec(p, "size").map((x) => x / 2);
    return { min: [-w, -h, -d], max: [w, h, d] };
  },
  build: (p, k) => {
    const [w, h, d] = vec(p, "size");
    const r = Math.min(num(p, "bevel"), w / 4.4, h / 4.4, d / 2.2);
    const geo = r > 0 ? new RoundedBox(w, h, d, r) : new THREE.BoxGeometry(w, h, d);
    return shadowed(new THREE.Mesh(geo, kitOf(k).byName[str(p, "material") as keyof ReturnType<typeof kitOf>["byName"]]));
  },
};

function roundBody(type: string, description: string, defaults: { length: number; diameter: number; bore: number; material: string }, category: PartType["category"] = "primitive"): PartType {
  return {
    type,
    category,
    description,
    params: {
      length: { type: "number", unit: "m", default: defaults.length, min: 0.0005, max: 50, desc: "chiều dài dọc trục" },
      diameter: { type: "number", unit: "m", default: defaults.diameter, min: 0.0005, max: 2, desc: "đường kính ngoài" },
      boreDiameter: { type: "number", unit: "m", default: defaults.bore, min: 0, max: 2, desc: "đường kính lỗ (0 = đặc)" },
      material: material(defaults.material),
    },
    anchors: (p) => {
      const L = num(p, "length"), R = num(p, "diameter") / 2, b = num(p, "boreDiameter") / 2;
      return {
        axis: axis([0, 0, 0], [0, 1, 0], [0, 0, 1], "trục, tâm ở giữa chiều dài; R = bán kính ngoài", R),
        ...(b > 0 ? { bore: axis([0, 0, 0], [0, 1, 0], [0, 0, 1], "lỗ (dùng làm b của through)", b) } : {}),
        end0: { ...hface([0, -L / 2, 0], false, "mặt đầu phía −trục"), up: [0, 0, 1] },
        end1: { ...hface([0, L / 2, 0], true, "mặt đầu phía +trục"), up: [0, 0, 1] },
        surface: surface([0, 0, 0], [0, 1, 0], R, [0, 0, 1], "mặt trụ ngoài (ở giữa chiều dài)"),
      };
    },
    bounds: (p) => {
      const L = num(p, "length") / 2, R = num(p, "diameter") / 2;
      return { min: [-R, -L, -R], max: [R, L, R] };
    },
    build: (p, k) => {
      const geo = ringLathe(num(p, "diameter") / 2, num(p, "boreDiameter") / 2, num(p, "length"));
      return shadowed(new THREE.Mesh(geo, kitOf(k).byName[str(p, "material") as keyof ReturnType<typeof kitOf>["byName"]]));
    },
  };
}

export const rod = roundBody("rod", "Thanh tròn đặc (trục dọc y). Dùng làm cột, chốt, thanh nối.", { length: 0.1, diameter: 0.01, bore: 0, material: "steel" });
export const shaft = roundBody("shaft", "Trục thép quay; lắp qua lỗ gối đỡ bằng through.", { length: 0.42, diameter: 0.012, bore: 0, material: "steel" }, "mechanical");
export const tube = roundBody("tube", "Ống tròn có lỗ (trục dọc y).", { length: 0.1, diameter: 0.02, bore: 0.016, material: "aluminium" });
export const disc = roundBody("disc", "Đĩa tròn mỏng (trục dọc y), có thể có lỗ giữa.", { length: 0.004, diameter: 0.05, bore: 0, material: "aluminium" });
export const collar = roundBody("collar", "Vòng chặn trên trục, lắp bằng coaxial.", { length: 0.006, diameter: 0.019, bore: 0.012, material: "steel" }, "mechanical");
