/** Public mount. Must match `basePath` / `assetPrefix` in next.config.ts. */
export const BASE_PATH = "/maintenance";

/** Prefix root-absolute fetch and location URLs. Leave React Router paths alone. */
export function withBase(path: string) {
  return path.startsWith("/") ? `${BASE_PATH}${path}` : path;
}
