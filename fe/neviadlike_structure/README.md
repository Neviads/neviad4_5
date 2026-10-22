# neviadlike_structure

Khuôn mẫu cho một thí nghiệm theo **kiểu 2**: `engines/<x>` tách khỏi `renderers/<x>`.
Hiện chỉ có khung giao diện (`shared/experiment-frame.tsx` + `shared/empty-scene.tsx`), chưa có thí nghiệm nào.

```text
neviadlike_structure/
├── presets/                  khai báo thí nghiệm (metadata + params + applyParams)
│   ├── types.ts              union Preset, mỗi thí nghiệm một `kind`
│   ├── <ten-thi-nghiem>.ts   một file / một thí nghiệm
│   └── index.ts              registry PRESETS
├── engines/<x>/              vật lý thuần, không React / canvas
│   └── engine.ts             MỘT file, bốn phần: kiểu (Params, State, Metrics, Command) → hằng số
│                             (tham số mặc định, hình học vật) → máy trạng thái (chuyển pha) → vật lý
│                             (evaluate, createState / step / metrics)
├── objects/                  vật thể dùng lại được: mỗi vật một file, CHỈ vẽ (Konva), không tính vật lý
│   ├── types.ts              chữ ký ObjectFactory: (p, radius, fill, draggable, label?) → Group | {group, update}
│   ├── palette.ts            bảng token màu / nét / bóng, hàm clamp, font cho Konva.Text
│   ├── <ten-vat>.ts          một file / một vật (có sẵn: pendulum-bob.ts tĩnh, piston-cylinder.ts động)
│   └── index.ts              registry OBJECTS + createObject(name, p, radius, fill)
├── renderers/<x>/            chỉ vẽ: gọi engine mỗi frame rồi vẽ canvas / Konva
│   └── <x>-scene.tsx
├── experiments/              trang chi tiết: ghép renderer + toolbar + panel
│   └── <X>Experiment.tsx
└── shared/                   dùng chung (experiment-frame, empty-scene, param-panel, toolbar, tabs, view-transform, view-camera, draw-axes, object-pose, hook)
```

Luồng phụ thuộc, chỉ đi một chiều:

```text
experiments ──> renderers ──> engines
     │              │
     │              └──> objects ──> (palette, Konva)
     └──────────────┴──> shared
presets ──> engines (chỉ kiểu)
```

## Hệ toạ độ

- **World (mét)**: gốc O, Ox hướng phải, Oy hướng lên; hai nửa trục âm (−Ox, −Oy) vẫn hợp lệ.
  Mặc định O ở góc **trái-dưới** của màn view, nên nửa trục âm nằm ngoài view.
- **View (pixel logic)**: màn view cố định (vd. 1000×480), gốc canvas ở trên-trái, y hướng xuống.
- **Màn hình thật**: `fitView` đặt màn view vào container (giữ tỉ lệ, căn giữa).
- **Camera người xem**: `shared/view-camera.tsx` (`useViewCamera`, `ViewZoomControls`) thu phóng (cuộn chuột, nút) và kéo cảnh,
  áp sau `fitView` bằng `camera.apply(fit)`. Không đổi toạ độ thế giới hay `PIXELS_PER_METER`; lưới và trục tự chia mịn theo mức phóng.
- Phép đổi duy nhất đi qua `shared/view-transform.ts` (`toView`, `toWorld`, `length`); không tự
  viết công thức đổi trong renderer. `shared/draw-axes.ts` vẽ trục Oxy đủ 4 hướng.
- Thí nghiệm cần gốc khác (vd. giữa-dưới) truyền `origin` (pixel từ góc trái-dưới) khi tạo transform.
- Engine chỉ biết mét. `VIEW_*`, `PIXELS_PER_METER` và vị trí vật cố định nằm ở
  `renderers/<x>/view-constants.ts`. Biến trạng thái của engine có thể đo từ điểm riêng
  (vd. li độ từ vị trí cân bằng); renderer cộng thêm toạ độ điểm đó trước khi `toView`.

## Vật thể (`objects/`)

**Hợp đồng hiện tại (vật do agent vẽ, kiểu `ShapeObject` trong `objects/types.ts`):**

- Hàm dựng `(p, ppm, fill, label?) => { group, parts, points }`. `ppm` là pixel trên mét của CẢ cảnh (`PIXELS_PER_METER`); mọi độ dài = mét × `ppm`, nên mọi vật cùng một tỉ lệ.
- Kích thước, điểm neo, tên bộ phận và tên điểm lấy đúng `objectGeometry` của kịch bản: đó là nguồn hình học duy nhất mà vật, engine và cảnh cùng dùng.
- Vật là bất cứ gì cần một hình riêng: thiết bị, đồ vật, hay hạt, hạt nhân, nguyên tử, hành tinh.
- Vật không có vật lý và không tự chuyển động. Engine báo `metrics.objects[<id>] = { x, y, parts, visible? }`: vị trí điểm neo (mét), tư thế từng bộ phận, và `visible: false` khi vật chưa xuất hiện hay đã biến mất.
- Cảnh dùng `shared/object-pose.ts`: `placeObject(obj, view.toView(x, y))`, `setObjectVisible(obj, visible)`, `applyPose(obj, parts, ppm)`, `worldPoint(obj, "tên")` cho thứ vẽ thêm.

