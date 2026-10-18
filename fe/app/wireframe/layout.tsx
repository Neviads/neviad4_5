import { WireframeShell } from "@/components/wireframe";

export default function WireframeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <WireframeShell>{children}</WireframeShell>;
}
