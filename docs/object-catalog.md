# Danh mục vật thể cho kho vật thể

Danh sách các vật mà thí nghiệm vật lý phổ thông (Vật lí 10–12) và các mô phỏng mở rộng hay cần, để vẽ sẵn một lần rồi dùng lại thay vì để DrawObjectAgent vẽ lại ở mỗi lượt gen.

Mỗi vật khi vào kho phải theo hợp đồng `ShapeObject` (`fe/neviadlike_structure/objects/types.ts`):

- là hàm Konva `(p, ppm, fill, label) => { group, parts, points }`;
- điểm neo cố định, mọi kích thước bằng mét × `ppm`;
- bộ phận chuyển động tách thành `parts`, engine điều khiển;
- vật chỉ vẽ, không tự tính vật lý.

## Cách đọc

- **Ưu tiên**
  - **P1**: gặp ở nhiều bài, làm trước.
  - **P2**: gặp ở vài bài.
  - **P3**: đặc thù một bài, hoặc chỉ để mở rộng.
- **Bộ phận chuyển động**: các `parts` gợi ý, kèm kiểu `trượt` (mét) hay `quay` (độ). Để `—` là vật cứng, chỉ dời cả khối.
- **Điểm neo**: gợi ý theo quy ước của README:
  - đứng trên sàn: điểm chạm sàn;
  - treo: điểm treo;
  - vật tròn hay hạt: tâm.
- **Tham khảo**: nơi thư viện `fe/components/simulations` đã vẽ vật tương tự. Chỉ dùng để xem dáng và màu; đằng nào cũng phải viết lại.

**Vật hay hiện tượng?** Thứ thí nghiệm *tạo ra hàng loạt hay thoáng qua* thì không phải vật mà là hiện tượng, đi qua `metrics.items`, ví dụ tia sáng, vệt hạt, giọt nước, tia lửa điện, bọt khí, phân tử khí trong bình. Những thứ đó nằm ở mục cuối, vẽ bằng `drawItems`. Một hạt *đơn lẻ, có danh tính* (hạt nhân bị bắn, electron được theo dõi) thì vẫn có thể là vật.

---

## 1. Giá đỡ, nền và đồ gá chung

| Vật | Dùng ở | Bộ phận chuyển động | Điểm neo | Ưu tiên | Tham khảo |
|---|---|---|---|---|---|
| Giá thí nghiệm (chân đế, trụ đứng, khớp nối, thanh ngang) | hầu hết bài treo vật, con lắc, lực kế | khớp nối trượt dọc trụ | đáy chân đế | P1 | `presets/do-p-t-bang-luc-ke.ts` (giá chữ L) |
| Kẹp vạn năng / kẹp ống nghiệm | gá ống nghiệm, nhiệt kế, cảm biến | — | điểm kẹp vào trụ | P2 | |
| Xà treo / giá treo ngang | con lắc, lò xo, ròng rọc, palăng | — | giữa xà | P1 | `hooke-law/HookeLawExperiment.tsx` (`Support`) |
| Bàn thí nghiệm / mặt sàn | nền chung của cảnh | — | mép trên | P2 | |
| Tường / vách cứng | va chạm, lò xo nằm ngang | — | chân tường | P2 | `newton-third-law/NewtonThirdLawScene.tsx` |
| Bảng thép / bảng từ có lưới | tổng hợp lực, moment | — | tâm bảng | P2 | |
| Đế gỗ / hộp cộng hưởng | âm thoa, dây đàn | — | đáy | P3 | `oscilloscope-frequency-scene.tsx` |
| Băng / ray quang học (giá quang học có thước) | mọi bài quang học | con trượt mang dụng cụ (trượt) | đầu trái ray | P1 | |

## 2. Dụng cụ đo

