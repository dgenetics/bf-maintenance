-- Remap urgency statuses → board workflow; keep COMPLETED/CANCELLED
UPDATE "MaintenanceTask" SET "status" = 'BACKLOG'
WHERE "status" IN ('PENDING', 'DUE_SOON', 'OVERDUE');

CREATE TABLE "new_MaintenanceTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT,
    "componentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BACKLOG',
    "completedAt" DATETIME,
    "completedNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceTask_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "MaintenanceSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceTask_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_MaintenanceTask" ("id", "scheduleId", "componentId", "title", "description", "dueDate", "status", "completedAt", "completedNotes", "createdAt", "updatedAt")
SELECT "id", "scheduleId", "componentId", "title", "description", "dueDate", "status", "completedAt", "completedNotes", "createdAt", "updatedAt" FROM "MaintenanceTask";

DROP TABLE "MaintenanceTask";
ALTER TABLE "new_MaintenanceTask" RENAME TO "MaintenanceTask";

CREATE INDEX "MaintenanceTask_componentId_idx" ON "MaintenanceTask"("componentId");
CREATE INDEX "MaintenanceTask_scheduleId_idx" ON "MaintenanceTask"("scheduleId");
CREATE INDEX "MaintenanceTask_dueDate_idx" ON "MaintenanceTask"("dueDate");
CREATE INDEX "MaintenanceTask_status_idx" ON "MaintenanceTask"("status");
