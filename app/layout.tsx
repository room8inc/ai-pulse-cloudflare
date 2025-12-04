import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Pulse - AI News Aggregator",
  description: "Automated AI Update & User Voice Collector",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

