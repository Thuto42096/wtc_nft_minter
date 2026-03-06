import type { Metadata } from "next";
import { Geist_Mono, Press_Start_2P } from "next/font/google";

import { Providers } from "./providers";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "WTC Pixel Vault",
  description: "Retro WTC NFT minting and staking frontend for Sepolia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistMono.variable} ${pressStart.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
