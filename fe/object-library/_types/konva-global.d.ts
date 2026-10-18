// Vật trong kho là một hàm ở cấp cao nhất, không import: cổng kiểm (scripts/lib/free-object-check.mjs) và trang /vat-the-mo-phong
// đưa Konva vào như biến toàn cục. Khai kiểu ở đây chỉ để `npx tsc -p object-library/_types` kiểm được các vật.
declare const Konva: typeof import("konva").default;
declare namespace Konva {
  type Context = import("konva/lib/Context").Context;
  type Group = import("konva/lib/Group").Group;
  type Shape = import("konva/lib/Shape").Shape;
}
