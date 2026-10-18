// Chạy thử LOGIC của một vật thể thông minh (skill `draw-object`) trong Node, không cần canvas.
//
// Konva được thay bằng một bản giả: mọi `new Konva.X(cfg)` trả về một nút ghi lại các thuộc tính
// (`node.y(5)` đặt, `node.y()` đọc). Nhờ đó chạy được `set` / `get` / `read` của vật và đo được việc
// một đầu vào có thật sự làm hình thay đổi hay không. Code của model chạy trong `vm` có giới hạn thời gian.

import vm from "node:vm";

export function createFakeKonva() {
  const registry = [];
  const makeNode = (kind, cfg) => {
    const attrs = { ...(cfg && typeof cfg === "object" ? cfg : {}) };
    const children = [];
    const target = { __kind: kind, __attrs: attrs, __children: children };
    const node = new Proxy(target, {
      get(t, prop) {
        if (prop in t) return t[prop];
        if (typeof prop === "symbol" || prop === "then") return undefined;
        if (prop === "add") return (...items) => { children.push(...items.flat()); return node; };
        if (["destroy", "remove", "moveToTop", "moveToBottom", "cache", "clearCache", "draw", "batchDraw"].includes(prop)) return () => node;
        if (prop === "getTextWidth") return () => String(attrs.text ?? "").length * (attrs.fontSize ?? 12) * 0.55;
        return (...args) => {
          if (args.length === 0) return attrs[prop];
          attrs[prop] = args[0];
          return node;
        };
      },
    });
    registry.push(node);
    return node;
  };
  const Konva = new Proxy({}, {
    get(_, kind) {
      if (typeof kind === "symbol" || kind === "then") return undefined;
      if (kind === "Util") return { degToRad: (d) => (d * Math.PI) / 180, radToDeg: (r) => (r * 180) / Math.PI };
      return function FakeShape(cfg) { return makeNode(String(kind), cfg); };
    },
  });
  return { Konva, registry };
}

const snapshot = (registry) => JSON.stringify(registry.map((n) => n.__attrs), (_, v) => (typeof v === "function" ? undefined : v));

function hasNaN(registry) {
  const bad = [];
  const scan = (value, path) => {
    if (typeof value === "number") { if (!Number.isFinite(value)) bad.push(path); return; }
    if (Array.isArray(value)) value.forEach((v, i) => scan(v, `${path}[${i}]`));
    else if (value && typeof value === "object" && !value.__attrs) for (const [k, v] of Object.entries(value)) scan(v, `${path}.${k}`);
  };
  registry.forEach((n, i) => { for (const [k, v] of Object.entries(n.__attrs)) scan(v, `${n.__kind}#${i}.${k}`); });
  return bad.slice(0, 3);
}

const finite = (v) => typeof v === "number" && Number.isFinite(v);

const sameKeys = (a, b) => a.length === b.length && a.every((k) => b.includes(k));

/**
 * @param js        JavaScript đã biên dịch của hàm vẽ
 * @param name      tên hàm (vd. makeXxxObject)
 * @param declared  metadata model khai báo: { inputs:[{name,min,max,default}], outputs:[{name}], ports:[{name}], selfTests:[...] }
 * @returns         { problems: string[], report: string[] }  (rỗng problems = đạt)
 */
