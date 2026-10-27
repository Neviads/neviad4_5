import Studio from "./Studio";

// Xưởng lắp ráp 3D: Claude dựng vật bằng bộ phận + ràng buộc qua MCP neviad-assembly; trang này hiện bản lắp ráp
// và chụp ảnh 4 góc cho Claude xem.
export default function AssemblyStudioPage() {
  return (
    <main className="flex h-dvh flex-col bg-[#1d2129] text-[#e9ecf1]">
      <header className="border-b border-white/10 px-4 py-3 sm:px-6">
        <h1 className="text-[18px] font-semibold">Lắp ráp 3D</h1>
        <p className="mt-0.5 text-[13px] text-[#aab2bd]">
          Claude chọn bộ phận trong thư viện và nói chúng ghép vào nhau thế nào (MCP <code>neviad-assembly</code>); bộ giải tính vị trí. Để trang này mở thì Claude mới xem được ảnh chụp.
        </p>
      </header>
      <Studio />
    </main>
  );
}
