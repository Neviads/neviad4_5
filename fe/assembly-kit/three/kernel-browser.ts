/**
 * Nạp lõi manifold trong trình duyệt từ public/wasm (bản sao của node_modules/manifold-3d): import thẳng URL tĩnh,
 * không qua bundler, nên WASM và nhánh mã dành cho Node của gói không bị đóng gói.
 */

import { initKernel } from "../shapes/kernel";

const URL_JS = "/wasm/manifold.js";

export const loadBrowserKernel = () => initKernel(() => import(/* webpackIgnore: true */ /* turbopackIgnore: true */ URL_JS));
