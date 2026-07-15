import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { mapComponent } from "@/lib/mappers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; componentId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { id: systemId, componentId } = await ctx.params;
  const db = getDb();

  const source = await db.component.findFirst({
    where: { id: componentId, systemId },
  });
  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Shift later siblings so the copy sits right after the source
  await db.component.updateMany({
    where: {
      systemId,
      sortOrder: { gt: source.sortOrder },
    },
    data: { sortOrder: { increment: 1 } },
  });

  const created = await db.component.create({
    data: {
      systemId,
      name: source.name,
      location: source.location,
      modelNumber: source.modelNumber,
      productNumber: source.productNumber,
      serialNumber: "",
      manufacturer: source.manufacturer,
      warrantyInfo: source.warrantyInfo,
      userManual: source.userManual,
      vendorName: source.vendorName,
      vendorContact: source.vendorContact,
      serviceCompanyName: source.serviceCompanyName,
      serviceCompanyContact: source.serviceCompanyContact,
      purchaseDate: source.purchaseDate,
      purchaseCost: source.purchaseCost,
      replacementCost: source.replacementCost,
      notes: source.notes,
      sortOrder: source.sortOrder + 1,
    },
  });

  await db.system.update({
    where: { id: systemId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(mapComponent(created), { status: 201 });
}
