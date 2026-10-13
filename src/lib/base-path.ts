/** Public mount. Must match `basePath` / `assetPrefix` in next.config.ts. */
export const BASE_PATH = "/maintenance";

/** Prefix root-absolute fetch and location URLs. Leave React Router paths alone. */
export function withBase(path: string) {
  return path.startsWith("/") ? `${BASE_PATH}${path}` : path;
}

/** AiEA login on this host. `next` is the current path, including basePath. */
export function loginHref(nextPath?: string) {
  const next =
    nextPath ??
    (typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : BASE_PATH);
  return `/login?next=${encodeURIComponent(next)}`;
}
