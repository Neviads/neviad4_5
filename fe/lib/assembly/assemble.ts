// LẮP RÁP máy từ các vật con (SmartObject). Thuần hàm: không biết Konva, chỉ cần `ports` và `set` của từng vật con.
//
// Mô hình:
//   - Máy có MỘT đầu vào `u` (vd. hành trình ấn cần bơm).
//   - Mỗi vật con chuyển động có một `driver`: đầu vào của nó = biểu thức số học của `u` (vd. "u*0.25").
//   - Vật con nối với nhau theo cây: điểm nối `childPort` của con trùng điểm nối `parentPort` của cha ở MỌI `u`.
//     Vị trí con = vị trí cha + port của cha − port của con, nên con luôn dính cha (không thể lơ lửng) nếu port khai đúng.
// Dùng chung cho trang (trình duyệt) và cổng kiểm tra Node (scripts/validate-assembly.mjs, Node chạy thẳng file .ts này).

export type Vec2 = { x: number; y: number };

export type AssemblyPlan = {
  input: { name: string; label: string; unit: string; min: number; max: number; default: number };
  root: string;
  components: {
    id: string;
    title: string;
    request: string;
    hint: string;
    moving: boolean;
    driver: { input: string; expr: string } | null;
  }[];
  attachments: { child: string; childPort: string; parent: string; parentPort: string }[];
};

export type PartLike = { ports: Record<string, Vec2>; set(values: Record<string, number>): void };

/** Chỉ số, `u`, + - * / ( ) và dấu chấm: biểu thức không thể gọi hàm hay truy cập gì ngoài `u`. */
const SAFE_EXPR = /^[0-9u+\-*/().\s]+$/;

export function isSafeExpression(expr: string): boolean {
  return SAFE_EXPR.test(expr);
}

export function evaluateDriver(expr: string, u: number): number {
  if (!isSafeExpression(expr)) throw new Error(`Biểu thức không hợp lệ: ${expr}`);
  const value = new Function("u", `"use strict"; return (${expr});`)(u);
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Biểu thức "${expr}" không ra số hữu hạn khi u=${u}`);
  return value;
}

/** Đặt đầu vào của mọi vật con chuyển động từ đầu vào `u` của máy. */
export function applyMachineInput(plan: AssemblyPlan, parts: Record<string, PartLike>, u: number): void {
  for (const c of plan.components) {
    if (c.driver) parts[c.id].set({ [c.driver.input]: evaluateDriver(c.driver.expr, u) });
  }
}

/** Vị trí (px) của gốc mỗi vật con, đi từ `root` xuống theo `attachments`. Gọi sau khi đã `set`. */
export function layout(plan: AssemblyPlan, parts: Record<string, PartLike>): Record<string, Vec2> {
  const at: Record<string, Vec2> = { [plan.root]: { x: 0, y: 0 } };
  const queue = [plan.root];
  while (queue.length) {
    const parent = queue.shift() as string;
    for (const a of plan.attachments.filter((x) => x.parent === parent)) {
      const from = parts[parent].ports[a.parentPort];
      const to = parts[a.child].ports[a.childPort];
      at[a.child] = { x: at[parent].x + from.x - to.x, y: at[parent].y + from.y - to.y };
      queue.push(a.child);
    }
  }
  return at;
}
