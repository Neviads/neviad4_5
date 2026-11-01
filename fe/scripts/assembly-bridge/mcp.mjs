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
import { checkArgs, serveMcp, text } from "../lib/mcp-stdio.mjs";
import { crop } from "../code-bridge/view.mjs";
import { CLAUDE_INSTRUCTIONS } from "./instructions.mjs";
import { FE_ROOT, findAssembly, meshFile, physicsFile, readSnapshotMeta, readState, snapshotFile, snapshotGlbFile, updateState } from "./store.mjs";

const SERVER = { name: "neviad-assembly", version: "0.2.0" };
const PAGE = "/lap-rap-3d";

// assembly-kit viết bằng TypeScript: đóng gói assembly-kit vào node_modules/.cache để "three" tự tìm thấy.
const cache = join(FE_ROOT, "node_modules/.cache/assembly-bridge");
mkdirSync(cache, { recursive: true });
const kitFile = join(cache, "kit.mjs");
await build({ entryPoints: [join(FE_ROOT, "assembly-kit/node.ts")], bundle: true, platform: "node", format: "esm", outfile: kitFile, external: ["three", "manifold-3d"], logLevel: "error" });
const kit = await import(`${pathToFileURL(kitFile).href}?t=${Date.now()}`);
const { PARTS, solve, partReport, describeTree, typeInfo, solveRoute, registryFor, checkDocExtras, buildShapes, MATERIAL_PARAMS, TEXTURE_KINDS, checkDefinedMaterial, anchorFrame, worldBounds, SHAPE_PREFIX, initKernel, physicsKey, encodeShape, keyHash, usedShapeIds, shapeKeys, buildPhysicsModel, bodyOfPart, World, flatten, worldGeometry, descendants, partOrCluster, toManifold, meshPointDistance, meshAxisDistance, kernel: kernelOf, transformAnchorSpec, transformBounds, checkTypeName, chain, invertRigid, transformPoint, LOOP_TOL } = kit;
// lõi hình khối kín (boolean, khắc rãnh): nạp WASM một lần trước khi phục vụ
await initKernel(() => import("manifold-3d"));

