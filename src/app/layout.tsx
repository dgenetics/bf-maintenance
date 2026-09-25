import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BF Maintenance · Beausoleil Farm",
  description:
    "Systems and components registry for Beausoleil Farm house and property",
  // Web App Manifest is what keeps iOS/Android home-screen launches inside
  // standalone when navigating between routes. appleWebApp alone is not enough:
  // without scope/start_url, the first paint stays standalone and the next
  // navigation falls into the browser chrome.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "BF Maint",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/pwa-192.png", sizes: "192x192", type: "image/png" }],
  },
};

/** Keep pinch-zoom. Next injects maximum-scale=1 unless userScalable is true — set it explicitly; never userScalable=false / maximumScale=1. */
export const viewport: Viewport = {
  themeColor: "#2d4a3e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
