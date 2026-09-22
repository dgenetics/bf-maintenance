#!/usr/bin/env node
/**
 * Playwright (CDP via system Chrome) driver for bf-maintenance.
 *
 * Usage:
 *   node drive.mjs --feature pin-gate [--base-url URL] [--run-id ID] [--pin PIN]
 *   node drive.mjs --feature systems-list ...
 *   node drive.mjs --feature maintenance-buckets ...
 *   node drive.mjs --feature archive ...
 *   node drive.mjs --feature sticky-save ...
 *   node drive.mjs --feature schedules ...
 *   node drive.mjs --feature auto-materialize ...
 *
 * Env: VERIFY_BASE_URL / SMOKE_BASE_URL, BF_ACCESS_PIN, VERIFY_RUN_ID
 * Evidence written under ../evidence/<run-id>/
 */
import { createRequire } from "node:module";
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = join(__dirname, "..");
const REPO_ROOT = join(__dirname, "../../../..");
const EVIDENCE_ROOT = join(SKILL_DIR, "evidence");

function loadDotEnv() {
  const envPath = join(REPO_ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function gitShort() {
  const r = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return r.status === 0 ? r.stdout.trim() : "nogit";
}

function runId() {
  return (
    arg("--run-id", null) ||
    process.env.VERIFY_RUN_ID ||
    `${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")}-${gitShort()}`
  );
}

async function screenshot(page, path) {
  await page.screenshot({ path, fullPage: true });
}

async function ariaDump(page, path) {
  const snap = await page.locator("body").ariaSnapshot();
  writeFileSync(path, snap);
}

async function unlock(page, pin) {
  await page.getByLabel("Access PIN").waitFor({ timeout: 20000 });
  await page.getByLabel("Access PIN").fill(pin);
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.getByRole("heading", { level: 2, name: "Systems", exact: true }).waitFor({
    timeout: 20000,
  });
}

async function drivePinGate(page, out, pin) {
  const steps = [];
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "Maintenance access", exact: true }).waitFor();
  await screenshot(page, join(out, "pin-gate-locked.png"));
  await ariaDump(page, join(out, "pin-gate-locked.aria.txt"));
  steps.push("locked: heading Maintenance access visible");

  await page.getByLabel("Access PIN").fill("__wrong__");
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.getByText(/Incorrect PIN/i).waitFor({ timeout: 10000 });
  await screenshot(page, join(out, "pin-gate-wrong.png"));
  steps.push("wrong pin: Incorrect PIN shown");

  await page.getByLabel("Access PIN").fill(pin);
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.getByRole("heading", { level: 2, name: "Systems", exact: true }).waitFor({
    timeout: 20000,
  });
  await page.getByText("Beausoleil Farm").first().waitFor();
  await screenshot(page, join(out, "pin-gate-unlocked.png"));
  await ariaDump(page, join(out, "pin-gate-unlocked.aria.txt"));
  steps.push("right pin: Systems heading + Beausoleil Farm chrome");
  return steps;
}

async function driveSystemsList(page, out, pin) {
  const steps = [];
  await page.goto("/", { waitUntil: "networkidle" });
  if (await page.getByLabel("Access PIN").count()) {
    await unlock(page, pin);
  }
  await page.getByRole("heading", { level: 2, name: "Systems", exact: true }).waitFor();
  const search = page.getByLabel("Search systems");
  await search.fill("xyzzy-no-match-verify");
  await page.waitForTimeout(300);
  const url1 = page.url();
  if (!url1.includes("q=")) {
    throw new Error(`search did not sync to ?q= (url=${url1})`);
  }
  await page.getByText(/No matches|0 of \d+ system/i).first().waitFor({
    timeout: 10000,
  });
  await screenshot(page, join(out, "systems-search-empty.png"));
  steps.push(`empty search synced to URL: ${url1}`);

  await search.fill("");
  await page.waitForTimeout(300);
  await search.fill("a");
  await page.waitForTimeout(400);
  const subtitle = await page
    .locator("text=/\\d+ of \\d+ systems?/i")
    .first()
    .textContent()
    .catch(() => null);
  await screenshot(page, join(out, "systems-search-filtered.png"));
  await ariaDump(page, join(out, "systems-search.aria.txt"));
  steps.push(`filtered subtitle: ${subtitle ?? "(absolute count or single letter match)"}`);
  return steps;
}

async function driveMaintenanceBuckets(page, out, pin) {
  const steps = [];
  await page.goto("/", { waitUntil: "networkidle" });
  if (await page.getByLabel("Access PIN").count()) {
    await unlock(page, pin);
  }
  await page.getByRole("link", { name: "Chores" }).click();
  await page.waitForURL(/\/maintenance/);
  await page.getByRole("heading", { level: 2, name: "Chores", exact: true }).waitFor();
  if (await page.getByRole("button", { name: "Suggest tasks" }).count()) {
    throw new Error("Suggest tasks button should be removed from Chores");
  }
  steps.push("no Suggest tasks button");
  for (const title of ["Overdue", "Due soon", "Upcoming"]) {
    await page.getByText(title, { exact: true }).first().waitFor({
      timeout: 15000,
    });
    steps.push(`bucket visible: ${title}`);
  }
  await screenshot(page, join(out, "maintenance-buckets.png"));
  await ariaDump(page, join(out, "maintenance-buckets.aria.txt"));
  return steps;
}

async function driveArchive(page, out, pin) {
  const steps = [];
  await page.goto("/", { waitUntil: "networkidle" });
  if (await page.getByLabel("Access PIN").count()) {
    await unlock(page, pin);
  }
  await page.goto("/maintenance/archive", { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 2, name: "Completed archive", exact: true }).waitFor({
    timeout: 20000,
  });
  await screenshot(page, join(out, "archive.png"));
  await ariaDump(page, join(out, "archive.aria.txt"));
  steps.push("archive route rendered");
  return steps;
}

