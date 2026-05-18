import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  weight: ["700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nigelrimando.com"),
  title: "Nigel Rimando — Data Professional & Consultant",
  description: "Data, Stats, Fitness, Padel, and Milk Tea",
  openGraph: {
    title: "Nigel Rimando — Data Professional & Consultant",
    description: "Data, Stats, Fitness, Padel, and Milk Tea",
    url: "https://nigelrimando.com",
    siteName: "Nigel Rimando",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Nigel Rimando — Data Professional & Consultant",
    description: "Data, Stats, Fitness, Padel, and Milk Tea",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable} ${jetbrainsMono.variable} scroll-smooth`}
    >
      <body className="bg-bg text-text antialiased font-sans">{children}</body>
    </html>
  );
}
