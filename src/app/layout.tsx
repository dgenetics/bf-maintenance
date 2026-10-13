import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { SiteNav } from "@/components/site-nav";
import { BASE_PATH } from "@/lib/base-path";
import "./globals.css";

export const metadata: Metadata = {
  title: "BF Maintenance · Beausoleil Farm",
  description:
    "Systems and components registry for Beausoleil Farm house and property",
  appleWebApp: {
    capable: true,
    title: "BF Maint",
    statusBarStyle: "default",
  },
  icons: {
    // Metadata icon strings are not prefixed by basePath (confirmed in the HTML).
    // public/favicon.svg is served at /maintenance/favicon.svg.
    icon: `${BASE_PATH}/favicon.svg`,
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
      <body>
        <Suspense
          fallback={
            <div
              className="min-h-10 bg-[#12141c] safe-top"
              aria-hidden="true"
            />
          }
        >
          <SiteNav zone="maintenance" />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
