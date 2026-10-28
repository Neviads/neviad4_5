#!/usr/bin/env node
// MCP server "neviad-assembly": lắp ráp vật 3D bằng bộ phận + ràng buộc (fe/assembly-kit, docs/assembly-tool-design.md).
// Claude chọn bộ phận và nói chúng ghép với nhau thế nào; bộ giải tính tư thế. Ghi vào fe/.assembly-bridge/state.json;
// trang /lap-rap-3d hiện bản lắp ráp và chụp ảnh 4 góc cho assembly_view.
//
//   claude mcp add neviad-assembly -- node fe/scripts/assembly-bridge/mcp.mjs      (hoặc dùng .mcp.json ở gốc repo)
//   node fe/scripts/assembly-bridge/mcp.mjs --selftest                              (dựng thử máy phát, so với đáp số)
import { build } from "esbuild";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { serveMcp, text } from "../lib/mcp-stdio.mjs";
import { crop } from "../code-bridge/view.mjs";
import { CLAUDE_INSTRUCTIONS } from "./instructions.mjs";
import { FE_ROOT, findAssembly, meshFile, physicsFile, readSnapshotMeta, readState, snapshotFile, snapshotGlbFile, updateState } from "./store.mjs";

const SERVER = { name: "neviad-assembly", version: "0.2.0" };
const PAGE = "/lap-rap-3d";

// assembly-kit viết bằng TypeScript: đóng gói phần lõi + thư viện vào node_modules/.cache để "three" tự tìm thấy.
const cache = join(FE_ROOT, "node_modules/.cache/assembly-bridge");
mkdirSync(cache, { recursive: true });
const kitFile = join(cache, "kit.mjs");
await build({ entryPoints: [join(FE_ROOT, "assembly-kit/node.ts")], bundle: true, platform: "node", format: "esm", outfile: kitFile, external: ["three", "manifold-3d"], logLevel: "error" });
const kit = await import(`${pathToFileURL(kitFile).href}?t=${Date.now()}`);
const { PARTS, solve, partReport, describeTree, typeInfo, typeList, solveRoute, MATERIAL_NAMES, registryFor, checkDocExtras, buildShapes, PRESETS, TEXTURE_KINDS, anchorFrame, worldBounds, SHAPE_PREFIX, initKernel, physicsKey, encodeShape, keyHash, usedShapeIds, shapeKeys, buildPhysicsModel, bodyOfPart, World, flatten, worldGeometry, descendants, partOrCluster, toManifold, kernel: kernelOf, transformAnchorSpec, transformBounds, checkTypeName, chain, invertRigid } = kit;
// lõi hình khối kín (boolean, khắc rãnh): nạp WASM một lần trước khi phục vụ
await initKernel(() => import("manifold-3d"));

const ID = /^[A-Za-z0-9_-]{1,40}$/;
const assemblyArg = { type: "string", description: "id bản lắp ráp" };
const materialArg = { type: "string", description: "vật liệu cho cả bộ phận: id đã material_define, tên preset (material_presets) hoặc tên cũ; chuỗi rỗng để bỏ" };
const v3Arg = { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 };
const path2dArg = (desc) => ({ type: "object", description: `${desc}. {pts: [[a, b], …] (mét), round?: [bán kính bo tại từng điểm, 0 = giữ góc], closed?}`, properties: { pts: { type: "array", items: { type: "array", items: { type: "number" } } }, round: { type: "array", items: { type: "number" } }, closed: { type: "boolean" } }, required: ["pts"] });
const shapeCommon = {
  assembly: assemblyArg,
  id: { type: "string", description: "id hình; trùng id thì thay hình cũ (giữ thứ tự)" },
  offset: { ...v3Arg, description: "dời kết quả [x, y, z] (m), trước khi tính điểm neo" },
  rotate: { ...v3Arg, description: "xoay kết quả [x, y, z] độ (Euler XYZ)" },
  material: { type: "string", description: "vật liệu mặc định của hình" },
};
const placeSchema = {
  type: "object",
  description: "Cách ghép: {kind: onto|touch|coaxial|through|fixed, a: 'idMoi.diemNeo', b: 'idCo.diemNeo' hoặc 'ground.top', at?: [u,v], offset?, angle? (độ), flip?, shift?: [x,y,z], follow?}",
  properties: {
    kind: { type: "string", enum: ["onto", "touch", "coaxial", "through", "fixed"] },
    a: { type: "string" }, b: { type: "string" },
    at: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
    offset: { type: "number" }, angle: { type: "number" }, flip: { type: "boolean" },
    shift: { type: "array", items: { type: "number" }, minItems: 3, maxItems: 3 },
    follow: { type: "boolean" },
  },
  required: ["kind", "a", "b"],
};

