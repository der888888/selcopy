import type { Metadata } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "셀카피 | 스마트스토어·쿠팡 상세/광고 카피 AI",
  description:
    "상품명만 넣으면 상세페이지 초안, 광고 문구, 옵션명, 검색 키워드를 한 번에 생성합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${plex.variable} h-full`}>
      <body className={`${plex.className} min-h-full antialiased`}>
        {children}
      </body>
    </html>
  );
}
