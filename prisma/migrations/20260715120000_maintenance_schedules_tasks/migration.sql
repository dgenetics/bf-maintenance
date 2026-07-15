-- CreateTable
CREATE TABLE "MaintenanceSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "componentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frequency" TEXT,
    "intervalDays" INTEGER,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "nextDueDate" DATETIME NOT NULL,
    "lastCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceSchedule_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaintenanceTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT,
    "componentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" DATETIME,
    "completedNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceTask_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "MaintenanceSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceTask_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MaintenanceSchedule_componentId_idx" ON "MaintenanceSchedule"("componentId");
CREATE INDEX "MaintenanceSchedule_nextDueDate_idx" ON "MaintenanceSchedule"("nextDueDate");
CREATE INDEX "MaintenanceTask_componentId_idx" ON "MaintenanceTask"("componentId");
CREATE INDEX "MaintenanceTask_scheduleId_idx" ON "MaintenanceTask"("scheduleId");
CREATE INDEX "MaintenanceTask_dueDate_idx" ON "MaintenanceTask"("dueDate");
CREATE INDEX "MaintenanceTask_status_idx" ON "MaintenanceTask"("status");
