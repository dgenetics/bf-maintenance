-- Move location from System onto Component (copy existing system location into parts)

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Component" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "systemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "modelNumber" TEXT NOT NULL DEFAULT '',
    "productNumber" TEXT NOT NULL DEFAULT '',
    "serialNumber" TEXT NOT NULL DEFAULT '',
    "manufacturer" TEXT NOT NULL DEFAULT '',
    "warrantyInfo" TEXT NOT NULL DEFAULT '',
    "userManual" TEXT NOT NULL DEFAULT '',
    "vendorName" TEXT NOT NULL DEFAULT '',
    "vendorContact" TEXT NOT NULL DEFAULT '',
    "serviceCompanyName" TEXT NOT NULL DEFAULT '',
    "serviceCompanyContact" TEXT NOT NULL DEFAULT '',
    "purchaseCost" REAL,
    "replacementCost" REAL,
    "notes" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Component_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Component" (
    "id", "systemId", "name", "location", "modelNumber", "productNumber", "serialNumber",
    "manufacturer", "warrantyInfo", "userManual", "vendorName", "vendorContact",
    "serviceCompanyName", "serviceCompanyContact", "purchaseCost", "replacementCost",
    "notes", "sortOrder"
)
SELECT
    c."id",
    c."systemId",
    c."name",
    COALESCE(NULLIF(s."location", ''), '') ,
    c."modelNumber",
    c."productNumber",
    c."serialNumber",
    c."manufacturer",
    c."warrantyInfo",
    c."userManual",
    c."vendorName",
    c."vendorContact",
    c."serviceCompanyName",
    c."serviceCompanyContact",
    c."purchaseCost",
    c."replacementCost",
    c."notes",
    c."sortOrder"
FROM "Component" c
LEFT JOIN "System" s ON s."id" = c."systemId";

DROP TABLE "Component";
ALTER TABLE "new_Component" RENAME TO "Component";
CREATE INDEX "Component_systemId_idx" ON "Component"("systemId");

CREATE TABLE "new_System" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_System" ("category", "createdAt", "id", "name", "notes", "updatedAt")
SELECT "category", "createdAt", "id", "name", "notes", "updatedAt" FROM "System";
DROP TABLE "System";
ALTER TABLE "new_System" RENAME TO "System";
CREATE INDEX "System_category_idx" ON "System"("category");
CREATE INDEX "System_name_idx" ON "System"("name");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
