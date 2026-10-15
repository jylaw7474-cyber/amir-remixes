import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

const heebo = Heebo({ variable: "--font-heebo", subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  title: "AMIR REMIXES",
  description: "סטודיו מוזיקה אישי",
};

/** No pinch/focus zoom: on phones the page stays exactly screen-wide */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a2219",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col overflow-x-hidden font-sans">
        <Header />
        <main className="mx-auto w-full min-w-0 max-w-4xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
