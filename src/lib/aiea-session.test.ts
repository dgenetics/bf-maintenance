import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSessionBody } from "./aiea-session";

const now = Date.parse("2026-10-13T12:00:00.000Z");

describe("parseSessionBody", () => {
  it("accepts the GET /api/session contract", () => {
    const parsed = parseSessionBody(
      {
        user: { id: "u1", email: "a@b.co", name: "Ada" },
        expiresAt: "2026-11-12T12:00:00.000Z",
      },
      now,
    );
    assert.equal(parsed.kind, "ok");
    if (parsed.kind === "ok") {
      assert.deepEqual(parsed.user, { id: "u1", email: "a@b.co", name: "Ada" });
    }
  });

  it("treats an expired expiresAt as signed out", () => {
    const parsed = parseSessionBody(
      {
        user: { id: "u1", email: "a@b.co", name: "Ada" },
        expiresAt: "2026-10-13T11:59:00.000Z",
      },
      now,
    );
    assert.equal(parsed.kind, "signed-out");
  });

  it("rejects a body that is missing the user", () => {
    assert.equal(parseSessionBody({ expiresAt: "2026-11-12T12:00:00.000Z" }, now).kind, "unavailable");
  });

  it("rejects a user missing name", () => {
    assert.equal(
      parseSessionBody(
        {
          user: { id: "u1", email: "a@b.co" },
          expiresAt: "2026-11-12T12:00:00.000Z",
        },
        now,
      ).kind,
      "unavailable",
    );
  });
});
