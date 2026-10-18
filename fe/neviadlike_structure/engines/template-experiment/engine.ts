// TẦNG ENGINE — engine.ts
// Toàn bộ engine của một thí nghiệm nằm trong MỘT file, theo bốn phần: kiểu → hằng số → máy trạng thái → vật lý.
// Vật lý thuần: không import React, DOM, canvas, Konva; không Math.random, không đồng hồ hệ thống.
//
// KHUÔN MẪU: thí nghiệm ném xiên — một máy bắn đứng trên sàn, nòng ngẩng theo góc đặt trước,
// bắn ra các viên đạn bay theo quỹ đạo parabol rồi rơi xuống đất.
// Nó cố ý có ĐỦ HAI KÊNH mà mọi thí nghiệm đều dùng:
//   - `objects` : khí cụ (máy bắn) — vị trí điểm neo và tư thế bộ phận (nòng quay).
//   - `items`   : hiện tượng (viên đạn) — thứ thí nghiệm TẠO RA, số lượng đổi theo thời gian.
// Đổi tiền tố `TemplateExperiment` thành tên thí nghiệm của bạn.

/* ══ 1. KIỂU ═══════════════════════════════════════════════════════════════ */

/** Pha bắt buộc; thêm pha riêng nếu thí nghiệm cần. */
export type TemplateExperimentPhase = "idle" | "running" | "paused" | "complete";

export type TemplateExperimentCommand = "start" | "pause" | "resume";

/** Tham số người dùng chỉnh, theo ĐƠN VỊ TRỰC QUAN của kịch bản (độ, m/s) — không đổi sang SI. */
export type TemplateExperimentParams = {
  /** Tốc độ rời nòng, m/s. */
  launchSpeed: number;
  /** Góc ngẩng của nòng, độ so với phương ngang. */
  launchAngle: number;
};

/** Một viên đạn đang bay. Đây là trạng thái riêng của engine, không vật nào sở hữu. */
export type Pellet = {
  id: number;
  /** Vị trí trong thế giới, mét. */
  x: number;
  y: number;
  /** Vận tốc, m/s. */
  vx: number;
  vy: number;
  /** Đã chạm đất thì nằm lại và mờ dần. */
  landed: boolean;
  /** Giây còn lại trước khi biến mất khỏi cảnh. */
  fade: number;
};

export type TemplateExperimentEvent = { phase: string; label: string; time: number };

export type TemplateExperimentHistoryPoint = { time: number; values: Record<string, number> };

/** Trạng thái BẤT BIẾN: mỗi hàm trả object mới, không sửa đầu vào. */
export type TemplateExperimentState = {
  phase: TemplateExperimentPhase;
  resumePhase: TemplateExperimentPhase;
  /** Giây đã mô phỏng. */
  time: number;
  /** Góc ngẩng HIỆN TẠI của nòng, độ. Khi bắt đầu chạy nòng ngẩng dần từ 0 tới góc đã đặt. */
  barrelAngle: number;
  /** Đạn đang trong cảnh; dài ngắn tuỳ khoảnh khắc. */
  pellets: Pellet[];
  /** Giây kể từ phát bắn gần nhất, để biết khi nào bắn phát tiếp. */
  sinceLastShot: number;
  /** Đếm tăng dần, làm id cho viên đạn mới. */
  nextPelletId: number;
  /** Số viên đã chạm đất, một đại lượng tích luỹ. */
  landedCount: number;
  history: TemplateExperimentHistoryPoint[];
  events: TemplateExperimentEvent[];
};

/**
 * Vị trí điểm neo (mét) và tư thế tức thời của từng bộ phận của MỘT vật.
 * Bộ phận trượt tính bằng mét, bộ phận quay tính bằng độ, đều tính từ vị trí nghỉ.
 * `visible: false` khi vật chưa xuất hiện hay đã biến mất (vẫn có `x`, `y`); bỏ trống là đang thấy.
 */
export type ObjectPose = { x: number; y: number; parts: Record<string, number>; visible?: boolean };

/**
 * Một thứ thí nghiệm TẠO RA tại khoảnh khắc này. `kind` là tên hiện tượng trong kịch bản;
 * `x`, `y` bằng mét trong thế giới, cùng hệ với `objects`. Cảnh vẽ chúng bằng `shared/draw-items.ts`.
 */
export type SceneItem = {
  kind: string;
  x: number;
  y: number;
  angle?: number;
  scale?: number;
  opacity?: number;
};

