import type { Metadata, Viewport } from "next";
import { SiteNav } from "@/components/site-nav";
import { getSessionUser } from "@/lib/auth";
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
    icon: "/favicon.svg",
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <html lang="en" className="h-full">
      <body>
        <SiteNav signedIn={Boolean(user)} zone="maintenance" />
        <div className="min-h-0 w-full flex-1">{children}</div>
      </body>
    </html>
  );
}
