/**
 * Dựng đồ thị Node Geometry qua các tool của server MCP `nge` (@babylonjs/mcp-servers).
 *
 * Mỗi hằng số là một GeometryInputBlock (server không cho đặt giá trị thẳng
 * vào cổng), nên lớp này gom hằng số trùng nhau dùng chung một block. Block và
 * kết nối được ghi theo tên rồi gửi một lượt bằng add_blocks_batch /
 * connect_blocks_batch; validate_geometry và export_geometry_json chạy cuối.
 *
 * Không dùng BooleanGeometryBlock: block này luôn tải Manifold WASM từ CDN khi
 * build (kể cả với useOldCSGEngine), trang sẽ phụ thuộc mạng.
 */
export class Graph {
  constructor(client, name) {
    this.c = client;
    this.name = name;
    this.blocks = []; // {blockType, name, properties}
    this.links = []; // [src, out, dst, in]
    this.consts = new Map();
    this.n = 0;
  }
  b(blockType, properties) {
    const name = `${blockType.replace(/Block$/, "")}_${++this.n}`;
    this.blocks.push({ blockType, name, ...(properties ? { properties } : {}) });
    return name;
  }
  link(src, out, dst, input) {
    this.links.push([src, out, dst, input]);
  }
  k(type, value) {
    const key = type + JSON.stringify(value);
    if (!this.consts.has(key)) this.consts.set(key, this.b("GeometryInputBlock", { type, value }));
    return this.consts.get(key);
  }
  f(v) { return this.k("Float", +v.toFixed(5)); }
  i(v) { return this.k("Int", v); }
  v3(x, y, z) { return this.k("Vector3", { x: +x.toFixed(5), y: +y.toFixed(5), z: +z.toFixed(5) }); }
  src(type, inputs) {
    const blk = this.b(type);
    for (const [port, [kind, val]] of Object.entries(inputs)) {
      if (val === undefined) continue;
      this.link(kind === "i" ? this.i(val) : this.f(val), "output", blk, port);
    }
    return { blk, out: "geometry" };
  }
  box(w, h, d) { return this.src("BoxBlock", { width: ["f", w], height: ["f", h], depth: ["f", d] }); }
  cyl(h, d, tess = 32, dTop, dBot) { return this.src("CylinderBlock", { height: ["f", h], diameter: ["f", d], tessellation: ["i", tess], diameterTop: ["f", dTop], diameterBottom: ["f", dBot] }); }
  sphere(d, seg = 16, dx, dy, dz) { return this.src("SphereBlock", { diameter: ["f", d], segments: ["i", seg], diameterX: ["f", dx], diameterY: ["f", dy], diameterZ: ["f", dz] }); }
  torus(d, t, tess = 32) { return this.src("TorusBlock", { diameter: ["f", d], thickness: ["f", t], tessellation: ["i", tess] }); }
  capsule(h, r, tess = 16) { return this.src("CapsuleBlock", { height: ["f", h], radius: ["f", r], tessellation: ["i", tess] }); }
  plane(w, h) { return this.src("PlaneBlock", { width: ["f", w], height: ["f", h] }); }
  /** t, r (Euler, rad), s: [x,y,z] */
  xf(g, { t, r, s } = {}) {
    const blk = this.b("GeometryTransformBlock");
    this.link(g.blk, g.out, blk, "value");
    if (t) this.link(this.v3(...t), "output", blk, "translation");
    if (r) this.link(this.v3(...r), "output", blk, "rotation");
    if (s) this.link(this.v3(...s), "output", blk, "scaling");
    return { blk, out: "output" };
  }
  /** Xoay trục +Y của hình về hướng d rồi dời tới p. */
  aim(g, d, p) {
    const al = this.b("AlignBlock");
    this.link(this.v3(0, 1, 0), "output", al, "source");
    this.link(this.v3(...d), "output", al, "target");
    const tr = this.b("TranslationBlock");
    this.link(this.v3(...p), "output", tr, "translation");
    const m = this.b("MatrixComposeBlock");
    this.link(al, "matrix", m, "matrix0");
    this.link(tr, "matrix", m, "matrix1");
    const blk = this.b("GeometryTransformBlock");
    this.link(g.blk, g.out, blk, "value");
    this.link(m, "output", blk, "matrix");
    return { blk, out: "output" };
  }
  merge(list) {
    let cur = list.filter(Boolean);
    while (cur.length > 1) {
      const next = [];
      for (let i = 0; i < cur.length; i += 5) {
        const chunk = cur.slice(i, i + 5);
        if (chunk.length === 1) { next.push(chunk[0]); continue; }
        const blk = this.b("MergeGeometryBlock");
        chunk.forEach((g, j) => this.link(g.blk, g.out, blk, `geometry${j}`));
        next.push({ blk, out: "output" });
      }
      cur = next;
    }
    return cur[0];
  }
  bevel(g, amount, segments = 2, angle) {
    const blk = this.b("BevelBlock");
    this.link(g.blk, g.out, blk, "geometry");
    this.link(this.f(amount), "output", blk, "amount");
    this.link(this.i(segments), "output", blk, "segments");
    if (angle !== undefined) this.link(this.f(angle), "output", blk, "angle");
    return { blk, out: "output" };
  }
  /** Ống tròn bán kính r đi qua các điểm (nội suy Catmull-Rom, mỗi đoạn là một trụ). */
  tube(points, r, segments = 14, tess = 8) {
    const P = points;
    const at = (t) => {
      const n = P.length - 1, x = Math.min(n - 1e-9, t * n), i = Math.floor(x), u = x - i;
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n, i + 2)];
      return [0, 1, 2].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u * u * u));
    };
    const pts = Array.from({ length: segments + 1 }, (_, j) => at(j / segments));
    const parts = [];
    for (let j = 0; j < segments; j++) {
      const a = pts[j], b = pts[j + 1];
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const len = Math.hypot(...d);
      if (len < 1e-5) continue;
      // trụ dài thêm một bán kính để các khớp nối không hở
      parts.push(this.aim(this.cyl(len + r, 2 * r, tess), d.map((v) => v / len), [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]));
    }
    return this.merge(parts);
  }
  linear(g, count, dir, rot, scale) {
    const blk = this.b("InstantiateLinearBlock");
    this.link(g.blk, g.out, blk, "instance");
    this.link(this.i(count), "output", blk, "count");
    this.link(this.v3(...dir), "output", blk, "direction");
    if (rot) this.link(this.v3(...rot), "output", blk, "rotation");
    if (scale) this.link(this.v3(...scale), "output", blk, "scaling");
    return { blk, out: "output" };
  }
  radial(g, count, radius, rot) {
    const blk = this.b("InstantiateRadialBlock");
    this.link(g.blk, g.out, blk, "instance");
    this.link(this.i(count), "output", blk, "count");
    this.link(this.i(radius), "output", blk, "radius");
    if (rot) this.link(this.v3(...rot), "output", blk, "rotation");
    return { blk, out: "output" };
  }
  mat(g, id) {
    const blk = this.b("SetMaterialIDBlock");
    this.link(g.blk, g.out, blk, "geometry");
    this.link(this.i(id), "output", blk, "id");
    return { blk, out: "output" };
  }
  output(g) {
    const blk = this.b("GeometryOutputBlock");
    this.link(g.blk, g.out, blk, "geometry");
  }

  /** Gửi toàn bộ qua MCP, kiểm tra, xuất JSON. */
  async commit(outFile) {
    const c = this.c;
    await c.call("create_geometry", { name: this.name });
    const ids = new Map();
    for (let i = 0; i < this.blocks.length; i += 150) {
      const txt = await c.call("add_blocks_batch", { geometryName: this.name, blocks: this.blocks.slice(i, i + 150) });
      if (/Error/.test(txt)) throw new Error(txt.split("\n").filter((l) => /Error/.test(l)).slice(0, 5).join("\n"));
      for (const m of txt.matchAll(/\[(\d+)\]\s+(\S+)\s+\(/g)) ids.set(m[2], +m[1]);
    }
    const conns = this.links.map(([s, o, d, inp]) => ({ sourceBlockId: ids.get(s), outputName: o, targetBlockId: ids.get(d), inputName: inp }));
    for (let i = 0; i < conns.length; i += 200) {
      const txt = await c.call("connect_blocks_batch", { geometryName: this.name, connections: conns.slice(i, i + 200) });
      if (/Error|fail/i.test(txt)) throw new Error(txt.split("\n").filter((l) => /Error|fail/i.test(l)).slice(0, 5).join("\n"));
    }
    const v = await c.call("validate_geometry", { geometryName: this.name });
    await c.call("export_geometry_json", { geometryName: this.name, outputFile: outFile });
    return { blocks: this.blocks.length, links: conns.length, validate: v };
  }
}
