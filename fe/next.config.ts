import path from "node:path";
import type { NextConfig } from "next";

// Ports and backend URLs live in the repository's root .env, shared with the backend and scripts/start.*.
// Variables already set in the environment win over the file.
try {
  process.loadEnvFile(path.resolve(process.cwd(), "..", ".env"));
} catch {
  // No root .env: rely on the environment.
}

const backendPort = process.env.APP_PORT || "8080";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || `http://localhost:${backendPort}`,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || `ws://localhost:${backendPort}/ws`,
  },
  // Lưới nướng sẵn của các route 3D: tên tệp là băm nội dung, nên trình duyệt giữ mãi được (không tải lại 15 MB mỗi lần mở trang)
  async headers() {
    return [{ source: "/assembly-meshes/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
  },
};

export default nextConfig;