| Vật | Dùng ở | Bộ phận chuyển động | Điểm neo | Ưu tiên | Tham khảo |
|---|---|---|---|---|---|
| Thước thẳng có vạch chia | đo độ dài, độ giãn, quãng đường | — | vạch 0 | P1 | `water-surface-wave-scene.tsx` (`drawRuler`) |
| Thước kẹp (thước cặp) | đo đường kính, bề dày | hàm động (trượt) | hàm cố định | P2 | |
| Panme (thước vi kế) | đo đường kính dây, bề dày lá | tang trống (quay), trục đo (trượt) | đầu đe | P3 | `coulomb-torsion-balance-scene.tsx` (`drawMicrometer`) |
| Thước đo góc (bán nguyệt, tròn) | khúc xạ, con lắc, mặt nghiêng | — | tâm thước | P1 | `coulomb-torsion-balance-scene.tsx` (`drawDegreeScale`) |
| Đồng hồ bấm giây (cơ, hiện số) | đo thời gian mọi bài chuyển động | kim (quay) | tâm mặt | P1 | `water-calorimetry-scene.tsx` (`drawStopwatch`) |
| Đồng hồ đo thời gian hiện số + cổng quang điện | rơi tự do, gia tốc trên máng, động lượng | — (số hiện là nhãn) | chân cổng | P1 | `newton-second-law/NewtonSecondLawRaceScene.tsx` (`drawFinishGate`) |
| Tấm chắn sáng (gắn trên xe hay vật) | đi qua cổng quang điện | — | chân tấm | P2 | |
| Lực kế lò xo | đo lực, trọng lượng, ma sát, tổng hợp lực | lò xo + kim chỉ (trượt) | móc treo trên | P1 | `scene-konva-2d.tsx` (`makeForceMeterNode`, Konva) |
| Cảm biến lực | thí nghiệm số hoá về lực, va chạm | — | mặt đo | P2 | |
| Cân đòn / cân Roberval | khối lượng, cân bằng moment | đòn cân (quay), kim (quay) | chân cân | P2 | |
| Cân điện tử | đo khối lượng nước, đá, nhiệt học | — | đáy | P1 | |
| Hộp quả cân | đi kèm cân | — | đáy hộp | P3 | |
| Ống đong / bình chia độ | đo thể tích, lực đẩy Archimedes | mực chất lỏng (trượt) | đáy | P1 | |
| Nhiệt kế (chất lỏng) | mọi bài nhiệt | cột chất lỏng (trượt) | bầu nhiệt kế | P1 | `isothermal-boyle-canvas.tsx` (`MiniThermometer`) |
| Nhiệt kế điện tử / cảm biến nhiệt độ | nhiệt dung riêng, nhiệt hoá hơi | — | đầu dò | P1 | |
| Áp kế (đồng hồ kim) | định luật Boyle, Charles, khí | kim (quay) | tâm mặt | P1 | `isothermal-boyle-canvas.tsx` (`PressureGauge`) |
| Áp kế chữ U (ống chất lỏng) | áp suất chất lỏng, khí | hai mực chất lỏng (trượt) | đáy chữ U | P2 | |
| Phong vũ biểu / ống Torricelli | áp suất khí quyển | cột thuỷ ngân (trượt) | chậu | P3 | |
| Ampe kế (kim) | mọi bài mạch điện | kim (quay) | tâm mặt | P1 | `water-calorimetry-scene.tsx` (`drawMeter`) |
| Vôn kế (kim) | mọi bài mạch điện | kim (quay) | tâm mặt | P1 | như trên (cùng khung với ampe kế) |
| Điện kế G (số 0 ở giữa) | cảm ứng điện từ, cầu Wheatstone | kim (quay hai phía) | tâm mặt | P1 | `scene-konva-variable-current-induction.tsx` (`drawMeter`) |
| Đồng hồ đa năng hiện số | đo U, I, R | núm chọn thang (quay) | đáy | P2 | |
| Oát kế / Jun kế | công suất, nhiệt lượng | kim (quay) | tâm mặt | P3 | |
| Dao động kí (oscilloscope) | sóng âm, dòng xoay chiều | — (đường sóng là hiện tượng trên màn) | đáy máy | P2 | `oscilloscope-frequency-scene.tsx` (`drawOscilloscope`) |
| Máy phát tần số / máy phát âm tần | sóng dừng, cộng hưởng, loa | núm (quay) | đáy máy | P2 | |
| Cảm biến chuyển động (siêu âm) | đồ thị x–t, v–t | — | mặt phát | P3 | |

## 3. Cơ học

