import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loginRedirectUrl, nextPath } from "./login-redirect";

describe("nextPath", () => {
  it("prefixes the maintenance base path", () => {
    assert.equal(
      nextPath("/schedules", "/maintenance", "?add=1"),
      "/maintenance/schedules?add=1",
    );
  });

  it("does not double-prefix", () => {
    assert.equal(
      nextPath("/maintenance/assets/abc", "/maintenance", ""),
      "/maintenance/assets/abc",
    );
  });

  it("uses the base path for the zone root", () => {
    assert.equal(nextPath("/", "/maintenance", ""), "/maintenance");
  });

  it("rejects protocol-relative and backslash paths", () => {
    assert.equal(nextPath("//evil.com", "/maintenance", ""), "/maintenance");
    assert.equal(nextPath("/foo\\bar", "/maintenance", ""), "/maintenance");
  });
});

describe("loginRedirectUrl", () => {
  const base = {
    pathname: "/schedules",
    basePath: "/maintenance",
    search: "",
    host: "aiea-cyan.vercel.app",
    forwardedHost: null,
    forwardedProto: "https",
    protocol: "https:",
    aieaUrl: "https://aiea-cyan.vercel.app",
  };

  it("stays on AiEA's host and encodes next", () => {
    const url = new URL(loginRedirectUrl(base));
    assert.equal(url.origin, "https://aiea-cyan.vercel.app");
    assert.equal(url.pathname, "/login");
    assert.equal(url.searchParams.get("next"), "/maintenance/schedules");
  });

  it("sends the standalone bf host to AiEA", () => {
    const url = new URL(
      loginRedirectUrl({
        ...base,
        host: "bf-maintenance.vercel.app",
        forwardedHost: "bf-maintenance.vercel.app",
      }),
    );
    assert.equal(url.origin, "https://aiea-cyan.vercel.app");
    assert.equal(url.pathname, "/login");
    assert.equal(url.searchParams.get("next"), "/maintenance/schedules");
  });

  it("uses the public host when it is already AiEA", () => {
    const url = new URL(
      loginRedirectUrl({
        ...base,
        host: "127.0.0.1:3101",
        forwardedHost: "127.0.0.1:3100",
        forwardedProto: "http",
        protocol: "http:",
        aieaUrl: "http://127.0.0.1:3100",
        pathname: "/",
      }),
    );
    assert.equal(url.origin, "http://127.0.0.1:3100");
    assert.equal(url.searchParams.get("next"), "/maintenance");
  });

  it("points a direct bf port at AiEA's login", () => {
    const url = new URL(
      loginRedirectUrl({
        ...base,
        host: "127.0.0.1:3100",
        forwardedHost: null,
        forwardedProto: null,
        protocol: "http:",
        aieaUrl: "http://127.0.0.1:3000",
      }),
    );
    assert.equal(url.origin, "http://127.0.0.1:3000");
    assert.equal(url.pathname, "/login");
  });
});
