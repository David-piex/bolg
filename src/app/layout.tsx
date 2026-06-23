import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, Comfortaa } from "next/font/google";
import "@/app/globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const comfortaa = Comfortaa({
  subsets: ["latin"],
  variable: "--font-comfortaa",
  weight: ["500", "700"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "绫奈",
  description: "绫奈的会员制内容相册、视频和动态空间。"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh" className={`${plusJakartaSans.variable} ${comfortaa.variable}`}>
      <body>{children}</body>
    </html>
  );
}
