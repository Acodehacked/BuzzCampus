import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { TooltipProvider, Toaster } from "@buzz/ui";
import { TRPCProvider } from "../lib/trpc/client";
import "./globals.css";

// General Sans isn't served by Google Fonts; Space Grotesk is the fallback
// the design system names for exactly this case (DESIGN_SYSTEM.md §2).
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Buzz — one campus feed",
    template: "%s · Buzz",
  },
  description:
    "One campus feed. Every need and every offer to help — a broken AC, an hour of tutoring, a missing teammate — is the same kind of post: an Ask or a Give.",
  applicationName: "Buzz",
};

export const viewport: Viewport = {
  themeColor: "#0E1116",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${inter.variable} ${plexMono.variable}`}
    >
      <body>
        <SessionProvider>
          <TRPCProvider>
            <TooltipProvider delayDuration={200} skipDelayDuration={300}>
              <Toaster>{children}</Toaster>
            </TooltipProvider>
          </TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
