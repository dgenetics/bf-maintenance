#!/usr/bin/env node
/**
 * Local stand-in for AiEA in front of bf-maintenance.
 *
 * The browser talks to --public-port. This process:
 * - serves AiEA's session contract (GET /api/session, POST /api/auth/login|logout,
 *   GET /api/auth/me, GET /login) for the smoke user
 * - proxies everything else to bf on --bf-port, with x-forwarded-host set to
 *   the public host so bf's signed-out redirect stays on this origin
 *
 * Not used in production. Production calls the real AiEA GET /api/session.
 */
import { spawn } from "node:child_process";
import { createServer, request as httpRequest } from "node:http";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../../..");

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const publicPort = Number(arg("--public-port", "3100"));
const bfPort = Number(arg("--bf-port", String(publicPort + 1)));
const bfPidFile = arg("--bf-pidfile", "");

const sessions = new Map();

function smokeUser() {
  const email = (process.env.AIEA_SMOKE_EMAIL || "verify@beausoleil.test")
    .toLowerCase()
    .trim();
  return {
    id: "verify-user",
    email,
    name: "Verify User",
    password: process.env.AIEA_SMOKE_PASSWORD || "verify-pass-1234",
  };
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c],
  );
}

function safeNext(raw) {
  if (
    typeof raw !== "string" ||
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.includes("\\")
  ) {
    return "/tasks";
  }
  return raw;
}

function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) === name) {
      return decodeURIComponent(trimmed.slice(eq + 1));
    }
  }
  return null;
}

function sessionRow(req) {
  const token = readCookie(req, "aiea_session");
  if (!token) return null;
  return sessions.get(token) || null;
}

function setSessionCookie(token) {
  const maxAge = 60 * 60 * 24 * 30;
  return `aiea_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearSessionCookie() {
  return "aiea_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0";
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const ct = String(req.headers["content-type"] || "");
      if (ct.includes("application/json")) {
        try {
          resolve({ json: true, data: raw ? JSON.parse(raw) : {} });
        } catch {
          resolve({ json: true, data: null });
        }
        return;
      }
      const params = new URLSearchParams(raw);
      resolve({ json: false, data: Object.fromEntries(params.entries()) });
    });
    req.on("error", reject);
  });
}

function send(res, status, body, headers = {}) {
  const payload =
    typeof body === "string" ? body : JSON.stringify(body ?? {});
  const isJson = typeof body !== "string";
  res.writeHead(status, {
    "content-type": isJson
      ? "application/json; charset=utf-8"
      : "text/html; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  res.end(payload);
}

function loginPage(next, error) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sign in · Farm Manager</title>
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f7f3eb;font-family:Segoe UI,system-ui,sans-serif;color:#1c1917">
  <main style="width:100%;max-width:22rem;background:#fff;border:1px solid #ebe4d6;border-radius:1rem;padding:1.5rem">
    <p style="margin:0;font-size:0.65rem;letter-spacing:0.18em;text-transform:uppercase;color:#78716c;text-align:center">Farm Manager</p>
    <h1 style="margin:0.25rem 0 0;font-size:1.15rem;text-align:center">Sign in</h1>
    <p style="margin:0.35rem 0 1rem;font-size:0.85rem;color:#78716c;text-align:center">Use your AiEA account</p>
    <form method="post" action="/api/auth/login">
      <input type="hidden" name="next" value="${esc(next)}" />
      <label style="display:block;font-size:0.75rem;color:#78716c;margin-bottom:0.75rem">Email
        <input id="email" name="email" type="email" autocomplete="email" required aria-label="Email" style="display:block;width:100%;margin-top:0.25rem;box-sizing:border-box;padding:0.55rem 0.7rem;border:1px solid #ebe4d6;border-radius:0.75rem" />
      </label>
      <label style="display:block;font-size:0.75rem;color:#78716c;margin-bottom:0.75rem">Password
        <input id="password" name="password" type="password" autocomplete="current-password" required aria-label="Password" style="display:block;width:100%;margin-top:0.25rem;box-sizing:border-box;padding:0.55rem 0.7rem;border:1px solid #ebe4d6;border-radius:0.75rem" />
      </label>
      ${error ? `<p style="color:#b91c1c;font-size:0.75rem;text-align:center">${esc(error)}</p>` : ""}
      <button type="submit" style="width:100%;padding:0.6rem 0.8rem;border:0;border-radius:0.75rem;background:#2d4a3e;color:#fdfbf7;font-weight:600">Sign in</button>
    </form>
  </main>
</body>
</html>`;
}