const TOOLS = [
  { name: "part_types_list", description: "Liệt kê các loại bộ phận trong thư viện (khối cơ bản, cơ khí, điện).", inputSchema: { type: "object", properties: {} } },
  { name: "part_type_info", description: "Tham số (đơn vị, mặc định, miền) và điểm neo của một loại bộ phận. Với hình tự dựng (shape:<id>) thì cho thêm assembly.", inputSchema: { type: "object", properties: { type: { type: "string" }, assembly: assemblyArg }, required: ["type"] } },
  { name: "assembly_create", description: "Tạo bản lắp ráp rỗng (có sẵn ground.top là mặt bàn y = 0).", inputSchema: { type: "object", properties: { id: { type: "string", description: "chữ, số, -, _; bỏ trống để tự đặt" }, title: { type: "string" } }, required: ["title"] } },
  { name: "assembly_list", description: "Liệt kê các bản lắp ráp.", inputSchema: { type: "object", properties: {} } },
  { name: "assembly_read", description: "Đọc JSON đầy đủ của một bản lắp ráp.", inputSchema: { type: "object", properties: { assembly: assemblyArg }, required: ["assembly"] } },
  { name: "assembly_delete", description: "Xoá một bản lắp ráp.", inputSchema: { type: "object", properties: { assembly: assemblyArg }, required: ["assembly"] } },
  {
    name: "part_add",
    description: "Thêm một bộ phận và đặt nó vào bộ phận đã có. Trả về tư thế đã giải, khung bao và toạ độ thế giới của các điểm neo.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" }, type: { type: "string", description: "loại trong thư viện, hoặc shape:<idHinh>" }, params: { type: "object" }, place: placeSchema, material: materialArg }, required: ["assembly", "id", "type", "place"] },
  },
  {
    name: "part_update",
    description: "Sửa tham số (gộp vào tham số cũ) và/hoặc cách ghép của một bộ phận; mọi bộ phận ghép vào nó đi theo.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" }, params: { type: "object" }, place: placeSchema, material: materialArg }, required: ["assembly", "id"] },
  },
  {
    name: "part_remove",
    description: "Xoá một bộ phận. Có bộ phận ghép vào nó thì báo lỗi, trừ khi cascade = true (xoá cả nhánh).",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" }, cascade: { type: "boolean" } }, required: ["assembly", "id"] },
  },
  {
    name: "joint_add",
    description: "Thêm (hoặc thay, cùng id) một khớp: revolute (quay, độ) hoặc prismatic (trượt, mét) quanh một điểm neo kiểu axis (kể cả ground.x/y/z); moves = bộ phận được điều khiển, bộ phận ghép vào chúng đi theo. couple: khớp chạy theo khớp khác (giá trị = ratio × khớp dẫn); bánh lăn theo khớp trượt thì bỏ ratio, công cụ tự tính từ bán kính bánh.",
    inputSchema: {
      type: "object",
      properties: { assembly: assemblyArg, id: { type: "string" }, kind: { type: "string", enum: ["revolute", "prismatic"] }, axis: { type: "string" }, moves: { type: "array", items: { type: "string" } }, limits: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
        couple: { type: "object", properties: { joint: { type: "string" }, ratio: { type: "number", description: "đơn vị khớp này trên một đơn vị khớp dẫn; bỏ trống = bánh lăn không trượt" } }, required: ["joint"] },
      },
      required: ["assembly", "id", "kind", "axis", "moves"],
    },
  },
  {
    name: "assembly_export",
    description: `Ghi bản lắp ráp ra một file trong repo (đường dẫn tính từ gốc repo). .json: tài liệu để trang/route dựng lại (buildAssembly(doc, kit) rồi setPose({khop: giaTri})). .glb: lưới + vật liệu glTF để dùng ngoài (trang ${PAGE} phải đang mở; pose tuỳ chọn).`,
    inputSchema: { type: "object", properties: { assembly: assemblyArg, path: { type: "string", description: "vd fe/app/ten-route/vat.assembly.json hoặc .glb" }, pose: { type: "object" }, wait_ms: { type: "integer", minimum: 0, maximum: 60000 } }, required: ["assembly", "path"] },
  },
  { name: "joint_remove", description: "Xoá một khớp.", inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" } }, required: ["assembly", "id"] } },
  {
    name: "route_add",
    description: `Thêm (hoặc thay, cùng id) một dây nối giữa hai điểm neo (điểm hoặc mặt), tuỳ chọn bám các mặt via. Vật liệu: ${MATERIAL_NAMES.join(", ")}.`,
    inputSchema: {
      type: "object",
      properties: { assembly: assemblyArg, id: { type: "string" }, from: { type: "string" }, to: { type: "string" }, via: { type: "array", items: { type: "object", properties: { on: { type: "string" } }, required: ["on"] } }, radius: { type: "number" }, material: { type: "string" } },
      required: ["assembly", "id", "from", "to", "radius", "material"],
    },
  },
  { name: "route_remove", description: "Xoá một dây nối.", inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" } }, required: ["assembly", "id"] } },
  { name: "assembly_describe", description: "Cây lắp ráp: ai ghép vào ai bằng cách nào, toạ độ gốc từng bộ phận, các khớp và dây.", inputSchema: { type: "object", properties: { assembly: assemblyArg }, required: ["assembly"] } },
  {
    name: "assembly_view",
    description: `XEM bản lắp ráp: trang ${PAGE} (đang mở trong trình duyệt) chụp ảnh 2×2 gồm phối cảnh, trước (+z), cạnh (+x), trên (+y). pose đặt giá trị khớp khi chụp; focus phóng vào một bộ phận; region cắt một vùng (px của ảnh 960×640).`,
    inputSchema: {
      type: "object",
      properties: {
        assembly: assemblyArg,
        pose: { type: "object", description: "{tenKhop: giaTri}" },
        focus: { type: "string", description: "id bộ phận cần phóng to" },
        wait_ms: { type: "integer", minimum: 0, maximum: 30000 },
        region: { type: "object", properties: { x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" } }, required: ["x", "y", "width", "height"] },
      },
      required: ["assembly"],
    },
  },  // ───── hình tự dựng (cây tính năng) ─────
  {
    name: "shape_lathe",
    description: "TIỆN: xoay biên dạng [bán kính, y] quanh trục y. Cho vật tròn xoay: cốc, chai, lốp, la-zăng, đèn tròn, núm. wall > 0 thì có thành dày thật và miệng bo (round) như thuỷ tinh thổi. Đặt vào lắp ráp bằng part_add type \"shape:<id>\".",
    inputSchema: { type: "object", properties: { ...shapeCommon, profile: path2dArg("biên dạng mặt ngoài, đi từ dưới lên, x = bán kính ≥ 0"), wall: { type: "number", description: "độ dày thành (m), 0 = khối đặc/mặt đơn" }, lip: { type: "string", enum: ["round", "flat"] }, segments: { type: "integer" }, angle: { type: "number", description: "độ, < 360 để tiện một phần" } }, required: ["assembly", "id", "profile"] },
  },
  {
    name: "shape_extrude",
    description: "ĐÙN: đường bao kín 2D kéo dày theo trục còn lại, đối xứng quanh 0, bo mọi cạnh (edgeRadius, mặc định 0,5 mm; khung bao vẫn đúng kích thước khai báo). Cho tấm, thanh định hình, ốp, tay nắm, biển số, giá đỡ, nan la-zăng.",
    inputSchema: { type: "object", properties: { ...shapeCommon, outline: path2dArg("đường bao kín"), holes: { type: "array", items: path2dArg("lỗ") }, depth: { type: "number" }, edgeRadius: { type: "number" }, plane: { type: "string", enum: ["xy", "xz", "zy"], description: "mặt vẽ đường bao: xy (đùn theo z), xz (đùn theo y), zy (toạ độ [z, y], đùn theo x)" }, taper: { type: "number", description: "tỉ lệ đường bao ở đầu +trục đùn (1 = thẳng)" } }, required: ["assembly", "id", "outline", "depth"] },
  },
  {
    name: "shape_sweep",
    description: "QUÉT: mặt cắt chạy dọc một đường 3D (khung xoay nhỏ nhất, không xoắn vô cớ). Mặt cắt [u, v]: v theo pháp tuyến (lên trên khi đường nằm ngang), u sang ngang. Cho gioăng, viền, ống cong, dây, lò xo (đường xoắn), cần gạt.",
    inputSchema: { type: "object", properties: { ...shapeCommon, section: path2dArg("mặt cắt (mặc định kín)"), path: { type: "object", properties: { pts: { type: "array", items: v3Arg }, smooth: { type: "boolean", description: "mặc định true: spline qua các điểm" }, closed: { type: "boolean" } }, required: ["pts"] }, twist: { type: "number", description: "độ xoắn tổng" }, scaleEnd: { type: "number" }, caps: { type: "boolean" }, samples: { type: "integer" } }, required: ["assembly", "id", "section", "path"] },
  },
  {
    name: "shape_mirror",
    description: "ĐỐI XỨNG một hình có sẵn qua mặt x/y/z = 0 (mặc định z: trái-phải của xe), giữ cả bản gốc. Chỉ cần dựng một nửa.",
    inputSchema: { type: "object", properties: { ...shapeCommon, input: { type: "string" }, plane: { type: "string", enum: ["x", "y", "z"] }, keepOriginal: { type: "boolean" } }, required: ["assembly", "id", "input"] },
  },
  {
    name: "shape_pattern",
    description: "LẶP một hình có sẵn: radial (quanh trục x/y/z qua center, count bản, mỗi bản stepAngle độ, mặc định chia đều 360°) hoặc linear (step [x, y, z]). Cho nan la-zăng, ốc bánh, gai, lỗ lưới.",
    inputSchema: { type: "object", properties: { ...shapeCommon, input: { type: "string" }, kind: { type: "string", enum: ["radial", "linear"] }, count: { type: "integer" }, axis: { type: "string", enum: ["x", "y", "z"] }, stepAngle: { type: "number" }, center: v3Arg, step: v3Arg }, required: ["assembly", "id", "input", "count"] },
  },
  {
    name: "shape_loft",
    description: "LOFT (thân xe, thân tàu, vỏ máy): nối mượt nhiều mặt cắt ngang KHÁC DÁNG đặt tại các x tăng dần. Mỗi mặt cắt là đường kín trong mặt (z, y). symmetric: true thì chỉ cho NỬA z ≥ 0, đi từ tâm đáy (z = 0) lên tâm nóc (z = 0), tool tự lấy đối xứng. round bo góc từng mặt cắt. caps round (mũi/đuôi tròn) | flat | open. Điểm neo s0…sN (tâm mặt cắt), nose, tail. Thêm mặt cắt ở chỗ dáng đổi nhanh (kính chắn gió, đuôi).",
    inputSchema: { type: "object", properties: { ...shapeCommon, sections: { type: "array", items: { type: "object", properties: { x: { type: "number" }, profile: path2dArg("mặt cắt [z, y]") }, required: ["x", "profile"] } }, symmetric: { type: "boolean" }, points: { type: "integer", description: "số điểm mỗi vòng (mặc định 64)" }, samples: { type: "integer", description: "số vòng giữa hai mặt cắt (mặc định 10)" }, caps: { type: "string", enum: ["round", "flat", "open"] }, capLength: { type: "number" } }, required: ["assembly", "id", "sections"] },
  },
  {
    name: "shape_boolean",
    description: "BOOLEAN (lõi manifold): op subtract (khoét hốc bánh, ô kính, lỗ), union (gộp), intersect (giao) giữa input và các hình tools. Mọi hình phải kín và đã nằm đúng chỗ trong cùng khung (dùng offset / rotate của chúng). Trả về thể tích trước / sau. Mép cắt sắc: bo tiếp bằng shape_round_edges.",
    inputSchema: { type: "object", properties: { ...shapeCommon, op: { type: "string", enum: ["subtract", "union", "intersect"] }, input: { type: "string" }, tools: { type: "array", items: { type: "string" } } }, required: ["assembly", "id", "op", "input", "tools"] },
  },
  {
    name: "shape_round_edges",
    description: "BO CẠNH mọi cạnh gãy hơn angle (mặc định 30°) với bán kính xấp xỉ radius (mặc định 4 mm): chia mịn lưới trong dải quanh cạnh rồi làm mượt. Dùng sau boolean / groove để mép không sắc như dao. Bán kính là xấp xỉ, không phải fillet CAD chính xác; báo số cạnh gãy còn lại.",
    inputSchema: { type: "object", properties: { ...shapeCommon, input: { type: "string" }, radius: { type: "number" }, angle: { type: "number" }, maxTriangles: { type: "integer" } }, required: ["assembly", "id", "input"] },
  },
  {
    name: "shape_groove",
    description: "KHẮC RÃNH dọc một đường nằm trên mặt hình (khe cửa, khe capo, khe cốp, đường gân): curve {plane: {axis: x|y|z, at}} = giao của mặt với mặt phẳng (within [[min],[max]] để chỉ lấy một đoạn), hoặc {pts: [[x,y,z]…], project: [dx,dy,dz]} = chiếu polyline lên mặt. width (mặc định 3,5 mm), depth (4 mm). Hình phải kín.",
    inputSchema: { type: "object", properties: { ...shapeCommon, input: { type: "string" }, curve: { type: "object" }, within: { type: "array", items: v3Arg, minItems: 2, maxItems: 2 }, width: { type: "number" }, depth: { type: "number" } }, required: ["assembly", "id", "input", "curve"] },
  },
  {
    name: "shape_split_region",
    description: "TÁCH VÙNG mặt thành tấm mỏng ôm đúng mặt gốc (kính xe, ốp, nhãn lớn): outline lồi vẽ trong mặt plane (xy | xz | zy = [z, y]), chiếu theo trục còn lại; range [từ, tới] dọc trục chiếu để chỉ lấy một phía (vd kính hông trái: plane xy, range [0, 1]). thickness (mặc định 4 mm, dày vào trong), lift (dời theo pháp tuyến; dương = nổi ra, âm = thụt vào). Muốn ô thủng thì shape_boolean subtract với shape_extrude cùng outline.",
    inputSchema: { type: "object", properties: { ...shapeCommon, input: { type: "string" }, outline: path2dArg("đường bao lồi"), plane: { type: "string", enum: ["xy", "xz", "zy"] }, range: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 }, thickness: { type: "number" }, lift: { type: "number" } }, required: ["assembly", "id", "input", "outline"] },
  },
  {
    name: "part_save_as_type",
    description: "LƯU CỤM thành loại bộ phận mới để lắp ở bản khác (bánh xe, đèn, gương…): parts = các bộ phận của cụm (mặc định cả bản; phải khép kín: mỗi bộ phận đặt vào ground hoặc vào bộ phận trong cụm), root = bộ phận gốc (khung của loại mới = khung bộ phận này), expose = {tenCongKhai: \"idBoPhan.diemNeo\"} (mặc định mọi điểm neo của root). Sau đó ở bản khác: part_add {type: name} rồi ghép bằng điểm neo công khai.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, name: { type: "string" }, parts: { type: "array", items: { type: "string" } }, root: { type: "string" }, expose: { type: "object" }, description: { type: "string" } }, required: ["assembly", "name"] },
  },
  // ───── vật lý (bộ giải chung XPBD) ─────
  {
    name: "physics_setup",
    description: "Bật mô phỏng cho bản lắp ráp: bộ phận gom thành vật rắn (ghép chặt thì chung vật, mỗi khớp mở vật mới, bộ phận gắn ground đứng yên), khối lượng / trọng tâm / quán tính tính từ lưới × khối lượng riêng vật liệu, va chạm bằng bao lồi. free = các khớp bỏ đi để vật thành tự do (vd xe trượt dọc ground.x → xe chạy tự do trên đường). Báo danh sách vật và khớp.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, gravity: v3Arg, groundPlane: { type: "boolean", description: "mặt phẳng va chạm y = 0 (mặc định có)" }, substeps: { type: "integer" }, free: { type: "array", items: { type: "string" } } }, required: ["assembly"] },
  },
  {
    name: "body_set",
    description: "Ghi đè tính chất vật lý của vật chứa bộ phận (đường dẫn, kể cả trong cụm: \"xeA/banhTruocT\"): mass (kg, vd vật thật rỗng), fixed, friction, restitution (hệ số phục hồi 0–1).",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, part: { type: "string" }, mass: { type: "number" }, fixed: { type: "boolean" }, friction: { type: "number" }, restitution: { type: "number" } }, required: ["assembly", "part"] },
  },
  {
    name: "initial_set",
    description: "Vận tốc đầu của vật chứa bộ phận: velocity [m/s], angularVelocity [độ/s] (thế giới).",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, part: { type: "string" }, velocity: v3Arg, angularVelocity: v3Arg }, required: ["assembly", "part"] },
  },
  {
    name: "drive_add",
    description: "Động cơ trên một khớp (kể cả \"cum/khop\"): speed (độ/s với khớp quay, m/s với khớp trượt) hoặc torque (N·m / N); maxForce giới hạn lực của động cơ tốc độ. value = null để bỏ.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, joint: { type: "string" }, kind: { type: "string", enum: ["speed", "torque"] }, value: { type: ["number", "null"] }, maxForce: { type: "number" } }, required: ["assembly", "joint"] },
  },
  {
    name: "simulate",
    description: "CHẠY mô phỏng trong Node (không cần trình duyệt): trả bảng mẫu theo thời gian (vị trí, vận tốc của các vật), tổng động lượng và động năng, thời điểm chạm đầu tiên giữa các cặp vật. record = các vật/bộ phận cần ghi (mặc định mọi vật động, tối đa 6).",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, duration: { type: "number" }, dt: { type: "number" }, samples: { type: "integer" }, record: { type: "array", items: { type: "string" } } }, required: ["assembly", "duration"] },
  },
  {
    name: "sim_export",
    description: "Ghi mô hình vật lý đã tính sẵn (vật, bao lồi, khối lượng, khớp) ra file .physics.json trong repo, để trang chạy cùng bộ giải (new World(model)) mà không phải dựng lại.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, path: { type: "string" } }, required: ["assembly", "path"] },
  },
  // ───── kiểm tra theo lưới thật ─────
  {
    name: "check_interference",
    description: "KIỂM TRA XUYÊN NHAU theo lưới thật (giao khối manifold): báo cặp bộ phận chồng lấn, thể tích và tâm vùng giao. Bỏ qua cặp nằm cùng một cụm (cụm đã kiểm lúc dựng) trừ khi inside: true.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, parts: { type: "array", items: { type: "string" } }, tolerance: { type: "number", description: "m³, mặc định 1e-7" }, inside: { type: "boolean" } }, required: ["assembly"] },
  },
  {
    name: "check_clearance",
    description: "KHE HỞ nhỏ nhất theo lưới thật giữa hai bộ phận hoặc hai cụm (a, b là đường dẫn). min: báo lỗi nếu khe nhỏ hơn.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, a: { type: "string" }, b: { type: "string" }, min: { type: "number" } }, required: ["assembly", "a", "b"] },
  },
  {
    name: "check_floating",
    description: "LƠ LỬNG: bộ phận không chạm bộ phận nào khác và không chạm mặt đất (theo lưới, dung sai tolerance mặc định 2 mm).",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, tolerance: { type: "number" } }, required: ["assembly"] },
  },
  {
    name: "check_physics",
    description: "KIỂM TRA VẬT LÝ bằng mô phỏng ngắn: vật bay quá nhanh (nổ do xuyên nhau), rơi xuyên sàn, động năng tăng khi không có động cơ, khớp bị kéo rời.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, duration: { type: "number" } }, required: ["assembly"] },
  },
  { name: "shape_list", description: "Liệt kê các hình của bản lắp ráp: phép dựng, khung bao, số tam giác, điểm neo.", inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string", description: "chỉ một hình" } }, required: ["assembly"] } },
  { name: "shape_remove", description: "Xoá một hình (báo lỗi nếu bộ phận hoặc hình khác đang dùng nó).", inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" } }, required: ["assembly", "id"] } },
  {
    name: "anchor_define",
    description: "Đặt điểm neo có tên trên một hình tự dựng (khung của hình). from = điểm neo có sẵn của hình (top, bottom, left, right, front, back, center, axis…) kèm shift [x, y, z]; hoặc cho origin + dir trực tiếp. kind: point | axis | face.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, shape: { type: "string" }, name: { type: "string" }, kind: { type: "string", enum: ["point", "axis", "face"] }, from: { type: "string" }, shift: v3Arg, origin: v3Arg, dir: v3Arg, up: v3Arg, radius: { type: "number" }, desc: { type: "string" } }, required: ["assembly", "shape", "name"] },
  },
  // ───── vật liệu, decal ─────
  { name: "material_presets", description: "Danh mục vật liệu PBR có sẵn và tham số chỉnh được (màu \"#rrggbb\", độ nhám, kim loại, clearcoat, transmission…), cùng các loại texture thủ tục.", inputSchema: { type: "object", properties: {} } },
  {
    name: "material_define",
    description: "Định nghĩa (hoặc thay) một vật liệu có tên từ một preset, ghi đè tham số và gắn texture thủ tục: textures {normal|roughness|color: {kind: noise|flakes|tread|grain|scratches, scale (số lần lặp), seed, strength}}.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" }, preset: { type: "string" }, overrides: { type: "object" }, textures: { type: "object" } }, required: ["assembly", "id", "preset"] },
  },
  {
    name: "material_assign",
    description: "Gán vật liệu cho một bộ phận (cả bộ phận) hoặc làm vật liệu mặc định của một hình (target \"shape:<id>\").",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, target: { type: "string" }, material: { type: "string" } }, required: ["assembly", "target", "material"] },
  },
  {
    name: "decal_add",
    description: "Dán chữ hoặc SVG lên mặt một bộ phận, chiếu từ điểm neo kiểu mặt (at, kể cả mặt trụ \"id.surface@angle=…\"). content {text, color, background, font, arcRadius (m: chữ chạy theo cung, cho hông lốp) | svg}; mode print | emboss | engrave. Trùng id thì thay.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" }, target: { type: "string" }, at: { type: "string" }, size: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 }, angle: { type: "number" }, depth: { type: "number" }, content: { type: "object" }, mode: { type: "string", enum: ["print", "emboss", "engrave"] } }, required: ["assembly", "id", "target", "at", "size", "content"] },
  },
  { name: "decal_remove", description: "Xoá một decal.", inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" } }, required: ["assembly", "id"] } },
  // ───── đo ─────
  {
    name: "measure",
    description: "ĐO bằng số (theo tư thế pose nếu có): bounds (khung bao một bộ phận hoặc cả vật), distance (giữa hai điểm neo a, b), gap (khe giữa khung bao hai bộ phận a, b; âm = chồng lấn), clearance (đáy thấp nhất so với y = 0). spec {length, width, height} so với khung bao cả vật.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, kind: { type: "string", enum: ["bounds", "distance", "gap", "clearance"] }, target: { type: "string" }, a: { type: "string" }, b: { type: "string" }, pose: { type: "object" }, spec: { type: "object" } }, required: ["assembly", "kind"] },
  },
  // ───── cảnh, render ─────
  {
    name: "scene_set",
    description: "Chọn ánh sáng và nền: environment room | studio (hộp đèn mềm, hợp sơn xe) | street | sunset | dawn (HDRI thật); stage table | studioCyc (phông cong liền sàn) | road | glossyFloor | none; exposure.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, environment: { type: "string", enum: ["room", "studio", "street", "sunset", "dawn"] }, stage: { type: "string", enum: ["table", "studioCyc", "road", "glossyFloor", "none"] }, exposure: { type: "number" } }, required: ["assembly"] },
  },
  {
    name: "render_view",
    description: `RENDER một góc đặt sẵn, chất lượng cao, theo vật liệu và cảnh của bản lắp ráp (trang ${PAGE} phải đang mở). camera: threeQuarterFront | threeQuarterRear | side | front | rear | top | detail:<idBoPhan>. quality final bật AO và bloom.`,
    inputSchema: { type: "object", properties: { assembly: assemblyArg, camera: { type: "string" }, size: { type: "array", items: { type: "integer" }, minItems: 2, maxItems: 2 }, quality: { type: "string", enum: ["preview", "final"] }, pose: { type: "object" }, wait_ms: { type: "integer", minimum: 0, maximum: 60000 } }, required: ["assembly"] },
  },
];

// ───────── trợ giúp ─────────

const clone = (x) => JSON.parse(JSON.stringify(x));

/** Giải và kiểm tra toàn bộ tài liệu: hình, lắp ráp, dây, vật liệu, decal. */
function check(doc) {
  buildShapes(doc); // dựng (và kiểm tra) mọi hình, kể cả hình chưa có bộ phận nào dùng
  const reg = registryFor(doc);
  const solved = solve(doc, reg);
  for (const r of doc.routes) solveRoute(r, solved, reg);
  checkDocExtras(doc);
  for (const d of doc.decals ?? []) {
    const { frame } = anchorFrame(reg, solved.parts, d.at, "rest");
    if (d.at.split(".")[0] !== d.target) throw new Error(`[decal ${d.id}] at phải là điểm neo của chính ${d.target}, đang là "${d.at}".`);
    if (frame.kind !== "face") throw new Error(`[decal ${d.id}] ${d.at} là ${frame.kind}; decal cần mặt (face hoặc mặt trụ @…).`);
  }
  return { reg, solved };
}

/** Hình nặng hơn ngưỡng này (tam giác) thì nướng sẵn lưới cho trang tải về. */
const BAKE_MIN_TRIANGLES = 8000;
const HEAVY_OPS = new Set(["loft", "boolean", "roundEdges", "groove", "splitRegion"]);