| Vật | Dùng ở | Bộ phận chuyển động | Điểm neo | Ưu tiên | Tham khảo |
|---|---|---|---|---|---|
| Quả nặng có móc (đơn, chồng) | lực kế, lò xo, ròng rọc, moment | — | móc trên | P1 | `scene-konva-rotation.tsx` (`createSingleWeight`, `createWeightStack`, Konva) |
| Khối gỗ / khối hộp | ma sát, mặt nghiêng, định luật Newton | — | tâm đáy | P1 | `NewtonSecondLawRaceScene.tsx` (`drawMassBlock`) |
| Viên bi / quả cầu thép | rơi tự do, ném, máng Galilei, va chạm | — | tâm | P1 | `scene-konva-2d.tsx` (`makeMetalBallNode`, Konva) |
| Quả bóng (đá, tennis, bowling) | ném xiên, va chạm, nảy | — | tâm | P2 | |
| Xe lăn / xe đẩy thí nghiệm | định luật 2 và 3 Newton, động lượng | 4 bánh (quay) | điểm giữa hai trục, chạm sàn | P1 | `NewtonThirdLawScene.tsx` (`drawCart`) |
| Xe trượt trên đệm khí + đệm khí | va chạm đàn hồi, mềm | — | chạm ray | P2 | |
| Máng / ray (thẳng, nghiêng) | chuyển động trên máng, gia tốc | — | đầu dưới | P1 | `presets/mang-cong-galilei.ts` |
| Máng cong / ray tàu lượn | bảo toàn cơ năng, Galilei | — | điểm thấp nhất | P2 | `presets/dong-nang-the-nang.ts`, `bao-toan-co-nang-con-lac.ts` |
| Mặt phẳng nghiêng (chỉnh được góc) | ma sát, phân tích lực | tấm nghiêng (quay quanh bản lề) | bản lề | P1 | `presets/mat-nghieng-ma-sat.ts` |
| Ròng rọc cố định | máy Atwood, nâng vật | bánh (quay) | điểm treo trục | P1 | |
| Ròng rọc động / palăng | lợi về lực | bánh (quay), khối tải (trượt) | móc trên | P2 | |
| Dây (mảnh, không giãn) | nối vật, treo, ròng rọc | — (vẽ theo điểm của hai vật) | — | P1 | |
| Lò xo (treo, nằm ngang) | Hooke, con lắc lò xo, va chạm | độ dài (trượt) | đầu cố định | P1 | `hooke-law/HookeLawExperiment.tsx` (`Spring`), `scene-konva-2d.tsx` (`hookeSpringPoints`) |
| Con lắc đơn (giá + dây + quả nặng) | dao động, chu kì, cơ năng | dây + quả (quay quanh điểm treo) | điểm treo | P1 | `presets/con-lac-don.ts` |
| Con lắc lò xo | dao động điều hoà | lò xo + vật (trượt) | điểm treo | P1 | `presets/con-lac-lo-xo.ts` |
| Con lắc vật lý / con lắc kép | dao động vật rắn | thanh (quay), khâu hai (quay) | trục quay | P3 | |
| Thanh cứng / đòn bẩy | moment, cân bằng | thanh (quay quanh trục) | trục quay | P1 | |
| Bập bênh | quy tắc moment | ván (quay) | trục giữa | P2 | `renderers/rotation/scene-konva-seesaw.tsx` |
| Đĩa moment (đĩa tròn có lỗ treo) | quy tắc moment | đĩa (quay) | tâm trục | P2 | `presets/quy-tac-moment-dia-tron.ts` |
| Ống Newton (ống chân không) | rơi tự do không khí và chân không | — | đáy ống | P3 | `presets/ong-newton-chan-khong.ts` |
| Lông vũ | rơi trong không khí | — | tâm | P2 | `scene-konva-2d.tsx` (`makeFeatherNode`, ảnh `newton/feather.png`) |
| Nam châm điện giữ bi (máy rơi tự do) | đo g | — | điểm giữ | P2 | |
| Bánh xe / vô lăng / đĩa quay | chuyển động tròn, moment quán tính | đĩa (quay) | tâm trục | P2 | |
| Bánh răng, thanh răng | truyền chuyển động | bánh (quay), thanh (trượt) | tâm trục | P3 | |
| Cơ cấu tay quay – con trượt | động cơ, máy bơm | tay quay (quay), thanh truyền, con trượt (trượt) | tâm tay quay | P3 | |
| Máy bắn / súng bắn bi / pháo | ném ngang, ném xiên, giật lùi | nòng (quay), giá (trượt khi giật) | chạm sàn | P1 | `neviadlike_structure/objects/template-experiment-1.ts` (hợp đồng mới) |
| Tên lửa | chuyển động bằng phản lực | — | đuôi | P2 | |
| Máy nén / kích thuỷ lực | nguyên lý Pascal | hai pít tông (trượt) | đáy | P2 | `neviadlike_structure/objects/hydraulic-lift-1.ts` |
| Bình thông nhau | áp suất chất lỏng | các mực nước (trượt) | đáy | P2 | |
| Bình tràn + vật chìm | lực đẩy Archimedes | mực nước (trượt) | đáy | P2 | |
| Cần trục / cần cẩu | moment, công, cân bằng | cần (quay), móc (trượt) | chân | P3 | |
| Thang máy (cabin + cáp) | trọng lượng biểu kiến | cabin (trượt) | điểm treo cáp | P3 | |

## 4. Dao động và sóng