async function driveStickySave(page, out, pin) {
  const steps = [];
  await page.goto("/", { waitUntil: "networkidle" });
  if (await page.getByLabel("Access PIN").count()) {
    await unlock(page, pin);
  }
  await page.goto("/assets/new", { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 2, name: "Add system", exact: true }).waitFor();
  const save = page.getByRole("button", { name: "Save" });
  await save.waitFor();
  const box = await save.boundingBox();
  const nav = page.locator("nav").last();
  const navBox = await nav.boundingBox();
  if (!box || !navBox) throw new Error("could not measure Save or nav");
  if (box.y + box.height > navBox.y + 2) {
    throw new Error(
      `Save button overlaps / sits under tab nav (save.bottom=${box.y + box.height} nav.top=${navBox.y})`,
    );
  }
  await screenshot(page, join(out, "sticky-save.png"));
  steps.push(
    `Save above tab nav (save.bottom=${Math.round(box.y + box.height)} nav.top=${Math.round(navBox.y)})`,
  );
  return steps;
}

async function driveSchedules(page, out, pin) {
  const steps = [];
  await page.goto("/", { waitUntil: "networkidle" });
  if (await page.getByLabel("Access PIN").count()) {
    await unlock(page, pin);
  }
  await page.getByRole("link", { name: "Schedules" }).click();
  await page.waitForURL(/\/schedules/);
  await page.getByRole("heading", { level: 2, name: "Schedules", exact: true }).waitFor({
    timeout: 20000,
  });
  steps.push("Schedules h2 visible");

  // List or empty state — no junk creates
  const empty = page.getByText(/No schedules/i).first();
  const search = page.getByLabel("Search schedules");
  const listHint = page.getByText(/of \d+ schedule/i).first();
  const rendered =
    (await empty.count()) > 0 ||
    (await search.count()) > 0 ||
    (await listHint.count()) > 0;
  if (!rendered) {
    throw new Error("Schedules page did not show list chrome or empty state");
  }
  if ((await empty.count()) > 0) {
    steps.push(`empty/list copy: ${(await empty.textContent())?.trim() ?? "No schedules"}`);
  } else {
    steps.push("schedules list chrome present (search and/or count)");
  }

  await screenshot(page, join(out, "schedules.png"));
  await ariaDump(page, join(out, "schedules.aria.txt"));
  return steps;
}

async function driveAutoMaterialize(page, out, pin) {
  const steps = [];
  await page.goto("/", { waitUntil: "networkidle" });
  if (await page.getByLabel("Access PIN").count()) {
    await unlock(page, pin);
  }
  await page.goto("/maintenance", { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 2, name: "Chores", exact: true }).waitFor({
    timeout: 20000,
  });
  steps.push("Chores h2 visible");

  if (await page.getByRole("button", { name: "Suggest tasks" }).count()) {
    throw new Error("Suggest tasks button should be removed (auto-materialize)");
  }
  steps.push("no Suggest tasks button");

  for (const title of ["Overdue", "Due soon", "Upcoming"]) {
    await page.getByText(title, { exact: true }).first().waitFor({
      timeout: 15000,
    });
    steps.push(`bucket visible: ${title}`);
  }

  const refresh = page.getByRole("button", { name: "Refresh" });
  if (await refresh.count()) {
    steps.push("Refresh control present (kept)");
  } else {
    steps.push("Refresh control absent (optional)");
  }

  await screenshot(page, join(out, "auto-materialize.png"));
  await ariaDump(page, join(out, "auto-materialize.aria.txt"));
  return steps;
}

const FEATURES = {
  "pin-gate": drivePinGate,
  "systems-list": driveSystemsList,
  "maintenance-buckets": driveMaintenanceBuckets,
  archive: driveArchive,
  "sticky-save": driveStickySave,
  schedules: driveSchedules,
  "auto-materialize": driveAutoMaterialize,
};

async function main() {
  loadDotEnv();
  const feature = arg("--feature", "pin-gate");
  if (!FEATURES[feature]) {
    console.error(
      `unknown feature ${feature}; choose: ${Object.keys(FEATURES).join(", ")}`,
    );
    process.exit(2);
  }
  const base =
    arg("--base-url", null) ||
    process.env.VERIFY_BASE_URL ||
    process.env.SMOKE_BASE_URL ||
    "http://127.0.0.1:3100";
  const pin = arg("--pin", null) || process.env.BF_ACCESS_PIN;
  if (!pin) {
    console.error("BF_ACCESS_PIN required");
    process.exit(2);
  }
  const id = runId();
  const out = join(EVIDENCE_ROOT, id);
  mkdirSync(out, { recursive: true });

  const launchOpts = {
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  };
  // CI may install Chrome outside Playwright's default channel paths.
  if (process.env.PLAYWRIGHT_CHROME_PATH) {
    launchOpts.executablePath = process.env.PLAYWRIGHT_CHROME_PATH;
  } else {
    launchOpts.channel = "chrome";
  }
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    baseURL: base,
  });
  const page = await context.newPage();

  let steps;
  try {
    steps = await FEATURES[feature](page, out, pin);
  } finally {
    await browser.close();
  }

  const summary = {
    feature,
    base,
    runId: id,
    steps,
    pinSource: process.env.BF_ACCESS_PIN ? "BF_ACCESS_PIN" : "arg",
    sha: gitShort(),
    finished: new Date().toISOString(),
  };
  writeFileSync(join(out, `drive-${feature}.json`), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`evidence: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
