import type { NextConfig } from "next";
import { BASE_PATH } from "./src/lib/base-path";

const nextConfig: NextConfig = {
  // Same value for both: Next assigns assetPrefix from basePath and does not concatenate them.
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,
  serverExternalPackages: [
    "@prisma/client",
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "@prisma/adapter-libsql",
    "@libsql/client",
  ],
  async redirects() {
    return [
      {
        // Host root and installed-app bookmarks. basePath: false so this matches
        // "/" and not "/maintenance" (which would loop).
        source: "/",
        destination: "/maintenance",
        permanent: false,
        basePath: false,
      },
      {
        // TEMPORARY. Delete after AiEA's BF_MAINTENANCE_URL is
        // https://bf-maintenance.vercel.app/maintenance (no trailing slash).
        // Until then AiEA still calls /api/integrations/suggestions and
        // /api/integrations/tasks/complete|reopen on this host.
        //
        // This wants to be a rewrite, but Next 16 rejects an internal
        // destination when basePath is false (invalid-external-rewrite).
        // A 307 keeps the method and body; fetch follows it.
        source: "/api/integrations/:path*",
        destination: "/maintenance/api/integrations/:path*",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
