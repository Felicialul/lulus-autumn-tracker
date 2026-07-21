import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host") || "autumn-application-tracker.nildiaz908.chatgpt.site";
  const protocol = headerStore.get("x-forwarded-proto") || "https";
  const origin = `${protocol}://${host}`;
  return {
    title: "秋招投递管家",
    description: "投递、面试、Offer，一处管理。跨设备同步的个人秋招工作台。",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title: "秋招投递管家", description: "投递、面试、Offer，一处管理。", images: [{ url: `${origin}/og.png`, width: 1536, height: 910 }] },
    twitter: { card: "summary_large_image", title: "秋招投递管家", description: "投递、面试、Offer，一处管理。", images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
