import { NextResponse, type NextRequest } from "next/server";
import {
  SessionUnavailableError,
  verifyAieaSession,
} from "@/lib/aiea-session";
import { BASE_PATH } from "@/lib/base-path";
import { loginRedirectUrl } from "@/lib/login-redirect";

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/** Drop a leftover bf_session once. Later requests no longer send it. */
function clearLegacySession(response: NextResponse, request: NextRequest): NextResponse {
  if (!request.cookies.get("bf_session")) return response;
  response.cookies.set("bf_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

function isStaticPath(pathname: string): boolean {
  return (
    pathname.includes("/_next/") ||
    pathname.startsWith("/_next/") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

function redirectToLogin(request: NextRequest): NextResponse {
  const location = loginRedirectUrl({
    pathname: request.nextUrl.pathname,
    basePath: request.nextUrl.basePath || BASE_PATH,
    search: request.nextUrl.search,
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    protocol: request.nextUrl.protocol,
    aieaUrl:
      process.env.AIEA_URL?.trim() ||
      process.env.AIEA_BASE_URL?.trim() ||
      null,
  });
  const res = NextResponse.redirect(location, 302);
  res.headers.set("cache-control", "no-store");
  return clearLegacySession(res, request);
}

function cantVerify(request: NextRequest): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Can't verify sign-in</title>
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f7f3eb;color:#1c1917;font-family:Segoe UI,system-ui,sans-serif">
  <main style="max-width:24rem;padding:1.5rem;text-align:center">
    <p style="font-size:0.7rem;letter-spacing:0.18em;text-transform:uppercase;color:#78716c">Farm Manager</p>
    <h1 style="font-size:1.25rem;margin:0.5rem 0">Can't verify sign-in</h1>
    <p style="color:#78716c;font-size:0.9rem">AiEA didn't answer the session check. Wait a moment and try again.</p>
  </main>
</body>
</html>`;
  return clearLegacySession(
    new NextResponse(html, {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    }),
    request,
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isApiPath(pathname) || isStaticPath(pathname)) {
    return clearLegacySession(NextResponse.next(), request);
  }

  const token = request.cookies.get("aiea_session")?.value;
  if (!token) return redirectToLogin(request);

  try {
    const user = await verifyAieaSession(token);
    if (!user) return redirectToLogin(request);
    return clearLegacySession(NextResponse.next(), request);
  } catch (err) {
    if (!(err instanceof SessionUnavailableError)) {
      console.error("session verify failed");
    }
    return cantVerify(request);
  }
}

export const config = {
  matcher: [
    "/",
    "/((?!_next/static|_next/image|.*\\..*).*)",
  ],
};
