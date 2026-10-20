import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PREFS_INLINE_SCRIPT } from "@/lib/prefs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Anchor: find the barbershops of every community",
    template: "%s | Anchor",
  },
  description:
    "Anchor shows health workers where high blood pressure goes untreated, and which local places people there already love and trust. Built on CDC data, Qloo taste data and a landmark NEJM study.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfa" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1116" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script sets data-theme and data-layer before paint, so the
    // server markup and the DOM can differ on <html> attributes only.
    <html lang="en" data-layer="simple" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_INLINE_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-bg text-text antialiased">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
