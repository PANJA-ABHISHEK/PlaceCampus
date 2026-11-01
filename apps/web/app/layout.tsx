import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteConfig } from "@/config/site";
import "./globals.css";

import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="font-sans"
    >
      <body className="min-h-screen bg-[hsl(var(--background))] antialiased">
        <Providers>
          <ToastProvider>
            <TooltipProvider delayDuration={200}>
              <div className="relative flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <ToastViewport />
            </TooltipProvider>
          </ToastProvider>
        </Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