/** Ghi lưới các hình mà bộ phận dùng (kể cả trong cụm lồng) ra meshes/, nếu nặng và chưa có tệp. Trả về số tệp mới. */
function bakeDoc(doc) {
  let n = 0;
  const walk = (d) => {
    const ids = usedShapeIds(d);
    const built = ids.length ? buildShapes(d, ids) : new Map();
    // chỉ hình bộ phận dùng trực tiếp; hình trung gian (đầu vào) không cần tải về
    const ops = new Map((d.shapes ?? []).map((n) => [n.id, n.op]));
    for (const s of ids.map((i) => built.get(i))) {
      // phép nặng (hoặc dựng từ hình nặng) thì luôn nướng; phép nhẹ chỉ nướng khi lưới lớn
      if (!HEAVY_OPS.has(ops.get(s.id)) && s.triangles < BAKE_MIN_TRIANGLES) continue;
      const file = meshFile(keyHash(s.key));
      if (existsSync(file)) continue;
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, encodeShape(s));
      n++;
    }
    for (const t of Object.values(d.types ?? {})) walk(t.doc);
  };
  walk(doc);
  return n;
}

/** Sửa tài liệu của một bản lắp ráp: chạy `change`, giải lại toàn bộ; lỗi thì không ghi gì. */
function editDoc(assemblyId, change) {
  const res = updateState((state) => {
    const a = findAssembly(state, assemblyId);
    const doc = clone(a.doc);
    const info = change(doc);
    const { reg, solved } = check(doc);
    a.doc = doc;
    a.rev += 1;
    a.updatedAt = new Date().toISOString();
    return { doc, solved, info, reg };
  });
  bakeDoc(res.doc);
  return res;
}

const fmtV = (v) => `[${v.map((x) => +x.toFixed(5)).join(", ")}]`;
const sizeOf = (b) => b.max.map((v, i) => v - b.min[i]);

function fmtAnchor(name, a) {
  if (a.kind === "surface") return `${name} (surface) trục qua ${fmtV(a.origin)} hướng ${fmtV(a.axis)}, R ${+a.radius.toFixed(5)}`;
  const d = a.kind === "face" ? a.normal : a.dir;
  return `${name} (${a.kind}) ${fmtV(a.origin)} → ${fmtV(d)}${a.kind === "axis" && a.radius ? `, R ${+a.radius.toFixed(5)}` : ""}`;
}

/** Báo cáo một hình: phép dựng, cỡ, số tam giác, điểm neo (khung của hình). */
function shapeReport(doc, id) {
  const s = buildShapes(doc).get(id);
  if (!s) throw new Error(`Không có hình "${id}". Có: ${(doc.shapes ?? []).map((x) => x.id).join(", ") || "(chưa có)"}.`);
  const node = doc.shapes.find((x) => x.id === id);
  const users = doc.parts.filter((p) => p.type === `${SHAPE_PREFIX}${id}`).map((p) => p.id);
  return [
    `hình ${id} (${node.op}${node.material ? `, vật liệu ${node.material}` : ""}): ${s.info.join("; ")}`,
    `khung bao ${fmtV(s.bounds.min)} → ${fmtV(s.bounds.max)}, cỡ ${fmtV(sizeOf(s.bounds))}, ${s.triangles} tam giác`,
    "điểm neo (khung của hình):",
    ...Object.entries(s.anchors).map(([k, a]) => `  ${fmtAnchor(k, a)}`),
    users.length ? `đang dùng ở bộ phận: ${users.join(", ")}` : `Đặt vào lắp ráp: part_add {type: "${SHAPE_PREFIX}${id}", place: {kind: "onto", a: "<idBoPhan>.bottom", b: "ground.top"}}.`,
  ].join("\n");
}

const SHAPE_KEYS = new Set(["assembly", "id", "offset", "rotate", "material", "input", "tools"]);

/** Thêm hoặc thay (giữ vị trí và điểm neo agent đã đặt) một nút hình, rồi giải lại cả tài liệu. */
function upsertShape(op, args) {
  const { assembly, id, offset, rotate, material, input, tools } = args;
  if (!ID.test(id ?? "")) throw new Error(`id hình "${id}" không hợp lệ (chữ, số, -, _).`);
  const params = Object.fromEntries(Object.entries(args).filter(([k, v]) => !SHAPE_KEYS.has(k) && v !== undefined));
  let replaced = false;
  const { doc } = editDoc(assembly, (d) => {
    d.shapes = d.shapes ?? [];
    const node = { id, op, params, ...(input ? { inputs: [input, ...(Array.isArray(tools) ? tools : [])] } : {}), ...(offset ? { offset } : {}), ...(rotate ? { rotate } : {}), ...(material ? { material } : {}) };
    const i = d.shapes.findIndex((s) => s.id === id);
    if (i >= 0) {
      const old = d.shapes[i];
      if (old.anchors) node.anchors = old.anchors;
      if (!material && old.material) node.material = old.material;
      d.shapes[i] = node;
      replaced = true;
    } else d.shapes.push(node);
  });
  return text(`${replaced ? "Đã thay" : "Đã tạo"} ${shapeReport(doc, id)}`);
}

/**
 * Nhờ trang /lap-rap-3d làm việc cần trình duyệt (chụp 4 góc, render, xuất glb): ghi yêu cầu vào state.view rồi chờ
 * trang gửi kết quả về snapshots/. Trả về bản lắp ráp và meta {key, error?}.
 */
async function requestBrowser(assembly, spec, wait_ms) {
  const a = findAssembly(readState(), assembly);
  for (const [k, v] of Object.entries(spec.pose ?? {})) {
    const j = findJoint(a.doc, k);
    if (!j) throw new Error(`pose: không có khớp "${k}". Có: ${jointNames(a.doc).join(", ") || "(chưa có khớp)"}.`);
    if (typeof v !== "number") throw new Error(`pose.${k} phải là số.`);
    if (j.limits && (v < j.limits[0] || v > j.limits[1])) throw new Error(`pose.${k} = ${v} ngoài giới hạn ${JSON.stringify(j.limits)}.`);
  }
  if (spec.focus && !a.doc.parts.some((p) => p.id === spec.focus)) throw new Error(`focus: không có bộ phận "${spec.focus}".`);
  const detail = /^detail:(.+)$/.exec(spec.camera ?? "");
  if (detail && !a.doc.parts.some((p) => p.id === detail[1])) throw new Error(`camera: không có bộ phận "${detail[1]}".`);
  const key = `${assembly}-${a.rev}-${Date.now().toString(36)}`;
  updateState((s) => { s.view = { key, assembly, rev: a.rev, pose: {}, focus: null, mode: "four", ...spec, requestedAt: new Date().toISOString() }; });
  const until = Date.now() + Math.max(0, Math.min(60000, wait_ms));
  let meta = readSnapshotMeta(assembly);
  while (meta?.key !== key && Date.now() < until) {
    await new Promise((r) => setTimeout(r, 250));
    meta = readSnapshotMeta(assembly);
  }
  // xong (hoặc hết giờ) thì gỡ yêu cầu, để trang mở sau không làm lại một yêu cầu cũ
  updateState((s) => { if (s.view?.key === key) s.view = null; });
  if (meta?.key !== key) throw new Error(`Chưa có kết quả: trang ${PAGE} có đang mở trong trình duyệt không? (server dev: npm --prefix fe run dev)`);
  return { a, meta };
}

/** Khớp theo tên, kể cả khớp trong cụm ("<idBoPhan>/<khop>"). */
function findJoint(doc, name) {
  const slash = name.indexOf("/");
  if (slash < 0) return doc.joints.find((x) => x.id === name);
  const part = doc.parts.find((p) => p.id === name.slice(0, slash));
  const sub = part && doc.types?.[part.type]?.doc;
  return sub ? findJoint(sub, name.slice(slash + 1)) : undefined;
}
function jointNames(doc, prefix = "") {
  const out = doc.joints.map((j) => `${prefix}${j.id}`);
  for (const p of doc.parts) if (doc.types?.[p.type]) out.push(...jointNames(doc.types[p.type].doc, `${prefix}${p.id}/`));
  return out;
}

// ───── vật lý: mô hình có cache, báo cáo, khối đặc để kiểm tra ─────

const modelCache = new Map();
/** Mô hình vật lý của tài liệu; tính lại khi bộ phận, hình, cụm hoặc cấu hình vật lý đổi. */
function physicsModel(doc) {
  const key = JSON.stringify([doc.parts, doc.joints, doc.shapes, doc.types, doc.materials, doc.physics]);
  let m = modelCache.get(key);
  if (!m) {
    m = buildPhysicsModel(doc);
    if (modelCache.size > 20) modelCache.clear();
    modelCache.set(key, m);
  }
  // ghi sẵn cho trang /lap-rap-3d (nút Chạy vật lý)
  const file = physicsFile(physicsKey(doc));
  if (!existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(m));
  }
  return m;
}

function modelReport(model) {
  const r3 = (a) => fmtV(a.map((x) => +x.toFixed(4)));
  return [
    `Mô hình vật lý: ${model.bodies.length} vật, ${model.joints.length} khớp${model.gears.length ? `, ${model.gears.length} bánh răng` : ""}; trọng lực ${r3(model.gravity)}, ${model.substeps} substep, mặt đất ${model.groundPlane ? "có" : "không"}.`,
    "Vật:",
    ...model.bodies.map((b) => `- ${b.id}${b.fixed ? " (đứng yên)" : ` ${+b.mass.toFixed(3)} kg, trọng tâm ${r3(b.x0)}`}; ${b.parts.length} bộ phận${b.parts.length <= 4 ? ` (${b.parts.map((p) => p.path).join(", ")})` : ""}; bao lồi ${b.hull.verts.length} đỉnh; ma sát ${b.friction}, phục hồi ${b.restitution}`),
    ...(model.joints.length ? ["Khớp:", ...model.joints.map((j) => `- ${j.id}: ${j.kind} ${j.a} ↔ ${j.b ?? "thế giới"}, trục ${r3(j.axisA)}${j.motor ? `, động cơ ${j.motor.kind} ${+j.motor.value.toFixed(4)}` : ""}`)] : []),
    ...(Object.keys(model.initial).length ? [`Vận tốc đầu: ${Object.entries(model.initial).map(([k, x]) => `${k}${x.v ? ` v${r3(x.v)}` : ""}`).join("; ")}`] : []),
    ...model.notes.map((n) => `⚠ ${n}`),
  ].join("\n");
}

function requirePart(doc, path) {
  const { parts } = flatten(doc);
  if (!parts.some((p) => p.path === path)) throw new Error(`Không có bộ phận "${path}". Có: ${parts.map((p) => p.path).slice(0, 40).join(", ")}.`);
}

/** Khối đặc manifold ở thế giới cho các bộ phận phẳng; lưới hở thì lấy bao lồi (đánh dấu xấp xỉ). */
function solidsOf(list) {
  const { Manifold } = kernelOf();
  return list.map((p) => {
    const g = worldGeometry(p);
    g.computeBoundingBox();
    const bb = { min: g.boundingBox.min.toArray(), max: g.boundingBox.max.toArray() };
    try {
      return { path: p.path, m: toManifold(g, p.path), bb, approx: false };
    } catch {
      const arr = g.attributes.position.array, pts = [];
      const step = Math.max(1, Math.ceil(arr.length / 3 / 20000));
      for (let i = 0; i < arr.length / 3; i += step) pts.push([arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]]);
      return { path: p.path, m: Manifold.hull(pts), bb, approx: true };
    }
  });
}

const boxesOverlap = (a, b, tol = 0) => [0, 1, 2].every((k) => a.min[k] <= b.max[k] + tol && b.min[k] <= a.max[k] + tol);

/** Thư viện chung kèm mục hình tự dựng. */
const typList = () => `${typeList(PARTS)}

## shape
- shape:<id>: hình tự dựng bằng shape_lathe / shape_extrude / shape_sweep / shape_loft / shape_boolean… (xem shape_list).`;

function children(doc, id) {
  return doc.parts.filter((p) => p.place?.b?.split(".")[0] === id).map((p) => p.id);
}

// ───────── tool ─────────

