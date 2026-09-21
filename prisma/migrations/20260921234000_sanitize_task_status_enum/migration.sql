-- Remap orphan board-lane statuses (kanban spike residue) to date-product enums.
-- Prisma P2023 on unfiltered findMany when rows still say BACKLOG/ICEBOX/CURRENT.
UPDATE "MaintenanceTask"
SET "status" = 'PENDING'
WHERE "status" NOT IN ('PENDING', 'DUE_SOON', 'OVERDUE', 'COMPLETED', 'CANCELLED');
