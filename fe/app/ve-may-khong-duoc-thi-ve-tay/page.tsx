import FreeDraw from "./FreeDraw";

// Vẽ máy không được thì vẽ tay: một bảng vẽ tự do, dụng cụ duy nhất là cái bút.
export default function VeTayPage() {
  return <main className="flex h-dvh flex-col bg-[#f5f1ec]">
    <header className="border-b border-[#e8e2d9] bg-white px-4 py-3 sm:px-6">
      <h1 className="text-[18px] font-semibold text-[#171717]">Vẽ tay</h1>
      <p className="mt-0.5 text-[13px] text-[#6b6b6b]">Bảng vẽ tự do trên nền giống cảnh mô phỏng. Một dụng cụ: cái bút. Bút cảm ứng có lực ấn thì nét to nhỏ theo lực.</p>
    </header>
    <FreeDraw />
  </main>;
}