| Vật | Dùng ở | Bộ phận chuyển động | Điểm neo | Ưu tiên | Tham khảo |
|---|---|---|---|---|---|
| Âm thoa (có búa gõ, hộp cộng hưởng) | âm, tần số, cộng hưởng | hai nhánh (dao động nhỏ) | đáy hộp | P1 | `oscilloscope-frequency-scene.tsx` (`drawTuningFork`) |
| Loa | phát âm, sóng dừng trong ống | màng loa (trượt) | đáy | P1 | |
| Micro | thu âm vào dao động kí | — | đầu thu | P2 | `oscilloscope-frequency-scene.tsx` (`drawMicrophone`) |
| Cần rung + dây (bộ sóng dừng) | sóng dừng trên dây | đầu rung (trượt) | thân cần rung | P1 | `presets/song-dung.ts` |
| Dây đàn / sợi dây căng qua ròng rọc | sóng dừng, tần số âm | — (dây là hiện tượng sóng) | hai đầu | P2 | `presets/song-tren-day.ts` |
| Khay / chậu sóng nước | giao thoa, nhiễu xạ sóng nước | — | tâm khay | P1 | `water-surface-wave-scene.tsx` |
| Nguồn sóng nước (mũi nhọn gắn cần rung) | giao thoa hai nguồn | mũi nhọn (trượt lên xuống) | thân | P1 | `water-surface-wave-scene.tsx` (`drawDriver`) |
| Ống cộng hưởng (ống thuỷ tinh + pít tông hay mực nước) | đo tốc độ âm | pít tông (trượt) | đáy ống | P2 | |
| Bộ nhiều con lắc trên một xà (con lắc Barton) | cộng hưởng | từng con lắc (quay) | giữa xà | P3 | `pendulum-resonance-canvas.tsx` |
| Nhạc cụ (đàn guitar, sáo, trống) | ứng dụng âm | dây hay màng (trượt) | thân | P3 | |
| Phao / vật nổi trên mặt nước | dao động của phần tử sóng | phao (trượt) | tâm | P3 | |

## 5. Quang học

| Vật | Dùng ở | Bộ phận chuyển động | Điểm neo | Ưu tiên | Tham khảo |
|---|---|---|---|---|---|
| Đèn chiếu / nguồn sáng (đèn sợi đốt, đèn LED) | mọi bài quang học | — | đáy | P1 | |
| Bút laser / đèn laser | khúc xạ, phản xạ, giao thoa | thân (quay để đổi góc) | đầu phát | P1 | `presets/giao-thoa-anh-sang-day-du.ts` |
| Đèn có khe / hộp tạo chùm tia song song | vẽ tia sáng | — | cửa ra | P2 | |
| Vật sáng (mũi tên, chữ F) | tạo ảnh qua thấu kính, gương | — | chân vật | P1 | |
| Màn chắn / màn ảnh | hứng ảnh, vân giao thoa | — | chân | P1 | `rutherford-scattering-scene.tsx` (`drawScreen`) |
| Gương phẳng | phản xạ, ảnh qua gương | gương (quay) | tâm | P1 | |
| Gương cầu lõm / lồi | ảnh qua gương cầu | — | đỉnh gương | P2 | |
| Thấu kính hội tụ / phân kì | tạo ảnh, kính lúp, mắt | — | quang tâm | P1 | |
| Lăng kính | tán sắc, khúc xạ | lăng kính (quay) | trọng tâm | P1 | |
| Khối bán trụ / bản mặt song song | khúc xạ, phản xạ toàn phần | khối (quay) | tâm phẳng | P2 | |
| Bể nước / chậu chất lỏng trong suốt | khúc xạ qua nước | mực nước (trượt) | đáy | P2 | |
| Sợi quang | phản xạ toàn phần | — | đầu vào | P3 | |
| Khe hẹp, khe Young (hai khe) | nhiễu xạ, giao thoa | — | tâm khe | P1 | `renderers/wave-field/scene-canvas-wave-field.tsx` |
| Cách tử nhiễu xạ | quang phổ, đo bước sóng | — | tâm | P2 | |
| Kính lọc màu | màu sắc ánh sáng | — | tâm | P3 | |
| Kính phân cực (kính lọc phân cực) | phân cực ánh sáng | kính (quay) | tâm | P3 | |
| Kính lúp | quang cụ | — | quang tâm | P2 | |
| Kính hiển vi | quang cụ | ống kính (trượt) | đế | P3 | |
| Kính thiên văn | quang cụ | ống (trượt) | giá | P3 | |
| Mắt (mặt cắt: thuỷ tinh thể, võng mạc) | mắt, tật khúc xạ | thuỷ tinh thể (độ phồng) | tâm nhãn cầu | P2 | |
| Máy ảnh (mặt cắt) | tạo ảnh | vật kính (trượt) | đáy | P3 | |
| Tế bào quang điện | hiệu ứng quang điện | — | đáy | P2 | |
| Tấm kim loại (catot) bị chiếu sáng | hiệu ứng quang điện | — | tâm | P2 | |
| Quang phổ kế / máy quang phổ lăng kính | quang phổ vạch, liên tục | ống chuẩn trực (quay) | tâm bàn | P3 | |

## 6. Điện: mạch và tĩnh điện

