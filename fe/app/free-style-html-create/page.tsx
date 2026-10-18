import Studio from "./Studio";

// Xưởng tạo vật bằng code: gõ yêu cầu, Claude viết vật thành HTML (SVG/Canvas) và tự xem ảnh chụp để sửa cho giống thật.
export default function FreeStyleHtmlCreatePage() {
  return <main className="flex h-dvh flex-col bg-[#f5f1ec]">
    <header className="border-b border-[#e8e2d9] bg-white px-4 py-3 sm:px-6">
      <h1 className="text-[18px] font-semibold text-[#171717]">Tạo vật bằng code</h1>
      <p className="mt-0.5 text-[13px] text-[#6b6b6b]">Gõ yêu cầu; Claude viết vật bằng HTML (SVG hoặc Canvas), xem ảnh chụp từ chính trình duyệt này rồi sửa tới khi giống thật. Vật chạy trong khung cô lập.</p>
    </header>
    <Studio worker="Claude" emptyHint="Chưa có vật nào. Gửi một yêu cầu bên trái rồi nhắn Claude làm."
      note={<>Yêu cầu nằm chờ ở đây. Claude nhận khi bạn nhắn trong Claude Code, ví dụ “làm yêu cầu trên trang”, hoặc khi đang chạy <code>/loop</code>.</>} />
  </main>;
}