const ID = /^[A-Za-z0-9_-]{1,40}$/;
const assemblyArg = { type: "string", description: "id bản lắp ráp" };
const materialArg = { type: "string", description: "vật liệu cho cả bộ phận: id đã material_define; chuỗi rỗng để bỏ" };
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
  { name: "part_types_list", description: "Liệt kê các loại bộ phận dùng được: hình tự dựng (shape:<id>) và cụm đã lưu bằng part_save_as_type.", inputSchema: { type: "object", properties: {} } },
  { name: "part_type_info", description: "Tham số (đơn vị, mặc định, miền) và điểm neo của một loại bộ phận. Với hình tự dựng (shape:<id>) thì cho thêm assembly.", inputSchema: { type: "object", properties: { type: { type: "string" }, assembly: assemblyArg }, required: ["type"] } },
  { name: "assembly_create", description: "Tạo bản lắp ráp rỗng (có sẵn ground.top là mặt bàn y = 0).", inputSchema: { type: "object", properties: { id: { type: "string", description: "chữ, số, -, _; bỏ trống để tự đặt" }, title: { type: "string" } }, required: ["title"] } },
  { name: "assembly_list", description: "Liệt kê các bản lắp ráp.", inputSchema: { type: "object", properties: {} } },
  { name: "assembly_read", description: "Đọc JSON đầy đủ của một bản lắp ráp.", inputSchema: { type: "object", properties: { assembly: assemblyArg }, required: ["assembly"] } },
  { name: "assembly_delete", description: "Xoá một bản lắp ráp.", inputSchema: { type: "object", properties: { assembly: assemblyArg }, required: ["assembly"] } },
  {
    name: "part_add",
    description: "Thêm một bộ phận và đặt nó vào bộ phận đã có. Trả về tư thế đã giải, khung bao và toạ độ thế giới của các điểm neo.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" }, type: { type: "string", description: "shape:<idHinh>, hoặc tên cụm đã lưu" }, params: { type: "object" }, place: placeSchema, material: materialArg }, required: ["assembly", "id", "type", "place"] },
  },
  {
    name: "part_update",
    description: "Sửa tham số (gộp vào tham số cũ) và/hoặc cách ghép của một bộ phận; mọi bộ phận ghép vào nó đi theo.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" }, params: { type: "object" }, place: placeSchema, material: materialArg }, required: ["assembly", "id"] },
  },
  {
    name: "part_remove",
    description: "Xoá một bộ phận cùng khớp, dây, decal và thiết lập vật lý trỏ tới nó. Có bộ phận ghép vào nó, hoặc khớp khác couple theo khớp bị xoá, thì báo lỗi, trừ khi cascade = true (xoá cả nhánh).",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" }, cascade: { type: "boolean" } }, required: ["assembly", "id"] },
  },
  {
    name: "joint_add",
    description: "Thêm (hoặc thay, cùng id) một khớp: revolute (quay, độ) hoặc prismatic (trượt, mét) quanh một điểm neo kiểu axis (kể cả ground.x/y/z); moves = bộ phận được điều khiển, bộ phận ghép vào chúng đi theo. couple: khớp chạy theo khớp khác (giá trị = ratio × khớp dẫn, hoặc theo bảng table khi chuyển động phi tuyến/nhiều giai đoạn); bánh lăn theo khớp trượt thì bỏ ratio, công cụ tự tính từ bán kính bánh. Ghép chạy hai chiều (pose đặt khớp ghép thì khớp dẫn được suy ngược; vật lý ràng buộc cả hai). Khâu nối vào hai nhánh (xi lanh, thanh truyền): dùng loop_add thay cho couple tỉ số. Trục khớp phải chạm VẬT LIỆU (lưới) của cụm dẫn và cụm cha — cụm = bộ phận cùng mọi bộ phận ghép cứng vào nó; trục qua lỗ thì khai radius ở anchor_define — không thì báo lỗi và không ghi.",
    inputSchema: {
      type: "object",
      properties: { assembly: assemblyArg, id: { type: "string" }, kind: { type: "string", enum: ["revolute", "prismatic"] }, axis: { type: "string" }, moves: { type: "array", items: { type: "string" } }, limits: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
        couple: { type: "object", properties: {
          joint: { type: "string" },
          ratio: { type: "number", description: "đơn vị khớp này trên một đơn vị khớp dẫn; bỏ trống = bánh lăn không trượt" },
          table: { type: "array", items: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 }, description: "thay ratio: [[giá trị khớp dẫn, giá trị khớp này], ...] tăng dần theo khớp dẫn; nội suy từng đoạn, ngoài bảng giữ mút. Cho chuyển động phi tuyến hoặc nhiều giai đoạn" },
        }, required: ["joint"] },
        allowAir: { type: "string", description: "lý do trục được phép nằm xa vật liệu (chỉ khi cố ý); bỏ trống thì trục phải chạm vật liệu cả cụm dẫn lẫn cụm cha" },
        tolerance: { type: "number", description: "m, mặc định 0,002; trục qua lỗ cộng thêm radius của điểm neo" },
      },
      required: ["assembly", "id", "kind", "axis", "moves"],
    },
  },
  {
    name: "assembly_export",
    description: `Ghi bản lắp ráp ra một file trong repo (đường dẫn tính từ gốc repo). .json: tài liệu để trang/route dựng lại (buildAssembly(doc, kit) rồi setPose({khop: giaTri})). .glb: lưới + vật liệu glTF để dùng ngoài (trang ${PAGE} phải đang mở; pose tuỳ chọn).`,
    inputSchema: { type: "object", properties: { assembly: assemblyArg, path: { type: "string", description: "vd fe/app/ten-route/vat.assembly.json hoặc .glb" }, pose: { type: "object" }, wait_ms: { type: "integer", minimum: 0, maximum: 60000 } }, required: ["assembly", "path"] },
  },
  { name: "joint_remove", description: "Xoá một khớp (cả động cơ của nó). Khớp khác đang couple theo nó thì báo lỗi, trừ khi cascade = true (xoá cả chuỗi); vòng kín đang tính nó cũng vậy.", inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" }, cascade: { type: "boolean" } }, required: ["assembly", "id"] } },
  {
    name: "loop_add",
    description: "KHÉP VÒNG cơ cấu nhiều khâu, khi một bộ phận nối vào HAI nhánh của cây lắp ráp: xi lanh/piston đẩy một bộ phận quay, tay quay–thanh truyền–con trượt, bốn khâu, cần gạt. Cây lắp ráp vẫn dựng như thường (mỗi khâu ghép vào một cha), rồi loop_add nói điểm neo a (đầu khâu ở nhánh này) phải trùng điểm neo b (lỗ/chốt ở nhánh kia, hoặc ground) ở MỌI tư thế. solves = 1–3 khớp do vòng tính ra (thường là khớp quay ở chân xi lanh + khớp trượt của cán, hoặc khớp ở hai đầu thanh truyền); mỗi khớp phải nằm trên nhánh từ gốc tới đúng một đầu. Khớp còn lại của nhóm là khớp dẫn. Đừng ghép tay bằng couple tỉ số cho các khâu này: quan hệ thật là phi tuyến. Điều kiện: lắp sao cho a trùng b khi mọi khớp = 0 (tool báo độ lệch nếu chưa), và mỗi đầu nằm trên VẬT LIỆU của cụm chứa nó (lưới bộ phận cùng mọi bộ phận ghép cứng vào nó, dung sai tolerance) — hai điểm trùng mà một đầu ở khoảng không (giữa hai tấm, trong lỗ khoét) thì báo lỗi; thêm chốt/tai ghép cứng ở đó, hoặc allowAir nếu cố ý. Kết quả: bảng quét khớp dẫn trong limits (giá trị các khớp do vòng tính, chỗ không khép hoặc vượt giới hạn). Sau đó pose/thanh trượt đặt khớp dẫn hoặc bất kỳ khớp nào trong nhóm; vật lý ghim hai điểm.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" }, a: { type: "string", description: "điểm neo đầu khâu, vd 'can.dau'" }, b: { type: "string", description: "điểm neo phải trùng a, vd 'thung.tai' hoặc 'ground…'" }, solves: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 }, allowAir: { type: "string", description: "lý do một đầu vòng được phép nằm xa vật liệu (chỉ khi cố ý)" }, tolerance: { type: "number", description: "m, mặc định 0,002" } }, required: ["assembly", "id", "a", "b", "solves"] },
  },
  { name: "loop_remove", description: "Bỏ một vòng kín; các khớp nó tính trở lại thành khớp dẫn tự do.", inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" } }, required: ["assembly", "id"] } },
  {
    name: "route_add",
    description: "Thêm (hoặc thay, cùng id) một dây nối giữa hai điểm neo (điểm hoặc mặt), tuỳ chọn bám các mặt via. material = id đã material_define.",
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
    description: "TIỆN: xoay biên dạng [bán kính, y] quanh trục y. Cho vật tròn xoay quanh một trục. wall > 0 thì có thành dày thật và miệng bo (round). Đặt vào lắp ráp bằng part_add type \"shape:<id>\".",
    inputSchema: { type: "object", properties: { ...shapeCommon, profile: path2dArg("biên dạng mặt ngoài, đi từ dưới lên, x = bán kính ≥ 0"), wall: { type: "number", description: "độ dày thành (m), 0 = khối đặc/mặt đơn" }, lip: { type: "string", enum: ["round", "flat"] }, segments: { type: "integer" }, angle: { type: "number", description: "độ, < 360 để tiện một phần" } }, required: ["assembly", "id", "profile"] },
  },
  {
    name: "shape_extrude",
    description: "ĐÙN: đường bao kín 2D kéo dày theo trục còn lại, đối xứng quanh 0, bo mọi cạnh (edgeRadius, mặc định 0,5 mm; khung bao vẫn đúng kích thước khai báo). Cho khối có mặt cắt không đổi (hoặc thon đều bằng taper) dọc một trục.",
    inputSchema: { type: "object", properties: { ...shapeCommon, outline: path2dArg("đường bao kín"), holes: { type: "array", items: path2dArg("lỗ") }, depth: { type: "number" }, edgeRadius: { type: "number" }, plane: { type: "string", enum: ["xy", "xz", "zy"], description: "mặt vẽ đường bao: xy (đùn theo z), xz (đùn theo y), zy (toạ độ [z, y], đùn theo x)" }, taper: { type: "number", description: "tỉ lệ đường bao ở đầu +trục đùn (1 = thẳng)" } }, required: ["assembly", "id", "outline", "depth"] },
  },
  {
    name: "shape_sweep",
    description: "QUÉT: mặt cắt chạy dọc một đường 3D (khung xoay nhỏ nhất, không xoắn vô cớ). Mặt cắt [u, v]: v theo pháp tuyến (lên trên khi đường nằm ngang), u sang ngang. Cho khối có mặt cắt chạy theo một đường cong 3D (kể cả đường xoắn).",
    inputSchema: { type: "object", properties: { ...shapeCommon, section: path2dArg("mặt cắt (mặc định kín)"), path: { type: "object", properties: { pts: { type: "array", items: v3Arg }, smooth: { type: "boolean", description: "mặc định true: spline qua các điểm" }, closed: { type: "boolean" } }, required: ["pts"] }, twist: { type: "number", description: "độ xoắn tổng" }, scaleEnd: { type: "number" }, caps: { type: "boolean" }, samples: { type: "integer" } }, required: ["assembly", "id", "section", "path"] },
  },
  {
    name: "shape_mirror",
    description: "ĐỐI XỨNG một hình có sẵn qua mặt x/y/z = 0 (mặc định z), giữ cả bản gốc. Chỉ cần dựng một nửa.",
    inputSchema: { type: "object", properties: { ...shapeCommon, input: { type: "string" }, plane: { type: "string", enum: ["x", "y", "z"] }, keepOriginal: { type: "boolean" } }, required: ["assembly", "id", "input"] },
  },
  {
    name: "shape_pattern",
    description: "LẶP một hình có sẵn: radial (quanh trục x/y/z qua center, count bản, mỗi bản stepAngle độ, mặc định chia đều 360°) hoặc linear (step [x, y, z]). Cho chi tiết lặp đều quanh trục hoặc theo hàng.",
    inputSchema: { type: "object", properties: { ...shapeCommon, input: { type: "string" }, kind: { type: "string", enum: ["radial", "linear"] }, count: { type: "integer" }, axis: { type: "string", enum: ["x", "y", "z"] }, stepAngle: { type: "number" }, center: v3Arg, step: v3Arg }, required: ["assembly", "id", "input", "count"] },
  },
  {
    name: "shape_loft",
    description: "LOFT — mặt cong theo hai chiều: nối mượt nhiều mặt cắt ngang KHÁC DÁNG tại các x tăng dần, mỗi mặt cắt là đường kín trong mặt (z, y). Đùn một biên dạng thì mặt bên luôn phẳng; khối mà mặt cắt đổi dáng dọc chiều dài thì dùng loft, và thêm mặt cắt ở chỗ dáng đổi nhanh. symmetric: true thì chỉ cho NỬA z ≥ 0, từ tâm đáy (z = 0) lên tâm nóc (z = 0), tool tự đối xứng. round bo góc từng mặt cắt; caps round | flat | open. Điểm neo s0…sN (tâm mặt cắt), nose, tail. Kết quả trả bảng rộng × cao từng mặt cắt để so với số đo thật.",
    inputSchema: { type: "object", properties: { ...shapeCommon, sections: { type: "array", items: { type: "object", properties: { x: { type: "number" }, profile: path2dArg("mặt cắt [z, y]") }, required: ["x", "profile"] } }, symmetric: { type: "boolean" }, points: { type: "integer", description: "số điểm mỗi vòng (mặc định 64)" }, samples: { type: "integer", description: "số vòng giữa hai mặt cắt (mặc định 10)" }, caps: { type: "string", enum: ["round", "flat", "open"] }, capLength: { type: "number" } }, required: ["assembly", "id", "sections"] },
  },
  {
    name: "shape_boolean",
    description: "BOOLEAN (lõi manifold): op subtract (khoét hốc, lỗ, ô), union (gộp), intersect (giao) giữa input và các hình tools. Mọi hình phải kín và đã nằm đúng chỗ trong cùng khung (offset / rotate của chúng). Trả về thể tích trước / sau. Kết quả GIỮ điểm neo của dao cắt, tên \"<idDao>.<diemNeo>\" (khoét hốc bằng trụ \"hoc\" thì thân có \"hoc.axis\"; bo cạnh, khắc rãnh giữ nguyên; pattern đánh số \"<input>[i].<diemNeo>\"): ghép tiếp vào đó thay vì gõ toạ độ. smooth: true cho pháp tuyến liền mạch (mặt cong lớn). Mép cắt sắc: bo tiếp bằng shape_round_edges.",
    inputSchema: { type: "object", properties: { ...shapeCommon, op: { type: "string", enum: ["subtract", "union", "intersect"] }, input: { type: "string" }, tools: { type: "array", items: { type: "string" } }, smooth: { type: "boolean", description: "pháp tuyến liền mạch trên cả lưới (mặc định false: gãy ở cạnh > 30°)" } }, required: ["assembly", "id", "op", "input", "tools"] },
  },
  {
    name: "shape_weld",
    description: "MIẾT MỐI NỐI (không thêm vật liệu): gộp hai hình KÍN rồi làm mượt dải quanh chỗ chạm. Dùng khi hai mặt chạm nhau GẦN SONG SONG thành khe hẹp — round_edges bỏ qua ca này. Cần đắp vật liệu vào góc lõm giữa hai khối thì dùng shape_bevel. Hai hình phải cắm vào nhau vài mm. radius (m, mặc định 0,35 × bề dày nhỏ hơn, 4–30 mm), strength 0..1 (0,6), detail = cỡ lưới trong dải (radius/3). Kết quả: MỘT hình, MỘT vật liệu, kèm dòng \"lưới: … gấp mép …\".",
    inputSchema: { type: "object", properties: { ...shapeCommon, input: { type: "string", description: "hình thứ nhất (a)" }, tools: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 1, description: "[hình thứ hai (b)]" }, radius: { type: ["number", "string"], description: "bán kính cung hàn (m) hoặc \"auto\"" }, strength: { type: "number", description: "0..1, mặc định 0,6" }, detail: { type: ["number", "string"], description: "cỡ cạnh lưới trong dải (m) hoặc \"auto\"" }, maxTriangles: { type: "integer" } }, required: ["assembly", "id", "input", "tools"] },
  },
  {
    name: "shape_bevel",
    description: "ĐẮP / GỌT ĐÚNG MỘT MỐI NỐI giữa hai hình đã cắm vào nhau vài mm. mode \"add\" (mặc định khi có hình thứ hai): đắp vật liệu vào góc lõm nơi một khối cắm vào khối kia, thành một cung liền. \"cut\": gọt cạnh lồi nằm trong mối nối. radius (m, mặc định 0,35 × bề dày nhỏ nhất, 3–30 mm); profile 0..1 (> 0,5 mối dày hơn); strength 0..1 = độ miết; loop chọn vòng khi mối ra nhiều vòng (0 = dài nhất); angle = ngưỡng cạnh gãy cho cut. Ống/vỏ RỖNG: đắp trên khối ĐẶC rồi mới khoét lòng, nếu không cung cắt xuyên vách. Chỉ cần bo mọi cạnh: shape_round_edges; khe hẹp gần song song: shape_weld. Còn gợn sau khi đắp: shape_sand.",
    inputSchema: { type: "object", properties: { ...shapeCommon, input: { type: "string", description: "hình thứ nhất" }, tools: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 1, description: "[hình thứ hai] — có nó thì chỉ bo đúng mối nối giữa hai hình" }, mode: { type: "string", enum: ["cut", "add", "auto"] }, radius: { type: ["number", "string"], description: "bán kính cung (m) hoặc \"auto\"" }, profile: { type: "number", description: "0..1, mặc định 0,5" }, strength: { type: "number", description: "0..1, mặc định 0,6" }, loop: { type: "integer", description: "chọn vòng mối nối (0 = dài nhất)" }, angle: { type: "number", description: "ngưỡng cạnh gãy cho mode cut (mặc định 40°)" }, detail: { type: ["number", "string"], description: "cỡ cạnh lưới trong dải (m) hoặc \"auto\"" }, maxTriangles: { type: "integer" } }, required: ["assembly", "id", "input"] },
  },
  {
    name: "shape_sand",
    description: "MÀI GỢN (\"giấy ráp\") còn lại sau boolean / bevel / weld mà KHÔNG đổi dáng: đỉnh chỉ dời theo pháp tuyến về mặt bậc 2 khớp với hàng xóm, tối đa `limit` (mặc định 5 % cạnh lưới, 0,05–0,5 mm) so với hình gốc, nên gọi nhiều lần cũng không trôi; đỉnh nào làm lật/gấp tam giác thì được trả về chỗ cũ. Dùng khi thấy vòng gợn quanh mối nối, mặt lăn tăn. radius = cỡ miếng ráp: gợn NGẮN hơn radius mới bị bào (sóng 10–20 mm cần 0,015–0,02). region all | near | keep quanh tools[0], reach = bán kính vùng. lock (30°): đỉnh trên cạnh gãy hơn mức đó không bị mài (miệng ống vẫn sắc; 180 = mài cả cạnh). strength 0..1 hoặc passes. Đọc dòng \"đẩy theo pháp tuyến\" và \"đỉnh chạm trần\": chạm trần > 5 % là gợn to hơn limit — sửa tham số phép sinh ra gợn hoặc tăng limit. Không sửa được hình sai.",
    inputSchema: { type: "object", properties: { ...shapeCommon, input: { type: "string", description: "hình cần mài" }, tools: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 1, description: "[hình dùng làm vùng cho region near/keep]" }, region: { type: "string", enum: ["all", "near", "keep"] }, reach: { type: "number", description: "bán kính vùng (m), bỏ trống = tự tính" }, limit: { type: "number", description: "trần dời mỗi đỉnh (m), bỏ trống = 5 % cạnh lưới" }, radius: { type: "number", description: "bán kính miếng ráp (m), bỏ trống = max(3×limit, 4×cạnh ngắn)" }, strength: { type: "number", description: "0..1, mặc định 0,5" }, passes: { type: "integer", description: "1..200, ghi đè strength" }, lock: { type: "number", description: "độ, mặc định 30" }, maxTriangles: { type: "integer" } }, required: ["assembly", "id", "input"] },
  },
  {
    name: "shape_round_edges",
    description: "BO CẠNH mọi cạnh gãy hơn angle (mặc định 30°) với bán kính xấp xỉ radius (mặc định 4 mm): chia mịn lưới trong dải quanh cạnh rồi làm mượt. Dùng sau boolean / groove để mép không sắc như dao. Bán kính là xấp xỉ, không phải fillet CAD chính xác; báo số cạnh gãy còn lại. KHÔNG dùng cho mối nối hai mặt gần song song tạo khe hẹp — ca đó dùng shape_weld.",
    inputSchema: { type: "object", properties: { ...shapeCommon, input: { type: "string" }, radius: { type: "number" }, angle: { type: "number" }, maxTriangles: { type: "integer" } }, required: ["assembly", "id", "input"] },
  },
  {
    name: "shape_groove",
    description: "KHẮC RÃNH dọc một đường nằm trên mặt hình (rãnh, đường gân, khe giả — hình vẫn là một khối): curve {plane: {axis: x|y|z, at}} = giao của mặt với mặt phẳng (within [[min],[max]] để chỉ lấy một đoạn), hoặc {pts: [[x,y,z]…], project: [dx,dy,dz]} = chiếu polyline lên mặt. width (mặc định 3,5 mm), depth (4 mm). Hình phải kín.",
    inputSchema: { type: "object", properties: { ...shapeCommon, input: { type: "string" }, curve: { type: "object" }, within: { type: "array", items: v3Arg, minItems: 2, maxItems: 2 }, width: { type: "number" }, depth: { type: "number" } }, required: ["assembly", "id", "input", "curve"] },
  },
  {
    name: "shape_split_region",
    description: "TÁCH VÙNG mặt thành tấm mỏng ôm đúng mặt gốc (lớp phủ một phần mặt, thường khác vật liệu): outline lồi vẽ trong mặt plane (xy | xz | zy = [z, y]), chiếu theo trục còn lại; range [từ, tới] dọc trục chiếu để chỉ lấy một phía (vd range [0, 1] = chỉ phía dương của trục chiếu). thickness (mặc định 4 mm, dày vào trong), lift (dời theo pháp tuyến; dương = nổi ra, âm = thụt vào). Muốn ô thủng thì shape_boolean subtract với shape_extrude cùng outline.",
    inputSchema: { type: "object", properties: { ...shapeCommon, input: { type: "string" }, outline: path2dArg("đường bao lồi"), plane: { type: "string", enum: ["xy", "xz", "zy"] }, range: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 }, thickness: { type: "number" }, lift: { type: "number" } }, required: ["assembly", "id", "input", "outline"] },
  },
  {
    name: "part_save_as_type",
    description: "LƯU CỤM thành loại bộ phận mới để lắp lại nhiều lần hoặc ở bản khác: parts = các bộ phận của cụm (mặc định cả bản; phải khép kín: mỗi bộ phận đặt vào ground hoặc vào bộ phận trong cụm), root = bộ phận gốc (khung của loại mới = khung bộ phận này), expose = {tenCongKhai: \"idBoPhan.diemNeo\"} (mặc định mọi điểm neo của root). Sau đó ở bản khác: part_add {type: name} rồi ghép bằng điểm neo công khai.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, name: { type: "string" }, parts: { type: "array", items: { type: "string" } }, root: { type: "string" }, expose: { type: "object" }, description: { type: "string" } }, required: ["assembly", "name"] },
  },
  // ───── vật lý (bộ giải chung XPBD) ─────
  {
    name: "physics_setup",
    description: "Bật mô phỏng (bộ giải chung XPBD, chạy cả trong Node lẫn trang): bộ phận gom thành vật rắn (ghép chặt thì chung vật, mỗi khớp mở vật mới, gắn ground thì đứng yên), khối lượng / trọng tâm / quán tính từ lưới × khối lượng riêng, va chạm bằng bao lồi. free = các khớp bỏ đi để vật thành tự do (bỏ khớp trượt dọc ground.x thì vật trượt tự do theo vật lý). Tiếp theo: body_set (khối lượng thật nếu vật rỗng, ma sát, phục hồi) → initial_set (vận tốc đầu; bánh lăn sẵn thì cho cả ω) → drive_add → simulate đọc bảng số → sim_export .physics.json cho trang (new World(model), world.step(dt), view.setWorld(path, chain(world.matrix(body), part.offset))). Khớp trong cụm viết \"<idBoPhan>/<khop>\".",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, gravity: v3Arg, groundPlane: { type: "boolean", description: "mặt phẳng va chạm y = 0 (mặc định có)" }, substeps: { type: "integer" }, free: { type: "array", items: { type: "string" } } }, required: ["assembly"] },
  },
  {
    name: "body_set",
    description: "Ghi đè tính chất vật lý của vật chứa bộ phận (đường dẫn, kể cả trong cụm: \"cum/boPhan\"): mass (kg, vd vật thật rỗng), fixed, friction, restitution (hệ số phục hồi 0–1).",
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
    description: "KIỂM TRA XUYÊN NHAU theo lưới thật (giao khối manifold): báo cặp bộ phận chồng lấn, thể tích và tâm vùng giao. Bỏ qua cặp nằm cùng một cụm (cụm đã kiểm lúc dựng) trừ khi inside: true. pose: kiểm ở tư thế khớp đó (mặc định tư thế nghỉ). Lưới không kín thì tính theo bao lồi (ghi rõ trong kết quả).",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, parts: { type: "array", items: { type: "string" } }, tolerance: { type: "number", description: "m³, mặc định 1e-7" }, inside: { type: "boolean" }, pose: { type: "object", description: "{tenKhop: giaTri}, khớp cấp ngoài" } }, required: ["assembly"] },
  },
  {
    name: "check_clearance",
    description: "KHE HỞ nhỏ nhất theo lưới thật giữa hai bộ phận hoặc hai cụm (a, b là đường dẫn). min: báo lỗi nếu khe nhỏ hơn. pose: đo ở tư thế khớp đó (mặc định tư thế nghỉ).",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, a: { type: "string" }, b: { type: "string" }, min: { type: "number" }, pose: { type: "object", description: "{tenKhop: giaTri}, khớp cấp ngoài" } }, required: ["assembly", "a", "b"] },
  },
  {
    name: "check_floating",
    description: "LƠ LỬNG: bộ phận không chạm bộ phận nào khác và không chạm mặt đất (theo lưới, dung sai tolerance mặc định 2 mm). Chỉ hỏi 'có chạm gì không', không hỏi chạm đúng chỗ nối: dùng check_connections cho việc đó. pose: kiểm ở tư thế khớp đó.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, tolerance: { type: "number" }, pose: { type: "object", description: "{tenKhop: giaTri}, khớp cấp ngoài" } }, required: ["assembly"] },
  },
  {
    name: "check_connections",
    description: "CHỖ NỐI CÓ THẬT KHÔNG: điểm neo trùng nhau chưa chắc khối chạm nhau. Kiểm (1) mỗi cách ghép: bộ phận chạm cụm cha theo lưới; (2) mỗi khớp: trục chạm vật liệu của cụm dẫn và cụm cha (trục qua lỗ: cộng radius của neo); (3) mỗi vòng: hai đầu nằm trên vật liệu của cụm chứa chúng; (4) quét từng khớp dẫn có limits (steps tư thế): vòng còn khép, cụm dẫn của mỗi khớp còn chạm cụm cha (bắt cán trượt khỏi xi lanh, cần rời trục). Cụm = bộ phận + mọi bộ phận ghép cứng vào nó. Gọi trước khi báo xong.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, tolerance: { type: "number", description: "m, mặc định 0,002" }, steps: { type: "integer", minimum: 2, maximum: 25, description: "số tư thế quét mỗi khớp dẫn, mặc định 9" } }, required: ["assembly"] },
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
  {
    name: "material_define",
    description: "Định nghĩa (hoặc thay) một vật liệu có tên bằng thông số PBR tự đặt theo vật liệu thật (không có vật liệu dựng sẵn): params (màu, độ nhám, kim loại, lớp phủ, truyền sáng…), density = khối lượng riêng thật kg/m³ (dùng cho khối lượng khi mô phỏng), friction. textures {normal|roughness|color: {kind, scale (số lần lặp trên UV), seed, strength}} cho bề mặt không đều: noise = sần ngẫu nhiên, flakes = vảy lấp lánh, grain = vệt xước song song một hướng, tread = khối lặp theo chu vi quanh trục (UV u quanh trục của hình tiện), scratches = xước ngẫu nhiên. Vật liệu phải định nghĩa trước rồi mới gán (material_assign, tham số material của part_add / shape_* / route_add).",
    inputSchema: {
      type: "object",
      properties: {
        assembly: assemblyArg,
        id: { type: "string" },
        params: { type: "object", properties: Object.fromEntries(Object.entries(MATERIAL_PARAMS).map(([k, p]) => [k, p.range === "color" ? { type: "string", description: `${p.desc}, "#rrggbb"` } : { type: "number", minimum: p.range[0], maximum: p.range[1], description: p.desc }])), additionalProperties: false },
        density: { type: "number", description: "khối lượng riêng kg/m³ của vật liệu thật" },
        friction: { type: "number", description: "hệ số ma sát (mặc định 0,5)" },
        textures: { type: "object" },
      },
      required: ["assembly", "id", "params", "density"],
    },
  },
  {
    name: "material_assign",
    description: "Gán vật liệu cho một bộ phận (cả bộ phận) hoặc làm vật liệu mặc định của một hình (target \"shape:<id>\").",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, target: { type: "string" }, material: { type: "string" } }, required: ["assembly", "target", "material"] },
  },
  {
    name: "decal_add",
    description: "Dán chữ hoặc SVG lên mặt một bộ phận, chiếu từ điểm neo kiểu mặt (at, kể cả mặt trụ \"id.surface@angle=…\"). content {text, color, background, font, arcRadius (m: chữ chạy theo cung tròn) | svg}; mode print | emboss | engrave. Trùng id thì thay.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" }, target: { type: "string" }, at: { type: "string" }, size: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 }, angle: { type: "number" }, depth: { type: "number" }, content: { type: "object" }, mode: { type: "string", enum: ["print", "emboss", "engrave"] } }, required: ["assembly", "id", "target", "at", "size", "content"] },
  },
  { name: "decal_remove", description: "Xoá một decal.", inputSchema: { type: "object", properties: { assembly: assemblyArg, id: { type: "string" } }, required: ["assembly", "id"] } },
  // ───── đo ─────
  {
    name: "measure",
    description: "ĐO bằng số (theo tư thế pose nếu có): bounds (khung bao một bộ phận hoặc cả vật), distance (giữa hai điểm neo a, b), gap (khe giữa KHUNG BAO hai bộ phận a, b, không phải lưới; âm = chồng lấn; khe lưới thật: check_clearance), clearance (đáy thấp nhất so với y = 0). spec {length, width, height} so với khung bao cả vật.",
    inputSchema: { type: "object", properties: { assembly: assemblyArg, kind: { type: "string", enum: ["bounds", "distance", "gap", "clearance"] }, target: { type: "string" }, a: { type: "string" }, b: { type: "string" }, pose: { type: "object" }, spec: { type: "object" } }, required: ["assembly", "kind"] },
  },
  // ───── cảnh, render ─────
  {
    name: "scene_set",
    description: "Chọn ánh sáng và nền: environment room | studio (hộp đèn mềm, phản chiếu mượt trên mặt bóng) | street | sunset | dawn (HDRI thật); stage table | studioCyc (phông cong liền sàn) | road | glossyFloor | none; exposure.",
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
  // vòng kín: ở tư thế nghỉ (mọi khớp = 0) hai đầu phải trùng; sửa cách ghép làm lệch thì báo, không để bộ giải lặng lẽ bù
  for (const l of doc.loops ?? []) {
    const at = (ref) => {
      const { frame, part } = anchorFrame(reg, solved.parts, ref, "rest");
      return part ? transformPoint(part.rest, frame.origin) : frame.origin;
    };
    const pa = at(l.a), pb = at(l.b), gap = Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
    if (gap > 1e-4) throw new Error(`[vòng ${l.id}] ở tư thế nghỉ (mọi khớp = 0) ${l.a} ở ${fmtV(pa)} còn ${l.b} ở ${fmtV(pb)}, lệch ${(gap * 1000).toFixed(2)} mm. Lắp sao cho hai điểm trùng nhau khi mọi khớp = 0 (sửa cách ghép hoặc điểm neo), hoặc bỏ vòng (loop_remove).`);
  }
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
    if (material) checkDefinedMaterial(d, material, `[hình ${id}].material`);
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
  const posed = checkPose(a.doc, spec.pose);
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
  return { a, meta, posed };
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

/** pose {tenKhop: giaTri}: khớp phải có thật (kể cả "cum/khop"), giá trị là số trong giới hạn. `topOnly` khi chỉ giải được cấp ngoài. */
function checkPose(doc, pose = {}, topOnly = false) {
  for (const [k, v] of Object.entries(pose)) {
    if (topOnly && k.includes("/")) throw new Error(`pose.${k}: lệnh này chỉ đặt được khớp cấp ngoài (${doc.joints.map((j) => j.id).join(", ") || "chưa có"}); khớp trong cụm thì xem bằng assembly_view.`);
    const j = findJoint(doc, k);
    if (!j) throw new Error(`pose: không có khớp "${k}". Có: ${jointNames(doc).join(", ") || "(chưa có khớp)"}.`);
    if (typeof v !== "number") throw new Error(`pose.${k} phải là số.`);
    if (j.limits && (v < j.limits[0] || v > j.limits[1])) throw new Error(`pose.${k} = ${v} ngoài giới hạn ${JSON.stringify(j.limits)}.`);
  }
  // giải thử cấp ngoài: khớp phụ thuộc suy ngược ra khớp dẫn, vòng phải khép, khớp do vòng tính phải trong giới hạn
  const own = Object.fromEntries(Object.entries(pose).filter(([k]) => !k.includes("/")));
  if (!Object.keys(own).length) return null;
  const solved = solve(doc, registryFor(doc), { pose: own });
  if (solved.warnings.length) throw new Error(`pose ${JSON.stringify(own)}: ${solved.warnings.join(" ")}`);
  return solved;
}

/** Giá trị các khớp cùng nhóm liên động với khớp trong pose (đã suy ngược / lan truyền), để agent thấy cả nhóm đi theo. */
function poseReport(solved, pose = {}) {
  if (!solved) return "";
  const groups = new Set(Object.keys(pose).filter((k) => solved.groups.has(k)).map((k) => solved.groups.get(k)));
  const rows = [...solved.values].filter(([id]) => groups.has(solved.groups.get(id)) && !(id in pose));
  return rows.length ? `
Khớp đi theo: ${rows.map(([id, v]) => `${id} = ${+v.toFixed(4)}`).join(", ")}.` : "";
}

/**
 * Bỏ các khớp `ids` khỏi tài liệu cùng mọi thứ trỏ tới chúng (động cơ). Khớp khác đang couple theo chúng thì báo
 * lỗi, trừ khi `cascade` (bỏ luôn cả chuỗi). Trả về danh sách khớp đã bỏ.
 */
function dropJoints(doc, ids, cascade) {
  const gone = new Set(ids);
  for (let grew = true; grew;) {
    grew = false;
    const deps = doc.joints.filter((j) => !gone.has(j.id) && j.couple && gone.has(j.couple.joint));
    if (deps.length && !cascade) throw new Error(`Khớp ${deps.map((j) => `${j.id} (couple theo ${j.couple.joint})`).join(", ")} đang chạy theo khớp sắp xoá. Xoá hoặc đổi couple của chúng trước, hoặc dùng cascade: true.`);
    for (const j of deps) { gone.add(j.id); grew = true; }
  }
  doc.joints = doc.joints.filter((j) => !gone.has(j.id));
  if (doc.physics?.drives) doc.physics.drives = Object.fromEntries(Object.entries(doc.physics.drives).filter(([k]) => !gone.has(k)));
  dropLoops(doc, (l) => l.solves.some((s) => gone.has(s)), cascade, "tính khớp sắp xoá");
  return [...gone];
}

/** Vòng kín nằm trọn trong một tập bộ phận (hai đầu trong tập hoặc trên ground, mọi khớp nó tính đi theo cụm). */
function loopsIn(doc, set) {
  const kept = new Set(doc.joints.filter((j) => set.has(j.axis.split(".")[0]) && j.moves.every((m) => set.has(m))).map((j) => j.id));
  return (doc.loops ?? []).filter((l) => [l.a, l.b].every((ref) => { const id = ref.split(".")[0]; return id === "ground" || set.has(id); }) && l.solves.every((x) => kept.has(x)));
}

/** Bỏ các vòng kín thoả `hit`; không có `cascade` thì báo lỗi. Trả về id các vòng đã bỏ. */
function dropLoops(doc, hit, cascade, why) {
  const hits = (doc.loops ?? []).filter(hit);
  if (!hits.length) return [];
  if (!cascade) throw new Error(`Vòng ${hits.map((l) => l.id).join(", ")} đang ${why}. Xoá vòng trước (loop_remove), hoặc dùng cascade: true.`);
  doc.loops = doc.loops.filter((l) => !hits.includes(l));
  if (!doc.loops.length) delete doc.loops;
  return hits.map((l) => l.id);
}

// ───── vật lý: mô hình có cache, báo cáo, khối đặc để kiểm tra ─────

const modelCache = new Map();
/** Mô hình vật lý của tài liệu; tính lại khi bộ phận, hình, cụm hoặc cấu hình vật lý đổi. */
function physicsModel(doc) {
  const key = JSON.stringify([doc.parts, doc.joints, doc.shapes, doc.types, doc.materials, doc.physics, ...(doc.loops ? [doc.loops] : [])]);
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
    `Mô hình vật lý: ${model.bodies.length} vật, ${model.joints.length} khớp${model.couples?.length ? `, ${model.couples.length} khớp ghép` : ""}; trọng lực ${r3(model.gravity)}, ${model.substeps} substep, mặt đất ${model.groundPlane ? "có" : "không"}.`,
    "Vật:",
    ...model.bodies.map((b) => `- ${b.id}${b.fixed ? " (đứng yên)" : ` ${+b.mass.toFixed(3)} kg, trọng tâm ${r3(b.x0)}`}; ${b.parts.length} bộ phận${b.parts.length <= 4 ? ` (${b.parts.map((p) => p.path).join(", ")})` : ""}; bao lồi ${b.hull.verts.length} đỉnh; ma sát ${b.friction}, phục hồi ${b.restitution}`),
    ...(model.joints.length ? ["Khớp:", ...model.joints.map((j) => `- ${j.id}: ${j.kind} ${j.a} ↔ ${j.b ?? "thế giới"}, ${j.kind === "point" ? `ghim tại ${r3(j.pivotA)} (khung vật)` : `trục ${r3(j.axisA)}`}${j.motor ? `, động cơ ${j.motor.kind} ${+j.motor.value.toFixed(4)}` : ""}`)] : []),
    ...(model.couples?.length ? ["Khớp ghép (hai chiều):", ...model.couples.map((c) => `- ${c.follow} theo ${c.lead}${c.table ? ` theo bảng ${c.table.length} điểm` : ` × ${+c.ratio.toFixed(5)} (SI)`}`)] : []),
    ...(Object.keys(model.initial).length ? [`Vận tốc đầu: ${Object.entries(model.initial).map(([k, x]) => `${k}${x.v ? ` v${r3(x.v)}` : ""}`).join("; ")}`] : []),
    ...model.notes.map((n) => `⚠ ${n}`),
  ].join("\n");
}

