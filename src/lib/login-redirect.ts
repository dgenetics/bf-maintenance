/**
 * Where a signed-out page request should go.
 * Same host → `/login?next=<path>`. A request whose public host is not AiEA
 * (standalone bf-maintenance.vercel.app, or bf's own port in local dev)
 * is sent to `{AIEA_URL}/login` so the browser lands on AiEA's login.
 */

export type LoginRedirectInput = {
  /** nextUrl.pathname, with or without the /maintenance base path. */
  pathname: string;
  basePath: string;
  /** nextUrl.search, including the leading ? when present. */
  search: string;
  host: string | null;
  forwardedHost: string | null;
  forwardedProto: string | null;
  /** nextUrl.protocol, such as "http:". */
  protocol: string;
  aieaUrl: string | null;
};

function firstToken(value: string | null): string | null {
  if (!value) return null;
  const token = value.split(",")[0]?.trim() ?? "";
  return token || null;
}

function originOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/** Path + query to put in `next`, always including the public base path. */
export function nextPath(
  pathname: string,
  basePath: string,
  search: string,
): string {
  const query = search ? (search.startsWith("?") ? search : `?${search}`) : "";
  const base = basePath && basePath !== "/" ? basePath.replace(/\/$/, "") : "";
  const raw = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return `${base || "/"}${query}`;
  }
  let full = raw;
  if (base && raw !== base && !raw.startsWith(`${base}/`)) {
    full = raw === "/" ? base : `${base}${raw}`;
  }
  if (full.startsWith("//") || full.includes("\\")) {
    return `${base || "/"}${query}`;
  }
  return `${full}${query}`;
}

export function loginRedirectUrl(input: LoginRedirectInput): string {
  const next = nextPath(input.pathname, input.basePath, input.search);
  const aieaOrigin = originOf(input.aieaUrl);
  const aieaHost = hostOf(input.aieaUrl);
  const publicHost = (
    firstToken(input.forwardedHost) ||
    firstToken(input.host) ||
    "localhost"
  ).toLowerCase();
  const proto =
    (firstToken(input.forwardedProto) || input.protocol || "https").replace(
      /:$/,
      "",
    ) || "https";

  const sameHost = !aieaOrigin || (aieaHost !== null && publicHost === aieaHost);
  const origin = sameHost ? `${proto}://${publicHost}` : aieaOrigin!;
  const url = new URL("/login", origin);
  url.searchParams.set("next", next);
  return url.toString();
}