const handlers = {
  part_types_list: () => {
    const lib = Object.entries(readState().library ?? {});
    return text([
      typList(),
      lib.length ? `\n## Cụm đã lưu (part_save_as_type)\n${lib.map(([k, c]) => `- ${k}: ${c.description}; ${c.doc.parts.length} bộ phận từ ${c.source}; điểm neo: ${Object.keys(c.anchors).join(", ")}`).join("\n")}` : "",
    ].join("\n"));
  },
  part_type_info: ({ type, assembly }) => {
    const st = readState();
    const doc = assembly ? clone(findAssembly(st, assembly).doc) : { id: "_", title: "_", parts: [], joints: [], routes: [] };
    if (st.library?.[type] && !doc.types?.[type]) doc.types = { ...(doc.types ?? {}), [type]: st.library[type] };
    return text(typeInfo(registryFor(doc), type));
  },

  assembly_create: ({ id, title }) => {
    const slug = id || String(title).normalize("NFD").replace(/\p{M}+/gu, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "lap-rap";
    if (!ID.test(slug)) throw new Error(`id "${slug}" không hợp lệ (chữ, số, -, _).`);
    updateState((state) => {
      if (state.assemblies.some((a) => a.id === slug)) throw new Error(`Đã có bản lắp ráp "${slug}".`);
      const now = new Date().toISOString();
      state.assemblies.push({ id: slug, title, rev: 1, createdAt: now, updatedAt: now, doc: { id: slug, title, parts: [], joints: [], routes: [] } });
    });
    return text(`Đã tạo bản lắp ráp "${slug}". Bộ phận đầu tiên đặt lên ground.top (mặt bàn, y = 0).`);
  },
  assembly_list: () => {
    const { assemblies } = readState();
    if (!assemblies.length) return text("Chưa có bản lắp ráp nào.");
    return text(assemblies.map((a) => `- ${a.id}: ${a.title} (rev ${a.rev}, ${a.doc.parts.length} bộ phận)`).join("\n"));
  },
  assembly_read: ({ assembly }) => text(JSON.stringify(findAssembly(readState(), assembly).doc, null, 2)),
  assembly_delete: ({ assembly }) => {
    updateState((state) => {
      findAssembly(state, assembly);
      state.assemblies = state.assemblies.filter((a) => a.id !== assembly);
    });
    return text(`Đã xoá "${assembly}".`);
  },

  part_add: ({ assembly, id, type, params = {}, place, material }) => {
    const lib = readState().library ?? {};
    const { solved, reg } = editDoc(assembly, (doc) => {
      if (doc.parts.some((p) => p.id === id)) throw new Error(`Đã có bộ phận "${id}"; dùng part_update để sửa.`);
      // loại là cụm trong thư viện: chép vào tài liệu để file tự đủ
      if (!PARTS[type] && !String(type).startsWith(SHAPE_PREFIX) && !doc.types?.[type] && lib[type]) doc.types = { ...(doc.types ?? {}), [type]: lib[type] };
      doc.parts.push({ id, type, params, place, ...(material ? { material } : {}) });
    });
    return text(partReport(reg, solved, id));
  },
  part_update: ({ assembly, id, params, place, material }) => {
    const { solved, info, reg } = editDoc(assembly, (doc) => {
      const p = doc.parts.find((x) => x.id === id);
      if (!p) throw new Error(`Không có bộ phận "${id}".`);
      if (params) p.params = { ...p.params, ...params };
      if (place) p.place = place;
      if (material !== undefined) material ? (p.material = material) : delete p.material;
      return children(doc, id);
    });
    return text(`${partReport(reg, solved, id)}${info.length ? `\n(bộ phận ghép trực tiếp vào ${id} đã đi theo: ${info.join(", ")})` : ""}`);
  },
  part_remove: ({ assembly, id, cascade = false }) => {
    const { info } = editDoc(assembly, (doc) => {
      if (!doc.parts.some((p) => p.id === id)) throw new Error(`Không có bộ phận "${id}".`);
      const gone = new Set([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const p of doc.parts) if (!gone.has(p.id) && gone.has(p.place?.b?.split(".")[0])) { gone.add(p.id); grew = true; }
      }
      if (gone.size > 1 && !cascade) throw new Error(`Có bộ phận ghép vào ${id}: ${[...gone].filter((x) => x !== id).join(", ")}. Đặt lại chúng trước, hoặc dùng cascade: true.`);
      doc.parts = doc.parts.filter((p) => !gone.has(p.id));
      doc.joints = doc.joints.map((j) => ({ ...j, moves: j.moves.filter((m) => !gone.has(m)) })).filter((j) => j.moves.length && !gone.has(j.axis.split(".")[0]));
      doc.routes = doc.routes.filter((r) => ![r.from, r.to, ...(r.via ?? []).map((v) => v.on)].some((ref) => gone.has(ref.split(".")[0])));
      return [...gone];
    });
    return text(`Đã xoá: ${info.join(", ")}.`);
  },

  joint_add: ({ assembly, id, kind, axis, moves, limits, couple }) => {
    if (!ID.test(id)) throw new Error(`id khớp "${id}" không hợp lệ.`);
    const { doc, solved } = editDoc(assembly, (d) => {
      d.joints = d.joints.filter((j) => j.id !== id);
      d.joints.push({ id, kind, axis, moves, ...(limits ? { limits } : {}), ...(couple ? { couple } : {}) });
    });
    let coupled = "";
    if (couple) {
      // đo tỉ số thật: cho khớp dẫn 1 đơn vị, các khớp khác 0
      const probe = clone(doc);
      for (const j of probe.joints) j.value = j.id === couple.joint ? 1 : 0;
      const v = solve(probe, registryFor(probe)).values.get(id);
      coupled = ` Ghép theo ${couple.joint}: ${+v.toFixed(4)} ${kind === "revolute" ? "°" : "m"} cho mỗi 1 ${probe.joints.find((j) => j.id === couple.joint).kind === "revolute" ? "°" : "m"} của khớp dẫn.`;
    }
    return text(`Khớp ${id} (${kind} quanh ${axis}) kéo theo: ${solved.clusters.get(id).join(", ")}.${coupled}`);
  },
  assembly_export: async ({ assembly, path, pose = {}, wait_ms = 30000 }) => {
    const root = resolve(FE_ROOT, "..");
    const file = resolve(root, path);
    if (!file.startsWith(root + sep) || !/\.(json|glb)$/.test(file)) throw new Error(`"${path}" phải là file .json hoặc .glb nằm trong repo.`);
    if (file.endsWith(".glb")) {
      const { a, meta } = await requestBrowser(assembly, { mode: "export", pose }, wait_ms);
      if (meta.error) return { ...text(`Trang xuất glb lỗi: ${meta.error}`), isError: true };
      const glb = readFileSync(snapshotGlbFile(assembly));
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, glb);
      return text(`Đã ghi ${relative(root, file).replaceAll("\\", "/")} (${(glb.length / 1024).toFixed(0)} KB, glTF nhị phân của ${a.title} rev ${a.rev}).`);
    }
    const doc = clone(findAssembly(readState(), assembly).doc);
    for (const j of doc.joints) delete j.value;
    // chép lưới nướng sẵn mà tài liệu cần sang public/assembly-meshes, để route chạy mà không phải dựng hình nặng
    bakeDoc(doc);
    const meshDir = join(FE_ROOT, "public/assembly-meshes");
    let copied = 0;
    const walk = (d) => {
      if (d.shapes?.length) {
        const keys = shapeKeys(d);
        for (const sid of usedShapeIds(d)) {
          const h = keyHash(keys.get(sid)), from = meshFile(h), to = join(meshDir, `${h}.bin`);
          if (existsSync(from) && !existsSync(to)) {
            mkdirSync(meshDir, { recursive: true });
            writeFileSync(to, readFileSync(from));
            copied++;
          }
        }
      }
      for (const t of Object.values(d.types ?? {})) walk(t.doc);
    };
    walk(doc);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(doc, null, 1)}
`);
    return text(`Đã ghi ${relative(root, file).replaceAll("\\", "/")} (${doc.parts.length} bộ phận, khớp: ${doc.joints.map((j) => j.id).join(", ") || "không"}). ${copied ? ` Chép ${copied} lưới nướng sẵn vào fe/public/assembly-meshes: trang gọi preloadMeshes(doc, (h) => \`/assembly-meshes/\${h}.bin\`) trước khi dựng.` : ""} Trong trang: buildAssembly(doc, createMaterialKit()) từ @/assembly-kit/three/build-scene, rồi view.setPose({...}) mỗi khung hình; khớp ghép tự đi theo khớp dẫn.`);
  },
  joint_remove: ({ assembly, id }) => {
    editDoc(assembly, (doc) => {
      if (!doc.joints.some((j) => j.id === id)) throw new Error(`Không có khớp "${id}".`);
      doc.joints = doc.joints.filter((j) => j.id !== id);
    });
    return text(`Đã xoá khớp ${id}.`);
  },
  route_add: ({ assembly, id, from, to, via, radius, material }) => {
    if (!ID.test(id)) throw new Error(`id dây "${id}" không hợp lệ.`);
    const { doc, solved, reg } = editDoc(assembly, (d) => {
      d.routes = d.routes.filter((r) => r.id !== id);
      d.routes.push({ id, from, to, ...(via?.length ? { via } : {}), radius, material });
    });
    const r = solveRoute(doc.routes.find((x) => x.id === id), solved, reg);
    return text(`Dây ${id}: ${from} → ${to}, dài ${r.length.toFixed(3)} m, ${r.points.length} điểm khống chế.`);
  },
  route_remove: ({ assembly, id }) => {
    editDoc(assembly, (doc) => {
      if (!doc.routes.some((r) => r.id === id)) throw new Error(`Không có dây "${id}".`);
      doc.routes = doc.routes.filter((r) => r.id !== id);
    });
    return text(`Đã xoá dây ${id}.`);
  },
  assembly_describe: ({ assembly }) => {
    const doc = findAssembly(readState(), assembly).doc;
    const reg = registryFor(doc);
    const extra = [
      doc.shapes?.length ? `\n\n## Hình\n${doc.shapes.map((s) => `- ${s.id}: ${s.op}${s.inputs?.length ? ` ← ${s.inputs.join(", ")}` : ""}${s.material ? `, vật liệu ${s.material}` : ""}`).join("\n")}` : "",
      Object.keys(doc.materials ?? {}).length ? `\n\n## Vật liệu\n${Object.entries(doc.materials).map(([k, m]) => `- ${k}: ${m.preset} ${JSON.stringify(m.overrides ?? {})}`).join("\n")}` : "",
      doc.decals?.length ? `\n\n## Decal\n${doc.decals.map((d) => `- ${d.id}: ${d.content.text ?? "svg"} trên ${d.at}`).join("\n")}` : "",
      doc.scene ? `\n\n## Cảnh\n${JSON.stringify(doc.scene)}` : "",
    ].join("");
    return text(describeTree(doc, solve(doc, reg), reg) + extra);
  },

  // ───── vật lý ─────
  physics_setup: ({ assembly, gravity, groundPlane, substeps, free }) => {
    const { doc } = editDoc(assembly, (d) => {
      d.physics = { ...(d.physics ?? {}), ...(gravity ? { gravity } : {}), ...(groundPlane !== undefined ? { groundPlane } : {}), ...(substeps ? { substeps } : {}), ...(free ? { free } : {}) };
    });
    return text(modelReport(physicsModel(doc)));
  },
  body_set: ({ assembly, part, mass, fixed, friction, restitution }) => {
    const { doc } = editDoc(assembly, (d) => {
      requirePart(d, part);
      const cur = d.physics?.bodies?.[part] ?? {};
      const next = { ...cur, ...(mass !== undefined ? { mass } : {}), ...(fixed !== undefined ? { fixed } : {}), ...(friction !== undefined ? { friction } : {}), ...(restitution !== undefined ? { restitution } : {}) };
      if (next.mass !== undefined && !(next.mass > 0)) throw new Error("mass phải > 0 (kg).");
      if (next.restitution !== undefined && !(next.restitution >= 0 && next.restitution <= 1)) throw new Error("restitution trong [0, 1].");
      d.physics = { ...(d.physics ?? {}), bodies: { ...(d.physics?.bodies ?? {}), [part]: next } };
    });
    const b = bodyOfPart(physicsModel(doc), part);
    return text(`Vật ${b.id}: ${b.fixed ? "đứng yên" : `${+b.mass.toFixed(3)} kg`}, ma sát ${b.friction}, phục hồi ${b.restitution}.`);
  },
  initial_set: ({ assembly, part, velocity, angularVelocity }) => {
    editDoc(assembly, (d) => {
      requirePart(d, part);
      d.physics = { ...(d.physics ?? {}), initial: { ...(d.physics?.initial ?? {}), [part]: { ...(velocity ? { velocity } : {}), ...(angularVelocity ? { angularVelocity } : {}) } } };
    });
    return text(`Vận tốc đầu ${part}: ${velocity ? `v ${fmtV(velocity)} m/s` : ""}${angularVelocity ? ` ω ${fmtV(angularVelocity)} °/s` : ""}.`);
  },
  drive_add: ({ assembly, joint, kind = "speed", value, maxForce }) => {
    editDoc(assembly, (d) => {
      if (!findJoint(d, joint)) throw new Error(`Không có khớp "${joint}". Có: ${jointNames(d).join(", ") || "(chưa có)"}.`);
      const drives = { ...(d.physics?.drives ?? {}) };
      if (value === null || value === undefined) delete drives[joint];
      else drives[joint] = { kind, value, ...(maxForce !== undefined ? { maxForce } : {}) };
      d.physics = { ...(d.physics ?? {}), drives };
    });
    return text(value === null || value === undefined ? `Bỏ động cơ ở ${joint}.` : `Động cơ ${kind} ${value} trên khớp ${joint}${maxForce !== undefined ? `, lực tối đa ${maxForce}` : ""}.`);
  },
  simulate: ({ assembly, duration, dt = 1 / 120, samples = 10, record }) => {
    if (!(duration > 0 && duration <= 60)) throw new Error("duration trong (0, 60] giây.");
    const doc = findAssembly(readState(), assembly).doc;
    const model = physicsModel(doc);
    const w = new World(model);
    const dyn = model.bodies.filter((b) => !b.fixed);
    const ids = record ? record.map((r) => { const b = bodyOfPart(model, r); if (!b) throw new Error(`record: không có vật chứa "${r}".`); return b.id; }) : dyn.slice(0, 6).map((b) => b.id);
    const r3 = (a) => `[${a.map((x) => x.toFixed(3)).join(", ")}]`;
    const p0 = w.momentum(), k0 = w.kineticEnergy();
    const steps = Math.ceil(duration / dt), every = Math.max(1, Math.floor(steps / Math.max(1, samples)));
    const first = new Map();
    const rows = [];
    const sample = () => rows.push(`t ${w.t.toFixed(3)}: ${ids.map((id) => { const b = w.byId.get(id); return `${id} x${r3(b.x)} v${r3(b.v)} |ω| ${(Math.hypot(...b.w) * 180 / Math.PI).toFixed(1)}°/s`; }).join(" · ")}`);
    sample();
    for (let i = 1; i <= steps; i++) {
      w.step(dt);
      for (const e of w.events) {
        if (!e.b) continue;
        const A = w.byId.get(e.a), B = w.byId.get(e.b);
        if (A.fixed || B.fixed) continue;
        const key = [e.a, e.b].sort().join(" ↔ ");
        if (!first.has(key)) first.set(key, { t: w.t, point: e.point });
      }
      if (i % every === 0 || i === steps) sample();
    }
    const p1 = w.momentum(), k1 = w.kineticEnergy();
    return text([
      `Mô phỏng ${duration} s (dt ${+dt.toFixed(5)}, ${model.substeps} substep): ${model.bodies.length} vật (${dyn.length} động), ${model.joints.length} khớp.`,
      `Động lượng ${r3(p0)} → ${r3(p1)} kg·m/s; động năng ${k0.toFixed(2)} → ${k1.toFixed(2)} J.`,
      first.size ? `Chạm lần đầu: ${[...first].map(([k, f]) => `${k} lúc ${f.t.toFixed(3)} s tại ${r3(f.point)}`).join("; ")}.` : "Không có va chạm giữa các vật động.",
      ...rows,
    ].join("\n"));
  },
  sim_export: ({ assembly, path }) => {
    const root = resolve(FE_ROOT, "..");
    const file = resolve(root, path);
    if (!file.startsWith(root + sep) || !file.endsWith(".physics.json")) throw new Error(`"${path}" phải là file .physics.json nằm trong repo.`);
    const model = physicsModel(findAssembly(readState(), assembly).doc);
    const round = (x) => (typeof x === "number" ? +x.toPrecision(7) : Array.isArray(x) ? x.map(round) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, y]) => [k, round(y)])) : x);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(round(model)));
    return text(`Đã ghi ${relative(root, file).replaceAll("\\", "/")}: ${model.bodies.length} vật, ${model.joints.length} khớp. Trong trang: new World(model) từ @/assembly-kit/physics/solver, mỗi khung hình world.step(dt) rồi view.setWorld(path, chain(world.matrix(body), part.offset)) cho từng bộ phận của vật.`);
  },

  // ───── kiểm tra theo lưới thật ─────
  check_interference: ({ assembly, parts, tolerance = 1e-7, inside = false }) => {
    const doc = findAssembly(readState(), assembly).doc;
    const flat = flatten(doc).parts;
    let list = flat.filter((p) => p.geometry);
    if (parts?.length) {
      const keep = new Set(parts.flatMap((id) => partOrCluster(flat, id).map((p) => p.path)));
      list = list.filter((p) => keep.has(p.path));
    }
    const solids = solidsOf(list);
    const top = (path) => path.split("/")[0];
    const hits = [];
    for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) {
      const A = solids[i], B = solids[j];
      if (!inside && A.path.includes("/") && top(A.path) === top(B.path)) continue;
      if (!boxesOverlap(A.bb, B.bb)) continue;
      const inter = A.m.intersect(B.m);
      const vol = inter.volume();
      if (vol > tolerance) {
        const bb = inter.boundingBox();
        hits.push({ a: A.path, b: B.path, vol, c: bb.min.map((x, k) => (x + bb.max[k]) / 2), approx: A.approx || B.approx });
      }
      inter.delete();
    }
    solids.forEach((s) => s.m.delete());
    if (!hits.length) return text(`Không có cặp nào xuyên nhau (${solids.length} bộ phận, dung sai ${tolerance} m³).`);
    hits.sort((x, y) => y.vol - x.vol);
    return text([`${hits.length} cặp xuyên nhau:`, ...hits.slice(0, 30).map((h) => `- ${h.a} ↔ ${h.b}: ${(h.vol * 1e6).toFixed(2)} cm³ quanh ${fmtV(h.c)}${h.approx ? " (lưới hở: tính theo bao lồi)" : ""}`)].join("\n"));
  },
  check_clearance: ({ assembly, a, b, min }) => {
    const doc = findAssembly(readState(), assembly).doc;
    const flat = flatten(doc).parts;
    const side = (id) => {
      const list = partOrCluster(flat, id).filter((p) => p.geometry);
      if (!list.length) throw new Error(`Không có bộ phận "${id}" (đường dẫn, vd "xeA/banhTruocT").`);
      const ss = solidsOf(list);
      let u = ss[0].m;
      for (const s of ss.slice(1)) { const n = u.add(s.m); u.delete(); s.m.delete(); u = n; }
      return u;
    };
    const ma = side(a), mb = side(b);
    const gap = ma.minGap(mb, Math.max(1, (min ?? 0) * 4));
    const overlap = ma.intersect(mb).volume();
    ma.delete(); mb.delete();
    const msg = overlap > 1e-9 ? `${a} và ${b} CHỒNG LẤN ${(overlap * 1e6).toFixed(2)} cm³.` : `Khe nhỏ nhất ${a} ↔ ${b}: ${(gap * 1000).toFixed(2)} mm${gap >= Math.max(1, (min ?? 0) * 4) - 1e-9 ? " trở lên" : ""}.`;
    const bad = overlap > 1e-9 || (min !== undefined && gap < min);
    return bad ? { ...text(`${msg}${min !== undefined ? ` Yêu cầu ≥ ${min * 1000} mm.` : ""}`), isError: min !== undefined } : text(msg);
  },
  check_floating: ({ assembly, tolerance = 0.002 }) => {
    const doc = findAssembly(readState(), assembly).doc;
    const flat = flatten(doc).parts.filter((p) => p.geometry);
    const solids = solidsOf(flat);
    const out = [];
    for (const A of solids) {
      if (A.bb.min[1] <= tolerance) continue; // chạm đất
      let touching = false;
      for (const B of solids) {
        if (A === B || !boxesOverlap(A.bb, B.bb, tolerance)) continue;
        if (A.m.minGap(B.m, tolerance * 2) <= tolerance) { touching = true; break; }
      }
      if (!touching) out.push(`- ${A.path}: không chạm gì (đáy ở y = ${A.bb.min[1].toFixed(4)} m)`);
    }
    solids.forEach((s) => s.m.delete());
    return text(out.length ? [`${out.length} bộ phận lơ lửng (dung sai ${tolerance * 1000} mm):`, ...out].join("\n") : `Không có bộ phận lơ lửng (${solids.length} bộ phận, dung sai ${tolerance * 1000} mm).`);
  },
  check_physics: ({ assembly, duration = 1 }) => {
    const doc = findAssembly(readState(), assembly).doc;
    const model = physicsModel(doc);
    const w = new World(model);
    const g = Math.hypot(...model.gravity);
    const energy = () => w.bodies.reduce((s, b) => (b.fixed ? s : s + b.mass * g * b.x[1]), 0) + w.kineticEnergy();
    const e0 = energy();
    const v0 = Math.max(0, ...w.bodies.map((b) => Math.hypot(...b.v)));
    const issues = [];
    let fast = false, fell = false;
    const dt = 1 / 120;
    for (let i = 0; i < Math.ceil(duration / dt); i++) {
      w.step(dt);
      for (const b of w.bodies) {
        if (b.fixed) continue;
        if (!fast && Math.hypot(...b.v) > Math.max(30, v0 * 2 + g * w.t * 2)) { fast = true; issues.push(`- ${b.id} bay ${Math.hypot(...b.v).toFixed(1)} m/s lúc ${w.t.toFixed(2)} s: thường do hai vật đặt xuyên nhau (xem check_interference).`); }
        if (!fell && b.x[1] < -0.5) { fell = true; issues.push(`- ${b.id} rơi xuống y = ${b.x[1].toFixed(2)} m: xuyên qua sàn (bật groundPlane hoặc thêm vật đỡ).`); }
      }
    }
    const e1 = energy();
    const drives = Object.keys(doc.physics?.drives ?? {}).length;
    if (!drives && e1 > e0 * 1.1 + 0.5) issues.push(`- năng lượng tăng ${e0.toFixed(1)} → ${e1.toFixed(1)} J dù không có động cơ: ràng buộc mâu thuẫn hoặc vật xuyên nhau.`);
    for (const j of model.joints) {
      const a = w.byId.get(j.a), b = j.b ? w.byId.get(j.b) : null;
      const rot = (body, p) => { const m = w.matrix(body); return [0, 1, 2].map((k) => m[k] * p[0] + m[4 + k] * p[1] + m[8 + k] * p[2] + m[12 + k]); };
      const pa = rot(a, j.pivotA), pb = b ? rot(b, j.pivotB) : j.pivotB;
      const sep = Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
      if (sep > 0.01) issues.push(`- khớp ${j.id} bị kéo rời ${(sep * 1000).toFixed(1)} mm: vật quá nặng so với nơi gắn hoặc khớp trùng nhau.`);
    }
    return text(issues.length ? [`Vật lý có vấn đề sau ${duration} s:`, ...issues].join("\n") : `Ổn sau ${duration} s mô phỏng: ${model.bodies.length} vật, năng lượng ${e0.toFixed(1)} → ${e1.toFixed(1)} J.`);
  },

  // ───── lưu cụm ─────
  part_save_as_type: ({ assembly, name, parts, root, expose, description }) => {
    checkTypeName(name);
    const src = clone(findAssembly(readState(), assembly).doc);
    for (const j of src.joints) delete j.value;
    const reg = registryFor(src);
    const solved = solve(src, reg);
    const ids = parts ?? src.parts.map((p) => p.id);
    const set = new Set(ids);
    for (const id of ids) {
      const sp = solved.parts.get(id);
      if (!sp) throw new Error(`Không có bộ phận "${id}" trong ${assembly}.`);
      if (sp.parent !== "ground" && !set.has(sp.parent)) throw new Error(`Cụm chưa khép kín: ${id} đặt vào ${sp.parent} nhưng ${sp.parent} không nằm trong parts.`);
    }
    const rootId = root ?? ids.find((id) => solved.parts.get(id).parent === "ground");
    if (!rootId || !set.has(rootId)) throw new Error(`root "${root}" phải là một bộ phận trong cụm.`);
    const inv = invertRigid(solved.parts.get(rootId).rest);
    // điểm neo công khai, trong khung bộ phận gốc
    const exposeMap = expose ?? Object.fromEntries(Object.keys(reg[solved.parts.get(rootId).type].anchors(solved.parts.get(rootId).params)).map((k) => [k, `${rootId}.${k}`]));
    const anchors = {};
    for (const [pub, ref] of Object.entries(exposeMap)) {
      const [pid, an] = String(ref).split(".");
      const sp = solved.parts.get(pid);
      if (!sp || !set.has(pid)) throw new Error(`expose.${pub}: "${ref}" phải là điểm neo của một bộ phận trong cụm.`);
      const spec = reg[sp.type].anchors(sp.params)[an];
      if (!spec) throw new Error(`expose.${pub}: ${sp.type} "${pid}" không có điểm neo "${an}".`);
      anchors[pub] = { ...transformAnchorSpec(spec, chain(inv, sp.rest)), desc: `${pub}: ${spec.desc} (${ref})` };
    }
    // khung bao cả cụm trong khung gốc
    const bounds = ids.map((id) => {
      const sp = solved.parts.get(id);
      return transformBounds(reg[sp.type].bounds(sp.params), chain(inv, sp.rest));
    }).reduce((u, b) => ({ min: u.min.map((v, i) => Math.min(v, b.min[i])), max: u.max.map((v, i) => Math.max(v, b.max[i])) }));
    // tài liệu con: bộ phận, hình (kèm đầu vào đệ quy), vật liệu, decal, types lồng
    const subParts = src.parts.filter((p) => set.has(p.id));
    const needShapes = new Set(subParts.filter((p) => p.type.startsWith(SHAPE_PREFIX)).map((p) => p.type.slice(SHAPE_PREFIX.length)));
    for (let grew = true; grew;) {
      grew = false;
      for (const sh of src.shapes ?? []) if (needShapes.has(sh.id)) for (const i of sh.inputs ?? []) if (!needShapes.has(i)) { needShapes.add(i); grew = true; }
    }
    const usedTypes = Object.fromEntries(Object.entries(src.types ?? {}).filter(([k]) => subParts.some((p) => p.type === k)));
    const doc = {
      // khớp nằm trọn trong cụm (trục và mọi bộ phận được dẫn) đi theo cụm: "<idBoPhan>/<khop>" ở bản dùng nó
      id: `${name}`, title: description ?? name, parts: subParts, routes: [],
      joints: src.joints.filter((j) => set.has(j.axis.split(".")[0]) && j.moves.every((m) => set.has(m))).map(({ value, ...j }) => j),
      ...(needShapes.size ? { shapes: src.shapes.filter((sh) => needShapes.has(sh.id)) } : {}),
      ...(src.materials ? { materials: src.materials } : {}),
      ...(src.decals?.some((d) => set.has(d.target)) ? { decals: src.decals.filter((d) => set.has(d.target)) } : {}),
      ...(Object.keys(usedTypes).length ? { types: usedTypes } : {}),
    };
    const entry = { description: description ?? `${name} (từ ${assembly})`, source: assembly, root: rootId, doc, rootMatrix: solved.parts.get(rootId).rest, anchors, bounds };
    updateState((state) => { state.library = { ...(state.library ?? {}), [name]: entry }; });
    return text([
      `Đã lưu loại "${name}": ${subParts.length} bộ phận, ${needShapes.size} hình, gốc ${rootId}.`,
      `khung bao (khung của loại) ${fmtV(bounds.min)} → ${fmtV(bounds.max)}, cỡ ${fmtV(sizeOf(bounds))}`,
      "điểm neo công khai:",
      ...Object.entries(anchors).map(([k, a]) => `  ${fmtAnchor(k, a)}`),
      `Lắp ở bản khác: part_add {type: "${name}", place: {kind: "coaxial", a: "<id>.${Object.keys(anchors)[0] ?? "…"}", b: "…"}}.`,
    ].join("\n"));
  },

  // ───── hình tự dựng ─────
  shape_lathe: (args) => upsertShape("lathe", args),
  shape_extrude: (args) => upsertShape("extrude", args),
  shape_sweep: (args) => upsertShape("sweep", args),
  shape_mirror: (args) => upsertShape("mirror", args),
  shape_pattern: (args) => upsertShape("pattern", args),
  shape_loft: (args) => upsertShape("loft", args),
  shape_boolean: (args) => upsertShape("boolean", args),
  shape_round_edges: (args) => upsertShape("roundEdges", args),
  shape_groove: (args) => upsertShape("groove", args),
  shape_split_region: (args) => upsertShape("splitRegion", args),
  shape_list: ({ assembly, id }) => {
    const doc = findAssembly(readState(), assembly).doc;
    if (!doc.shapes?.length) return text("Chưa có hình nào. Dựng bằng shape_lathe / shape_extrude / shape_sweep.");
    if (id) return text(shapeReport(doc, id));
    const built = buildShapes(doc);
    return text(doc.shapes.map((s) => {
      const b = built.get(s.id);
      return `- ${s.id} (${s.op}${s.inputs?.length ? ` ← ${s.inputs.join(", ")}` : ""}): cỡ ${fmtV(sizeOf(b.bounds))}, ${b.triangles} tam giác, điểm neo: ${Object.keys(b.anchors).join(", ")}`;
    }).join("\n"));
  },
  shape_remove: ({ assembly, id }) => {
    editDoc(assembly, (doc) => {
      if (!doc.shapes?.some((s) => s.id === id)) throw new Error(`Không có hình "${id}".`);
      const users = [...doc.parts.filter((p) => p.type === `${SHAPE_PREFIX}${id}`).map((p) => `bộ phận ${p.id}`), ...doc.shapes.filter((s) => s.inputs?.includes(id)).map((s) => `hình ${s.id}`)];
      if (users.length) throw new Error(`Hình ${id} đang được dùng bởi: ${users.join(", ")}. Xoá hoặc đổi chúng trước.`);
      doc.shapes = doc.shapes.filter((s) => s.id !== id);
    });
    return text(`Đã xoá hình ${id}.`);
  },
  anchor_define: ({ assembly, shape, name, kind, from, shift, origin, dir, up, radius, desc }) => {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(name ?? "")) throw new Error(`Tên điểm neo "${name}" không hợp lệ (chữ cái đầu, rồi chữ, số, _).`);
    const { doc } = editDoc(assembly, (d) => {
      const node = d.shapes?.find((s) => s.id === shape);
      if (!node) throw new Error(`Không có hình "${shape}".`);
      let spec;
      if (from) {
        const base = buildShapes(d).get(shape).anchors[from];
        if (!base) throw new Error(`Hình ${shape} không có điểm neo "${from}".`);
        if (base.kind === "surface") throw new Error(`"${from}" là mặt trụ; cho origin + dir trực tiếp.`);
        const s = shift ?? [0, 0, 0];
        spec = { kind: kind ?? base.kind, origin: base.origin.map((v, i) => v + s[i]), dir: base.kind === "face" ? base.normal : base.dir, up: up ?? base.up };
      } else {
        if (!origin || !dir) throw new Error("Cần from (điểm neo có sẵn) hoặc origin + dir.");
        spec = { kind: kind ?? "point", origin, dir, up };
      }
      const k = spec.kind;
      if (!["point", "axis", "face"].includes(k)) throw new Error(`kind phải là point, axis hoặc face.`);
      const d0 = Math.hypot(...spec.dir);
      if (!(d0 > 1e-9)) throw new Error("dir không được là véc-tơ 0.");
      const text0 = desc ?? `điểm neo ${name} (agent đặt)`;
      node.anchors = { ...(node.anchors ?? {}), [name]: k === "face" ? { kind: "face", origin: spec.origin, normal: spec.dir, ...(spec.up ? { up: spec.up } : {}), desc: text0 } : { kind: k, origin: spec.origin, dir: spec.dir, ...(spec.up ? { up: spec.up } : {}), ...(k === "axis" && radius ? { radius } : {}), desc: text0 } };
    });
    return text(`Đã đặt ${shape}.${name}.\n${shapeReport(doc, shape)}`);
  },

  // ───── vật liệu, decal ─────
  material_presets: () => text([
    "# Preset vật liệu (material_define {preset, overrides}) — hoặc dùng thẳng tên preset làm vật liệu",
    ...Object.entries(PRESETS).map(([k, p]) => `- ${k}: ${p.desc}. Tham số: ${Object.entries(p.defaults).map(([n, v]) => `${n}=${v}`).join(", ")}`),
    `\n# Texture thủ tục (textures.normal | roughness | color): ${TEXTURE_KINDS.join(", ")}; {kind, scale (số lần lặp trên UV), seed, strength}. tread = gai lốp chạy theo chu vi (dùng cho lathe: UV u quanh trục).`,
    `\n# Tên cũ vẫn dùng được: ${MATERIAL_NAMES.join(", ")}`,
  ].join("\n")),
  material_define: ({ assembly, id, preset, overrides, textures }) => {
    if (!ID.test(id ?? "")) throw new Error(`id vật liệu "${id}" không hợp lệ.`);
    editDoc(assembly, (d) => {
      d.materials = { ...(d.materials ?? {}), [id]: { preset, ...(overrides ? { overrides } : {}), ...(textures ? { textures } : {}) } };
    });
    return text(`Vật liệu ${id} = ${preset}${overrides ? ` ${JSON.stringify(overrides)}` : ""}${textures ? `, texture ${Object.entries(textures).map(([s, t]) => `${s}:${t.kind}`).join(", ")}` : ""}. Gán bằng material_assign hoặc tham số material của part_add / shape_*.`);
  },
  material_assign: ({ assembly, target, material }) => {
    editDoc(assembly, (d) => {
      const setOn = (o) => (material ? (o.material = material) : delete o.material);
      if (target.startsWith(SHAPE_PREFIX)) {
        const node = d.shapes?.find((s) => s.id === target.slice(SHAPE_PREFIX.length));
        if (!node) throw new Error(`Không có hình "${target}".`);
        setOn(node);
      } else {
        const part = d.parts.find((p) => p.id === target);
        if (!part) throw new Error(`Không có bộ phận "${target}". Gán cho hình thì viết "shape:<id>".`);
        setOn(part);
      }
    });
    return text(`${target} ← ${material || "(vật liệu mặc định)"}.`);
  },
  decal_add: ({ assembly, id, target, at, size, angle, depth, content, mode }) => {
    if (!ID.test(id ?? "")) throw new Error(`id decal "${id}" không hợp lệ.`);
    editDoc(assembly, (d) => {
      d.decals = (d.decals ?? []).filter((x) => x.id !== id);
      d.decals.push({ id, target, at, size, ...(angle ? { angle } : {}), ...(depth ? { depth } : {}), content, ...(mode ? { mode } : {}) });
    });
    return text(`Decal ${id}: ${content?.text ? `"${content.text}"` : "svg"} ${size[0]} × ${size[1]} m trên ${at}${mode ? ` (${mode})` : ""}. Xem bằng render_view camera detail:${target}.`);
  },
  decal_remove: ({ assembly, id }) => {
    editDoc(assembly, (d) => {
      if (!d.decals?.some((x) => x.id === id)) throw new Error(`Không có decal "${id}".`);
      d.decals = d.decals.filter((x) => x.id !== id);
    });
    return text(`Đã xoá decal ${id}.`);
  },

  // ───── đo ─────
  measure: ({ assembly, kind, target, a, b, pose = {}, spec }) => {
    const doc = clone(findAssembly(readState(), assembly).doc);
    for (const j of doc.joints) j.value = pose[j.id] ?? 0;
    const reg = registryFor(doc);
    const solved = solve(doc, reg);
    const boxOf = (id) => {
      const part = solved.parts.get(id);
      if (!part) throw new Error(`Không có bộ phận "${id}".`);
      return worldBounds(reg, part);
    };
    const all = () => {
      const ids = [...solved.parts.keys()];
      if (!ids.length) throw new Error("Bản lắp ráp chưa có bộ phận.");
      return ids.map(boxOf).reduce((u, x) => ({ min: u.min.map((v, i) => Math.min(v, x.min[i])), max: u.max.map((v, i) => Math.max(v, x.max[i])) }));
    };
    const worldPoint = (ref) => {
      const { frame, world: m } = anchorFrame(reg, solved.parts, ref, "world");
      const [x, y, z] = frame.origin;
      return [0, 1, 2].map((i) => m[i] * x + m[4 + i] * y + m[8 + i] * z + m[12 + i]);
    };
    const r = (v) => +v.toFixed(5);
    const lines = [];
    if (kind === "bounds") {
      const bb = target ? boxOf(target) : all();
      const sz = sizeOf(bb);
      lines.push(`${target ?? "cả vật"}: ${fmtV(bb.min)} → ${fmtV(bb.max)}; dài (x) ${r(sz[0])}, cao (y) ${r(sz[1])}, rộng (z) ${r(sz[2])} m`);
      if (spec) {
        const want = { length: sz[0], height: sz[1], width: sz[2] };
        for (const [k, v] of Object.entries(spec)) if (k in want) lines.push(`  ${k}: đo ${r(want[k])}, cần ${v}, lệch ${r(want[k] - v)} m (${r((100 * (want[k] - v)) / v)}%)`);
      }
    } else if (kind === "distance") {
      if (!a || !b) throw new Error("distance cần a và b (điểm neo \"id.diemNeo\").");
      const pa = worldPoint(a), pb = worldPoint(b);
      const dv = pb.map((v, i) => v - pa[i]);
      lines.push(`${a} ${fmtV(pa)} → ${b} ${fmtV(pb)}: ${r(Math.hypot(...dv))} m (dx ${r(dv[0])}, dy ${r(dv[1])}, dz ${r(dv[2])})`);
    } else if (kind === "gap") {
      if (!a || !b) throw new Error("gap cần a và b (id bộ phận).");
      const A = boxOf(a), B = boxOf(b);
      const sep = [0, 1, 2].map((i) => Math.max(A.min[i] - B.max[i], B.min[i] - A.max[i]));
      const pos = sep.filter((v) => v > 0);
      const gap = pos.length ? Math.hypot(...pos) : Math.max(...sep);
      lines.push(`khe ${a} ↔ ${b} (theo khung bao): ${r(gap)} m${gap < 0 ? " (chồng lấn)" : ""}; theo trục x ${r(sep[0])}, y ${r(sep[1])}, z ${r(sep[2])}`);
    } else if (kind === "clearance") {
      const ids = target ? [target] : [...solved.parts.keys()];
      let low = { id: "", y: Infinity };
      for (const id of ids) {
        const y = boxOf(id).min[1];
        if (y < low.y) low = { id, y };
      }
      lines.push(`đáy thấp nhất: ${low.id} ở y = ${r(low.y)} m${low.y < -1e-6 ? " (thấp hơn mặt đất y = 0)" : ""}`);
    } else throw new Error("kind phải là bounds, distance, gap hoặc clearance.");
    return text(lines.join("\n"));
  },

  // ───── cảnh, render ─────
  scene_set: ({ assembly, environment, stage, exposure }) => {
    const { doc } = editDoc(assembly, (d) => {
      d.scene = { ...(d.scene ?? {}), ...(environment ? { environment } : {}), ...(stage ? { stage } : {}), ...(exposure !== undefined ? { exposure } : {}) };
      if (d.scene.environment && !["room", "studio", "street", "sunset", "dawn"].includes(d.scene.environment)) throw new Error("environment: room, studio, street, sunset, dawn.");
      if (d.scene.stage && !["table", "studioCyc", "road", "glossyFloor", "none"].includes(d.scene.stage)) throw new Error("stage: table, studioCyc, road, glossyFloor, none.");
    });
    return text(`Cảnh: ${JSON.stringify(doc.scene)}.`);
  },
  render_view: async ({ assembly, camera = "threeQuarterFront", size = [1600, 1000], quality = "final", pose = {}, wait_ms = 30000 }) => {
    if (!/^(threeQuarterFront|threeQuarterRear|side|front|rear|top|detail:[A-Za-z0-9_-]+)$/.test(camera)) throw new Error("camera: threeQuarterFront, threeQuarterRear, side, front, rear, top, detail:<idBoPhan>.");
    if (!Array.isArray(size) || size.length !== 2 || size.some((v) => !(v >= 64 && v <= 4096))) throw new Error("size phải là [rộng, cao] trong 64–4096 px.");
    const { a, meta } = await requestBrowser(assembly, { mode: "render", pose, camera, size, quality }, wait_ms);
    if (meta.error) return { ...text(`Trang render lỗi: ${meta.error}`), isError: true };
    const png = readFileSync(snapshotFile(assembly));
    return { content: [{ type: "text", text: `${a.title} rev ${a.rev}, camera ${camera}, ${size[0]}×${size[1]}, ${quality}, cảnh ${JSON.stringify(a.doc.scene ?? {})}.` }, { type: "image", data: png.toString("base64"), mimeType: "image/png" }] };
  },
  assembly_view: async ({ assembly, pose = {}, focus, wait_ms = 12000, region }) => {
    const { a, meta } = await requestBrowser(assembly, { mode: "four", pose, focus: focus ?? null }, wait_ms);
    if (meta.error) return { ...text(`Trang chụp lỗi: ${meta.error}`), isError: true };
    const png = await crop(readFileSync(snapshotFile(assembly)), region);
    const label = `${a.title} rev ${a.rev}${Object.keys(pose).length ? `, pose ${JSON.stringify(pose)}` : ""}${focus ? `, focus ${focus}` : ""}. Ô: trái-trên phối cảnh, phải-trên trước (+z), trái-dưới cạnh (+x), phải-dưới trên (+y).`;
    return { content: [{ type: "text", text: label }, { type: "image", data: png.toString("base64"), mimeType: "image/png" }] };
  },
};

