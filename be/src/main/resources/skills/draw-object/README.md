# Skill `draw-object`: cách dùng

Skill này là một **module kiến thức** cho agent sinh sản phẩm: khi cần một vật thể mới ngoài danh mục hình có sẵn của thư viện mô phỏng, đưa skill vào prompt để model tạo ra một **vật thể thông minh**: hình đẹp đúng phong cách thư viện (`fe/components/simulations/renderers/mechanics/scene-konva-2d.tsx`) **và** logic riêng của vật (đầu vào, đầu ra, điểm nối, giới hạn).

Tư duy: vật là một thực thể có nghiệp vụ (như thực thể trong DDD). Cảnh chỉ nối các vật qua giao diện công khai của chúng. Định luật liên quan nhiều vật độc lập thuộc về engine, không thuộc vật (xem mục 3 của `SKILL.md`).

## Thành phần

| File | Vai trò |
|---|---|
| `SKILL.md` | Hợp đồng `SmartObject`, ranh giới vật/engine, cấu trúc mô hình–hình vẽ, bảng token, công thức hiệu ứng, quy trình, `selfTests`, checklist |

Khi chạy, prompt gồm **chỉ `SKILL.md`** rồi yêu cầu vật thể (có thể kèm gợi ý đầu vào/đầu ra). Skill không kèm ví dụ vật mẫu nào: khung JSON trong mục 1 dùng giá trị giữ chỗ `<...>` chứ không dùng một vật cụ thể.

## Hợp đồng đầu ra (rút gọn)

Model trả một JSON `{ name, shape, anchor, ports[], inputs[], outputs[], selfTests[], parts[], notes, code }`. `code` là một hàm TypeScript dựng `SmartObject`:

```ts
type SmartObject = {
  group: Konva.Group; pixelsPerMeter: number; ports: Record<string, Vec2>;
  inputs:  Record<string, { label; unit; min; max; default }>;
  outputs: Record<string, { label; unit }>;
  set(values): void;   // tự kẹp, tự cập nhật hình và ports
  get(): Record<string, number>;   // đầu vào hiện tại
  read(): Record<string, number>;  // đại lượng suy ra
};
```

## Dùng thủ công

Gọi với `AiClient` (xem `infrastructure/ai/AiClient.java`):

```java
String prompt = skill + "\n\n# Yêu cầu\n\n" + request;
String json = aiClient.generate(prompt);   // JSON ràng buộc mặc định
```

## Phạm vi và giới hạn

- Chỉ phủ phong cách cảnh cơ học Konva (nền `#0f172a`). Hooke (SVG, nền `#071525`), Brownian (canvas) có phong cách riêng, chưa nằm trong skill.
- Cửa kiểm tra bắt lỗi **logic và hợp đồng**, không đánh giá hình có đẹp hay không: phần đó cần mắt người (hoặc `screenshot_check` về sau).
- `selfTests` do chính model viết, nên chỉ bắt được sai lệch giữa code và công thức độc lập mà model nêu; nếu model hiểu sai vật lý ở cả hai chỗ thì cửa này không bắt được.
- Việc ghép nhiều vật qua `ports` và định luật giữa các vật độc lập thuộc cảnh/engine, chưa có trong skill này.
- Bảng token lấy từ năm hàm vẽ thật của thư viện; nếu thư viện đổi bảng màu thì cập nhật `SKILL.md`. `fe/neviadlike_structure/objects/palette.ts` là bản sao của cùng bảng này (hợp đồng `objects/types.ts` ở đó vẫn là bản cũ, chưa chuyển sang `SmartObject`).
