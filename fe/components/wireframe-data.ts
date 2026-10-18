export type WireframeRoute = {
  href: string;
  label: string;
  description: string;
  group: "workspace" | "agent" | "support";
};

export const wireframeRoutes: WireframeRoute[] = [
  {
    href: "/wireframe/simu-gen",
    label: "SimuGen AI",
    description: "Trò chuyện với agent để tạo nội dung tương tác.",
    group: "agent",
  },
  {
    href: "/wireframe/dashboard",
    label: "Dashboard",
    description: "Trang tổng quan cho công việc của giáo viên.",
    group: "workspace",
  },
  {
    href: "/wireframe/experiment/create",
    label: "Tạo thí nghiệm",
    description: "Mô tả ý tưởng và bối cảnh thí nghiệm.",
    group: "agent",
  },
  {
    href: "/wireframe/experiment/clarify",
    label: "Làm rõ yêu cầu",
    description: "Agent hỏi thêm thông tin còn thiếu.",
    group: "agent",
  },
  {
    href: "/wireframe/experiment/review",
    label: "Review thí nghiệm",
    description: "Giáo viên xem và chỉnh sửa proposal.",
    group: "agent",
  },
  {
    href: "/wireframe/experiment/safety",
    label: "Kiểm tra an toàn",
    description: "Cảnh báo rủi ro và điều kiện thực hiện.",
    group: "agent",
  },
  {
    href: "/wireframe/experiment/simulation",
    label: "Preview mô phỏng",
    description: "Xem preview và các tham số được agent đề xuất.",
    group: "agent",
  },
  {
    href: "/wireframe/lesson",
    label: "Lesson plan",
    description: "Đặt thí nghiệm vào giáo án.",
    group: "workspace",
  },
  {
    href: "/wireframe/slide",
    label: "Slide",
    description: "Chuyển nội dung bài học thành slide.",
    group: "workspace",
  },
  {
    href: "/wireframe/library",
    label: "Personal library",
    description: "Lưu và tái sử dụng tài liệu.",
    group: "support",
  },
];
