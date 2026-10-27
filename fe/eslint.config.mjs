import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  // public/wasm: bản sao nguyên văn của manifold-3d (lõi hình khối), không phải mã của repo
  globalIgnores([".next/**", "node_modules/**", "public/wasm/**"]),
]);
