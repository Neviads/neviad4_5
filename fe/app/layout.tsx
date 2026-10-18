import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import IconProvider from "@/components/IconProvider";

const linuxLibertine = localFont({
  variable: "--font-libertine",
  display: "swap",
  src: [
    { path: "./fonts/SVN-Linux Libertine regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/SVN-Linux Libertine bold.ttf", weight: "700", style: "normal" },
    { path: "./fonts/SVN-Linux Libertine Italic.ttf", weight: "400", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: "NEVIAD4 Physics",
  description: "AI workspace for Physics teachers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      className={`${linuxLibertine.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><IconProvider>{children}</IconProvider></body>
    </html>
  );
}
