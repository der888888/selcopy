import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["500", "600", "700", "800"],
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
  const bodyStyle = {
    ["--font-display"]: "var(--font-syne), Pretendard, sans-serif",
  } as CSSProperties;

  return (
    <html lang="ko" className={`${syne.variable} h-full`}>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full antialiased" style={bodyStyle}>
        {children}
      </body>
    </html>
  );
}