| Vật | Dùng ở | Bộ phận chuyển động | Điểm neo | Ưu tiên | Tham khảo |
|---|---|---|---|---|---|
| Pin (đơn, bộ pin trong hộp) | mọi mạch điện, suất điện động | — | tâm | P1 | `presets/do-suat-dien-dong-pin.ts` |
| Acquy / nguồn một chiều biến đổi | mạch điện | núm (quay) | đáy | P1 | |
| Nguồn xoay chiều / máy biến thế nguồn | mạch xoay chiều | núm (quay) | đáy | P2 | |
| Công tắc / khoá K | đóng ngắt mạch | lưỡi dao (quay) | đế | P1 | `electric-bell-scene.tsx` |
| Dây nối + kẹp cá sấu / chốt cắm | nối mạch | — (vẽ theo hai đầu) | — | P1 | |
| Bảng mạch / bảng lắp ráp | nền mạch điện | — | tâm | P2 | `electric-bell-scene.tsx` (bảng đế) |
| Điện trở (thực tế có vạch màu, ký hiệu) | định luật Ohm | — | tâm | P1 | |
| Biến trở con chạy | điều chỉnh dòng | con chạy (trượt) | tâm | P1 | `presets/bien-thien-dong-dien-bang-bien-tro-khoa-k.ts` |
| Bóng đèn sợi đốt (có đui) | đặc trưng V–A, công suất | — (sáng là trạng thái) | đáy đui | P1 | `presets/dac-trung-va-bong-den.ts` |
| Đèn LED / điốt | điốt, chỉnh lưu | — | tâm | P2 | |
| Tụ điện (thực tế, tụ phẳng) | tụ điện, điện trường | bản tụ (trượt khi đổi khoảng cách) | tâm | P1 | `presets/dien-truong-2-ban-song-song.ts` |
| Cuộn cảm / ống dây | tự cảm, từ trường ống dây | — | tâm | P1 | |
| Máy biến áp (lõi + hai cuộn) | máy biến áp | — | đế | P2 | |
| Động cơ điện một chiều | chuyển hoá năng lượng | rô to (quay) | đế | P2 | |
| Máy phát điện xoay chiều (khung dây quay trong nam châm) | cảm ứng điện từ | khung (quay) | trục | P2 | `presets/khung-day-quay-trong-tu-truong.ts` |
| Chuông điện | ứng dụng nam châm điện | lá thép + búa gõ (quay) | đế | P3 | `electric-bell-scene.tsx` |
| Cầu chì / aptomat | an toàn điện | — | tâm | P3 | |
| Dây điện trở / dây nung | nhiệt lượng toả ra, đốt giấy | — | hai đầu | P2 | `presets/day-sat-dot-giay.ts` |
| Bình nhiệt lượng kế có dây đốt | nhiệt dung riêng (phương pháp điện) | que khuấy (trượt) | đáy | P1 | `water-calorimetry-scene.tsx` |
| Bình điện phân + điện cực | dòng điện trong chất điện phân | — | đáy | P3 | |
| Thước nhựa, đũa thuỷ tinh, mảnh lụa/dạ | nhiễm điện do cọ xát | — | đầu cầm | P2 | `presets/nhiem-dien-hut.ts` |
| Mẩu giấy vụn / quả cầu bấc treo trên dây | nhiễm điện, hút đẩy | quả cầu (quay quanh điểm treo) | điểm treo | P2 | `presets/nhiem-dien-day.ts` |
| Điện nghiệm | nhiễm điện hưởng ứng | hai lá (quay) | đế | P2 | |
| Quả cầu kim loại tích điện (trên chân cách điện) | điện trường, điện thế | — | đáy chân | P1 | `coulomb-torsion-balance-scene.tsx` (`drawSphere`) |
| Cân xoắn Coulomb | định luật Coulomb | thanh treo (quay), núm (quay) | điểm treo dây xoắn | P3 | `coulomb-torsion-balance-scene.tsx` |
| Máy phát tĩnh điện (Van de Graaff, Wimshurst) | tĩnh điện, tia lửa | băng tải hay đĩa (quay) | đế | P3 | |
| Pin nhiệt điện (cặp nhiệt) | suất điện động nhiệt điện | — | mối hàn | P3 | |

## 7. Từ học