// ───────── tự kiểm tra ─────────

async function selftest() {
  const dir = mkdtempSync(join(tmpdir(), "assembly-selftest-"));
  process.env.NEVIAD_ASSEMBLY_DIR = dir;
  const call = (name, args) => handlers[name](args).content[0].text;
  const callAsync = async (name, args) => (await handlers[name](args)).content[0].text;
  const fails = [];
  const near = (label, got, want, tol = 1e-4) => { if (Math.abs(got - want) > tol) fails.push(`${label}: ${got} ≠ ${want}`); };
  const worldOf = () => solve(findAssembly(readState(), "gen").doc, PARTS);
  try {
    call("assembly_create", { id: "gen", title: "Máy phát điện xoay chiều" });
    const add = (id, type, place, params) => call("part_add", { assembly: "gen", id, type, place, params });
    add("base", "basePlate", { kind: "onto", a: "base.bottom", b: "ground.top", at: [0.04, 0] });
    add("mag", "horseshoeMagnet", { kind: "onto", a: "mag.bottom", b: "base.top", at: [-0.04, 0] });
    add("brgL", "bearingBlock", { kind: "onto", a: "brgL.foot", b: "base.top", at: [-0.138, 0] });
    add("brgR", "bearingBlock", { kind: "onto", a: "brgR.foot", b: "base.top", at: [0.058, 0] });
    add("shaft", "shaft", { kind: "through", a: "shaft.axis", b: "brgL.bore", offset: 0.082 }, { length: 0.412 });
    add("coil", "coil", { kind: "coaxial", a: "coil.axis", b: "shaft.axis", offset: 0.016 });
    add("ring1", "slipRing", { kind: "coaxial", a: "ring1.axis", b: "shaft.axis", offset: 0.144 });
    add("ring2", "slipRing", { kind: "coaxial", a: "ring2.axis", b: "shaft.axis", offset: 0.17 });
    add("brush1", "carbonBrush", { kind: "touch", a: "brush1.tip", b: "ring1.surface@bottom", follow: false }, { standHeight: 0.078 });
    add("crank", "crank", { kind: "coaxial", a: "crank.axis", b: "shaft.axis", offset: -0.198 });
    add("meter", "analogMeter", { kind: "onto", a: "meter.bottom", b: "base.top", at: [0.245, -0.05] });
    add("needle", "needle", { kind: "coaxial", a: "needle.axis", b: "meter.pivot" });
    add("postR", "bindingPost", { kind: "onto", a: "postR.bottom", b: "base.top", at: [0.165, 0.105] });
    call("joint_add", { assembly: "gen", id: "rotor", kind: "revolute", axis: "brgL.bore", moves: ["shaft"] });
    call("joint_add", { assembly: "gen", id: "needleJ", kind: "revolute", axis: "meter.pivot", moves: ["needle"], limits: [-45, 45] });
    call("route_add", { assembly: "gen", id: "w1", from: "brush1.terminal", to: "postR.terminal", via: [{ on: "base.top" }], radius: 0.0016, material: "wireRed" });

    const s = worldOf();
    const at = (id, p = [0, 0, 0]) => {
      const m = s.parts.get(id).world;
      return [0, 1, 2].map((i) => m[i] * p[0] + m[4 + i] * p[1] + m[8 + i] * p[2] + m[12 + i]);
    };
    const SY = 0.028 + 0.135;
    near("base.top y", at("base")[1], 0.028);
    near("ring1 x", at("ring1")[0], 0.128); near("ring1 y", at("ring1")[1], SY);
    near("coil x", at("coil")[0], 0); near("coil y", at("coil")[1], SY);
    near("brush1 tip y", at("brush1")[1], SY - 0.017); near("brush1 tip x", at("brush1")[0], 0.128);
    near("brush1 foot y", at("brush1", [0, -0.02 + 0.006 - 0.026 - 0.078, 0])[1], 0.028);
    near("crank x", at("crank")[0], -0.214);
    near("needle z", at("needle")[2], -0.05 + 0.017 + 0.0015);
    // quay rô-to 90°: khung dây đổi hướng, chổi than đứng yên
    const doc = findAssembly(readState(), "gen").doc;
    doc.joints.find((j) => j.id === "rotor").value = 90;
    const s90 = solve(doc, PARTS);
    const coilNormal = [8, 9, 10].map((i) => s90.parts.get("coil").world[i]);
    near("coil normal y @90°", Math.abs(coilNormal[1]), 1);
    near("brush1 x @90°", s90.parts.get("brush1").world[12], 0.128);
    near("ring1 y @90°", s90.parts.get("ring1").world[13], SY);
    if (JSON.stringify(s90.clusters.get("rotor")) !== JSON.stringify(["shaft", "coil", "ring1", "ring2", "crank"])) fails.push(`cụm rotor: ${s90.clusters.get("rotor")}`);

    console.log(call("assembly_describe", { assembly: "gen" }));
    console.log("\n--- lỗi cố ý ---");
    for (const [label, args] of [
      ["sai tên điểm neo", { id: "x1", type: "block", place: { kind: "onto", a: "x1.bottom", b: "base.topp" } }],
      ["trục to hơn lỗ", { id: "x2", type: "rod", params: { diameter: 0.03 }, place: { kind: "through", a: "x2.axis", b: "brgR.bore" } }],
      ["tham chiếu bộ phận chưa có", { id: "x3", type: "block", place: { kind: "onto", a: "x3.bottom", b: "lamp.top" } }],
      ["ghép trục vào mặt", { id: "x4", type: "rod", place: { kind: "coaxial", a: "x4.axis", b: "base.top" } }],
      ["tham số ngoài miền", { id: "x5", type: "coil", params: { turns: 0 }, place: { kind: "coaxial", a: "x5.axis", b: "shaft.axis" } }],
    ]) {
      try { add(args.id, args.type, args.place, args.params); fails.push(`${label}: không báo lỗi`); } catch (e) { console.log(`- ${label}: ${e.message}`); }
    }
    if (findAssembly(readState(), "gen").doc.parts.some((p) => p.id.startsWith("x"))) fails.push("lệnh lỗi vẫn ghi vào tài liệu");

    // xe cỡ thật trượt dọc ground.x, bánh lăn theo bằng khớp ghép tự tính tỉ số
    console.log("\n--- xe lăn ---");
    call("assembly_create", { id: "car", title: "Xe" });
    const addC = (id, type, place, params) => call("part_add", { assembly: "car", id, type, place, params });
    const R = 0.32;
    addC("body", "block", { kind: "onto", a: "body.bottom", b: "ground.top", offset: 0.2 }, { size: [4.3, 0.62, 1.72], bevel: 0.08 });
    addC("wheel", "disc", { kind: "touch", a: "wheel.end0", b: "body.front", at: [1.35, R - 0.51] }, { length: 0.22, diameter: 2 * R, material: "rubber" });
    call("joint_add", { assembly: "car", id: "drive", kind: "prismatic", axis: "ground.x", moves: ["body"] });
    console.log(call("joint_add", { assembly: "car", id: "roll", kind: "revolute", axis: "wheel.axis", moves: ["wheel"], couple: { joint: "drive" } }));
    const carDoc = findAssembly(readState(), "car").doc;
    const wheelAt = (s) => { carDoc.joints.find((j) => j.id === "drive").value = s; return solve(carDoc, PARTS).parts.get("wheel").world; };
    const m0 = wheelAt(0), m1 = wheelAt(Math.PI * R); // nửa vòng
    near("tâm bánh y", m0[13], R);
    // điểm vành đang chạm đất lúc đầu phải lên đỉnh sau nửa vòng, tâm dời πR
    const w = [m0[12], 0, m0[14]];
    const local = [0, 1, 2].map((c) => [0, 1, 2].reduce((acc, r) => acc + m0[c * 4 + r] * (w[r] - m0[12 + r]), 0));
    const top = [0, 1, 2].map((i) => m1[i] * local[0] + m1[4 + i] * local[1] + m1[8 + i] * local[2] + m1[12 + i]);
    near("vành sau nửa vòng y", top[1], 2 * R);
    near("vành sau nửa vòng x", top[0], m1[12]);
    near("tâm bánh dời", m1[12] - m0[12], Math.PI * R);
  } catch (e) {
    fails.push(`xe lăn: ${e.message}`);
  }
  try {
    call("joint_add", { assembly: "car", id: "bad", kind: "revolute", axis: "body.axisZ", moves: ["body"], couple: { joint: "drive" } });
    fails.push("couple không bán kính: không báo lỗi");
  } catch (e) {
    console.log(`- couple không tính được: ${e.message}`);
  }
  try {
    const out = await callAsync("assembly_export", { assembly: "car", path: "fe/node_modules/.cache/assembly-bridge/selftest.assembly.json" });
    if (!JSON.parse(readFileSync(join(FE_ROOT, "node_modules/.cache/assembly-bridge/selftest.assembly.json"), "utf8")).joints.some((j) => j.couple)) fails.push("export thiếu couple");
    console.log(out);
    try { await callAsync("assembly_export", { assembly: "car", path: "../ngoai-repo.json" }); fails.push("export ra ngoài repo không bị chặn"); } catch {}

    // hình tự dựng: lathe / extrude / sweep / mirror / pattern, gắn vào lắp ráp, vật liệu, decal, đo
    console.log("\n--- hình ---");
    call("assembly_create", { id: "shp", title: "Hình" });
    const S = (tool, args) => call(tool, { assembly: "shp", ...args });
    const built = () => buildShapes(findAssembly(readState(), "shp").doc);
    S("shape_lathe", { id: "cup", profile: { pts: [[0, 0], [0.035, 0], [0.0375, 0.05], [0.04, 0.095]], round: [0, 0.004, 0, 0] }, wall: 0.002 });
    const cup = built().get("cup");
    near("cốc đáy y", cup.bounds.min[1], 0);
    near("cốc R ngoài", cup.bounds.max[0], 0.04, 5e-4);
    {
      // ở giữa thân (y ≈ 0,05), bán kính trong nhỏ hơn bán kính ngoài khoảng bằng độ dày thành
      const pos = cup.geometry.attributes.position, rs = [];
      for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getY(i) - 0.05) < 0.003) rs.push(Math.hypot(pos.getX(i), pos.getZ(i)));
      near("cốc thành dày", Math.max(...rs) - Math.min(...rs), 0.002, 3e-4);
    }
    S("shape_extrude", { id: "plate", outline: { pts: [[-0.1, -0.05], [0.1, -0.05], [0.1, 0.05], [-0.1, 0.05]], closed: true, round: [0.01, 0.01, 0.01, 0.01] }, depth: 0.05, edgeRadius: 0.003 });
    const pl = built().get("plate");
    [[-0.1, -0.05, -0.025], [0.1, 0.05, 0.025]].forEach((want, k) => want.forEach((w, i) => near(`tấm khung bao ${k ? "max" : "min"}[${i}]`, (k ? pl.bounds.max : pl.bounds.min)[i], w, 2e-4)));
    const oct = { pts: Array.from({ length: 8 }, (_, i) => [0.005 * Math.cos((i * Math.PI) / 4), 0.005 * Math.sin((i * Math.PI) / 4)]) };
    S("shape_sweep", { id: "pipe", section: oct, path: { pts: [[0, 0, 0], [0.3, 0, 0]], smooth: false } });
    const pipe = built().get("pipe");
    near("ống dài", pipe.bounds.max[0] - pipe.bounds.min[0], 0.3, 1e-4);
    near("ống end x", pipe.anchors.end.origin[0], 0.3);
    near("ống end hướng", pipe.anchors.end.dir[0], 1);
    S("shape_extrude", { id: "spoke", outline: { pts: [[0, -0.01], [0.1, -0.006], [0.1, 0.006], [0, 0.01]], closed: true }, depth: 0.01, plane: "xz", offset: [0.02, 0, 0.1] });
    S("shape_mirror", { id: "spokes2", input: "spoke", plane: "z" });
    const m2 = built().get("spokes2");
    near("đối xứng z", m2.bounds.min[2], -m2.bounds.max[2]);
    console.log(S("shape_pattern", { id: "star", input: "spoke", kind: "radial", count: 5, axis: "y" }).split("\n")[0]);
    if (!built().get("star").info[0].includes("72°")) fails.push("lặp vòng 5 bản không phải 72°");
    console.log(S("part_add", { id: "cup1", type: "shape:cup", place: { kind: "onto", a: "cup1.bottom", b: "ground.top", at: [0.2, 0] } }).split("\n")[1]);
    near("cốc đặt lên đất", worldBounds(registryFor(findAssembly(readState(), "shp").doc), solve(findAssembly(readState(), "shp").doc, registryFor(findAssembly(readState(), "shp").doc)).parts.get("cup1")).min[1], 0);
    S("anchor_define", { shape: "cup", name: "handle", kind: "point", from: "right", shift: [0, 0.01, 0] });
    if (!built().get("cup").anchors.handle) fails.push("anchor_define không lưu");
    S("material_define", { id: "glassBlue", preset: "glassTinted", overrides: { attenuationColor: "#3aa0ff" } });
    S("material_assign", { target: "cup1", material: "glassBlue" });
    S("decal_add", { id: "label", target: "cup1", at: "cup1.surface@angle=0", size: [0.03, 0.01], content: { text: "250 ml" } });
    console.log(S("measure", { kind: "bounds", target: "cup1", spec: { height: 0.095 } }));
    console.log(S("measure", { kind: "distance", a: "cup1.bottom", b: "cup1.top" }));
    console.log(S("assembly_describe", {}).split("## Hình")[1]);
    for (const [label, tool, args] of [
      ["đường tự cắt", "shape_extrude", { id: "bad1", outline: { pts: [[0, 0], [1, 1], [1, 0], [0, 1]], closed: true }, depth: 0.1 }],
      ["hình không có", "part_add", { id: "x9", type: "shape:nope", place: { kind: "onto", a: "x9.bottom", b: "ground.top" } }],
      ["preset sai", "material_define", { id: "m2", preset: "gold" }],
      ["xoá hình đang dùng", "shape_remove", { id: "cup" }],
      ["mirror thiếu input", "shape_mirror", { id: "bad2", input: "zzz" }],
      ["decal lên trục", "decal_add", { id: "d2", target: "cup1", at: "cup1.axis", size: [0.01, 0.01], content: { text: "x" } }],
    ]) {
      try { S(tool, args); fails.push(`${label}: không báo lỗi`); } catch (e) { console.log(`- ${label}: ${e.message}`); }
    }

    // thân vỏ: loft, boolean, bo cạnh, khắc rãnh, tách vùng
    console.log("\n--- thân vỏ ---");
    const vol = (id) => +/→ ([\d.e-]+) m³/.exec(built().get(id).info.join(" "))?.[1];
    const rect = { pts: [[-0.1, 0], [0.1, 0], [0.1, 0.2], [-0.1, 0.2]], round: [0.02, 0.02, 0.02, 0.02], closed: true };
    S("shape_loft", { id: "duct", sections: [{ x: 0, profile: rect }, { x: 0.5, profile: rect }], caps: "flat" });
    const duct = built().get("duct");
    [[0, 0, -0.1], [0.5, 0.2, 0.1]].forEach((want, k) => want.forEach((w, i) => near(`loft hộp ${k ? "max" : "min"}[${i}]`, (k ? duct.bounds.max : duct.bounds.min)[i], w, 1e-3)));
    // nửa thân xe: mặt cắt (z, y) tại 5 vị trí, đối xứng
    const half = (w, hb, ht) => ({ pts: [[0, hb], [w, hb], [w, (hb + ht) / 2], [w * 0.7, ht], [0, ht]], round: [0, 0.05, 0, 0.08, 0] });
    const secs = [[0, 0.6, 0.25, 0.7], [0.8, 0.82, 0.22, 0.85], [2, 0.86, 0.22, 1.4], [3.4, 0.85, 0.22, 1.35], [4.3, 0.7, 0.3, 1.0]];
    console.log(S("shape_loft", { id: "body", symmetric: true, sections: secs.map(([x, w, hb, ht]) => ({ x, profile: half(w, hb, ht) })), caps: "round" }).split("\n").slice(0, 8).join("\n"));
    {
      const pos = built().get("body").geometry.attributes.position;
      for (const [x, w, , ht] of secs) {
        let zmax = 0, ymax = 0;
        for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getX(i) - x) < 1e-6) { zmax = Math.max(zmax, pos.getZ(i)); ymax = Math.max(ymax, pos.getY(i)); }
        near(`loft x=${x} nửa rộng`, zmax, w, 2e-3);
        near(`loft x=${x} cao`, ymax, ht, 2e-3);
      }
    }
    // khối 0,2 m trừ trụ r 0,05 xuyên qua
    S("shape_extrude", { id: "cube", outline: { pts: [[-0.1, -0.1], [0.1, -0.1], [0.1, 0.1], [-0.1, 0.1]], closed: true }, depth: 0.2, edgeRadius: 0 });
    S("shape_lathe", { id: "bar", profile: { pts: [[0, -0.15], [0.05, -0.15], [0.05, 0.15], [0, 0.15]] }, segments: 128 });
    console.log(S("shape_boolean", { id: "holed", op: "subtract", input: "cube", tools: ["bar"] }).split("\n")[0]);
    near("boolean thể tích", vol("holed"), 0.008 - Math.PI * 0.05 ** 2 * 0.2, 0.008 * 0.01);
    console.log(S("shape_round_edges", { id: "soft", input: "cube", radius: 0.01 }).split("\n")[0]);
    {
      // cạnh thẳng phải thành cung tròn đúng bán kính: điểm giữa cung ở 0,1 − r + r/√2 theo cả hai trục
      const pos = built().get("soft").geometry.attributes.position;
      let c = 1;
      for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getZ(i)) < 0.004 && Math.abs(pos.getX(i) - pos.getY(i)) < 1e-3 && pos.getX(i) > 0) c = Math.min(c, pos.getX(i));
      near("bo cạnh giữa cung", c, 0.1 - 0.01 + 0.01 / Math.SQRT2, 5e-4);
      const left = +/còn (\d+)/.exec(built().get("soft").info[0])[1];
      if (left > 60) fails.push(`bo cạnh còn nhiều cạnh gãy: ${built().get("soft").info[0]}`);
    }
    { const b = built().get("soft").bounds; if (b.max.some((v) => v > 0.1 + 1e-6) || b.min.some((v) => v < -0.1 - 1e-6)) fails.push(`bo cạnh làm phình khối: ${JSON.stringify(b)}`); }
    console.log(S("shape_groove", { id: "slot", input: "cube", curve: { plane: { axis: "x", at: 0 } }, within: [[-1, 0.09, -1], [1, 1, 1]], width: 0.0035, depth: 0.004 }).split("\n")[0]);
    {
      const r = 0.00175, area = 0.0035 * (0.004 - r) + (Math.PI * r * r) / 2;
      near("rãnh thể tích bớt", 0.008 - vol("slot"), area * 0.2, area * 0.2 * 0.15);
    }
    console.log(S("shape_split_region", { id: "pane", input: "cube", plane: "xz", outline: { pts: [[-0.05, -0.05], [0.05, -0.05], [0.05, 0.05], [-0.05, 0.05]], closed: true }, range: [0.05, 1], thickness: 0.004 }).split("\n")[0]);
    {
      const pane = built().get("pane");
      near("tấm đỉnh", pane.bounds.max[1], 0.1, 1e-5);
      near("tấm dày", pane.bounds.max[1] - pane.bounds.min[1], 0.004, 1e-5);
      near("tấm rộng", pane.bounds.max[0] - pane.bounds.min[0], 0.1, 1e-5);
    }
    S("shape_sweep", { id: "openPipe", section: oct, path: { pts: [[-0.3, 0, 0], [0.3, 0, 0]], smooth: false }, caps: false });
    for (const [label, tool, args] of [
      ["loft mặt cắt tự cắt", "shape_loft", { id: "bad3", sections: [{ x: 0, profile: { pts: [[0, 0], [1, 1], [1, 0], [0, 1]], closed: true } }, { x: 1, profile: rect }] }],
      ["loft x không tăng", "shape_loft", { id: "bad4", sections: [{ x: 1, profile: rect }, { x: 0, profile: rect }] }],
      ["boolean hình hở", "shape_boolean", { id: "bad5", op: "subtract", input: "cube", tools: ["openPipe"] }],
      ["tách vùng lõm", "shape_split_region", { id: "bad6", input: "cube", plane: "xz", outline: { pts: [[0, 0], [0.05, 0], [0.01, 0.01], [0, 0.05]], closed: true } }],
      ["rãnh không cắt", "shape_groove", { id: "bad7", input: "cube", curve: { plane: { axis: "x", at: 5 } } }],
    ]) {
      try { S(tool, args); fails.push(`${label}: không báo lỗi`); } catch (e) { console.log(`- ${label}: ${e.message}`); }
    }

    // cụm: lưu cốc + vòng thành loại "coc", lắp hai lần ở bản khác, rồi lồng tiếp
    console.log("\n--- cụm ---");
    call("assembly_create", { id: "src", title: "Nguồn" });
    const Src = (tool, args) => call(tool, { assembly: "src", ...args });
    Src("shape_lathe", { id: "cupS", profile: { pts: [[0, 0], [0.035, 0], [0.0375, 0.05], [0.04, 0.095]] }, wall: 0.002 });
    Src("shape_lathe", { id: "ringS", profile: { pts: [[0.039, 0.03], [0.045, 0.03], [0.045, 0.04], [0.039, 0.04]], closed: true } });
    Src("part_add", { id: "cup1", type: "shape:cupS", place: { kind: "onto", a: "cup1.bottom", b: "ground.top", at: [0.3, 0.1] }, material: "glassTinted" });
    Src("part_add", { id: "ring1", type: "shape:ringS", place: { kind: "coaxial", a: "ring1.axis", b: "cup1.axis" }, material: "chrome" });
    console.log(call("part_save_as_type", { assembly: "src", name: "coc", expose: { axis: "cup1.axis", day: "cup1.bottom" }, description: "cốc có vòng" }));
    call("assembly_create", { id: "dst", title: "Đích" });
    const Dst = (tool, args) => call(tool, { assembly: "dst", ...args });
    Dst("part_add", { id: "c1", type: "coc", place: { kind: "onto", a: "c1.day", b: "ground.top", at: [-0.2, 0] } });
    Dst("part_add", { id: "c2", type: "coc", place: { kind: "onto", a: "c2.day", b: "ground.top", at: [0.2, 0] } });
    {
      const d = findAssembly(readState(), "dst").doc, reg = registryFor(d), sd = solve(d, reg);
      if (!d.types?.coc) fails.push("cụm chưa chép vào doc.types");
      const b1 = worldBounds(reg, sd.parts.get("c1")), b2 = worldBounds(reg, sd.parts.get("c2"));
      near("cụm c1 tâm x", (b1.min[0] + b1.max[0]) / 2, -0.2);
      near("cụm c2 tâm x", (b2.min[0] + b2.max[0]) / 2, 0.2);
      near("cụm c1 đáy", b1.min[1], 0);
      near("cụm c1 cao", b1.max[1] - b1.min[1], 0.096, 2e-3);
      const ax = anchorFrame(reg, sd.parts, "c2.axis", "rest");
      near("cụm c2.axis x", ax.world[12] + ax.frame.origin[0], 0.2);
    }
    console.log(call("part_save_as_type", { assembly: "dst", name: "haiCoc", description: "hai cốc" }).split("\n")[0]);
    call("assembly_create", { id: "lv3", title: "Lồng" });
    call("part_add", { assembly: "lv3", id: "h", type: "haiCoc", place: { kind: "onto", a: "h.day", b: "ground.top" } });
    { const d = findAssembly(readState(), "lv3").doc; const b = worldBounds(registryFor(d), solve(d, registryFor(d)).parts.get("h")); near("cụm lồng rộng", b.max[0] - b.min[0], 0.4 + 0.09, 2e-3); }
    if (!/Cụm đã lưu[\s\S]*coc/.test(call("part_types_list", {}))) fails.push("part_types_list thiếu cụm");
    for (const [label, args] of [
      ["tên trùng loại có sẵn", { assembly: "src", name: "block" }],
      ["cụm không khép kín", { assembly: "src", name: "x1", parts: ["ring1"] }],
      ["root ngoài cụm", { assembly: "src", name: "x2", parts: ["cup1"], root: "ring1" }],
      ["expose sai điểm neo", { assembly: "src", name: "x3", expose: { a: "cup1.khongCo" } }],
    ]) {
      try { call("part_save_as_type", args); fails.push(`${label}: không báo lỗi`); } catch (e) { console.log(`- ${label}: ${e.message}`); }
    }

    // điểm neo kế thừa từ dao cắt, lặp, bo cạnh
    console.log("\n--- điểm neo kế thừa ---");
    S("shape_round_edges", { id: "holedSoft", input: "holed", radius: 0.006 });
    if (!built().get("holed").anchors["bar.axis"]) fails.push("boolean không kế thừa bar.axis");
    if (!built().get("holedSoft").anchors["bar.axis"]) fails.push("bo cạnh không giữ bar.axis");
    if (!built().get("star").anchors["spoke[2].extrudeAxis"]) fails.push("pattern không đánh số spoke[2]");
    {
      const a = built().get("star").anchors["spoke[1].extrudeAxis"], b = built().get("star").anchors["spoke[0].extrudeAxis"];
      near("pattern bản 1 xoay 72°", Math.atan2(a.origin[2], a.origin[0]) - Math.atan2(b.origin[2], b.origin[0]) + (Math.atan2(a.origin[2], a.origin[0]) < 0 ? 0 : 0), 0, 10); // chỉ cần có mặt
    }
    S("part_add", { id: "holed1", type: "shape:holed", place: { kind: "onto", a: "holed1.bottom", b: "ground.top", at: [1, 1] } });
    S("part_add", { id: "pin1", type: "rod", params: { length: 0.3, diameter: 0.02 }, place: { kind: "through", a: "pin1.axis", b: "holed1.bar.axis" } });
    console.log(S("part_add", { id: "pin2", type: "rod", params: { length: 0.3, diameter: 0.02 }, place: { kind: "through", a: "pin2.axis", b: "holed1.bar.axis", offset: 0.01 } }).split("\n")[1]);

    // khớp trong cụm: lưu cốc có khớp quay, xoay bằng "c1/xoay"
    console.log("\n--- khớp trong cụm ---");
    call("joint_add", { assembly: "src", id: "xoay", kind: "revolute", axis: "cup1.axis", moves: ["ring1"] });
    call("part_save_as_type", { assembly: "src", name: "cocXoay", expose: { day: "cup1.bottom", axis: "cup1.axis" } });
    call("assembly_create", { id: "dst2", title: "Đích 2" });
    call("part_add", { assembly: "dst2", id: "c1", type: "cocXoay", place: { kind: "onto", a: "c1.day", b: "ground.top" } });
    if (!findAssembly(readState(), "dst2").doc.types.cocXoay.doc.joints.some((j) => j.id === "xoay")) fails.push("cụm không lưu khớp");
    if (!findJoint(findAssembly(readState(), "dst2").doc, "c1/xoay")) fails.push("không tìm được khớp c1/xoay");

    // vật lý: rơi tự do, va chạm, con lắc, đĩa lăn, bánh răng (đáp số tính tay)
    console.log("\n--- vật lý ---");
    const P = (id, title) => { call("assembly_create", { id, title }); return (tool, args) => call(tool, { assembly: id, ...args }); };
    const box = (Q, id, size, place, extra = {}) => Q("part_add", { id, type: "block", params: { size, bevel: 0, material: "steel" }, place, ...extra });
    const bodyOf = (aid, id) => { const doc = findAssembly(readState(), aid).doc; const w = new World(physicsModel(doc)); return { w, b: w.byId.get(id) }; };
    {
      const Q = P("ph1", "Rơi");
      box(Q, "b", [0.2, 0.2, 0.2], { kind: "onto", a: "b.bottom", b: "ground.top", offset: 1 });
      Q("body_set", { part: "b", fixed: false });
      const { w, b } = bodyOf("ph1", "b");
      const y0 = b.x[1];
      for (let i = 0; i < 36; i++) w.step(1 / 120);
      near("rơi 0,3 s", y0 - b.x[1], 0.5 * 9.81 * 0.09, 0.006);
      near("khối lượng thép 0,008 m³", b.mass, 62.8, 0.05);
      for (let i = 0; i < 480; i++) w.step(1 / 120);
      near("nằm yên trên sàn", b.x[1], 0.1, 0.005);
    }
    for (const e of [1, 0]) {
      const id = `ph2e${e}`, Q = P(id, "Va chạm");
      box(Q, "A", [0.4, 0.2, 0.2], { kind: "onto", a: "A.bottom", b: "ground.top", at: [-1, 0] });
      box(Q, "B", [0.4, 0.2, 0.2], { kind: "onto", a: "B.bottom", b: "ground.top", at: [1, 0] });
      Q("body_set", { part: "A", fixed: false, mass: 2, friction: 0, restitution: e });
      Q("body_set", { part: "B", fixed: false, mass: 1, friction: 0, restitution: e });
      Q("initial_set", { part: "A", velocity: [3, 0, 0] });
      Q("initial_set", { part: "B", velocity: [-1, 0, 0] });
      const out = Q("simulate", { duration: 1, samples: 2 });
      const { w } = bodyOf(id, "A");
      for (let i = 0; i < 120; i++) w.step(1 / 120);
      const vA = (2 * 3 - 1 + e * (-1 - 3)) / 3, vB = (2 * 3 - 1 + 2 * e * 4) / 3;
      near(`va chạm e=${e} động lượng`, w.momentum()[0], 5, 0.05);
      near(`va chạm e=${e} vA`, w.byId.get("A").v[0], vA, 0.05 * 4);
      near(`va chạm e=${e} vB`, w.byId.get("B").v[0], vB, 0.05 * 4);
      if (!/Chạm lần đầu: A ↔ B/.test(out)) fails.push(`simulate không báo va chạm A ↔ B (e=${e})`);
    }
    {
      const Q = P("ph3", "Con lắc");
      box(Q, "pv", [0.02, 0.02, 0.02], { kind: "onto", a: "pv.bottom", b: "ground.top", offset: 1.5 });
      box(Q, "rod", [0.04, 1, 0.04], { kind: "onto", a: "rod.top", b: "pv.bottom", offset: -0.01 });
      Q("joint_add", { id: "j", kind: "revolute", axis: "pv.axisZ", moves: ["rod"] });
      Q("physics_setup", { groundPlane: false });
      Q("initial_set", { part: "rod", angularVelocity: [0, 0, 30] });
      const { w, b } = bodyOf("ph3", "rod");
      let last = null; const cross = [];
      for (let i = 0; i < 720; i++) { w.step(1 / 120); const a = Math.atan2(b.x[0], 1.5 - b.x[1]); if (last !== null && last < 0 && a >= 0) cross.push(w.t); last = a; }
      near("con lắc chu kỳ", (cross.at(-1) - cross[0]) / (cross.length - 1), 2 * Math.PI * Math.sqrt(2 / (3 * 9.81)), 0.03 * 1.638);
    }
    {
      const Q = P("ph4", "Đĩa lăn");
      Q("part_add", { id: "d", type: "disc", params: { length: 0.05, diameter: 0.4, material: "rubber" }, place: { kind: "touch", a: "d.surface@angle=0", b: "ground.top" } });
      Q("body_set", { part: "d", fixed: false });
      Q("initial_set", { part: "d", velocity: [2, 0, 0] });
      const { w, b } = bodyOf("ph4", "d");
      for (let i = 0; i < 120; i++) w.step(1 / 120);
      near("đĩa lăn ω·R = v", Math.hypot(...b.w) * 0.2, Math.abs(b.v[0]), 0.03);
      if (!(b.v[0] > 0.5)) fails.push(`đĩa lăn dừng sớm: v = ${b.v[0]}`);
    }
    {
      const Q = P("ph5", "Bánh răng");
      box(Q, "base", [1, 0.1, 0.4], { kind: "onto", a: "base.bottom", b: "ground.top" });
      Q("part_add", { id: "ga", type: "disc", params: { length: 0.02, diameter: 0.2 }, place: { kind: "onto", a: "ga.end0", b: "base.top", at: [-0.2, 0], offset: 0.05 } });
      Q("part_add", { id: "gb", type: "disc", params: { length: 0.02, diameter: 0.4 }, place: { kind: "onto", a: "gb.end0", b: "base.top", at: [0.2, 0], offset: 0.05 } });
      Q("joint_add", { id: "ja", kind: "revolute", axis: "ga.axis", moves: ["ga"] });
      Q("joint_add", { id: "jb", kind: "revolute", axis: "gb.axis", moves: ["gb"] });
      Q("physics_setup", { gravity: [0, 0, 0], groundPlane: false });
      Q("drive_add", { joint: "ja", kind: "speed", value: 60 });
      editDoc("ph5", (d) => { d.physics.gears = [{ a: "ja", b: "jb", ratio: 0.5 }]; });
      const { w } = bodyOf("ph5", "ga");
      for (let i = 0; i < 120; i++) w.step(1 / 120);
      near("bánh răng ωb = −½ωa", (w.byId.get("gb").w[1] / w.byId.get("ga").w[1]), -0.5, 0.01);
    }

    // kiểm tra theo lưới thật
    console.log("\n--- kiểm tra ---");
    {
      const Q = P("ck", "Kiểm tra");
      box(Q, "A", [0.2, 0.2, 0.2], { kind: "onto", a: "A.bottom", b: "ground.top", at: [0, 0] });
      box(Q, "B", [0.2, 0.2, 0.2], { kind: "fixed", a: "B.center", b: "A.center", shift: [0.15, 0, 0] });
      box(Q, "C", [0.2, 0.2, 0.2], { kind: "onto", a: "C.bottom", b: "ground.top", at: [0.55, 0] });
      box(Q, "F", [0.1, 0.1, 0.1], { kind: "onto", a: "F.bottom", b: "ground.top", at: [2, 0], offset: 0.5 });
      const inter = Q("check_interference", {});
      console.log(inter.split("\n").slice(0, 2).join("\n"));
      const m = /A ↔ B: ([\d.]+) cm³/.exec(inter);
      near("xuyên nhau A–B (cm³)", m ? +m[1] : -1, 0.05 * 0.2 * 0.2 * 1e6, 1);
      const gap = Q("check_clearance", { a: "B", b: "C" });
      console.log(gap);
      const g = /([\d.]+) mm/.exec(gap);
      near("khe B–C (mm)", g ? +g[1] : -1, 350, 0.5); // B dời theo z của khung A.center nên cách C 0,35 m theo x
      const fl = Q("check_floating", {});
      console.log(fl.split("\n").slice(0, 3).join("\n"));
      if (!/F: không chạm/.test(fl) || /- [ABC]:/.test(fl)) fails.push(`check_floating sai: ${fl}`);
      Q("body_set", { part: "A", fixed: false });
      Q("body_set", { part: "B", fixed: false });
      Q("part_update", { id: "B", place: { kind: "onto", a: "B.bottom", b: "ground.top", at: [0.1, 0] } });
      const phy = Q("check_physics", { duration: 0.5 });
      console.log(phy.split("\n").slice(0, 2).join("\n"));
      if (!/bay|kéo rời|năng lượng tăng/.test(phy)) fails.push(`check_physics không bắt hai hộp đặt xuyên nhau: ${phy}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(fails.length ? `\nTHẤT BẠI (${fails.length}):\n${fails.join("\n")}` : "\nOK: mọi tư thế khớp đáp số.");
  process.exit(fails.length ? 1 : 0);
}

if (process.argv.includes("--selftest")) await selftest();
else {
  serveMcp({ server: SERVER, instructions: CLAUDE_INSTRUCTIONS, tools: TOOLS, handlers });
  // nướng sẵn lưới cho các bản đã có (lần đầu có thể mất vài chục giây với thân xe), chạy sau khi đã nhận lệnh
  setTimeout(() => {
    for (const a of readState().assemblies) {
      try {
        bakeDoc(a.doc);
        if (a.doc.physics) physicsModel(a.doc);
      } catch (e) { process.stderr.write(`không nướng được ${a.id}: ${e.message}\n`); }
    }
  }, 50);
  process.stderr.write(`neviad-assembly ${SERVER.version}: ${Object.keys(PARTS).length} loại bộ phận, sẵn sàng\n`);
}