export type TemplateExperimentMetrics = {
  phase: TemplateExperimentPhase;
  time: number;
  /** MỌI đại lượng của kịch bản theo id, đơn vị trực quan, luôn hữu hạn kể cả ở pha "idle". */
  values: Record<string, number>;
  /** Một mục cho MỖI vật của thí nghiệm, ở mọi pha. */
  objects: Record<string, ObjectPose>;
  /** Hiện tượng tại khoảnh khắc này; `[]` khi chưa có gì. */
  items: SceneItem[];
  history: TemplateExperimentHistoryPoint[];
  events: TemplateExperimentEvent[];
};

export type TemplateExperimentStepResult = {
  state: TemplateExperimentState;
  completed: boolean;
};

/** Kiểu cảnh cho `applyParams` của preset; thí nghiệm tự chứa thì để `Record<string, never>`. */
export type TemplateExperimentScene = Record<string, never>;

/* ══ 2. HẰNG SỐ ════════════════════════════════════════════════════════════ */
// Hằng số vật lý, hình học của vật và tham số mặc định. KHÔNG có pixel ở đây:
// màn view và pixel-trên-mét thuộc renderers/<x>/view-constants.ts.
//
// Hình học của vật (kích thước, điểm neo, các điểm có tên) do KỊCH BẢN chốt. Khai lại thành
// hằng số có tên ở đây rồi dùng chính chúng để xét tương tác, đừng đặt mốc tuỳ ý.

export const SIM_DURATION_SECONDS = 18;
export const PHYSICS_SUBSTEP = 1 / 240;
export const MAX_FRAME_DT = 1 / 30;
export const MAX_HISTORY_POINTS = 600;

/** Gia tốc trọng trường, m/s². */
export const GRAVITY = 9.8;

/* ── Hình học của máy bắn (mét, theo kịch bản) ───────────────────────────── */

/** Điểm neo của máy bắn: tâm đáy, chạm sàn. Vật đứng yên nên vị trí này không đổi. */
export const LAUNCHER_ANCHOR = { x: 0.6, y: 0 };
/** Tâm khớp quay của nòng, đo từ điểm neo. */
export const BARREL_PIVOT = { x: 0, y: 0.32 };
/** Chiều dài nòng, từ khớp quay tới miệng nòng. */
export const BARREL_LENGTH = 0.42;
/** Tốc độ ngẩng nòng khi máy ngắm, độ trên giây. Máy chỉ bắn sau khi nòng tới đúng góc đã đặt. */
export const AIM_RATE = 60;
/** Khoảng giữa hai phát bắn, giây. */
export const SHOT_INTERVAL = 0.9;
/** Viên đạn đã nằm đất mờ dần rồi biến mất sau chừng này giây. */
export const PELLET_FADE_SECONDS = 1.6;
/** Quá xa hay quá thấp thì bỏ khỏi cảnh, để danh sách không phình mãi. */
export const WORLD_LIMIT = { maxX: 12, minY: -1 };

export const DEFAULT_TEMPLATE_EXPERIMENT_PARAMS: TemplateExperimentParams = {
  launchSpeed: 7,
  launchAngle: 45,
};

/* ══ 3. MÁY TRẠNG THÁI ═════════════════════════════════════════════════════ */
// Chuyển pha của thí nghiệm (idle → running ⇄ paused → complete). Hàm thuần, trả object mới.

export const TEMPLATE_EXPERIMENT_PHASE_LABELS: Record<TemplateExperimentPhase, string> = {
  idle: "Sẵn sàng",
  running: "Đang bắn",
  paused: "Tạm dừng",
  complete: "Đã xong",
};

/** Đổi pha và ghi một mốc vào `events`; quay về "idle" thì xoá sạch mốc cũ. */
export function transitionTemplateExperimentPhase(
  state: TemplateExperimentState,
  phase: Exclude<TemplateExperimentPhase, "paused">,
): TemplateExperimentState {
  const event: TemplateExperimentEvent = {
    phase,
    label: TEMPLATE_EXPERIMENT_PHASE_LABELS[phase],
    time: state.time,
  };
  return {
    ...state,
    phase,
    resumePhase: phase,
    events: phase === "idle" ? [] : [...state.events, event],
  };
}

/** Chỉ tạm dừng được khi đang chạy; nhớ pha để quay lại. */
export function pauseTemplateExperimentState(state: TemplateExperimentState): TemplateExperimentState {
  if (state.phase !== "running") return state;
  return { ...state, resumePhase: state.phase, phase: "paused" };
}