| Vật | Dùng ở | Bộ phận chuyển động | Điểm neo | Ưu tiên | Tham khảo |
|---|---|---|---|---|---|
| Nam châm thẳng (N đỏ, S xanh) | từ phổ, tương tác, cảm ứng | — | tâm | P1 | `presets/tu-pho.ts` |
| Nam châm chữ U | lực từ lên dây, động cơ | — | đáy chữ U | P1 | |
| Kim nam châm / la bàn | định hướng từ trường | kim (quay) | trục kim | P1 | `presets/tuong-tac-nam-cham-va-kim-nam-cham.ts` |
| Mạt sắt trên tấm bìa | từ phổ | — (mạt sắt là hiện tượng) | tâm tấm | P2 | `renderers/iron-filings/` |
| Ống dây (solenoid) có lõi sắt | từ trường ống dây, nam châm điện | lõi (trượt khi rút ra) | tâm | P1 | `scene-konva-variable-current-induction.tsx` |
| Khung dây / vòng dây dẫn | cảm ứng, lực từ | khung (quay) | tâm | P1 | `presets/cam-ung-dien-tu.ts` |
| Dây dẫn thẳng mang dòng điện | từ trường dòng thẳng, lực từ | — | tâm | P1 | `presets/tuong-tac-hai-tam-kim-loai-mang-dong-dien.ts` |
| Hai thanh ray + thanh dẫn trượt | suất điện động cảm ứng | thanh trượt (trượt) | đầu ray | P2 | |
| Cân dòng điện / cân từ | đo cảm ứng từ B | đòn cân (quay) | chân | P3 | |
| Ống phóng tia điện tử trong từ trường | lực Lorentz, quỹ đạo tròn | — | đáy | P2 | `presets/do-lech-tia-alpha-beta-gamma.ts`, `renderers/magnetic-deflection/` |

## 8. Nhiệt học và chất khí

| Vật | Dùng ở | Bộ phận chuyển động | Điểm neo | Ưu tiên | Tham khảo |
|---|---|---|---|---|---|
| Đèn cồn (có ngọn lửa) | đun nóng | ngọn lửa (cỡ ngọn) | đáy | P1 | `isothermal-boyle-canvas.tsx` (`AlcoholLamp`) |
| Bếp điện / bếp ga | đun nóng | — | đáy | P2 | `heating-curve/heating-curve-canvas.tsx` |
| Kiềng ba chân + lưới tản nhiệt | đặt cốc lên đun | — | chân | P1 | |
| Cốc thuỷ tinh (becher) có chất lỏng | đun nước, hoà tan, khuếch tán | mực chất lỏng (trượt) | đáy | P1 | |
| Bình cầu, bình tam giác | đun, khí | mực chất lỏng (trượt) | đáy | P2 | |
| Ống nghiệm | đun, giãn nở | mực chất lỏng (trượt) | đáy | P2 | |
| Nhiệt lượng kế (bình hai lớp, nắp, que khuấy) | nhiệt dung riêng, cân bằng nhiệt | que khuấy (trượt) | đáy | P1 | `water-calorimetry-scene.tsx` |
| Xi lanh + pít tông (kín khí) | Boyle, Charles, động cơ nhiệt | pít tông (trượt) | đáy xi lanh | P1 | `neviadlike_structure/objects/piston-cylinder.ts` (hợp đồng cũ), `isothermal-boyle-canvas.tsx` |
| Bơm tay / bơm xe đạp | nén khí | cán bơm (trượt) | đáy | P2 | |
| Bình khí kín có van | đẳng tích | van (quay) | đáy | P2 | |
| Chai có nút (nút bật) | khí giãn nở, nội năng | nút (trượt) | đáy chai | P2 | `cork-pop/cork-pop-canvas.tsx`, `renderers/thermodynamics/cork-scene.tsx` |
| Viên nước đá / cốc đá | nóng chảy | — (tan là trạng thái) | đáy | P1 | `renderers/circuit/ice-fusion-scene.tsx` |
| Ấm đun / nồi | hoá hơi, sôi | nắp (trượt khi sôi) | đáy | P2 | `renderers/circuit/water-vaporization-scene.tsx` |
| Thanh kim loại có ghim sáp | dẫn nhiệt | — | đầu được đun | P2 | `heat-transfer/heat-transfer-canvas.tsx` |
| Nến | đun, đối lưu | ngọn lửa | đáy | P3 | |
| Quả bóng bay | giãn nở khí | độ phồng | miệng bóng | P3 | |
| Động cơ nhiệt (xi lanh, pít tông, bánh đà) | nguyên lý động cơ | pít tông (trượt), bánh đà (quay) | đế | P3 | |
| Kính hiển vi quan sát chuyển động Brown | chuyển động Brown | — | đế | P3 | `brownian/` |

## 9. Nguyên tử, hạt nhân và vi mô (thực thể không chụp được)

Đây là các vật vẽ theo **hình minh hoạ khoa học quen thuộc**, không theo ảnh chụp. Khi một thứ trong số này xuất hiện **hàng loạt** (khí, chùm hạt, phóng xạ), hãy dùng nó như một `kind` của `metrics.items`, không làm thành vật.

