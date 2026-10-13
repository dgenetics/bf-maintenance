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
};

export default nextConfig;
