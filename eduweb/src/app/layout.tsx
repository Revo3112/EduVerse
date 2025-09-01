import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThirdwebProvider } from "thirdweb/react";
import { ThemeProvider } from "../components/theme-provider";
import { SidebarLayout } from "../components/sidebar-layout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduVerse - Web3 Educational Platform",
  description: "Decentralized educational platform powered by blockchain technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThirdwebProvider>
            <SidebarLayout>
              {children}
            </SidebarLayout>
          </ThirdwebProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