| Vật | Dùng ở | Bộ phận chuyển động | Điểm neo | Ưu tiên | Tham khảo |
|---|---|---|---|---|---|
| Electron (chấm xanh, dấu −) | dòng điện, mô hình nguyên tử, tia catot | — | tâm | P1 | |
| Proton (đỏ, dấu +) | hạt nhân, điện tích | — | tâm | P1 | |
| Neutron (xám) | hạt nhân, phân hạch | — | tâm | P1 | |
| Hạt nhân nhẹ (chùm proton–neutron) | phản ứng hạt nhân, Rutherford | — | tâm | P1 | `rutherford-nitrogen-scene.tsx` (`drawNuclearTarget`) |
| Hạt nhân nặng (U-235, U-238) | phân hạch | — (tách đôi là đổi vật) | tâm | P1 | |
| Hạt alpha (2p + 2n) | phóng xạ α, tán xạ Rutherford | — | tâm | P1 | `rutherford-scattering-scene.tsx` (`drawParticle`) |
| Hạt beta (e⁻ / e⁺) | phóng xạ β | — | tâm | P2 | |
| Photon / tia gamma (gói sóng) | hiệu ứng quang điện, phóng xạ γ | — | tâm | P1 | |
| Nguyên tử, mô hình Bohr (hạt nhân + quỹ đạo) | quang phổ, mức năng lượng | electron trên quỹ đạo (quay) | hạt nhân | P1 | |
| Nguyên tử, mô hình đám mây electron | cấu tạo nguyên tử | — | hạt nhân | P2 | |
| Nguyên tử, mô hình "bánh pudding" của Thomson | lịch sử mô hình nguyên tử | — | tâm | P3 | |
| Ion (+ / −) | điện phân, chất khí dẫn điện | — | tâm | P2 | |
| Phân tử nước H₂O | nhiệt học, chuyển thể | — | tâm O | P1 | |
| Phân tử khí hai nguyên tử (O₂, N₂, H₂) | thuyết động học | — | tâm | P1 | |
| Phân tử CO₂ | khí, hiệu ứng nhà kính | — | tâm C | P3 | |
| Phân tử khí đơn giản (quả cầu nhỏ) | khí lí tưởng, áp suất | — | tâm | P1 | `isothermal-boyle-canvas.tsx` (`createMolecules`) |
| Hạt phấn hoa / hạt khói | chuyển động Brown | — | tâm | P2 | `brownian/` |
| Mạng tinh thể (ô mạng) | chất rắn, nóng chảy | các nút (dao động nhỏ) | tâm ô | P2 | |
| Nguồn phóng xạ (hộp chì có lỗ) | phóng xạ, lệch tia α β γ | — | đáy hộp | P1 | `presets/do-lech-tia-alpha-beta-gamma.ts` |
| Ống đếm Geiger–Müller | đo phóng xạ | — | đầu ống | P2 | |
| Buồng sương Wilson / Blackett | vết hạt | pít tông giãn nở (trượt) | đáy buồng | P2 | `renderers/cloud-chamber/cloud-chamber-scene.tsx` |
| Lá vàng mỏng | tán xạ Rutherford | — | tâm lá | P2 | `rutherford-scattering-scene.tsx` (`drawFoil`) |
| Màn huỳnh quang ZnS / kính hiển vi đếm chớp | tán xạ Rutherford | kính (quay quanh lá) | tâm | P3 | `rutherford-scattering-scene.tsx` |
| Bộ thí nghiệm Rutherford biến đổi nitơ | phản ứng hạt nhân nhân tạo | — | đáy | P3 | `rutherford-nitrogen-scene.tsx` (`drawApparatus`) |
| Kính ảnh / phim ảnh | Becquerel, phát hiện phóng xạ | — | tâm | P3 | `renderers/radiography/becquerel-scene.tsx` |
| Ống tia catot (ống Crookes) | electron, tia catot | — | đáy | P2 | |
| Ống phóng tia X (ống Coolidge) | tia X | — | đáy | P3 | |
| Ống phóng điện chứa khí (đèn quang phổ) | quang phổ vạch | — | đáy | P3 | |
| Máy gia tốc vòng (cyclotron, hai cực chữ D) | hạt trong điện trường và từ trường | — | tâm | P3 | |
| Lò phản ứng (thanh nhiên liệu, thanh điều khiển) | phân hạch dây chuyền | thanh điều khiển (trượt) | đáy | P3 | |

## 10. Thiên văn và vật thể lớn

