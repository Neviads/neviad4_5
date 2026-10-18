"use client";

import dynamic from "next/dynamic";

// Konva cần `window`, nên hình vật chỉ chạy ở trình duyệt.
const DrawObjectStatic = dynamic(() => import("./DrawObjectGallery").then((module) => module.DrawObjectStatic), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-[#6b6b6b]">Đang tải canvas…</p>,
});

export default DrawObjectStatic;
