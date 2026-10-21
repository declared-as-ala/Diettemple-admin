import type { Metadata } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "DietTemple Admin Dashboard",
  description: "Admin dashboard for DietTemple - Premium Fitness Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body suppressHydrationWarning>
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('diettemple-theme') || 'light';
                  const root = document.documentElement;
                  const body = document.body;
                  root.classList.remove('light', 'dark');
                  body.classList.remove('light', 'dark');
                  root.classList.add(theme);
                  body.classList.add(theme);
                  root.style.colorScheme = theme;
                } catch (e) {
                  console.error('Theme script error:', e);
                }
              })();
            `,
          }}
        />
        <ThemeProvider defaultTheme="light" storageKey="diettemple-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