export function runObjectHarness(js, name, declared) {
  const problems = [];
  const report = [];
  const { Konva, registry } = createFakeKonva();
  const ctx = vm.createContext({ Konva, getSimulationFontFamily: () => "Arial", console: { log() {}, warn() {}, error() {} } });
  const inVm = (expr, vars = {}) => {
    Object.assign(ctx, vars);
    return vm.runInContext(expr, ctx, { timeout: 2000 });
  };

  let obj;
  try {
    inVm(`${js}\n;globalThis.__make = ${name};`);
    obj = inVm('__make({ x: 0, y: 0 }, 30, "#f472b6", "m")');
  } catch (error) {
    return { problems: [`Chạy hàm vẽ bị lỗi: ${error instanceof Error ? error.message : String(error)}`], report };
  }

  // 1. Hình dạng của đối tượng trả về.
  if (!obj || typeof obj !== "object") return { problems: ["Hàm không trả về đối tượng SmartObject."], report };
  if (!obj.group || typeof obj.group.add !== "function") problems.push("Thiếu `group` (Konva.Group).");
  if (!finite(obj.pixelsPerMeter) || obj.pixelsPerMeter <= 0) problems.push("`pixelsPerMeter` phải là số dương hữu hạn.");
  for (const fn of ["set", "get", "read"]) if (typeof obj[fn] !== "function") problems.push(`Thiếu hàm \`${fn}\`.`);
  const inputKeys = obj.inputs && typeof obj.inputs === "object" ? Object.keys(obj.inputs) : [];
  const outputKeys = obj.outputs && typeof obj.outputs === "object" ? Object.keys(obj.outputs) : [];
  const portKeys = obj.ports && typeof obj.ports === "object" ? Object.keys(obj.ports) : [];
  const isStatic = declared?.static === true; // vật con TĨNH của một máy lắp ráp: không có đầu vào/đầu ra, chỉ có hình và port
  if (!inputKeys.length && !isStatic) problems.push("`inputs` rỗng: vật phải có ít nhất một đầu vào điều khiển được.");
  if (!outputKeys.length && !isStatic) problems.push("`outputs` rỗng: vật phải có ít nhất một đại lượng đọc ra.");
  if (!portKeys.length) problems.push("`ports` rỗng: vật phải có ít nhất một điểm nối.");
  if (problems.length) return { problems, report };

  for (const k of inputKeys) {
    const d = obj.inputs[k];
    if (!d || !finite(d.min) || !finite(d.max) || !(d.min < d.max) || !finite(d.default) || d.default < d.min || d.default > d.max || typeof d.unit !== "string") {
      problems.push(`Đầu vào "${k}" khai báo sai (cần {label, unit, min < max, default trong [min,max]}).`);
    }
  }
  for (const k of portKeys) if (!obj.ports[k] || !finite(obj.ports[k].x) || !finite(obj.ports[k].y)) problems.push(`Port "${k}" phải là {x, y} hữu hạn.`);

  // 2. Metadata JSON phải khớp với những gì code thật sự khai báo.
  if (declared) {
    const names = (list) => (Array.isArray(list) ? list.map((x) => x?.name).filter(Boolean) : []);
    if (Array.isArray(declared.inputs) && !sameKeys(names(declared.inputs), inputKeys)) problems.push(`JSON khai báo inputs [${names(declared.inputs)}] khác với code [${inputKeys}].`);
    if (Array.isArray(declared.outputs) && !sameKeys(names(declared.outputs), outputKeys)) problems.push(`JSON khai báo outputs [${names(declared.outputs)}] khác với code [${outputKeys}].`);
    if (Array.isArray(declared.ports) && !sameKeys(names(declared.ports), portKeys)) problems.push(`JSON khai báo ports [${names(declared.ports)}] khác với code [${portKeys}].`);
  }
  if (problems.length) return { problems, report };

  const call = (method, arg) => inVm(`__obj.${method}(__arg)`, { __obj: obj, __arg: arg });
  const defaults = Object.fromEntries(inputKeys.map((k) => [k, obj.inputs[k].default]));

  try {
    call("set", defaults);
    // Port: tối đa 4 và cách nhau >= 30 px ở mọi trạng thái (chúng chuyển động theo đầu vào).
    const portIssues = new Set();
    const checkPorts = (label) => {
      const entries = Object.entries(obj.ports);
      if (entries.length > 4) portIssues.add("Có " + entries.length + " port, tối đa 4.");
      for (let a = 0; a < entries.length; a += 1) {
        for (let b = a + 1; b < entries.length; b += 1) {
          const d = Math.hypot(entries[a][1].x - entries[b][1].x, entries[a][1].y - entries[b][1].y);
          if (d < 30) portIssues.add("Port \"" + entries[a][0] + "\" và \"" + entries[b][0] + "\" chỉ cách " + d.toFixed(0) + " px (" + label + "); cần cách nhau ít nhất 30 px.");
        }
      }
    };

    // 3. Mọi đầu ra phải đọc được và hữu hạn.
    const readOk = (label) => {
      const out = call("read");
      if (!out || typeof out !== "object") { problems.push(`read() không trả đối tượng (${label}).`); return null; }
      for (const k of outputKeys) if (!finite(out[k])) problems.push(`read().${k} không hữu hạn (${label}): ${String(out[k])}.`);
      return out;
    };
    readOk("mặc định");
    checkPorts("mặc định");

    // 4. Mỗi đầu vào: kẹp giá trị, hữu hạn ở biên, và phải làm hình thay đổi.
    for (const k of inputKeys) {
      const { min, max } = obj.inputs[k];
      const span = max - min;
      call("set", { ...defaults, [k]: max + span * 10 });
      const hi = call("get")?.[k];
      call("set", { ...defaults, [k]: min - span * 10 });
      const lo = call("get")?.[k];
      if (!finite(hi) || hi > max + 1e-9 || !finite(lo) || lo < min - 1e-9) problems.push(`Đầu vào "${k}" không tự kẹp trong [${min}, ${max}] (get() ra ${lo}..${hi}).`);

      call("set", { ...defaults, [k]: min });
      readOk(`${k}=min`);
      checkPorts(`${k}=min`);
      const atMin = snapshot(registry);
      const nanMin = hasNaN(registry);
      call("set", { ...defaults, [k]: max });
      readOk(`${k}=max`);
      checkPorts(`${k}=max`);
      const atMax = snapshot(registry);
      const nanMax = hasNaN(registry);
      if (nanMin.length || nanMax.length) problems.push(`Hình có số không hữu hạn khi đổi "${k}": ${[...nanMin, ...nanMax].join(", ")}.`);
      if (atMin === atMax) problems.push(`Đầu vào "${k}" không làm hình thay đổi (hình giống hệt ở min và max).`);
      call("set", defaults);
    }

    for (const issue of [...portIssues].slice(0, 3)) problems.push(issue);

    // Không vẽ số đo lên vật: chữ dạng "tên = giá trị" là readout, thuộc khung hiển thị bên ngoài.
    const readouts = registry.filter((n) => n.__kind === "Text" && /=/.test(String(n.__attrs.text ?? ""))).map((n) => String(n.__attrs.text));
    if (readouts.length) problems.push("Hình chứa chữ dạng số đo/phép tính (" + JSON.stringify(readouts[0]) + "); số đo không được vẽ lên vật, hãy bỏ.");

    // 5. Ca tự kiểm tra do model đưa ra.
    const tests = Array.isArray(declared?.selfTests) ? declared.selfTests : [];
    if (tests.length < 2 && !isStatic) problems.push("Cần ít nhất 2 ca selfTests.");
    for (const t of tests) {
      if (!t || typeof t.set !== "object" || typeof t.expect !== "object") { problems.push("Một ca selfTests thiếu `set` hoặc `expect`."); continue; }
      call("set", { ...defaults, ...t.set });
      const merged = { ...call("get"), ...call("read") };
      const tol = finite(t.tolerance) && t.tolerance >= 0 ? t.tolerance : 1e-6;
      for (const [k, want] of Object.entries(t.expect)) {
        const got = merged[k];
        const ok = finite(got) && finite(want) && Math.abs(got - want) <= tol + Math.abs(want) * 1e-6;
        report.push(`${ok ? "✓" : "✗"} ${t.name ?? "ca"}: ${k} = ${finite(got) ? got.toPrecision(5) : got} (mong ${want}, sai số ${tol})`);
        if (!ok) problems.push(`selfTest "${t.name ?? "?"}": ${k} ra ${got}, mong ${want} (sai số ${tol}).`);
      }
    }
  } catch (error) {
    problems.push(`Lỗi khi chạy thử logic: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { problems, report };
}
