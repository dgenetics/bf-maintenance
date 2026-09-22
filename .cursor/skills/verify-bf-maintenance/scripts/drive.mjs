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
 *   node drive.mjs --feature move-component ...
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


async function driveMoveComponent(page, out, pin) {
  const steps = [];
  await page.goto("/", { waitUntil: "networkidle" });
  if (await page.getByLabel("Access PIN").count()) {
    await unlock(page, pin);
  }

  // Use in-page fetch so we share the browser cookie jar from unlock.
  // (page.request can miss Secure cookies on http://127.0.0.1 under next start.)
  async function api(method, path, body) {
    return page.evaluate(
      async ({ method, path, body }) => {
        const res = await fetch(path, {
          method,
          credentials: "same-origin",
          headers: body
            ? { "Content-Type": "application/json" }
            : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        let data = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
        }
        if (!res.ok) {
          const msg =
            data && typeof data === "object" && data.error
              ? data.error
              : text || res.statusText;
          throw new Error(`${method} ${path} failed: ${res.status} ${msg}`);
        }
        return data;
      },
      { method, path, body: body ?? null },
    );
  }

  let systems = await api("GET", "/api/systems");
  steps.push(`systems loaded: ${systems.length}`);

  async function createSystem(name, category) {
    return api("POST", "/api/systems", {
      name,
      category,
      notes: "",
      components: [],
    });
  }

  async function addComponent(systemId, name) {
    return api("POST", `/api/systems/${systemId}/components`, {
      name,
      location: "",
      modelNumber: "",
      productNumber: "",
      serialNumber: "",
      manufacturer: "",
      warrantyInfo: "",
      userManual: "",
      vendorName: "",
      vendorContact: "",
      serviceCompanyName: "",
      serviceCompanyContact: "",
      purchaseDate: null,
      purchaseCost: null,
      replacementCost: null,
      notes: "",
    });
  }

  const stamp = `verify-move-${Date.now()}`;
  let source = systems.find((s) => (s.components?.length ?? 0) > 0);
  let target = systems.find((s) => !source || s.id !== source.id);
  if (!source) {
    source = await createSystem(`${stamp}-source`, "Other");
    const comp = await addComponent(source.id, `${stamp}-part`);
    source = { ...source, components: [comp] };
    steps.push("seeded source system + component");
  }
  if (!target || target.id === source.id) {
    target = await createSystem(`${stamp}-target`, "HVAC");
    steps.push("seeded target system");
  }

  const component = source.components[0];
  if (!component) {
    throw new Error("no component available for move");
  }

  // Primary entry: system (AssetDetail) page part-row ⋯ menu — not ComponentDetail.
  await page.goto(`/assets/${source.id}`, { waitUntil: "networkidle" });
  await page
    .getByRole("heading", { level: 2, name: source.name, exact: true })
    .waitFor({ timeout: 20000 });
  await page.getByText(component.name, { exact: true }).first().waitFor({
    timeout: 10000,
  });
  steps.push(`on system detail: ${source.name}, part ${component.name}`);

  await page
    .getByLabel(`More actions for ${component.name}`)
    .click();
  const moveItem = page.getByRole("menuitem", {
    name: "Move to another system…",
  });
  await moveItem.waitFor({ timeout: 5000 });
  if (await moveItem.isDisabled()) {
    throw new Error("Move menu item disabled but we seeded ≥2 systems");
  }
  await moveItem.click();
  await page.getByRole("dialog", { name: "Move to another system" }).waitFor();
  await page
    .getByText("Schedules and chores stay with this part.", { exact: true })
    .waitFor();
  await page.getByLabel("Search systems").waitFor();
  steps.push("move sheet open from part-row ⋯");
  await screenshot(page, join(out, "move-component-sheet.png"));

  await page.getByLabel("Search systems").fill(target.name);
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: target.name }).click();
  await page
    .getByText(`Move “${component.name}” to “${target.name}”?`, {
      exact: true,
    })
    .waitFor({ timeout: 5000 });
  steps.push("confirm step shown");
  await screenshot(page, join(out, "move-component-confirm.png"));

  await page.getByRole("button", { name: "Move", exact: true }).click();
  // Stay on the source system detail — do not navigate to ComponentDetail.
  await page.waitForURL(new RegExp(`/assets/${source.id}/?$`), {
    timeout: 20000,
  });
  await page
    .getByRole("heading", { level: 2, name: source.name, exact: true })
    .waitFor();
  // Part should disappear from this system's list after refresh.
  await page
    .getByText(component.name, { exact: true })
    .waitFor({ state: "detached", timeout: 15000 });
  steps.push(
    `stayed on /assets/${source.id}; part removed from current system list`,
  );

  const after = await api("GET", "/api/systems");
  const srcAfter = after.find((s) => s.id === source.id);
  const tgtAfter = after.find((s) => s.id === target.id);
  if (srcAfter?.components?.some((c) => c.id === component.id)) {
    throw new Error("source system still lists moved component");
  }
  if (!tgtAfter?.components?.some((c) => c.id === component.id)) {
    throw new Error("target system missing moved component");
  }
  steps.push("API registry: component left source, on target");
  await screenshot(page, join(out, "move-component-done.png"));
  await ariaDump(page, join(out, "move-component.aria.txt"));
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
  "move-component": driveMoveComponent,
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