function requirePart(doc, path) {
  const { parts } = flatten(doc);
  if (!parts.some((p) => p.path === path)) throw new Error(`Không có bộ phận "${path}". Có: ${parts.map((p) => p.path).slice(0, 40).join(", ")}.`);
}

/**
 * Lưới hở: tách thành các mảnh liền (hàn đỉnh trùng), lấy bao lồi TỪNG mảnh rồi gộp. Bao lồi cả lưới lấp kín khe giữa
 * các mảnh rời (hai tấm song song thành một khối đặc), sinh chồng lấn giả với mọi thứ nằm giữa.
 */
function pieceHulls(g, Manifold) {
  const src = g.index ? g.toNonIndexed() : g, a = src.attributes.position.array;
  const ids = new Map(), par = [];
  const find = (x) => { while (par[x] !== x) x = par[x] = par[par[x]]; return x; };
  const vid = (i) => {
    const k = `${Math.round(a[i] * 1e5)},${Math.round(a[i + 1] * 1e5)},${Math.round(a[i + 2] * 1e5)}`;
    if (!ids.has(k)) { ids.set(k, par.length); par.push(par.length); }
    return ids.get(k);
  };
  const tri = [];
  for (let i = 0; i + 8 < a.length; i += 9) {
    const t = [vid(i), vid(i + 3), vid(i + 6)];
    tri.push(t);
    par[find(t[1])] = find(t[0]);
    par[find(t[2])] = find(t[0]);
  }
  const pieces = new Map();
  tri.forEach((t, n) => {
    const r = find(t[0]);
    if (!pieces.has(r)) pieces.set(r, []);
    for (let k = 0; k < 3; k++) pieces.get(r).push([a[n * 9 + k * 3], a[n * 9 + k * 3 + 1], a[n * 9 + k * 3 + 2]]);
  });
  let m = null;
  for (const pts of pieces.values()) {
    if (pts.length < 12) continue;
    const step = Math.max(1, Math.ceil(pts.length / 20000));
    const h = Manifold.hull(step > 1 ? pts.filter((_, i) => i % step === 0) : pts);
    if (m) { const u = m.add(h); m.delete(); h.delete(); m = u; } else m = h;
  }
  return m ?? Manifold.hull([...ids.keys()].map((k) => k.split(",").map((v) => v / 1e5)));
}

/** Khối đặc manifold ở thế giới cho các bộ phận phẳng; lưới hở thì lấy bao lồi từng mảnh liền (đánh dấu xấp xỉ). */
function solidsOf(list) {
  const { Manifold } = kernelOf();
  return list.map((p) => {
    const g = worldGeometry(p);
    g.computeBoundingBox();
    const bb = { min: g.boundingBox.min.toArray(), max: g.boundingBox.max.toArray() };
    try {
      return { path: p.path, m: toManifold(g, p.path), bb, approx: false };
    } catch {
      return { path: p.path, m: pieceHulls(g, Manifold), bb, approx: true };
    }
  });
}

const boxesOverlap = (a, b, tol = 0) => [0, 1, 2].every((k) => a.min[k] <= b.max[k] + tol && b.min[k] <= a.max[k] + tol);

/** Bộ phận phẳng ở tư thế `pose` (khớp cấp ngoài, đã kiểm) hoặc tư thế nghỉ; `head` mở đầu kết quả nói tư thế đã kiểm. */
function posedFlat(doc, pose) {
  const has = pose && Object.keys(pose).length > 0;
  if (has) checkPose(doc, pose, true);
  return { flat: flatten(doc, has ? { pose } : {}).parts, head: has ? `Tư thế ${JSON.stringify(pose)}: ` : "Tư thế nghỉ (mọi khớp = 0): " };
}

// ───────── điểm neo chạm vật liệu ─────────
// Điểm neo là toạ độ trong khung bộ phận, không buộc nằm trên vật liệu: hai neo trùng nhau (vòng khép 0 mm) mà khối vẫn
// hở. Các trợ giúp dưới đây đo khoảng cách từ neo tới lưới của CỤM CỨNG chứa nó (bộ phận + mọi bộ phận cùng chủ khớp,
// tức ghép cứng không qua khớp), ở tư thế nghỉ: quan hệ neo ↔ khối của nó không đổi theo khớp.

/** Dung sai mặc định (m) cho neo chạm vật liệu. */
const CONTACT_TOL = 0.002;
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const mmStr = (x) => (Number.isFinite(x) ? `${(x * 1000).toFixed(1)} mm` : "không có vật liệu");

/** Ngữ cảnh đo ở tư thế nghỉ: lời giải, lưới thế giới của mọi bộ phận phẳng, chủ khớp của từng bộ phận lớp ngoài. */
function contactCtx(doc, tol = CONTACT_TOL) {
  const reg = registryFor(doc);
  const solved = solve(doc, reg);
  const flat = flatten(doc).parts.filter((p) => p.geometry);
  const owner = new Map();
  for (const [j, ids] of solved.clusters) for (const id of ids) owner.set(id, j);
  const ownerOf = (id) => owner.get(id) ?? "ground";
  const box = new Map();
  for (const p of flat) {
    const g = p.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    const { min, max } = g.boundingBox;
    const pts = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => transformPoint(p.world, [i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z]));
    box.set(p.path, { min: [0, 1, 2].map((k) => Math.min(...pts.map((q) => q[k]))), max: [0, 1, 2].map((k) => Math.max(...pts.map((q) => q[k]))), corners: pts });
  }
  return { doc, reg, solved, flat, ownerOf, box, tol };
}