/** Chỉ chạy tiếp được khi đang tạm dừng. */
export function resumeTemplateExperimentState(state: TemplateExperimentState): TemplateExperimentState {
  if (state.phase !== "paused") return state;
  return { ...state, phase: state.resumePhase === "paused" ? "running" : state.resumePhase };
}

/* ══ 4. VẬT LÝ ═════════════════════════════════════════════════════════════ */
// Công thức vật lý THUẦN (không React, không canvas, không Math.random, không đồng hồ hệ thống).
// Đây là nơi DUY NHẤT tính toán; renderer chỉ gọi rồi vẽ.
//
// Hai thứ engine phải đưa ra mỗi khung hình:
//   - `objects[<id vật>]`  : vị trí điểm neo (mét) và tư thế từng bộ phận.
//   - `items`              : hiện tượng thí nghiệm tạo ra, số lượng đổi theo thời gian.

const RADIANS = Math.PI / 180;

/**
 * NƠI DUY NHẤT đặt công thức của bài. Nhận `id -> số` (thiếu thì lấy mặc định), trả các đại lượng
 * suy ra. `step` và `templateExperimentMetrics` gọi lại hàm này, không chép lại công thức.
 *
 * Ném xiên từ mặt đất:  tầm xa R = v²·sin(2θ)/g,  độ cao cực đại H = v²·sin²θ/(2g),  thời gian bay T = 2v·sinθ/g.
 */
export function evaluate(inputs: Record<string, number>): Record<string, number> {
  const speed = Number.isFinite(inputs.launchSpeed) ? inputs.launchSpeed : DEFAULT_TEMPLATE_EXPERIMENT_PARAMS.launchSpeed;
  const angle = Number.isFinite(inputs.launchAngle) ? inputs.launchAngle : DEFAULT_TEMPLATE_EXPERIMENT_PARAMS.launchAngle;
  const theta = angle * RADIANS;
  return {
    range: (speed * speed * Math.sin(2 * theta)) / GRAVITY,
    peakHeight: (speed * speed * Math.sin(theta) * Math.sin(theta)) / (2 * GRAVITY),
    flightTime: (2 * speed * Math.sin(theta)) / GRAVITY,
  };
}

/** Miệng nòng trong thế giới: điểm neo + khớp quay + nòng đã ngẩng. Đây là chỗ đạn ra. */
function muzzle(angleDegrees: number): { x: number; y: number } {
  const theta = angleDegrees * RADIANS;
  return {
    x: LAUNCHER_ANCHOR.x + BARREL_PIVOT.x + BARREL_LENGTH * Math.cos(theta),
    y: LAUNCHER_ANCHOR.y + BARREL_PIVOT.y + BARREL_LENGTH * Math.sin(theta),
  };
}

export function createTemplateExperimentState(
  params: TemplateExperimentParams,
): TemplateExperimentState {
  void params;
  return {
    phase: "idle",
    resumePhase: "idle",
    time: 0,
    barrelAngle: 0, // nòng hạ hẳn khi chưa chạy; ngẩng dần lên khi bắt đầu
    pellets: [],
    sinceLastShot: Number.POSITIVE_INFINITY, // bắn ngay khi ngắm xong
    nextPelletId: 1,
    landedCount: 0,
    history: [],
    events: [],
  };
}

export function applyTemplateExperimentCommand(
  state: TemplateExperimentState,
  command: TemplateExperimentCommand,
): TemplateExperimentState {
  switch (command) {
    case "start":
      if (state.phase !== "idle" && state.phase !== "complete") return state;
      return transitionTemplateExperimentPhase(
        { ...createTemplateExperimentState(DEFAULT_TEMPLATE_EXPERIMENT_PARAMS), events: [] },
        "running",
      );
    case "pause":
      return pauseTemplateExperimentState(state);
    case "resume":
      return resumeTemplateExperimentState(state);
    default:
      return state;
  }
}

