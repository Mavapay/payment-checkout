import type { Metadata } from "next";
import "./globals.css";

import { Geist, Geist_Mono, Inter } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mavapay Checkout",
  description: "Receive payments from your customers using Mavapay",
  icons: {
    icon: "/icons/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        {children}
        <Toaster
          toastOptions={{
            style: {
              background: "#16a34a",
              color: "#ffffff",
              border: "1px solid #16a34a",
            },
          }}
        />
      </body>
    </html>
  );
}
