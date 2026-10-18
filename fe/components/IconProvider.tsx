"use client";

import type { ReactNode } from "react";
import { IconContext } from "@phosphor-icons/react";

// Mọi icon Phosphor trong web dùng nét đậm (bold) cho dễ nhìn ở cỡ nhỏ.
const ICON_STYLE = { weight: "bold" } as const;

export default function IconProvider({ children }: { children: ReactNode }) {
  return <IconContext.Provider value={ICON_STYLE}>{children}</IconContext.Provider>;
}
