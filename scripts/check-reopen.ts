/**
 * Behavior check for reopenMaintenanceTask against a throwaway local SQLite DB.
 * Never touches Turso/prod: refuses to run unless DATABASE_URL is a file: URL
 * and ignores TURSO_* entirely.
 *
 *   DATABASE_URL=file:/tmp/bf-reopen-check.db npx prisma db push
 *   DATABASE_URL=file:/tmp/bf-reopen-check.db npx tsx scripts/check-reopen.ts
 */
import assert from "node:assert/strict";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { completeMaintenanceTask } from "@/lib/complete-task";
import { statusForDueDate } from "@/lib/maintenance";
import { reopenMaintenanceTask } from "@/lib/reopen-task";

const url = process.env.DATABASE_URL ?? "";
if (!url.startsWith("file:")) {
  console.error("Refusing to run: DATABASE_URL must be a local file: URL");
  process.exit(1);
}
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fixture(label: string) {
  const system = await db.system.create({ data: { name: `Energy ${label}` } });
  const component = await db.component.create({
    data: { systemId: system.id, name: "Solar Panels" },
  });
  const dueA = new Date("2026-10-13T12:00:00.000Z");
  const schedule = await db.maintenanceSchedule.create({
    data: {
      componentId: component.id,
      name: "Clean solar panels",
      frequency: "90d",
      intervalDays: 90,
      isRecurring: true,
      nextDueDate: dueA,
    },
  });
  const a = await db.maintenanceTask.create({
    data: {
      componentId: component.id,
      scheduleId: schedule.id,
      title: schedule.name,
      dueDate: dueA,
      status: statusForDueDate(dueA),
    },
  });
  return { component, schedule, a };
}

async function openTasks(scheduleId: string) {
  return db.maintenanceTask.findMany({
    where: { scheduleId, status: { in: ["PENDING", "DUE_SOON", "OVERDUE"] } },
  });
}

async function caseSpawnedNextDeleted() {
  const { schedule, a } = await fixture("spawned");
  // An earlier completion on the same schedule → lastCompletedAt target.
  const earlierDone = new Date("2026-07-15T12:00:00.000Z");
  await db.maintenanceTask.create({
    data: {
      componentId: a.componentId,
      scheduleId: schedule.id,
      title: schedule.name,
      dueDate: new Date("2026-07-15T12:00:00.000Z"),
      status: "COMPLETED",
      completedAt: earlierDone,
    },
  });

  const done = await completeMaintenanceTask(db, a.id, "oops");
  assert.ok(done?.nextTask, "complete should spawn next");
  const nextId = done!.nextTask!.id;
  const schedAfterComplete = await db.maintenanceSchedule.findUniqueOrThrow({
    where: { id: schedule.id },
  });
  assert.notEqual(schedAfterComplete.nextDueDate.getTime(), a.dueDate.getTime());

  const r = await reopenMaintenanceTask(db, a.id);
  assert.ok(r && !r.alreadyOpen);
  assert.equal(r!.deletedNextTaskId, nextId);
  assert.equal(await db.maintenanceTask.findUnique({ where: { id: nextId } }), null);

  const reA = await db.maintenanceTask.findUniqueOrThrow({ where: { id: a.id } });
  assert.equal(reA.status, statusForDueDate(a.dueDate));
  assert.equal(reA.completedAt, null);
  assert.equal(reA.completedNotes, null);

  const sched = await db.maintenanceSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
  assert.equal(sched.nextDueDate.getTime(), a.dueDate.getTime());
  assert.equal(sched.lastCompletedAt?.getTime(), earlierDone.getTime());
  assert.deepEqual((await openTasks(schedule.id)).map((t) => t.id), [a.id]);

  // Idempotent second reopen.
  const again = await reopenMaintenanceTask(db, a.id);
  assert.ok(again?.alreadyOpen);
  assert.equal(again!.deletedNextTaskId, null);
  const sched2 = await db.maintenanceSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
  assert.equal(sched2.updatedAt.getTime(), sched.updatedAt.getTime());
  console.log("ok  spawned untouched next → deleted, schedule rewound, idempotent");
}

async function caseTouchedNextKept() {
  const { schedule, a } = await fixture("touched");
  const done = await completeMaintenanceTask(db, a.id);
  const nextId = done!.nextTask!.id;
  await sleep(2_500);
  await db.maintenanceTask.update({
    where: { id: nextId },
    data: { description: "edited by a human" },
  });

  const r = await reopenMaintenanceTask(db, a.id);
  assert.ok(r && !r.alreadyOpen);
  assert.equal(r!.deletedNextTaskId, null);
  assert.ok(await db.maintenanceTask.findUnique({ where: { id: nextId } }));
  const sched = await db.maintenanceSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
  assert.equal(sched.nextDueDate.getTime(), a.dueDate.getTime());
  assert.equal(sched.lastCompletedAt, null);
  console.log("ok  touched next → kept, schedule rewound");
}

async function caseChainKeepsLaterWork() {
  const { schedule, a } = await fixture("chain");
  const d1 = await completeMaintenanceTask(db, a.id);
  const b = d1!.nextTask!;
  const d2 = await completeMaintenanceTask(db, b.id);
  const c = d2!.nextTask!;
  const r = await reopenMaintenanceTask(db, a.id);
  assert.equal(r!.deletedNextTaskId, null, "next (B) is completed → keep");
  assert.ok(await db.maintenanceTask.findUnique({ where: { id: c.id } }), "C untouched");
  const bRow = await db.maintenanceTask.findUniqueOrThrow({ where: { id: b.id } });
  const sched = await db.maintenanceSchedule.findUniqueOrThrow({ where: { id: schedule.id } });
  assert.equal(sched.lastCompletedAt?.getTime(), bRow.completedAt?.getTime());
  console.log("ok  completed next in chain → nothing deleted");
}

async function caseOpenAndMissing() {
  const { a } = await fixture("open");
  const r = await reopenMaintenanceTask(db, a.id);
  assert.ok(r?.alreadyOpen);
  assert.equal(await reopenMaintenanceTask(db, "does-not-exist"), null);
  console.log("ok  open task → no-op success; missing → null (404)");
}

async function main() {
  await caseSpawnedNextDeleted();
  await caseTouchedNextKept();
  await caseChainKeepsLaterWork();
  await caseOpenAndMissing();
  console.log("all reopen checks passed");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