| Vật | Dùng ở | Bộ phận chuyển động | Điểm neo | Ưu tiên | Tham khảo |
|---|---|---|---|---|---|
| Trái Đất | hấp dẫn, vệ tinh, trọng lực | Trái Đất (quay quanh trục) | tâm | P1 | |
| Mặt Trăng | hấp dẫn, quỹ đạo | — | tâm | P2 | |
| Mặt Trời | hệ Mặt Trời, bức xạ | — | tâm | P2 | |
| Hành tinh (chung, có vành) | định luật Kepler | — | tâm | P3 | |
| Vệ tinh nhân tạo | chuyển động tròn, tốc độ vũ trụ | tấm pin (quay) | tâm | P2 | |
| Tàu vũ trụ / trạm vũ trụ | không trọng lượng | — | tâm | P3 | |
| Sao chổi, thiên thạch | quỹ đạo elip, va chạm | — | tâm | P3 | |

## 11. Người, phương tiện và bối cảnh đời sống

| Vật | Dùng ở | Bộ phận chuyển động | Điểm neo | Ưu tiên | Tham khảo |
|---|---|---|---|---|---|
| Người (đứng, đẩy, kéo, ngồi) | định luật Newton, công, bập bênh | tay, chân (quay) | bàn chân | P1 | `NewtonSecondLawRaceScene.tsx` (`drawPerson`), ảnh `public/simulations/bapbenh/man.png` |
| Ô tô | chuyển động, va chạm, động lượng | bánh (quay) | điểm giữa hai bánh, chạm đường | P1 | |
| Xe máy / xe đạp | chuyển động, ròng rọc truyền động | bánh, bàn đạp (quay) | chạm đường | P2 | |
| Tàu hoả (đầu máy + toa) | chuyển động tương đối, va chạm | bánh (quay) | chạm ray | P3 | |
| Thuyền / tàu thuỷ | lực đẩy Archimedes, vận tốc tương đối | — | đáy thân | P2 | |
| Máy bay | lực nâng, ném vật từ máy bay | cánh quạt (quay) | tâm | P3 | |
| Khinh khí cầu | lực đẩy Archimedes trong khí | — | giỏ | P3 | |
| Cầu trượt / ván trượt / đu quay | cơ năng, chuyển động tròn | đu quay (quay) | chân | P3 | |
| Toà nhà / cột / tháp (điểm ném từ trên cao) | rơi tự do, ném ngang | — | chân | P2 | |
| Cây, đồi, mặt đường (nền phong cảnh) | bối cảnh ngoài trời | — | mép dưới | P3 | |
| Đập nước + tuabin | thế năng, máy phát | tuabin (quay) | chân đập | P3 | |

---

## Hiện tượng (đi qua `metrics.items`, không phải vật)

Liệt kê ở đây để khỏi lẫn với vật. Mỗi `kind` là một hình nhỏ, vẽ bằng `drawItems` (`fe/neviadlike_structure/shared/draw-items.ts`).

| `kind` gợi ý | Dùng ở |
|---|---|
| tia sáng (đoạn thẳng có hướng) | phản xạ, khúc xạ, thấu kính |
| chấm sáng / vân sáng trên màn | giao thoa, nhiễu xạ |
| vệt hạt (điểm của đường đi) | buồng sương, quỹ đạo hạt trong từ trường |
| chớp sáng trên màn huỳnh quang | Rutherford |
| phân tử khí đang bay | khí lí tưởng, áp suất, khuếch tán |
| hạt alpha, beta, photon, neutron đang bay (chùm) | phóng xạ, phân hạch |
| electron trôi trong dây dẫn | dòng điện |
| giọt nước, bọt khí, hơi nước | sôi, ngưng tụ |
| mảnh vỡ | va chạm, nổ |
| tia lửa điện | tĩnh điện, đóng ngắt mạch |
| ngọn lửa, khói | đốt, đun |
| sóng âm (vòng nén–giãn) | truyền âm |
| mạt sắt | từ phổ |
| điểm vết (dấu chấm theo thời gian) | băng giấy ghi chuyển động |

## Thứ tự làm đề xuất

1. **Đợt 1 (P1 của mục 1–3 và 6):** giá thí nghiệm, xà treo, thước thẳng, thước đo góc, đồng hồ bấm giây, cổng quang điện, lực kế, quả nặng, khối gỗ, viên bi, xe lăn, máng, mặt nghiêng, ròng rọc, lò xo, con lắc đơn, pin, khoá K, điện trở, biến trở, bóng đèn, ampe kế/vôn kế/điện kế (một khung, ba mặt số). Phần lớn bài cơ học và điện cần các vật này.
2. **Đợt 2 (P1 của mục 4, 5, 7, 8, 9):** âm thoa, loa, cần rung, khay sóng, nguồn sáng, laser, gương, thấu kính, lăng kính, khe Young, màn, nam châm, la bàn, ống dây, khung dây, đèn cồn, cốc, nhiệt lượng kế, xi lanh–pít tông, nhiệt kế, áp kế, các hạt (electron, proton, neutron, alpha, photon), mô hình Bohr, phân tử nước, nguồn phóng xạ.
3. **Đợt 3:** P2, rồi đến P3 khi có bài cần.