function issueSession() {
  const user = smokeUser();
  const token = randomBytes(32).toString("hex");
  const expiresAtMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
  sessions.set(token, {
    user: { id: user.id, email: user.email, name: user.name },
    expiresAtMs,
  });
  return token;
}

async function handleLocal(req, res, url) {
  if (req.method === "GET" && url.pathname === "/login") {
    send(res, 200, loginPage(safeNext(url.searchParams.get("next")), null));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/session") {
    const row = sessionRow(req);
    if (!row) {
      send(res, 401, { error: "Unauthorized" });
      return true;
    }
    send(res, 200, {
      user: row.user,
      expiresAt: new Date(row.expiresAtMs).toISOString(),
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    const row = sessionRow(req);
    const signedIn = Boolean(row && row.expiresAtMs > Date.now());
    send(res, 200, { signedIn });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    const token = readCookie(req, "aiea_session");
    if (token) sessions.delete(token);
    send(res, 200, { ok: true }, { "set-cookie": clearSessionCookie() });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/__verify/expire") {
    const token = readCookie(req, "aiea_session");
    const row = token ? sessions.get(token) : null;
    if (!row) {
      send(res, 404, { error: "No session" });
      return true;
    }
    row.expiresAtMs = Date.now() - 60_000;
    send(res, 200, { ok: true, expiresAt: new Date(row.expiresAtMs).toISOString() });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readBody(req);
    const data = body.data;
    if (!data || typeof data !== "object") {
      send(res, 400, { error: "Invalid input" });
      return true;
    }
    const user = smokeUser();
    const email = String(data.email || "").toLowerCase().trim();
    const password = String(data.password || "");
    const ok = Boolean(email) && email === user.email && password === user.password;
    if (!ok) {
      if (body.json) {
        send(res, 401, { error: "Invalid email or password" });
      } else {
        send(
          res,
          401,
          loginPage(safeNext(data.next), "Invalid email or password"),
        );
      }
      return true;
    }
    const token = issueSession();
    const cookie = setSessionCookie(token);
    if (body.json) {
      send(
        res,
        200,
        { ok: true, user: { id: user.id, email: user.email, name: user.name } },
        { "set-cookie": cookie },
      );
    } else {
      res.writeHead(302, {
        location: safeNext(data.next),
        "set-cookie": cookie,
        "cache-control": "no-store",
      });
      res.end();
    }
    return true;
  }

  return false;
}

function proxyToBf(req, res) {
  const headers = { ...req.headers, host: `127.0.0.1:${bfPort}` };
  headers["x-forwarded-host"] = req.headers.host || `127.0.0.1:${publicPort}`;
  headers["x-forwarded-proto"] = "http";
  delete headers.connection;
  const upstream = httpRequest(
    {
      hostname: "127.0.0.1",
      port: bfPort,
      path: req.url,
      method: req.method,
      headers,
    },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain" });
    }
    res.end("upstream unavailable");
  });
  req.pipe(upstream);
}

function listen() {
  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", `http://127.0.0.1:${publicPort}`);
    void handleLocal(req, res, url)
      .then((handled) => {
        if (!handled) proxyToBf(req, res);
      })
      .catch((err) => {
        console.error(err);
        if (!res.headersSent) send(res, 500, { error: "door error" });
      });
  });
  server.listen(publicPort, "127.0.0.1", () => {
    console.log(`door listening http://127.0.0.1:${publicPort} -> bf :${bfPort}`);
  });
  return server;
}

async function waitForBf() {
  const url = `http://127.0.0.1:${bfPort}/maintenance`;
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if ([200, 302, 307, 308].includes(res.status)) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`bf did not become ready on :${bfPort}`);
}

const child = spawn(
  "npm",
  ["run", "start", "--", "-p", String(bfPort), "-H", "127.0.0.1"],
  {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PORT: String(bfPort),
      AIEA_URL: `http://127.0.0.1:${publicPort}`,
    },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
child.stdout?.pipe(process.stdout);
child.stderr?.pipe(process.stderr);
if (bfPidFile && child.pid) writeFileSync(bfPidFile, String(child.pid));

let stopping = false;
function killChild() {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {
      /* already gone */
    }
  }
}
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  killChild();
  setTimeout(() => process.exit(code), 300).unref();
}
process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));
child.on("exit", (code) => {
  if (!stopping) {
    console.error(`bf exited ${code}`);
    process.exit(code ?? 1);
  }
});

try {
  await waitForBf();
  console.log(`bf ready on :${bfPort}`);
  listen();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  shutdown(1);
}
