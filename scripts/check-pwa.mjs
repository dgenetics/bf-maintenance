#!/usr/bin/env node
/**
 * Assert PWA shell stays in-app: manifest scope/start_url/display + primary
 * nav hrefs are same-origin relative (no target=_blank on internal NavLinks).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fails = [];
function check(cond, msg) {
  if (!cond) fails.push(msg);
  else console.log(`  PASS ${msg}`);
}

const manifestPath = join(root, "public/manifest.webmanifest");
check(existsSync(manifestPath), "public/manifest.webmanifest exists");
const m = JSON.parse(readFileSync(manifestPath, "utf8"));
check(m.display === "standalone", `display === standalone (got ${m.display})`);
check(m.scope === "/", `scope === / (got ${m.scope})`);
check(m.start_url === "/", `start_url === / (got ${m.start_url})`);
check(typeof m.id === "string" && m.id.length > 0, `id set (got ${m.id})`);
check(
  Array.isArray(m.icons) && m.icons.length >= 2,
  `icons present (${m.icons?.length ?? 0})`,
);
for (const icon of m.icons ?? []) {
  const file = join(root, "public", icon.src.replace(/^\//, ""));
  check(existsSync(file), `icon file ${icon.src} exists`);
}

const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");
check(
  /manifest:\s*["']\/manifest\.webmanifest["']/.test(layout),
  "layout.tsx links /manifest.webmanifest",
);
check(/appleWebApp:\s*\{[^}]*capable:\s*true/s.test(layout), "appleWebApp.capable");

const layoutNav = readFileSync(join(root, "src/components/Layout.tsx"), "utf8");
const navBlock = layoutNav.match(/const nav = \[([\s\S]*?)\]/);
check(Boolean(navBlock), "Layout.tsx declares nav[]");
const tos = [...(navBlock?.[1].matchAll(/to:\s*["']([^"']+)["']/g) ?? [])].map(
  (x) => x[1],
);
check(tos.length >= 3, `primary nav has ${tos.length} entries`);
for (const to of tos) {
  check(
    to.startsWith("/") && !/^https?:/i.test(to),
    `nav to="${to}" is same-origin relative`,
  );
}
check(
  !/NavLink[^>]*(target=["']_blank["']|rel=["']noopener)/.test(layoutNav),
  "primary NavLinks do not use target=_blank",
);

// Absolute https links in App shell / Layout are a PWA footgun.
const app = readFileSync(join(root, "src/App.tsx"), "utf8");
const absInApp = [
  ...app.matchAll(/href=["'](https?:\/\/[^"']+)["']/g),
].map((m) => m[1]);
check(
  absInApp.length === 0,
  `App.tsx has no absolute http(s) hrefs (found: ${absInApp.join(", ") || "none"})`,
);

if (fails.length) {
  console.error("\nFAIL:");
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\ncheck-pwa: ALL CHECKS PASSED");
