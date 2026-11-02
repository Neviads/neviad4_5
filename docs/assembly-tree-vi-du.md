# Sơ đồ một bản lắp ráp: ví dụ xe ben

Xe ben này là **ví dụ minh hoạ**, gom đủ các trường hợp của `neviad-assembly` vào một vật. Nó chưa được dựng thật bằng công cụ; tên bộ phận, khớp và điểm neo đều do người viết đặt.

Mô hình cần nhớ:

| Khái niệm | Trong sơ đồ | Tool |
|---|---|---|
| Node | Bộ phận | `part_add` |
| Edge | Khớp: gắn chặt, quay hoặc trượt | `place` trong `part_add`, thêm `joint_add` nếu chuyển động |
| Cạnh phụ | Ràng buộc nằm ngoài cây | `loop_add`, `route_add` |
| Quan hệ giữa các khớp | Khớp này chạy theo khớp kia | `couple` trong `joint_add` |

## 1. Cây bộ phận

- **Mũi tên mảnh:** gắn chặt, 0 bậc tự do.
- **Mũi tên đậm:** có khớp, 1 bậc tự do.
- **Mũi tên nét đứt:** cạnh phụ, không thuộc cây.

```mermaid
flowchart TD
  ground(["ground.top: mặt bàn"])
  khung["khung: bộ phận gốc"]
  cabin["cabin"]
  cua["cửa"]
  gatTrai["gạt mưa trái"]
  gatPhai["gạt mưa phải"]
  anten["ăng-ten"]
  denTrai["đèn hậu trái: cụm cum-den"]
  denPhai["đèn hậu phải: cụm cum-den"]
  cauSau["cầu sau"]
  banhSauTrai["bánh sau trái"]
  banhSauPhai["bánh sau phải"]
  maPhanh["má phanh"]
  cauTruoc["cầu trước"]
  banhTruoc["bánh trước"]
  thung["thùng"]
  cuaHau["cửa hậu"]
  xiLanh["xi lanh"]
  can["cán xi lanh"]

  ground ==>|"onto + prismatic: khopChay"| khung

  khung -->|"onto"| cabin
  cabin ==>|"coaxial + revolute: khopCua"| cua
  cabin ==>|"coaxial + revolute: khopGatTrai"| gatTrai
  cabin ==>|"coaxial + revolute: khopGatPhai"| gatPhai
  khung -->|"fixed + shift: lối thoát cuối"| anten
  khung -->|"onto, type: cum-den"| denTrai
  khung -->|"onto, type: cum-den"| denPhai

  khung -->|"onto"| cauSau
  cauSau ==>|"coaxial + revolute: khopBanhSau"| banhSauTrai
  cauSau ==>|"coaxial + revolute: khopBanhSau"| banhSauPhai
  banhSauTrai -->|"touch, follow: false"| maPhanh
  khung -->|"onto"| cauTruoc
  cauTruoc ==>|"coaxial + revolute: khopBanhTruoc"| banhTruoc

  khung ==>|"coaxial + revolute: khopThung"| thung
  thung ==>|"coaxial + revolute: khopCuaHau"| cuaHau
  khung ==>|"coaxial + revolute: khopChanXL"| xiLanh
  xiLanh ==>|"through + prismatic: khopCan"| can

  can -.->|"loop_add: can.dau trùng thung.tai"| thung
  khung -.->|"route_add: ống dầu"| xiLanh
```

`khopBanhSau` có `moves: ["banhSauTrai", "banhSauPhai"]`, nên một khớp điều khiển hai bộ phận và xuất hiện trên hai edge.

## 2. Quan hệ giữa các khớp

Sơ đồ này chỉ có khớp, không có bộ phận. Mỗi nhóm nối với nhau chuyển động cùng nhau, nên chỉ cần đặt `pose` cho một khớp bất kỳ trong nhóm là cả nhóm đi theo.

```mermaid
flowchart LR
  khopChay["khopChay: trượt"]
  khopBanhSau["khopBanhSau: quay"]
  khopBanhTruoc["khopBanhTruoc: quay"]
  khopGatTrai["khopGatTrai: quay"]
  khopGatPhai["khopGatPhai: quay"]
  khopThung["khopThung: quay, khớp dẫn"]
  khopCuaHau["khopCuaHau: quay"]
  khopChanXL["khopChanXL: quay"]
  khopCan["khopCan: trượt"]
  khopCua["khopCua: quay, độc lập"]

  khopChay -->|"couple, bỏ ratio: bánh lăn"| khopBanhSau
  khopChay -->|"couple, bỏ ratio: bánh lăn"| khopBanhTruoc
  khopGatTrai -->|"couple, ratio: 1"| khopGatPhai
  khopThung -->|"couple, table: nhiều giai đoạn"| khopCuaHau
  khopThung -.->|"loop_add, solves"| khopChanXL
  khopThung -.->|"loop_add, solves"| khopCan
```