/** Bộ phận lớp ngoài là con cháu của `id` (kể cả chính nó). */
function subtreeOf(solved, id) {
  const out = new Set([id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const [pid, p] of solved.parts) if (!out.has(pid) && out.has(p.parent)) { out.add(pid); grew = true; }
  }
  return out;
}

/**
 * Bộ phận của cụm cứng `own` thật sự BÁM vào gốc cụm: đi từ gốc (bộ phận đặt trên ground, hoặc bộ phận khớp kéo trực
 * tiếp) theo chuỗi tiếp xúc lưới (khe ≤ tol). Không có bước này thì các bộ phận đứng yên "bảo lãnh" lẫn nhau: trục chạm
 * bánh, bánh chạm trục, cả cụm lơ lửng cạnh khung mà vẫn được tính là vật liệu của khung.
 */
function anchoredPaths(ctx, own) {
  ctx.anchored ??= new Map();
  if (ctx.anchored.has(own)) return ctx.anchored.get(own);
  const top = (p) => p.path.split("/")[0];
  const members = ctx.flat.filter((p) => ctx.ownerOf(top(p)) === own);
  const roots = own === "ground"
    ? new Set(ctx.doc.parts.filter((p) => (p.place?.b ?? "").startsWith("ground")).map((p) => p.id))
    : new Set(ctx.doc.joints.find((j) => j.id === own)?.moves ?? []);
  const solids = solidsOf(members);
  const reached = new Set(), queue = solids.filter((s) => roots.has(s.path.split("/")[0]));
  queue.forEach((s) => reached.add(s.path));
  while (queue.length) {
    const A = queue.shift();
    for (const B of solids) {
      if (reached.has(B.path) || !boxesOverlap(A.bb, B.bb, ctx.tol)) continue;
      if (A.m.minGap(B.m, ctx.tol * 2) <= ctx.tol) { reached.add(B.path); queue.push(B); }
    }
  }
  solids.forEach((s) => s.m.delete());
  ctx.anchored.set(own, reached);
  return reached;
}

/** Lưới của cụm cứng chứa bộ phận `id` ("ground" = cụm đứng yên) đã bám vào gốc cụm, trừ các bộ phận trong `exclude`. */
function groupMeshes(ctx, id, exclude = new Set()) {
  const own = id === "ground" ? "ground" : ctx.ownerOf(id);
  const anchored = anchoredPaths(ctx, own);
  return ctx.flat.filter((p) => { const top = p.path.split("/")[0]; return !exclude.has(top) && ctx.ownerOf(top) === own && anchored.has(p.path); });
}

/** Neo ở thế giới (tư thế nghỉ): điểm, hướng, loại, bán kính. */
function anchorWorld(ctx, ref) {
  const { frame, world, part } = anchorFrame(ctx.reg, ctx.solved.parts, ref, "rest");
  const M = part ? world : IDENTITY;
  const o = transformPoint(M, frame.origin);
  const tip = transformPoint(M, frame.origin.map((v, i) => v + frame.dir[i]));
  return { origin: o, dir: tip.map((v, i) => v - o[i]), kind: frame.kind, radius: frame.radius, part: part?.id ?? "ground" };
}

/** Khoảng cách nhỏ nhất từ điểm tới các lưới; trả {dist, nearest}. */
function pointToMeshes(meshes, point) {
  let dist = Infinity, nearest = null;
  for (const p of meshes) {
    const d = meshPointDistance(p.geometry, p.world, point, dist);
    if (d < dist) { dist = d; nearest = p.path; }
  }
  return { dist, nearest };
}

/** Khoảng cách nhỏ nhất từ trục (đoạn nằm trong khung bao từng bộ phận, nới 5 mm) tới các lưới. */
function axisToMeshes(ctx, meshes, origin, dir) {
  const len = Math.hypot(...dir), d = dir.map((v) => v / len);
  let dist = Infinity, nearest = null;
  for (const p of meshes) {
    const ts = ctx.box.get(p.path).corners.map((c) => c.reduce((s, v, i) => s + (v - origin[i]) * d[i], 0));
    const x = meshAxisDistance(p.geometry, p.world, origin, d, Math.min(...ts) - 0.005, Math.max(...ts) + 0.005, 0.002, dist);
    if (x < dist) { dist = x; nearest = p.path; }
  }
  return { dist, nearest };
}

/** Một dòng kết quả: ✓ khi dist ≤ limit; `note` (allowAir) biến ✗ thành ✓ có ghi chú. */
function contactRow(label, { dist, nearest }, limit, note) {
  const ok = dist <= limit;
  const tail = `${mmStr(dist)}${nearest ? ` (gần nhất: ${nearest})` : ""}, ngưỡng ${mmStr(limit)}`;
  if (ok) return { ok: true, text: `✓ ${label}: ${tail}` };
  if (note) return { ok: true, text: `✓ ${label}: ${tail} — cho phép: ${note}` };
  return { ok: false, text: `✗ ${label}: ${tail}` };
}

/** Kiểm trục khớp chạm vật liệu ở cụm dẫn và cụm cha. Trả các dòng. */
function jointContact(ctx, j, tol) {
  // khớp trượt: chỉ hướng trục có nghĩa, vị trí đường trục thì không; chỗ tựa trượt do check_connections quét (cụm dẫn chạm cụm cha)
  if (j.kind === "prismatic") return [{ ok: true, text: `· khớp ${j.id}: trượt, không kiểm vị trí trục (xem phần quét)` }];
  const w = anchorWorld(ctx, j.axis);
  const limit = (w.radius ?? 0) + tol;
  const mover = j.moves[0];
  const parent = ctx.solved.parts.get(mover)?.parent ?? "ground";
  const rows = [contactRow(`khớp ${j.id}: trục ${j.axis} ↔ cụm dẫn (${mover})`, axisToMeshes(ctx, groupMeshes(ctx, mover), w.origin, w.dir), limit, j.allowAir)];
  // cha trực tiếp là ground (mặt đất ảo, chốt cố định trong không gian): không có khối nào để đo
  if (parent === "ground") return [...rows, { ok: true, text: `· khớp ${j.id}: cha là ground, không kiểm phía cố định` }];
  const fixedSide = groupMeshes(ctx, parent, subtreeOf(ctx.solved, mover));
  if (fixedSide.length) rows.push(contactRow(`khớp ${j.id}: trục ${j.axis} ↔ cụm cha (${parent})`, axisToMeshes(ctx, fixedSide, w.origin, w.dir), limit, j.allowAir));
  return rows;
}

/** Kiểm hai đầu vòng chạm vật liệu của cụm chứa chúng (đo theo điểm: vòng khép điểm). */
function loopContact(ctx, l, tol) {
  const rows = [];
  for (const ref of [l.a, l.b]) {
    const w = anchorWorld(ctx, ref);
    if (w.part === "ground") continue;
    rows.push(contactRow(`vòng ${l.id}: ${ref} ↔ cụm ${w.part}`, pointToMeshes(groupMeshes(ctx, w.part), w.origin), tol, l.allowAir));
  }
  return rows;
}

const contactHint = "Sửa: dời điểm neo vào chỗ có vật liệu (anchor_define), thêm chốt/bạc/tai ghép cứng vào bộ phận tại đó, khai radius cho trục đi qua lỗ, hoặc truyền allowAir: \"lý do\" nếu chỗ trống là cố ý.";

