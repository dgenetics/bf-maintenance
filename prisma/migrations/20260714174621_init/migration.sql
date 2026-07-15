-- CreateTable
CREATE TABLE "System" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "location" TEXT NOT NULL DEFAULT '',
    "purchaseDate" DATETIME,
    "purchaseCost" REAL,
    "replacementCost" REAL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "systemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
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
    "notes" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Component_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "System_category_idx" ON "System"("category");

-- CreateIndex
CREATE INDEX "System_name_idx" ON "System"("name");

-- CreateIndex
CREATE INDEX "Component_systemId_idx" ON "Component"("systemId");