Lệnh khép vòng xi lanh:

```jsonc
loop_add {
  "assembly": "xe-ben",
  "id": "vongXiLanh",
  "a": "can.dau",
  "b": "thung.tai",
  "solves": ["khopChanXL", "khopCan"]
}
```

## 3. Cây dựng hình bên trong chi tiết

Mỗi bộ phận trong sơ đồ 1 là một `shape:<id>`. Bên trong, hình được dựng từ nhiều phép, và một hình có thể dùng nhiều đầu vào, nên phần này không phải lúc nào cũng là cây thuần tuý.

```mermaid
flowchart BT
  subgraph sBanh["Bánh xe"]
    lop["shape_lathe: lốp"] --> lopGai["shape_groove: gai lốp"]
    nan["shape_extrude: một nan"] --> nanLap["shape_pattern: lặp quanh trục"]
    vanh["shape_lathe: vành"] --> banh["shape_boolean: ghép thành bánh"]
    lopGai --> banh
    nanLap --> banh
  end

  subgraph sThung["Thùng"]
    than["shape_extrude: thân"] --> thungKhoet["shape_boolean: trừ hốc"]
    hoc["shape_extrude: hốc"] --> thungKhoet
    thungKhoet --> thungBo["shape_round_edges: bo cạnh"]
  end

  subgraph sCabin["Cabin"]
    vo["shape_loft: thân vỏ"] --> voDoi["shape_mirror: đối xứng hai bên"]
    voDoi --> voTach["shape_split_region: tách vùng kính"]
  end

  subgraph sMoiNoi["Tai thùng hàn vào thân"]
    tai["shape_extrude: tai"] --> ghep["shape_boolean: ghép vào thân"]
    thanTai["hình thân đã có"] --> ghep
    ghep --> bevel["shape_bevel: đắp góc lõm"]
    bevel --> weld["shape_weld: miết khe hẹp"]
    weld --> sand["shape_sand: mài gợn còn lại"]
  end

  subgraph sOng["Ống xả"]
    ong["shape_sweep: quét theo đường"]
  end
```

Sau khi khoét, điểm neo được kế thừa từ dao cắt, ví dụ `thung.hoc.axis`; với phần lặp là `nan[2].axis`.

## 4. Bảng đối chiếu các trường hợp

| Trường hợp | Ví dụ trong xe ben | Cách khai |
|---|---|---|
| Bộ phận gốc | `khung` | `part_add`, `place: onto` lên `ground.top` |
| Gốc chuyển động | `khung` chạy trên mặt bàn | `joint_add` kiểu `prismatic`, trục `ground.z` |
| Gắn chặt mặt vào mặt | `cabin` lên `khung` | `place: onto`, không có khớp |
| Tiếp xúc, không quay theo | `maPhanh` tì lên bánh | `place: touch`, `follow: false` |
| Lối thoát cuối cùng | `anten` | `place: fixed`, `shift` |
| Dùng lại cụm | `denTrai`, `denPhai` | `part_save_as_type`, rồi `part_add` với `type: "cum-den"` |
| Khớp quay độc lập | `khopCua` | `coaxial`, `revolute`, `limits` |
| Trục lọt lỗ và trượt | `can` trong `xiLanh` | `through`, `prismatic` |
| Một khớp, nhiều bộ phận | `khopBanhSau` | `moves` có hai bộ phận |
| Chạy theo tỉ số | `khopGatPhai` | `couple: {joint, ratio}` |
| Bánh lăn theo khớp trượt | `khopBanhSau`, `khopBanhTruoc` | `couple: {joint}`, bỏ `ratio` |
| Phi tuyến, nhiều giai đoạn | `khopCuaHau` | `couple: {joint, table}` |
| Khâu nối hai nhánh | `xiLanh` và `can` với `thung` | `loop_add`, `solves` |
| Dây nối | ống dầu | `route_add` |
