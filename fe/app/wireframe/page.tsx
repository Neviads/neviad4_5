import { PageHeader, RouteCard, WireframeNote } from "@/components/wireframe";
import { wireframeRoutes } from "@/components/wireframe-data";

export default function WireframeIndexPage() {
  return <div className="mx-auto max-w-7xl">
    <PageHeader eyebrow="NEVIAD / Design inventory" title="Wireframe workspace" description="Bộ wireframe low-fi cho luồng giáo viên mô tả yêu cầu, làm rõ thông tin và chuẩn bị nội dung. Các màn hình hiện là placeholder để review bố cục." action={<span className="rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-xs font-semibold text-[var(--muted)]">9 màn hình</span>} />
    <WireframeNote>Frontend này chỉ minh họa bố cục. Các nút điều hướng đưa tới những màn hình placeholder và chưa tạo dữ liệu thật.</WireframeNote>
    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{wireframeRoutes.map((route) => <RouteCard key={route.href} route={route} />)}</section>
  </div>;
}
