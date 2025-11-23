import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import SessionProviderWrapper from "@/components/session-provider-wrapper";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "<3",
  description: "Next.js application",
  icons: {
    icon: [
      { url: "/ico.png", media: "(prefers-color-scheme: light)" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.className} ${geistMono.className}`}>
      <body className="font-sans antialiased pb-20">
        {/* 🔥 MUST HAVE: NextAuth Session Context */}
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>

        <Analytics />
      </body>
    </html>
  );
}