**Hiện tượng (thứ thí nghiệm TẠO RA hàng loạt hay thoáng qua, không vật nào sở hữu):** mảnh vỡ, các hạt mới sinh, tia, chấm sáng, điểm vệt.
Chúng KHÔNG phải bộ phận của vật và KHÔNG phải nút Konva, vì số lượng đổi theo từng khung hình.
Engine đưa chúng ra qua `metrics.items = { kind, x, y, angle?, scale?, opacity? }[]` (toạ độ thế giới,
mét); cảnh vẽ bằng `drawItems`/`groupByKind` của `shared/draw-items.ts` lên canvas nền, bằng hình có sẵn
(`shape`) hay hình riêng (`draw`). Xem
`renderers/template-experiment/template-experiment-scene.tsx`.

Các mẫu cũ dưới đây (`pendulum-bob.ts`, `piston-cylinder.ts`) theo hợp đồng cũ:

- Mỗi vật là một hàm thuần trả về `Konva.Group` (vật động trả `{ group, update }`). Chỉ vẽ: không tính vật lý, không import engine.
- Điểm neo (0,0): đứng trên sàn → điểm chạm sàn (thân y âm); treo → điểm treo (thân y dương); khớp → tâm khớp; vật tròn → tâm.
- Kích thước tính từ `radius` rồi kẹp min/max bằng `clamp`. Màu, nét, bóng lấy từ `palette.ts`, chỉ màu thân là `fill` do bên gọi truyền.
- Bóng đổ chỉ đặt trên thân chính. Chi tiết trang trí đặt `listening: false`.
- Vật có bộ phận chuyển động giữ tham chiếu và viết `update(values)` chỉ đặt lại vị trí/kích thước; renderer gọi mỗi frame với giá trị đã tính từ engine.
- Vật mới thường do skill `draw-object` sinh ra (`be/src/beneviadsystem/resources/skills/draw-object/`); đưa vào `objects/<ten-vat>.ts` rồi đăng ký trong `objects/index.ts`.

## Quy tắc

- Công thức vật lý chỉ nằm trong phần vật lý của `engines/<x>/engine.ts` (hàm `evaluate`). Renderer không tự tính. Hình vẽ của vật nằm trong `objects/`, không viết trực tiếp trong `draw()`.
- `engines/` không import React, DOM hay canvas. Dùng đơn vị SI; đổi đơn vị để hiển thị trong hàm `<x>Metrics`.
- Trạng thái bất biến: `stepX` trả về object mới.
- Renderer nhận `params`, `running`, `speed`, `resetSignal`, `command`, `onData`, `onComplete`.
- Preset đọc tham số bằng `p.key ?? default`; không chứa công thức.
- Import chỉ dùng đường dẫn tương đối hoặc alias `@/`.

## Thêm thí nghiệm mới

Bộ `template-experiment` là một thí nghiệm ĐẦY ĐỦ và ĐANG CHẠY (ném xiên: máy bắn nhả đạn), cố ý
giữ nhỏ để làm khuôn: nó có đủ hai kênh mà mọi thí nghiệm đều dùng — `metrics.objects` cho khí cụ
(máy bắn, nòng quay) và `metrics.items` cho hiện tượng (đạn đang bay). Đọc nó rồi viết thí nghiệm
của bạn theo cùng khuôn; đừng sao chép nội dung vật lý của nó.

1. Tạo `engines/<x>/engine.ts` theo đúng bốn phần của `engines/template-experiment/engine.ts`:
   kiểu → hằng số → máy trạng thái → vật lý. Chỉ vật lý thuần.
2. Tạo `renderers/<x>/` gồm `view-constants.ts` (màn view, `ORIGIN`, `PIXELS_PER_METER`, vị trí vật
   cố định bằng mét) và `<x>-scene.tsx` (vòng vẽ canvas; dùng `createViewTransform`, `fitView`,
   `visibleExtents`, `drawGrid`, `drawAxes` từ `shared/`).
3. Tạo `experiments/<X>Experiment.tsx`: ghép `ExperimentFrame` + `SimulationToolbar` + `ParamPanel`
   + scene (khung code nằm trong comment của `experiments/TemplateExperiment.tsx`).
4. Tạo `presets/<x>.ts` (metadata + `params` + `applyParams`), thêm kiểu `<X>Preset` với `kind` mới
   vào union `Preset` trong `presets/types.ts` (bỏ `Preset = never`).
5. Đăng ký preset trong `presets/index.ts`.
6. Chạy `npm --prefix fe run lint` và `npx --prefix fe tsc --noEmit -p fe`.