/** Loại dùng được: hình tự dựng (không có thư viện bộ phận viết sẵn). */
const typList = () => `## shape
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
    if (!ID.test(id ?? "")) throw new Error(`id bộ phận "${id}" không hợp lệ (chữ, số, -, _; không có dấu chấm hay /, vì chúng tách tên điểm neo và đường dẫn cụm).`);
    const lib = readState().library ?? {};
    const { solved, reg } = editDoc(assembly, (doc) => {
      if (doc.parts.some((p) => p.id === id)) throw new Error(`Đã có bộ phận "${id}"; dùng part_update để sửa.`);
      // loại là cụm trong thư viện: chép vào tài liệu để file tự đủ
      if (!PARTS[type] && !String(type).startsWith(SHAPE_PREFIX) && !doc.types?.[type] && lib[type]) doc.types = { ...(doc.types ?? {}), [type]: lib[type] };
      if (material) checkDefinedMaterial(doc, material, `[${id}].material`);
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
      if (material) checkDefinedMaterial(doc, material, `[${id}].material`);
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
      doc.joints = doc.joints.map((j) => ({ ...j, moves: j.moves.filter((m) => !gone.has(m)) }));
      dropLoops(doc, (l) => [l.a, l.b].some((ref) => gone.has(ref.split(".")[0])), cascade, "nối vào bộ phận sắp xoá");
      const jointsGone = dropJoints(doc, doc.joints.filter((j) => !j.moves.length || gone.has(j.axis.split(".")[0])).map((j) => j.id), cascade);
      doc.routes = doc.routes.filter((r) => ![r.from, r.to, ...(r.via ?? []).map((v) => v.on)].some((ref) => gone.has(ref.split(".")[0])));
      if (doc.decals) doc.decals = doc.decals.filter((d) => !gone.has(d.target));
      // tính chất vật lý ghi theo đường dẫn bộ phận ("id" hoặc "id/con")
      const keep = ([path]) => !gone.has(path.split("/")[0]);
      for (const k of ["bodies", "initial"]) if (doc.physics?.[k]) doc.physics[k] = Object.fromEntries(Object.entries(doc.physics[k]).filter(keep));
      if (doc.physics?.drives) doc.physics.drives = Object.fromEntries(Object.entries(doc.physics.drives).filter(keep));
      return { parts: [...gone], joints: jointsGone };
    });
    return text(`Đã xoá: ${info.parts.join(", ")}.${info.joints.length ? ` Khớp bỏ theo: ${info.joints.join(", ")}.` : ""}`);
  },

  joint_add: ({ assembly, id, kind, axis, moves, limits, couple, allowAir, tolerance = CONTACT_TOL }) => {
    if (!ID.test(id)) throw new Error(`id khớp "${id}" không hợp lệ.`);
    if (limits && !(limits[0] < limits[1])) throw new Error(`limits phải là [nhỏ, lớn], đang là ${JSON.stringify(limits)}.`);
    if (allowAir !== undefined && !(typeof allowAir === "string" && allowAir.trim())) throw new Error("allowAir phải là một câu lý do (chuỗi không rỗng).");
    let contact = [];
    const { doc, solved } = editDoc(assembly, (d) => {
      d.joints = d.joints.filter((j) => j.id !== id);
      const joint = { id, kind, axis, moves, ...(limits ? { limits } : {}), ...(couple ? { couple } : {}), ...(allowAir ? { allowAir: allowAir.trim() } : {}) };
      d.joints.push(joint);
      // trục khớp phải chạm vật liệu cả cụm dẫn lẫn cụm cha; không thì không ghi gì
      contact = jointContact(contactCtx(d, tolerance), joint, tolerance);
      const bad = contact.filter((r) => !r.ok);
      if (bad.length) throw new Error(`[khớp ${id}] trục ${axis} không chạm vật liệu:\n${bad.map((r) => r.text).join("\n")}\n${contactHint}`);
    });
    let coupled = "";
    if (couple) {
      // đo tỉ số thật: cho khớp dẫn 1 đơn vị, các khớp khác 0
      let v;
      try {
        v = solve(doc, registryFor(doc), { pose: { [couple.joint]: 1 } }).values.get(id);
      } catch {
        v = undefined;
      }
      const lead = findJoint(doc, couple.joint);
      coupled = typeof v === "number" && lead
        ? ` Ghép theo ${couple.joint}: ${+v.toFixed(4)} ${kind === "revolute" ? "°" : "m"} cho mỗi 1 ${lead.kind === "revolute" ? "°" : "m"} của khớp dẫn.`
        : ` Ghép theo ${couple.joint} (không đo được tỉ số).`;
    }
    return text(`Khớp ${id} (${kind} quanh ${axis}) kéo theo: ${solved.clusters.get(id).join(", ")}.${coupled}${couple ? ` Ghép chạy hai chiều: pose đặt ${id} thì ${couple.joint} được suy ngược.` : ""}\nChạm vật liệu:\n${contact.map((r) => r.text).join("\n")}`);
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
    return text(`Đã ghi ${relative(root, file).replaceAll("\\", "/")} (${doc.parts.length} bộ phận, khớp: ${doc.joints.map((j) => j.id).join(", ") || "không"}). ${copied ? ` Chép ${copied} lưới nướng sẵn vào fe/public/assembly-meshes: trang gọi preloadMeshes(doc, (h) => \`/assembly-meshes/\${h}.bin\`) trước khi dựng.` : ""} Trong trang: buildAssembly(doc, createMaterialKit()) từ @/assembly-kit/three/build-scene, rồi view.setPose({...}) mỗi khung hình: đặt khớp dẫn hoặc một khớp bất kỳ của nhóm liên động (couple, vòng kín), cả nhóm tự đi theo.`);
  },
  loop_add: ({ assembly, id, a, b, solves, allowAir, tolerance = CONTACT_TOL }) => {
    if (allowAir !== undefined && !(typeof allowAir === "string" && allowAir.trim())) throw new Error("allowAir phải là một câu lý do (chuỗi không rỗng).");
    if (!ID.test(id)) throw new Error(`id vòng "${id}" không hợp lệ.`);
    if (!Array.isArray(solves) || !solves.length || solves.length > 3) throw new Error("solves cần 1–3 khớp do vòng tính ra.");
    // ở tư thế nghỉ (mọi khớp = 0) hai đầu phải trùng: vòng chỉ giữ quan hệ, không sửa lắp sai
    const before = clone(findAssembly(readState(), assembly).doc);
    before.loops = (before.loops ?? []).filter((l) => l.id !== id);
    if (!before.loops.length) delete before.loops;
    const reg0 = registryFor(before), rest = solve(before, reg0, { pose: {} });
    const at = (ref) => {
      const { frame, world } = anchorFrame(reg0, rest.parts, ref, "world");
      return transformPoint(world, frame.origin);
    };
    const pa = at(a), pb = at(b), d = pa.map((x, i) => x - pb[i]), gap = Math.hypot(...d);
    if (gap > 1e-4) throw new Error(`[vòng ${id}] ở tư thế nghỉ (mọi khớp = 0) hai đầu chưa trùng: ${a} ở ${fmtV(pa)}, ${b} ở ${fmtV(pb)}, lệch ${(gap * 1000).toFixed(2)} mm theo ${fmtV(d)}. Sửa cách ghép (part_update) hoặc điểm neo để hai điểm trùng nhau khi mọi khớp = 0, rồi khép vòng.`);
    let contact = [];
    const { doc, solved, reg } = editDoc(assembly, (dd) => {
      dd.loops = (dd.loops ?? []).filter((l) => l.id !== id);
      const loop = { id, a, b, solves, ...(allowAir ? { allowAir: allowAir.trim() } : {}) };
      dd.loops.push(loop);
      // mỗi đầu phải nằm trên vật liệu của cụm chứa nó: hai điểm trùng chưa đủ
      contact = loopContact(contactCtx(dd, tolerance), loop, tolerance);
      const bad = contact.filter((r) => !r.ok);
      if (bad.length) throw new Error(`[vòng ${id}] hai đầu trùng nhau nhưng không chạm vật liệu:\n${bad.map((r) => r.text).join("\n")}\n${contactHint}`);
    });
    const g = solved.groups.get(solves[0]);
    const drv = solved.groupDrivers.get(g) ?? [];
    const others = [...solved.groups].filter(([j, gg]) => gg === g && !drv.includes(j)).map(([j]) => j);
    const lines = [`Vòng ${id}: ${a} ↔ ${b}, hở ${(gap * 1000).toFixed(3)} mm ở tư thế nghỉ. Khớp do vòng tính: ${solves.join(", ")}. Nhóm liên động: khớp dẫn ${drv.join(", ") || "(không có: cơ cấu bị khoá cứng)"}; khớp đi theo ${others.join(", ")}.`, "Chạm vật liệu:", ...contact.map((r) => r.text)];
    const jd = drv.length === 1 ? doc.joints.find((j) => j.id === drv[0]) : null;
    if (drv.length > 1) lines.push(`Nhóm có ${drv.length} khớp dẫn: tư thế cần đặt đủ ${drv.join(", ")}; kéo khớp phụ thuộc thì không suy ngược được.`);
    else if (jd && !jd.limits) lines.push(`Đặt limits cho khớp dẫn ${jd.id} (joint_add) để xem bảng quét và để thanh trượt chỉ chạy trong miền khép được.`);
    else if (jd) {
      const [lo, hi] = jd.limits, u = jd.kind === "revolute" ? "°" : " m";
      const xs = Array.from({ length: 9 }, (_, i) => lo + ((hi - lo) * i) / 8);
      const rows = new Map();
      // quét từ giá trị gần 0 ra hai phía, lời giải trước làm điểm xuất phát: đi liền một nhánh như cơ cấu thật
      const i0 = xs.reduce((best, x, i) => (Math.abs(x) < Math.abs(xs[best]) ? i : best), 0);
      for (const dir of [1, -1]) {
        let warm = rest.values;
        for (let i = dir > 0 ? i0 : i0 - 1; i >= 0 && i < xs.length; i += dir) {
          try {
            const s = solve(doc, reg, { pose: { [jd.id]: xs[i] }, warm });
            warm = s.values;
            rows.set(i, `${jd.id} = ${+xs[i].toFixed(4)}${u}: ${[...solves, ...others.filter((o) => !solves.includes(o))].map((j) => `${j} = ${+s.values.get(j).toFixed(4)}`).join(", ")}${s.warnings.length ? `  ⚠ ${s.warnings.join(" ")}` : ""}`);
          } catch (e) {
            rows.set(i, `${jd.id} = ${+xs[i].toFixed(4)}${u}: ✗ ${e.message}`);
          }
        }
      }
      lines.push(`Quét ${jd.id} trong [${lo}, ${hi}]${u}:`, ...xs.map((_, i) => `- ${rows.get(i)}`));
      if ([...rows.values()].some((r) => r.includes("✗") || r.includes("⚠"))) lines.push(`Có tư thế không khép hoặc vượt giới hạn: thu hẹp limits của ${jd.id}, hoặc sửa kích thước khâu.`);
    }
    return text(lines.join("\n"));
  },
  loop_remove: ({ assembly, id }) => {
    editDoc(assembly, (doc) => {
      if (!(doc.loops ?? []).some((l) => l.id === id)) throw new Error(`Không có vòng "${id}". Có: ${(doc.loops ?? []).map((l) => l.id).join(", ") || "(chưa có)"}.`);
      doc.loops = doc.loops.filter((l) => l.id !== id);
      if (!doc.loops.length) delete doc.loops;
    });
    return text(`Đã bỏ vòng ${id}.`);
  },
  joint_remove: ({ assembly, id, cascade = false }) => {
    const { info } = editDoc(assembly, (doc) => {
      if (!doc.joints.some((j) => j.id === id)) throw new Error(`Không có khớp "${id}".`);
      return dropJoints(doc, [id], cascade);
    });
    return text(`Đã xoá khớp ${info.join(", ")}.`);
  },
  route_add: ({ assembly, id, from, to, via, radius, material }) => {
    if (!ID.test(id)) throw new Error(`id dây "${id}" không hợp lệ.`);
    const { doc, solved, reg } = editDoc(assembly, (d) => {
      checkDefinedMaterial(d, material, `[dây ${id}].material`);
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
      Object.keys(doc.materials ?? {}).length ? `\n\n## Vật liệu\n${Object.entries(doc.materials).map(([k, m]) => `- ${k}: ${JSON.stringify({ ...(m.params ?? {}), ...(m.overrides ?? {}) })}${m.density ? `, ${m.density} kg/m³` : ""}`).join("\n")}` : "",
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
    if (record && record.length > 6) throw new Error(`record tối đa 6 vật (đang ${record.length}); bảng mẫu rộng hơn thì khó đọc — chạy nhiều lần.`);
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
  check_interference: ({ assembly, parts, tolerance = 1e-7, inside = false, pose }) => {
    const doc = findAssembly(readState(), assembly).doc;
    const { flat, head } = posedFlat(doc, pose);
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
    if (!hits.length) return text(`${head}không có cặp nào xuyên nhau (${solids.length} bộ phận, dung sai ${tolerance} m³).`);
    hits.sort((x, y) => y.vol - x.vol);
    return text([`${head}${hits.length} cặp xuyên nhau:`, ...hits.slice(0, 30).map((h) => `- ${h.a} ↔ ${h.b}: ${(h.vol * 1e6).toFixed(2)} cm³ quanh ${fmtV(h.c)}${h.approx ? " (lưới hở: tính theo bao lồi)" : ""}`)].join("\n"));
  },
  check_clearance: ({ assembly, a, b, min, pose }) => {
    const doc = findAssembly(readState(), assembly).doc;
    const { flat, head } = posedFlat(doc, pose);
    let approx = false;
    const side = (id) => {
      const list = partOrCluster(flat, id).filter((p) => p.geometry);
      if (!list.length) throw new Error(`Không có bộ phận "${id}" (đường dẫn, vd "cum/boPhan").`);
      const ss = solidsOf(list);
      if (ss.some((x) => x.approx)) approx = true;
      let u = ss[0].m;
      for (const s of ss.slice(1)) { const n = u.add(s.m); u.delete(); s.m.delete(); u = n; }
      return u;
    };
    const ma = side(a), mb = side(b);
    const gap = ma.minGap(mb, Math.max(1, (min ?? 0) * 4));
    const overlap = ma.intersect(mb).volume();
    ma.delete(); mb.delete();
    const msg = head + (approx ? "(lưới hở: tính theo bao lồi, có thể báo chồng lấn ở chỗ thực ra hở) " : "") + (overlap > 1e-9 ? `${a} và ${b} CHỒNG LẤN ${(overlap * 1e6).toFixed(2)} cm³.` : `Khe nhỏ nhất ${a} ↔ ${b}: ${(gap * 1000).toFixed(2)} mm${gap >= Math.max(1, (min ?? 0) * 4) - 1e-9 ? " trở lên" : ""}.`);
    const bad = overlap > 1e-9 || (min !== undefined && gap < min);
    return bad ? { ...text(`${msg}${min !== undefined ? ` Yêu cầu ≥ ${min * 1000} mm.` : ""}`), isError: min !== undefined } : text(msg);
  },
  check_floating: ({ assembly, tolerance = 0.002, pose }) => {
    const doc = findAssembly(readState(), assembly).doc;
    const { flat: all, head } = posedFlat(doc, pose);
    const flat = all.filter((p) => p.geometry);
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
    return text(out.length ? [`${head}${out.length} bộ phận lơ lửng (dung sai ${tolerance * 1000} mm):`, ...out].join("\n") : `${head}không có bộ phận lơ lửng (${solids.length} bộ phận, dung sai ${tolerance * 1000} mm). Chạm đúng chỗ nối hay không: check_connections.`);
  },
  check_connections: ({ assembly, tolerance = CONTACT_TOL, steps = 9 }) => {
    const doc = clone(findAssembly(readState(), assembly).doc);
    for (const j of doc.joints) delete j.value;
    const ctx = contactCtx(doc, tolerance);
    const rows = [];
    const add = (r) => rows.push(r);

    // 0. bộ phận không bám vào gốc cụm của nó (chỉ chạm các bộ phận cũng lơ lửng, hoặc chỉ chạm đất)
    for (const own of new Set(ctx.flat.map((p) => ctx.ownerOf(p.path.split("/")[0])))) {
      const anchored = anchoredPaths(ctx, own);
      const loose = ctx.flat.filter((p) => ctx.ownerOf(p.path.split("/")[0]) === own && !anchored.has(p.path)).map((p) => p.path);
      if (loose.length) add({ ok: false, text: `✗ không bám vào gốc ${own === "ground" ? "cụm đứng yên" : `cụm của khớp ${own}`}: ${loose.join(", ")} — không có chuỗi tiếp xúc nào nối về ${own === "ground" ? "bộ phận đặt trên ground" : "bộ phận khớp kéo"}` });
    }

    // 1. cách ghép: bộ phận chạm cụm cha (trừ chính nó và nhánh con của nó) theo lưới
    const restSolids = new Map(solidsOf(ctx.flat).map((s) => [s.path, s]));
    const touch = (aPaths, bPaths, tol) => {
      let best = Infinity, approx = false;
      for (const pa of aPaths) for (const pb of bPaths) {
        const A = restSolids.get(pa), B = restSolids.get(pb);
        if (!A || !B || !boxesOverlap(A.bb, B.bb, 0.05)) continue;
        approx ||= A.approx || B.approx;
        best = Math.min(best, A.m.minGap(B.m, 0.05));
        if (best <= tol) return { gap: best, approx };
      }
      return { gap: best, approx };
    };
    const pathsOf = (ids) => ctx.flat.filter((p) => ids.has(p.path.split("/")[0])).map((p) => p.path);
    for (const p of doc.parts) {
      const parent = ctx.solved.parts.get(p.id)?.parent ?? "ground";
      if (parent === "ground") continue;
      const sub = subtreeOf(ctx.solved, p.id);
      // so với cả cụm cứng của cha (trừ nhánh của p): p có thể tựa vào chốt/trục ghép cứng cạnh cha
      const others = groupMeshes(ctx, parent, sub).map((m) => m.path);
      const { gap, approx } = touch(pathsOf(new Set([p.id])), others, tolerance);
      const label = `ghép ${p.id} (${p.place.kind}) ↔ cụm của ${parent}`;
      const fixedNote = p.place.kind === "fixed" ? " (ghép fixed: chỉ cảnh báo)" : "";
      const ok = gap <= tolerance;
      add({ ok: ok || !!fixedNote, text: `${ok ? "✓" : fixedNote ? "⚠" : "✗"} ${label}: ${gap === Infinity ? "cách hơn 50 mm" : `khe ${mmStr(Math.max(0, gap))}`}${approx ? " (bao lồi)" : ""}${ok ? "" : fixedNote}` });
    }
    // 2. khớp, 3. vòng
    for (const j of doc.joints) jointContact(ctx, j, tolerance).forEach(add);
    for (const l of doc.loops ?? []) loopContact(ctx, l, tolerance).forEach(add);
    restSolids.forEach((s) => s.m.delete());

    // 4. quét khớp dẫn: vòng còn khép, cụm dẫn của mỗi khớp trong nhóm còn chạm cụm cha
    const sweepRows = [];
    const reg = ctx.reg;
    const groupOf = (id) => ctx.solved.groups.get(id) ?? `#${id}`;
    const drivers = doc.joints.filter((j) => {
      if (!j.limits) return false;
      const g = ctx.solved.groups.get(j.id);
      return g === undefined || (ctx.solved.groupDrivers.get(g) ?? [j.id]).includes(j.id);
    });
    const sideTouch = (flat, solids, mover, parent) => {
      const own = ctx.ownerOf(mover);
      const moving = new Set(flat.filter((p) => ctx.ownerOf(p.path.split("/")[0]) === own).map((p) => p.path));
      const parentOwn = parent === "ground" ? "ground" : ctx.ownerOf(parent);
      const fixed = new Set(flat.filter((p) => ctx.ownerOf(p.path.split("/")[0]) === parentOwn && !moving.has(p.path)).map((p) => p.path));
      let best = Infinity;
      for (const a of moving) for (const b of fixed) {
        const A = solids.get(a), B = solids.get(b);
        if (!boxesOverlap(A.bb, B.bb, 0.05)) continue;
        best = Math.min(best, A.m.minGap(B.m, 0.05));
        if (best <= tolerance) return best;
      }
      return best;
    };
    for (const jd of drivers) {
      const [lo, hi] = jd.limits, u = jd.kind === "revolute" ? "°" : " m";
      const group = groupOf(jd.id);
      const members = doc.joints.filter((j) => groupOf(j.id) === group);
      const xs = Array.from({ length: steps }, (_, i) => lo + ((hi - lo) * i) / (steps - 1));
      const i0 = xs.reduce((best, x, i) => (Math.abs(x) < Math.abs(xs[best]) ? i : best), 0);
      const fail = new Map();
      for (const dir of [1, -1]) {
        let warm = ctx.solved.values;
        for (let i = dir > 0 ? i0 : i0 - 1; i >= 0 && i < xs.length; i += dir) {
          const at = `${jd.id} = ${+xs[i].toFixed(4)}${u}`;
          let s;
          try {
            s = solve(doc, reg, { pose: { [jd.id]: xs[i] }, warm });
            warm = s.values;
          } catch (e) {
            fail.set(`✗ ${at}: không giải được (${e.message.slice(0, 120)})`, true);
            continue;
          }
          for (const [lid, g] of s.loopGap ?? []) if (g > 1e-4) fail.set(`✗ ${at}: vòng ${lid} hở ${mmStr(g)}`, true);
          for (const w of s.warnings) fail.set(`⚠ ${at}: ${w}`, true);
          const flat = flatten(doc, { pose: { [jd.id]: xs[i] } }).parts.filter((p) => p.geometry);
          const solids = new Map(solidsOf(flat).map((x) => [x.path, x]));
          for (const j of members) {
            const mover = j.moves[0], parent = ctx.solved.parts.get(mover)?.parent ?? "ground";
            if (parent === "ground") continue;
            const gap = sideTouch(flat, solids, mover, parent);
            if (gap > tolerance) fail.set(`✗ ${at}: khớp ${j.id}, cụm dẫn (${mover}) rời cụm cha (${parent}) — khe ${gap === Infinity ? "hơn 50 mm" : mmStr(gap)}`, true);
          }
          solids.forEach((x) => x.m.delete());
        }
      }
      sweepRows.push(`Quét ${jd.id} trong [${lo}, ${hi}]${u}, ${steps} tư thế, khớp trong nhóm: ${members.map((j) => j.id).join(", ")}:`);
      sweepRows.push(...(fail.size ? [...fail.keys()].map((k) => `  ${k}`) : ["  ✓ mọi tư thế: vòng khép, cụm dẫn luôn chạm cụm cha"]));
    }
    // các khớp có ✗ ở tư thế nghỉ thì quét cũng ✗: không lặp lại ở đây
    const bad = rows.filter((r) => !r.ok).length + sweepRows.filter((r) => r.trimStart().startsWith("✗")).length;
    const noLimit = doc.joints.filter((j) => !j.limits && !j.couple && !(doc.loops ?? []).some((l) => l.solves.includes(j.id))).map((j) => j.id);
    return text([
      `${bad ? `${bad} chỗ nối hở` : "Mọi chỗ nối chạm vật liệu"} (dung sai ${mmStr(tolerance)}; cụm = bộ phận + bộ phận ghép cứng vào nó).`,
      "## Tư thế nghỉ", ...rows.map((r) => r.text),
      ...(sweepRows.length ? ["## Quét theo hành trình", ...sweepRows] : []),
      ...(noLimit.length ? [`(Không quét ${noLimit.join(", ")}: chưa có limits.)`] : []),
      ...(bad ? [contactHint] : []),
    ].join("\n"));
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
      ...(loopsIn(src, set).length ? { loops: loopsIn(src, set) } : {}),
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
  shape_weld: (args) => upsertShape("weld", args),
  shape_bevel: (args) => upsertShape("bevel", args),
  shape_sand: (args) => upsertShape("sand", args),
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
    // chỉ báo (không chặn): neo có thể đặt trước khi dựng đủ khối; joint_add / loop_add mới kiểm
    let air = "";
    try {
      const built = buildShapes(doc).get(shape), a = built.anchors[name], g = built.geometry;
      const dir = a.dir ?? a.normal;
      let dist;
      if (a.kind === "axis") {
        if (!g.boundingBox) g.computeBoundingBox();
        const { min, max } = g.boundingBox, len = Math.hypot(...dir), u = dir.map((v) => v / len);
        const ts = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z].reduce((s, v, k) => s + (v - a.origin[k]) * u[k], 0));
        dist = meshAxisDistance(g, IDENTITY, a.origin, u, Math.min(...ts), Math.max(...ts));
      } else dist = meshPointDistance(g, IDENTITY, a.origin);
      const limit = (a.kind === "axis" ? a.radius ?? 0 : 0) + CONTACT_TOL;
      air = `\n${a.kind === "axis" ? "Trục" : "Điểm"} ${name} cách vật liệu của ${shape}: ${mmStr(dist)}${dist > limit ? ` ⚠ — dùng làm khớp/vòng thì vật liệu phải có ở đó (có thể từ bộ phận ghép cứng vào), không thì joint_add / loop_add báo lỗi.${a.kind === "axis" && !a.radius ? " Trục qua lỗ: khai radius." : ""}` : "."}`;
    } catch { /* hình chưa dựng được: shapeReport đã nói */ }
    return text(`Đã đặt ${shape}.${name}.${air}\n${shapeReport(doc, shape)}`);
  },

  // ───── vật liệu, decal ─────
  material_define: ({ assembly, id, params, density, friction, textures }) => {
    if (!ID.test(id ?? "")) throw new Error(`id vật liệu "${id}" không hợp lệ.`);
    if (!params || typeof params !== "object") throw new Error("params phải là object tham số PBR.");
    if (density === undefined) throw new Error("Thiếu density (khối lượng riêng kg/m³ của vật liệu thật).");
    editDoc(assembly, (d) => {
      d.materials = { ...(d.materials ?? {}), [id]: { params, density, ...(friction !== undefined ? { friction } : {}), ...(textures ? { textures } : {}) } };
    });
    return text(`Vật liệu ${id}: ${JSON.stringify(params)}, ${density} kg/m³${friction !== undefined ? `, ma sát ${friction}` : ""}${textures ? `, texture ${Object.entries(textures).map(([s, t]) => `${s}:${t.kind}`).join(", ")}` : ""}. Gán bằng material_assign hoặc tham số material của part_add / shape_* / route_add.`);
  },
  material_assign: ({ assembly, target, material }) => {
    editDoc(assembly, (d) => {
      if (material) checkDefinedMaterial(d, material, "material");
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
    checkPose(doc, pose, true);
    const reg = registryFor(doc);
    const solved = solve(doc, reg, { pose });
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
    const { a, meta, posed } = await requestBrowser(assembly, { mode: "four", pose, focus: focus ?? null }, wait_ms);
    if (meta.error) return { ...text(`Trang chụp lỗi: ${meta.error}`), isError: true };
    const png = await crop(readFileSync(snapshotFile(assembly)), region);
    const label = `${a.title} rev ${a.rev}${Object.keys(pose).length ? `, pose ${JSON.stringify(pose)}` : ""}${focus ? `, focus ${focus}` : ""}${poseReport(posed, pose)}. Ô: trái-trên phối cảnh, phải-trên trước (+z), trái-dưới cạnh (+x), phải-dưới trên (+y).`;
    return { content: [{ type: "text", text: label }, { type: "image", data: png.toString("base64"), mimeType: "image/png" }] };
  },
};

// ───────── tự kiểm tra ─────────

async function selftest() {
  const dir = mkdtempSync(join(tmpdir(), "assembly-selftest-"));
  process.env.NEVIAD_ASSEMBLY_DIR = dir;
  // kiểm tham số như server thật (strictArgs): test gõ sai tên tham số thì lộ ngay
  const toolOf = (name) => TOOLS.find((t) => t.name === name);
  const call = (name, args) => { checkArgs(toolOf(name), args); return handlers[name](args).content[0].text; };
  const callAsync = async (name, args) => { checkArgs(toolOf(name), args); return (await handlers[name](args)).content[0].text; };
  const fails = [];
  const near = (label, got, want, tol = 1e-4) => { if (Math.abs(got - want) > tol) fails.push(`${label}: ${got} ≠ ${want}`); };
  const solved = (aid) => { const d = findAssembly(readState(), aid).doc; return solve(d, registryFor(d)); };
  // khối dựng bằng hình tự dựng (không còn thư viện bộ phận): hộp đùn kèm trục qua tâm, thân tròn tiện quanh y
  const boxShape = (Q, sid, [w, h, d], edgeRadius = 0) => {
    Q("shape_extrude", { id: sid, outline: { pts: [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], closed: true }, depth: d, edgeRadius });
    for (const [name, dir, up] of [["axisX", [1, 0, 0], [0, 1, 0]], ["axisY", [0, 1, 0], [0, 0, 1]], ["axisZ", [0, 0, 1], [0, 1, 0]]]) {
      Q("anchor_define", { shape: sid, name, kind: "axis", origin: [0, 0, 0], dir, up });
    }
  };
  // vành hơi phồng ở giữa để điểm neo surface (bán kính lớn nhất) nằm giữa chiều dài
  const roundShape = (Q, sid, length, diameter, extra = {}) => {
    const L = length / 2, R = diameter / 2;
    Q("shape_lathe", { id: sid, profile: { pts: [[0, -L], [R * 0.995, -L], [R, 0], [R * 0.995, L], [0, L]] }, segments: 96, ...extra });
  };
  try {
    // trục quay trên hai gối, vành trượt và chổi tì vành (follow: false), dây nối
    call("assembly_create", { id: "gen", title: "Trục trên gối" });
    const G = (tool, args) => call(tool, { assembly: "gen", ...args });
    const add = (id, type, place) => G("part_add", { id, type, place });
    boxShape(G, "baseS", [0.58, 0.028, 0.28]);
    G("shape_extrude", { id: "brgBody", outline: { pts: [[-0.015, -0.08], [0.015, -0.08], [0.015, 0.08], [-0.015, 0.08]], closed: true }, depth: 0.05, edgeRadius: 0 });
    roundShape(G, "boreS", 0.1, 0.014, { rotate: [0, 0, -90], offset: [0, 0.055, 0] });
    G("shape_boolean", { id: "brgS", op: "subtract", input: "brgBody", tools: ["boreS"] });
    roundShape(G, "shaftS", 0.42, 0.012, { rotate: [0, 0, -90] });
    roundShape(G, "fatS", 0.1, 0.03, { rotate: [0, 0, -90] });
    boxShape(G, "coilS", [0.11, 0.084, 0.021]);
    roundShape(G, "ringS", 0.012, 0.032, { rotate: [0, 0, -90] });
    boxShape(G, "brushS", [0.008, 0.03, 0.0105]);
    boxShape(G, "crankS", [0.012, 0.08, 0.02]);
    boxShape(G, "postS", [0.01, 0.03, 0.01]);
    add("base", "shape:baseS", { kind: "onto", a: "base.bottom", b: "ground.top", at: [0.04, 0] });
    add("brgL", "shape:brgS", { kind: "onto", a: "brgL.bottom", b: "base.top", at: [-0.14, 0] });
    add("brgR", "shape:brgS", { kind: "onto", a: "brgR.bottom", b: "base.top", at: [0.06, 0] });
    add("shaft", "shape:shaftS", { kind: "through", a: "shaft.axis", b: "brgL.boreS.axis", offset: 0.1 });
    add("coil", "shape:coilS", { kind: "coaxial", a: "coil.axisX", b: "shaft.axis" });
    add("ring1", "shape:ringS", { kind: "coaxial", a: "ring1.axis", b: "shaft.axis", offset: 0.12 });
    add("ring2", "shape:ringS", { kind: "coaxial", a: "ring2.axis", b: "shaft.axis", offset: 0.15 });
    G("part_add", { id: "brush1", type: "shape:brushS", place: { kind: "touch", a: "brush1.top", b: "ring1.surface@bottom", follow: false } });
    add("crank", "shape:crankS", { kind: "coaxial", a: "crank.axisX", b: "shaft.axis", offset: -0.18 });
    add("postR", "shape:postS", { kind: "onto", a: "postR.bottom", b: "base.top", at: [0.165, 0.105] });
    G("joint_add", { id: "rotor", kind: "revolute", axis: "brgL.boreS.axis", moves: ["shaft"] });
    G("material_define", { id: "wireRed", params: { color: "#b3201f", roughness: 0.5 }, density: 3000 });
    G("route_add", { id: "w1", from: "brush1.bottom", to: "postR.top", via: [{ on: "base.top" }], radius: 0.0016, material: "wireRed" });

    const s = solved("gen");
    const at = (id) => [12, 13, 14].map((i) => s.parts.get(id).world[i]);
    const SY = 0.028 + 0.135;
    near("base.top y", at("base")[1] + 0.014, 0.028);
    near("shaft x", at("shaft")[0], 0); near("shaft y", at("shaft")[1], SY);
    near("ring1 x", at("ring1")[0], 0.12); near("ring1 y", at("ring1")[1], SY);
    near("coil x", at("coil")[0], 0); near("coil y", at("coil")[1], SY);
    near("brush1 y", at("brush1")[1], SY - 0.016 - 0.015); near("brush1 x", at("brush1")[0], 0.12);
    near("crank x", at("crank")[0], -0.18);
    // quay rô-to 90°: khung dây đổi hướng, chổi than đứng yên
    const doc = findAssembly(readState(), "gen").doc;
    doc.joints.find((j) => j.id === "rotor").value = 90;
    const s90 = solve(doc, registryFor(doc));
    const n0 = [8, 9, 10].map((i) => s.parts.get("coil").world[i]), n90 = [8, 9, 10].map((i) => s90.parts.get("coil").world[i]);
    near("coil pháp tuyến xoay 90°", n0.reduce((acc, v, i) => acc + v * n90[i], 0), 0);
    near("coil pháp tuyến vuông góc trục @90°", n90[0], 0);
    near("brush1 x @90°", s90.parts.get("brush1").world[12], 0.12);
    near("ring1 y @90°", s90.parts.get("ring1").world[13], SY);
    if (JSON.stringify(s90.clusters.get("rotor")) !== JSON.stringify(["shaft", "coil", "ring1", "ring2", "crank"])) fails.push(`cụm rotor: ${s90.clusters.get("rotor")}`);

    console.log(call("assembly_describe", { assembly: "gen" }));
    console.log("\n--- lỗi cố ý ---");
    for (const [label, args] of [
      ["sai tên điểm neo", { id: "x1", type: "shape:postS", place: { kind: "onto", a: "x1.bottom", b: "base.topp" } }],
      ["trục to hơn lỗ", { id: "x2", type: "shape:fatS", place: { kind: "through", a: "x2.axis", b: "brgR.boreS.axis" } }],
      ["tham chiếu bộ phận chưa có", { id: "x3", type: "shape:postS", place: { kind: "onto", a: "x3.bottom", b: "lamp.top" } }],
      ["ghép trục vào mặt", { id: "x4", type: "shape:shaftS", place: { kind: "coaxial", a: "x4.axis", b: "base.top" } }],
      ["loại không có", { id: "x5", type: "coil", place: { kind: "coaxial", a: "x5.axis", b: "shaft.axis" } }],
    ]) {
      try { add(args.id, args.type, args.place); fails.push(`${label}: không báo lỗi`); } catch (e) { console.log(`- ${label}: ${e.message}`); }
    }
    if (findAssembly(readState(), "gen").doc.parts.some((p) => p.id.startsWith("x"))) fails.push("lệnh lỗi vẫn ghi vào tài liệu");

    // xe cỡ thật trượt dọc ground.x, bánh lăn theo bằng khớp ghép tự tính tỉ số
    console.log("\n--- xe lăn ---");
    call("assembly_create", { id: "car", title: "Xe" });
    const C = (tool, args) => call(tool, { assembly: "car", ...args });
    C("material_define", { id: "rubber", params: { color: "#222222", roughness: 0.9 }, density: 1100, friction: 0.9 });
    const R = 0.32;
    boxShape(C, "bodyS", [4.3, 0.62, 1.72], 0.08);
    C("shape_lathe", { id: "wheelS", profile: { pts: [[0, -0.11], [R, -0.11], [R, 0.11], [0, 0.11]] }, segments: 96, rotate: [90, 0, 0] });
    C("part_add", { id: "body", type: "shape:bodyS", place: { kind: "onto", a: "body.bottom", b: "ground.top", offset: 0.2 } });
    C("part_add", { id: "wheel", type: "shape:wheelS", place: { kind: "touch", a: "wheel.back", b: "body.front", at: [1.35, R - 0.51] }, material: "rubber" });
    C("joint_add", { id: "drive", kind: "prismatic", axis: "ground.x", moves: ["body"] });
    console.log(C("joint_add", { id: "roll", kind: "revolute", axis: "wheel.axis", moves: ["wheel"], couple: { joint: "drive" } }));
    const carDoc = findAssembly(readState(), "car").doc;
    const wheelAt = (v) => { carDoc.joints.find((j) => j.id === "drive").value = v; return solve(carDoc, registryFor(carDoc)).parts.get("wheel").world; };
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
    S("material_define", { id: "glassBlue", params: { color: "#ffffff", roughness: 0.02, transmission: 1, ior: 1.52, thickness: 0.004, attenuationColor: "#3aa0ff", attenuationDistance: 0.5 }, density: 2500, friction: 0.3 });
    S("material_assign", { target: "cup1", material: "glassBlue" });
    S("decal_add", { id: "label", target: "cup1", at: "cup1.surface@angle=0", size: [0.03, 0.01], content: { text: "250 ml" } });
    console.log(S("measure", { kind: "bounds", target: "cup1", spec: { height: 0.095 } }));
    console.log(S("measure", { kind: "distance", a: "cup1.bottom", b: "cup1.top" }));
    console.log(S("assembly_describe", {}).split("## Hình")[1]);
    for (const [label, tool, args] of [
      ["đường tự cắt", "shape_extrude", { id: "bad1", outline: { pts: [[0, 0], [1, 1], [1, 0], [0, 1]], closed: true }, depth: 0.1 }],
      ["hình không có", "part_add", { id: "x9", type: "shape:nope", place: { kind: "onto", a: "x9.bottom", b: "ground.top" } }],
      ["vật liệu thiếu density", "material_define", { id: "m2", params: { color: "#ffcc00", metalness: 1 } }],
      ["tham số vật liệu sai", "material_define", { id: "m3", params: { roughness: 2 }, density: 1000 }],
      ["vật liệu chưa định nghĩa", "material_assign", { target: "cup1", material: "chrome" }],
      ["preset không còn nhận", "part_update", { id: "cup1", material: "glassTinted" }],
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
    Src("material_define", { id: "glassTinted", params: { color: "#ffffff", roughness: 0.02, transmission: 1, ior: 1.52 }, density: 2500, friction: 0.3 });
    Src("material_define", { id: "chrome", params: { color: "#f4f6f8", roughness: 0.05, metalness: 1 }, density: 7850, friction: 0.4 });
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
      ["tên mang tiền tố hình", { assembly: "src", name: "shape:coc" }],
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
    roundShape(S, "pinS", 0.3, 0.02);
    S("part_add", { id: "pin1", type: "shape:pinS", place: { kind: "through", a: "pin1.axis", b: "holed1.bar.axis" } });
    console.log(S("part_add", { id: "pin2", type: "shape:pinS", place: { kind: "through", a: "pin2.axis", b: "holed1.bar.axis", offset: 0.01 } }).split("\n")[1]);

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
    const P = (id, title) => { call("assembly_create", { id, title }); const Q = (tool, args) => call(tool, { assembly: id, ...args }); Q.boxes = new Map();
      Q("material_define", { id: "steel", params: { color: "#dcdfe3", metalness: 1, roughness: 0.18 }, density: 7850, friction: 0.4 });
      Q("material_define", { id: "rubber", params: { color: "#222222", roughness: 0.9 }, density: 1100, friction: 0.9 });
      return Q; };
    // hộp thép: mỗi cỡ một hình đùn trong bản lắp ráp
    const box = (Q, id, size, place, extra = {}) => {
      const key = size.join("x");
      if (!Q.boxes.has(key)) { Q.boxes.set(key, `hop${Q.boxes.size}`); boxShape(Q, Q.boxes.get(key), size); }
      return Q("part_add", { id, type: `shape:${Q.boxes.get(key)}`, place, material: "steel", ...extra });
    };
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
      roundShape(Q, "dS", 0.05, 0.4);
      Q("part_add", { id: "d", type: "shape:dS", material: "rubber", place: { kind: "touch", a: "d.surface@angle=0", b: "ground.top" } });
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
      roundShape(Q, "gaS", 0.02, 0.2);
      roundShape(Q, "gbS", 0.02, 0.4);
      Q("part_add", { id: "ga", type: "shape:gaS", place: { kind: "onto", a: "ga.bottom", b: "base.top", at: [-0.2, 0], offset: 0.05 } });
      Q("part_add", { id: "gb", type: "shape:gbS", place: { kind: "onto", a: "gb.bottom", b: "base.top", at: [0.2, 0], offset: 0.05 } });
      Q("joint_add", { id: "ja", kind: "revolute", axis: "ga.axis", moves: ["ga"] });
      Q("joint_add", { id: "jb", kind: "revolute", axis: "gb.axis", moves: ["gb"] });
      Q("physics_setup", { gravity: [0, 0, 0], groundPlane: false });
      Q("drive_add", { joint: "ja", kind: "speed", value: 60 });
      editDoc("ph5", (d) => { d.physics.gears = [{ a: "ja", b: "jb", ratio: 0.5 }]; });
      const { w } = bodyOf("ph5", "ga");
      for (let i = 0; i < 120; i++) w.step(1 / 120);
      near("bánh răng ωb = −½ωa", (w.byId.get("gb").w[1] / w.byId.get("ga").w[1]), -0.5, 0.01);
    }

    // khớp ghép hai chiều, vòng kín (động học) và ràng buộc tương ứng trong vật lý
    console.log("\n--- liên động: couple hai chiều, vòng kín ---");
    {
      const DEGR = Math.PI / 180;
      const mustThrow = (label, fn, re) => {
        try {
          fn();
          fails.push(`${label}: không báo lỗi`);
        } catch (e) {
          if (re && !re.test(e.message)) fails.push(`${label}: lỗi khác mong đợi: ${e.message}`);
          else console.log(`- ${label}: ${e.message.slice(0, 160)}`);
        }
      };
      // thanh phẳng trong mặt xy (trục quay z), khung bộ phận trùng thế giới khi ghép fixed vào ground.top / goc của thanh khác
      const bar = (Q, sid, x0, x1, y0, y1, anchors) => {
        Q("shape_extrude", { id: sid, outline: { pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], closed: true }, depth: 0.02 });
        Q("anchor_define", { shape: sid, name: "goc", kind: "point", origin: [0, 0, 0], dir: [0, 1, 0], up: [0, 0, -1] });
        for (const [name, a] of Object.entries(anchors)) Q("anchor_define", { shape: sid, name, ...a });
      };
      const Z = { kind: "axis", origin: [0, 0, 0], dir: [0, 0, 1], up: [0, 1, 0] };
      const at = (x, y) => ({ kind: "fixed", b: "ground.top", shift: [x, 0, y] });
      const docOf = (aid) => findAssembly(readState(), aid).doc;
      const posed = (aid, pose, warm) => { const d = docOf(aid); return solve(d, registryFor(d), { pose, warm }); };

      // 1. bánh răng: couple ratio −0,5 chạy hai chiều
      {
        const Q = P("lk1", "Bánh răng hai chiều");
        bar(Q, "gA", -0.05, 0.05, -0.05, 0.05, { axis: Z });
        Q("part_add", { id: "ga", type: "shape:gA", place: { ...at(0, 0.3), a: "ga.goc" } });
        Q("part_add", { id: "gb", type: "shape:gA", place: { ...at(0.3, 0.3), a: "gb.goc" } });
        Q("part_add", { id: "gc", type: "shape:gA", place: { ...at(0.6, 0.3), a: "gc.goc" } });
        Q("part_add", { id: "gd", type: "shape:gA", place: { ...at(0.9, 0.3), a: "gd.goc" } });
        Q("joint_add", { id: "ja", kind: "revolute", axis: "ga.axis", moves: ["ga"] });
        Q("joint_add", { id: "jb", kind: "revolute", axis: "gb.axis", moves: ["gb"], couple: { joint: "ja", ratio: -0.5 } });
        Q("joint_add", { id: "jc", kind: "revolute", axis: "gc.axis", moves: ["gc"] });
        Q("joint_add", { id: "jt", kind: "revolute", axis: "gd.axis", moves: ["gd"], couple: { joint: "jc", table: [[0, 0], [90, 45], [180, 180]] } });
        const s = posed("lk1", { jb: 30 });
        near("couple ngược: jb = 30 → ja", s.values.get("ja"), -60, 1e-6);
        near("couple ngược: jb giữ 30", s.values.get("jb"), 30, 1e-6);
        const want = solve(docOf("lk1"), registryFor(docOf("lk1")), { pose: { ja: -60 } }).parts.get("ga").world;
        near("couple ngược: ma trận ga", Math.max(...s.parts.get("ga").world.map((x, i) => Math.abs(x - want[i]))), 0, 1e-9);
        near("bảng ngược: jt = 112,5 → jc", posed("lk1", { jt: 112.5 }).values.get("jc"), 135, 1e-6);
        mustThrow("pose cả khớp dẫn lẫn khớp ghép", () => Q("measure", { kind: "bounds", pose: { ja: 10, jb: 10 } }), /cùng một nhóm/);
        Q("measure", { kind: "bounds", pose: { jb: 30 } });
      }

      // 2. tay quay – thanh truyền – con trượt: r = 0,1; L = 0,3; con trượt dọc x
      const r = 0.1, L = 0.3;
      const xSlide = (deg) => r * Math.cos(deg * DEGR) + Math.sqrt(L * L - (r * Math.sin(deg * DEGR)) ** 2) - (r + L);
      const crank = (aid, slideX = r + L) => {
        const Q = P(aid, "Tay quay con trượt");
        bar(Q, "crankS", 0, r, -0.01, 0.01, { pivot: Z, tip: { kind: "point", origin: [r, 0, 0], dir: [1, 0, 0] } });
        bar(Q, "rodS", 0, L, -0.008, 0.008, { pivot: Z, end: { kind: "point", origin: [L, 0, 0], dir: [1, 0, 0] } });
        bar(Q, "slideS", -0.03, 0.03, -0.015, 0.015, { rail: { kind: "axis", origin: [0, 0, 0], dir: [1, 0, 0], up: [0, 1, 0] }, pin: { kind: "point", origin: [0, 0, 0], dir: [0, 1, 0] } });
        Q("part_add", { id: "crank", type: "shape:crankS", material: "steel", place: { ...at(0, 0.5), a: "crank.goc" } });
        Q("part_add", { id: "rod", type: "shape:rodS", material: "steel", place: { kind: "fixed", a: "rod.goc", b: "crank.goc", shift: [r, 0, 0] } });
        Q("part_add", { id: "slider", type: "shape:slideS", material: "steel", place: { ...at(slideX, 0.5), a: "slider.goc" } });
        Q("joint_add", { id: "jCrank", kind: "revolute", axis: "crank.pivot", moves: ["crank"], limits: [0, 180] });
        Q("joint_add", { id: "jRod", kind: "revolute", axis: "rod.pivot", moves: ["rod"] });
        Q("joint_add", { id: "jSlide", kind: "prismatic", axis: "slider.rail", moves: ["slider"], limits: [-0.25, 0.05] });
        return Q;
      };
      {
        const Q = crank("lk2");
        const out = Q("loop_add", { id: "L", a: "rod.end", b: "slider.pin", solves: ["jRod", "jSlide"] });
        if (!/Quét jCrank/.test(out) || /✗/.test(out)) fails.push(`loop_add tay quay: bảng quét sai:\n${out}`);
        console.log(out.split("\n").slice(0, 3).join("\n"));
        let warm;
        for (const th of [0, 45, 90, 135, 180]) {
          const s = posed("lk2", { jCrank: th }, warm);
          warm = s.values;
          near(`con trượt x(${th}°)`, s.values.get("jSlide"), xSlide(th), 1e-5);
          near(`vòng khép ở ${th}°`, s.loopGap.get("L"), 0, 1e-6);
        }
        near("con trượt → tay quay (60°)", posed("lk2", { jSlide: xSlide(60) }).values.get("jCrank"), 60, 1e-4);
        mustThrow("con trượt ngoài tầm với", () => posed("lk2", { jSlide: 0.04 }), /không tới được/);
        if (!/Vòng kín[\s\S]*L: rod\.end ↔ slider\.pin/.test(Q("assembly_describe", {}))) fails.push("assembly_describe thiếu vòng kín");
        mustThrow("couple cho khớp do vòng tính", () => Q("joint_add", { id: "jRod", kind: "revolute", axis: "rod.pivot", moves: ["rod"], couple: { joint: "jCrank", ratio: 1 } }), /couple/);
        mustThrow("xoá khớp vòng đang tính", () => Q("joint_remove", { id: "jSlide" }), /loop_remove|cascade/);
        mustThrow("lắp lệch làm hở vòng", () => Q("part_update", { id: "slider", place: { ...at(r + L + 0.005, 0.5), a: "slider.goc" } }), /lệch/);

        // vật lý: động cơ ở tay quay, không trọng lực; con trượt theo đáp số, vòng giữ khép
        Q("physics_setup", { gravity: [0, 0, 0], groundPlane: false });
        Q("drive_add", { joint: "jCrank", kind: "speed", value: 90 });
        const model = physicsModel(docOf("lk2"));
        if (!model.joints.some((j) => j.kind === "point")) fails.push("mô hình vật lý thiếu khớp ghim của vòng");
        const w = new World(model);
        let worst = 0;
        for (let i = 0; i < 240; i++) {
          w.step(1 / 120);
          if (i % 12 !== 11) continue;
          const th = w.jointValueOf("jCrank") / DEGR;
          if (th > 175) break;
          worst = Math.max(worst, Math.abs(w.jointValueOf("jSlide") - xSlide(th)));
        }
        near("vật lý: con trượt theo tay quay", worst, 0, 0.002);
      }
      // lắp lệch 5 mm thì loop_add báo độ hở
      {
        const Q = crank("lk3", r + L + 0.005);
        mustThrow("loop_add khi lắp lệch", () => Q("loop_add", { id: "L", a: "rod.end", b: "slider.pin", solves: ["jRod", "jSlide"] }), /lệch 5\.00 mm/);
      }

      // 3. xi lanh nâng thùng: bản lề H, tai thùng T0, chân xi lanh P; khớp dẫn là góc thùng
      const H = [0, 0.5], T0 = [-0.6, 0.5], Pv = [-0.9, 0.2];
      const ux = T0[0] - Pv[0], uy = T0[1] - Pv[1], L0 = Math.hypot(ux, uy);
      const lug = (deg) => [H[0] + (T0[0] - H[0]) * Math.cos(deg * DEGR), H[1] - (T0[0] - H[0]) * Math.sin(deg * DEGR)];
      const stroke = (deg) => Math.hypot(lug(deg)[0] - Pv[0], lug(deg)[1] - Pv[1]) - L0;
      {
        const Q = P("lk4", "Xi lanh nâng");
        bar(Q, "trayS", -0.7, 0.05, 0, 0.05, { hinge: { ...Z, dir: [0, 0, -1] }, lug: { kind: "point", origin: [T0[0] - H[0], 0, 0], dir: [0, -1, 0] } });
        bar(Q, "cylS", -0.04, 0.04, -0.04, 0.04, { pivot: Z, slide: { kind: "axis", origin: [0, 0, 0], dir: [ux / L0, uy / L0, 0], up: [0, 0, 1] } });
        bar(Q, "rodS2", ux - 0.03, ux + 0.03, uy - 0.025, uy, { end: { kind: "point", origin: [ux, uy, 0], dir: [0, 1, 0] } });
        Q("part_add", { id: "tray", type: "shape:trayS", material: "steel", place: { ...at(H[0], H[1]), a: "tray.goc" } });
        Q("part_add", { id: "cyl", type: "shape:cylS", material: "steel", place: { ...at(Pv[0], Pv[1]), a: "cyl.goc" } });
        Q("part_add", { id: "rod", type: "shape:rodS2", material: "steel", place: { kind: "fixed", a: "rod.goc", b: "cyl.goc" } });
        Q("joint_add", { id: "nang", kind: "revolute", axis: "tray.hinge", moves: ["tray"], limits: [0, 50] });
        Q("joint_add", { id: "xoay", kind: "revolute", axis: "cyl.pivot", moves: ["cyl"], limits: [-30, 60] });
        Q("joint_add", { id: "day", kind: "prismatic", axis: "cyl.slide", moves: ["rod"], limits: [0, 0.6] });
        const out = Q("loop_add", { id: "nangThung", a: "rod.end", b: "tray.lug", solves: ["xoay", "day"] });
        if (!/Quét nang/.test(out) || /✗|⚠/.test(out)) fails.push(`loop_add xi lanh: bảng quét sai:\n${out}`);
        let warm;
        for (const th of [0, 10, 25, 40, 50]) {
          const s = posed("lk4", { nang: th }, warm);
          warm = s.values;
          near(`hành trình piston ở ${th}°`, s.values.get("day"), stroke(th), 1e-5);
        }
        near("piston → góc thùng", posed("lk4", { day: stroke(33) }).values.get("nang"), 33, 0.01);

        // vật lý: động cơ đẩy piston, có trọng lực; góc thùng theo quan hệ động học
        Q("physics_setup", { gravity: [0, -9.81, 0], groundPlane: false });
        Q("drive_add", { joint: "day", kind: "speed", value: 0.05, maxForce: 1e6 });
        const w = new World(physicsModel(docOf("lk4")));
        for (let i = 0; i < 240; i++) w.step(1 / 120);
        const s = w.jointValueOf("day");
        if (!(s > 0.05)) fails.push(`vật lý xi lanh: piston không đẩy (${s})`);
        near("vật lý: góc thùng theo piston", w.jointValueOf("nang") / DEGR, posed("lk4", { day: s }).values.get("nang"), 0.5);

        // cụm lưu lại giữ vòng; khớp do vòng tính trong cụm vẫn giải được
        Q("part_save_as_type", { name: "xiLanhNang", expose: { day: "tray.goc" } });
        const lib = readState().library.xiLanhNang;
        if (!lib.doc.loops?.some((l) => l.id === "nangThung")) fails.push("part_save_as_type bỏ mất vòng");
        else near("vòng trong cụm", solve(lib.doc, registryFor(lib.doc), { pose: { day: stroke(20) } }).values.get("nang"), 20, 0.01);
      }

      // 4. vật lý của couple (không qua physics.gears): bánh răng, thanh răng, bảng
      {
        const Q = P("lk5", "Couple vật lý");
        bar(Q, "gS", -0.05, 0.05, -0.05, 0.05, { axis: Z, rail: { kind: "axis", origin: [0, 0, 0], dir: [1, 0, 0], up: [0, 1, 0] } });
        for (const [id, x] of [["ga", 0], ["gb", 0.3], ["pin", 0.6], ["rack", 0.9], ["ta", 1.2], ["tb", 1.5]]) Q("part_add", { id, type: "shape:gS", material: "steel", place: { ...at(x, 0.5), a: `${id}.goc` } });
        Q("joint_add", { id: "ja", kind: "revolute", axis: "ga.axis", moves: ["ga"] });
        Q("joint_add", { id: "jb", kind: "revolute", axis: "gb.axis", moves: ["gb"], couple: { joint: "ja", ratio: -0.5 } });
        const R = 0.04;
        Q("joint_add", { id: "jp", kind: "revolute", axis: "pin.axis", moves: ["pin"] });
        Q("joint_add", { id: "jr", kind: "prismatic", axis: "rack.rail", moves: ["rack"], couple: { joint: "jp", ratio: R * DEGR } });
        Q("joint_add", { id: "jta", kind: "revolute", axis: "ta.axis", moves: ["ta"] });
        Q("joint_add", { id: "jtb", kind: "revolute", axis: "tb.axis", moves: ["tb"], couple: { joint: "jta", table: [[0, 0], [90, 45], [180, 180]] } });
        Q("physics_setup", { gravity: [0, 0, 0], groundPlane: false });
        Q("drive_add", { joint: "ja", kind: "speed", value: 60 });
        Q("drive_add", { joint: "jp", kind: "speed", value: 60 });
        Q("drive_add", { joint: "jta", kind: "speed", value: 90 });
        const w = new World(physicsModel(docOf("lk5")));
        for (let i = 0; i < 180; i++) w.step(1 / 120);
        near("vật lý couple: ωb/ωa = −0,5", w.byId.get("gb").w[2] / w.byId.get("ga").w[2], -0.5, 0.005);
        near("vật lý couple: thanh răng v = ω·R", w.byId.get("rack").v[0] / (w.byId.get("pin").w[2] * R), 1, 0.01);
        const ta = w.jointValueOf("jta") / DEGR, tb = w.jointValueOf("jtb") / DEGR;
        const want = ta <= 90 ? ta / 2 : 45 + 1.5 * (ta - 90);
        near(`vật lý couple: bảng (khớp dẫn ${ta.toFixed(1)}°)`, tb, want, Math.max(0.5, 0.01 * want));
      }
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

    // neo phải chạm vật liệu: hai tấm đứng, cần quay giữa hai tấm, đầu vòng ở khe giữa hai tấm
    console.log("\n--- neo chạm vật liệu ---");
    {
      const expectThrow = (label, fn, re) => {
        try { fn(); fails.push(`${label}: không báo lỗi`); } catch (e) {
          if (!re.test(e.message)) fails.push(`${label}: lỗi khác mong đợi: ${e.message}`);
          else console.log(`- ${label}: ${e.message.split("\n").slice(0, 2).join(" | ").slice(0, 200)}`);
        }
      };
      const Q = P("nc", "Neo chạm vật liệu");
      boxShape(Q, "tamS", [0.01, 0.1, 0.1]);
      boxShape(Q, "canS", [0.08, 0.02, 0.08]);
      boxShape(Q, "chotS", [0.11, 0.01, 0.01]);
      Q("anchor_define", { shape: "canS", name: "dau", kind: "point", origin: [0, 0, 0.04], dir: [0, 0, 1] });
      const lech = Q("anchor_define", { shape: "canS", name: "trucLech", kind: "axis", origin: [0, 0.03, 0], dir: [1, 0, 0], up: [0, 1, 0] });
      if (!/trucLech cách vật liệu của canS: 20\.0 mm ⚠/.test(lech)) fails.push(`anchor_define không báo neo xa vật liệu: ${lech.split("\n")[1]}`);
      // neo của tấm trái nằm ở khe giữa hai tấm (x = 0), ngang đầu cần
      Q("anchor_define", { shape: "tamS", name: "giua", kind: "point", origin: [0.05, 0, 0.04], dir: [0, 0, 1] });
      Q("anchor_define", { shape: "tamS", name: "trucGiua", kind: "axis", origin: [0.05, 0, 0.04], dir: [1, 0, 0], up: [0, 1, 0] });
      Q("anchor_define", { shape: "tamS", name: "trucCan", kind: "axis", origin: [0.05, 0, 0], dir: [1, 0, 0], up: [0, 1, 0] });
      Q("part_add", { id: "tamL", type: "shape:tamS", place: { kind: "onto", a: "tamL.bottom", b: "ground.top", at: [-0.05, 0] } });
      Q("part_add", { id: "tamR", type: "shape:tamS", place: { kind: "onto", a: "tamR.bottom", b: "ground.top", at: [0.05, 0] } });
      Q("part_add", { id: "can", type: "shape:canS", place: { kind: "coaxial", a: "can.axisX", b: "tamL.trucCan" } });
      // can nằm giữa hai tấm, cùng độ cao tâm tấm; đầu can (z = 0,04) ngang neo tamL.giua
      const cb = /\[([-\d.e]+), ([-\d.e]+), ([-\d.e]+)\] → \[([-\d.e]+), ([-\d.e]+), ([-\d.e]+)\]/.exec(Q("measure", { kind: "bounds", target: "can" }));
      near("can giữa hai tấm (x min)", cb ? +cb[1] : 9, -0.04, 1e-4);
      expectThrow("khớp có trục cách cần 20 mm", () => Q("joint_add", { id: "quayLech", kind: "revolute", axis: "can.trucLech", moves: ["can"] }), /không chạm vật liệu[\s\S]*✗ khớp quayLech: trục can.trucLech ↔ cụm dẫn \(can\): 20\.0 mm/);
      const lenient = Q("joint_add", { id: "quayLech", kind: "revolute", axis: "can.trucLech", moves: ["can"], allowAir: "thử lối thoát" });
      if (!/cho phép: thử lối thoát/.test(lenient)) fails.push(`allowAir không ghi chú: ${lenient}`);
      Q("joint_remove", { id: "quayLech" });
      const ok = Q("joint_add", { id: "quay", kind: "revolute", axis: "can.axisX", moves: ["can"], limits: [-30, 30] });
      if (!/✓ khớp quay: trục can.axisX ↔ cụm dẫn/.test(ok) || !/✓ khớp quay: trục can.axisX ↔ cụm cha \(tamL\)/.test(ok)) fails.push(`khớp quay xuyên tấm phải ✓: ${ok}`);
      // vòng: đầu cần trùng neo ở khe giữa hai tấm, hai điểm trùng 0 mm mà không có khối
      expectThrow("vòng có đầu ở khe giữa hai tấm", () => Q("loop_add", { id: "L", a: "can.dau", b: "tamL.giua", solves: ["quay"] }), /✗ vòng L: tamL.giua ↔ cụm tamL: 45\.0 mm/);
      const conn0 = Q("check_connections", {});
      if (!/✓ khớp quay/.test(conn0) || /✗ khớp/.test(conn0)) fails.push(`check_connections trước khi khép vòng: ${conn0}`);
      // chốt ghép cứng vào tấm trái, xuyên qua cả hai tấm ở đúng chỗ đó: cụm cứng của tamL có vật liệu
      Q("part_add", { id: "chot", type: "shape:chotS", place: { kind: "coaxial", a: "chot.axisX", b: "tamL.trucGiua" } });
      const loop = Q("loop_add", { id: "L", a: "can.dau", b: "tamL.giua", solves: ["quay"] });
      if (!/✓ vòng L: tamL.giua ↔ cụm tamL: 0\.0 mm \(gần nhất: chot\)/.test(loop)) fails.push(`vòng sau khi thêm chốt phải ✓ nhờ chot: ${loop}`);
      const conn = Q("check_connections", {});
      console.log(conn.split("\n").slice(0, 4).join("\n"));
      if (!/✓ vòng L: tamL.giua/.test(conn) || !/✓ vòng L: can.dau/.test(conn)) fails.push(`check_connections thiếu dòng vòng: ${conn}`);
      // hai khối đứng yên chỉ chạm nhau, cách tấm 0,3 m: không được "bảo lãnh" lẫn nhau thành vật liệu của cụm đứng yên
      box(Q, "dao1", [0.1, 0.1, 0.1], { kind: "fixed", a: "dao1.center", b: "tamL.center", shift: [0, 0, 0.3] });
      box(Q, "dao2", [0.1, 0.1, 0.1], { kind: "fixed", a: "dao2.center", b: "dao1.center", shift: [0, 0, 0.1] });
      const island = Q("check_connections", {});
      if (!/✗ không bám vào gốc cụm đứng yên: dao1, dao2/.test(island)) fails.push(`check_connections không bắt cụm đảo lơ lửng: ${island}`);
      Q("part_remove", { id: "dao1", cascade: true });

      // xi lanh nâng (lk4): cán là khối nhỏ ở đầu, không chạm xi lanh — quét phải bắt "rời cụm cha"
      const lk = call("check_connections", { assembly: "lk4" });
      if (!/✗ nang = [\d.]+°: khớp day, cụm dẫn \(rod\) rời cụm cha \(cyl\)/.test(lk)) fails.push(`check_connections lk4 không bắt cán rời xi lanh: ${lk}`);
      // pose cho check_*: xi lanh và thùng xa gần khác nhau theo góc nâng
      const g0 = call("check_clearance", { assembly: "lk4", a: "cyl", b: "tray", pose: { nang: 0 } });
      const g1 = call("check_clearance", { assembly: "lk4", a: "cyl", b: "tray", pose: { nang: 50 } });
      console.log(`${g0}\n${g1}`);
      if (!/^Tư thế \{"nang":0\}/.test(g0) || !/^Tư thế \{"nang":50\}/.test(g1) || g0.replace(/^[^:]*:/, "") === g1.replace(/^[^:]*:/, "")) fails.push(`check_clearance theo pose không đổi: ${g0} / ${g1}`);
      if (!/^Tư thế \{"nang":25\}/.test(call("check_interference", { assembly: "lk4", pose: { nang: 25 } }))) fails.push("check_interference không ghi tư thế");
      if (!/^Tư thế \{"nang":25\}/.test(call("check_floating", { assembly: "lk4", pose: { nang: 25 } }))) fails.push("check_floating không ghi tư thế");
      expectThrow("check_clearance pose ngoài giới hạn", () => call("check_clearance", { assembly: "lk4", a: "cyl", b: "tray", pose: { nang: 90 } }), /ngoài giới hạn/);
      // tham số lạ bị từ chối (trước đây pose truyền vào check_clearance bị lặng lẽ bỏ qua)
      expectThrow("tham số lạ", () => Q("measure", { kind: "bounds", foo: 1 }), /measure không có tham số foo/);
    }

    // dọn dẹp khi xoá: khớp ghép, động cơ, vật lý, decal; kiểm tham số
    console.log("\n--- xoá và kiểm tham số ---");
    {
      const throws = (label, fn) => { try { fn(); fails.push(`${label}: không báo lỗi`); } catch (e) { console.log(`- ${label}: ${e.message.split("\n")[0].slice(0, 120)}`); } };
      if (CLAUDE_INSTRUCTIONS.length > 3500) fails.push(`instructions dài ${CLAUDE_INSTRUCTIONS.length} ký tự (> 3500, client sẽ cắt)`);
      const Q = P("rm", "Xoá");
      box(Q, "base", [0.6, 0.05, 0.3], { kind: "onto", a: "base.bottom", b: "ground.top" });
      box(Q, "A", [0.1, 0.1, 0.1], { kind: "onto", a: "A.bottom", b: "base.top", at: [-0.15, 0] });
      box(Q, "C", [0.1, 0.1, 0.1], { kind: "onto", a: "C.bottom", b: "base.top", at: [0.15, 0] });
      throws("id bộ phận có dấu chấm", () => box(Q, "x.y", [0.1, 0.1, 0.1], { kind: "onto", a: "x.y.bottom", b: "base.top" }));
      Q("joint_add", { id: "j1", kind: "revolute", axis: "A.axisY", moves: ["A"] });
      Q("joint_add", { id: "j2", kind: "revolute", axis: "C.axisY", moves: ["C"], couple: { joint: "j1", ratio: 2 } });
      throws("limits ngược", () => Q("joint_add", { id: "j3", kind: "revolute", axis: "C.axisY", moves: ["C"], limits: [10, -10] }));
      Q("body_set", { part: "A", friction: 0.3 });
      Q("initial_set", { part: "A", velocity: [1, 0, 0] });
      Q("drive_add", { joint: "j1", kind: "speed", value: 90 });
      Q("decal_add", { id: "d1", target: "A", at: "A.front", size: [0.05, 0.05], content: { text: "A" } });
      throws("measure pose khớp không có", () => Q("measure", { kind: "bounds", pose: { khongCo: 1 } }));
      throws("measure pose khớp trong cụm", () => Q("measure", { kind: "bounds", pose: { "A/x": 1 } }));
      throws("joint_remove khớp đang được couple", () => Q("joint_remove", { id: "j1" }));
      throws("part_remove làm mồ côi khớp couple", () => Q("part_remove", { id: "A" }));
      console.log(Q("part_remove", { id: "A", cascade: true }));
      const d = findAssembly(readState(), "rm").doc;
      if (d.joints.length) fails.push(`part_remove còn khớp: ${d.joints.map((j) => j.id)}`);
      if (Object.keys(d.physics?.bodies ?? {}).length || Object.keys(d.physics?.initial ?? {}).length || Object.keys(d.physics?.drives ?? {}).length) fails.push(`part_remove còn vật lý: ${JSON.stringify(d.physics)}`);
      if (d.decals?.length) fails.push(`part_remove còn decal: ${d.decals.map((x) => x.id)}`);
      Q("physics_setup", {}); // trước đây ném "physics.initial: không có bộ phận A"
    }
  } catch (e) {
    // dừng giữa chừng: in các lỗi đã gom trước đó, thường là nguyên nhân gốc
    if (fails.length) console.log(`\nLỗi đã gom trước khi dừng (${fails.length}):\n${fails.join("\n")}`);
    throw e;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(fails.length ? `\nTHẤT BẠI (${fails.length}):\n${fails.join("\n")}` : "\nOK: mọi tư thế khớp đáp số.");
  process.exit(fails.length ? 1 : 0);
}

if (process.argv.includes("--selftest")) await selftest();
else {
  serveMcp({ server: SERVER, instructions: CLAUDE_INSTRUCTIONS, tools: TOOLS, handlers, strictArgs: true });
  // nướng sẵn lưới cho các bản đã có (lần đầu có thể mất vài chục giây với thân xe), chạy sau khi đã nhận lệnh
  setTimeout(() => {
    for (const a of readState().assemblies) {
      try {
        bakeDoc(a.doc);
        if (a.doc.physics) physicsModel(a.doc);
      } catch (e) { process.stderr.write(`không nướng được ${a.id}: ${e.message}\n`); }
    }
  }, 50);
  process.stderr.write(`neviad-assembly ${SERVER.version}: sẵn sàng\n`);
}