/** Một bước vật lý cố định: đạn bay theo quán tính và trọng lực, đạn đã rơi thì mờ dần. */
function advance(
  state: TemplateExperimentState,
  params: TemplateExperimentParams,
  dt: number,
): TemplateExperimentState {
  const pellets: Pellet[] = [];
  let landedCount = state.landedCount;

  for (const pellet of state.pellets) {
    if (pellet.landed) {
      const fade = pellet.fade - dt;
      if (fade > 0) pellets.push({ ...pellet, fade });
      continue;
    }
    const vy = pellet.vy - GRAVITY * dt;
    const x = pellet.x + pellet.vx * dt;
    const y = pellet.y + vy * dt;
    if (y <= 0) {
      // Chạm đất: nằm lại đúng chỗ rơi rồi mờ dần, không nảy.
      landedCount += 1;
      pellets.push({ ...pellet, x, y: 0, vx: 0, vy: 0, landed: true, fade: PELLET_FADE_SECONDS });
      continue;
    }
    if (x > WORLD_LIMIT.maxX || y < WORLD_LIMIT.minY) continue; // ra khỏi cảnh thì bỏ
    pellets.push({ ...pellet, x, y, vy });
  }

  // Máy ngắm: nòng ngẩng dần từ vị trí hạ tới góc đã đặt, không nhảy tức thì.
  const target = params.launchAngle;
  const gap = target - state.barrelAngle;
  const stepAngle = AIM_RATE * dt;
  const barrelAngle = Math.abs(gap) <= stepAngle ? target : state.barrelAngle + Math.sign(gap) * stepAngle;
  const aimed = barrelAngle === target;

  // Bắn theo nhịp cố định, nhưng chỉ sau khi đã ngắm xong; đạn ra từ đúng miệng nòng, đúng góc nòng.
  let sinceLastShot = state.sinceLastShot + dt;
  let nextPelletId = state.nextPelletId;
  if (aimed && sinceLastShot >= SHOT_INTERVAL) {
    sinceLastShot = 0;
    const at = muzzle(barrelAngle);
    const theta = barrelAngle * RADIANS;
    pellets.push({
      id: nextPelletId,
      x: at.x,
      y: at.y,
      vx: params.launchSpeed * Math.cos(theta),
      vy: params.launchSpeed * Math.sin(theta),
      landed: false,
      fade: PELLET_FADE_SECONDS,
    });
    nextPelletId += 1;
  }

  return { ...state, time: state.time + dt, barrelAngle, pellets, sinceLastShot, nextPelletId, landedCount };
}

export function stepTemplateExperiment(
  state: TemplateExperimentState,
  params: TemplateExperimentParams,
  frameDt: number,
): TemplateExperimentStepResult {
  if (state.phase !== "running") return { state, completed: false };

  const dt = Math.min(Math.max(frameDt, 0), MAX_FRAME_DT);
  const steps = Math.max(1, Math.ceil(dt / PHYSICS_SUBSTEP));
  const substep = dt / steps;

  let next = state;
  for (let i = 0; i < steps; i += 1) next = advance(next, params, substep);

  // Lịch sử ghi thưa để đồ thị không phình.
  const last = next.history[next.history.length - 1];
  if (!last || next.time - last.time >= 0.03) {
    const point = { time: next.time, values: templateExperimentMetrics(next, params).values };
    next = { ...next, history: [...next.history, point].slice(-MAX_HISTORY_POINTS) };
  }

  if (next.time >= SIM_DURATION_SECONDS) {
    return { state: transitionTemplateExperimentPhase(next, "complete"), completed: true };
  }
  return { state: next, completed: false };
}

export function templateExperimentMetrics(
  state: TemplateExperimentState,
  params: TemplateExperimentParams,
): TemplateExperimentMetrics {
  const derived = evaluate({ launchSpeed: params.launchSpeed, launchAngle: params.launchAngle });

  // Hiện tượng: mỗi viên đạn là một item. Đạn đã nằm đất thì mờ dần theo `fade`.
  const items: SceneItem[] = state.pellets.map((pellet) => ({
    kind: "pellet",
    x: pellet.x,
    y: pellet.y,
    // Đạn đang bay quay theo hướng vận tốc, nhìn ra chiều chuyển động.
    angle: pellet.landed ? 0 : -Math.atan2(pellet.vy, pellet.vx) / RADIANS,
    scale: pellet.landed ? 0.8 : 1,
    opacity: pellet.landed ? Math.max(0, pellet.fade / PELLET_FADE_SECONDS) : 1,
  }));

  return {
    phase: state.phase,
    time: state.time,
    values: {
      range: derived.range,
      peakHeight: derived.peakHeight,
      flightTime: derived.flightTime,
      launchAngle: params.launchAngle,
      landedCount: state.landedCount,
    },
    objects: {
      // Máy bắn đứng yên, nhưng vật đứng yên VẪN phải có vị trí; nòng là bộ phận quay.
      launcher: {
        x: LAUNCHER_ANCHOR.x,
        y: LAUNCHER_ANCHOR.y,
        // Góc NÒNG ĐANG Ở, không phải góc người dùng đặt: lúc đầu nòng còn đang ngẩng lên.
        parts: { barrel: state.barrelAngle },
      },
    },
    items,
    history: state.history,
    events: state.events,
  };
}
