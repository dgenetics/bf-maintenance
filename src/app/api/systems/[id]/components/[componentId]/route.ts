import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { mapComponent } from "@/lib/mappers";
import type { SystemComponentInput } from "@/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; componentId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { id: systemId, componentId } = await ctx.params;
  const body = (await req.json()) as Partial<SystemComponentInput>;
  const db = getDb();

  const existing = await db.component.findFirst({
    where: { id: componentId, systemId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.component.update({
    where: { id: componentId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
      ...(body.modelNumber !== undefined
        ? { modelNumber: body.modelNumber }
        : {}),
      ...(body.productNumber !== undefined
        ? { productNumber: body.productNumber }
        : {}),
      ...(body.serialNumber !== undefined
        ? { serialNumber: body.serialNumber }
        : {}),
      ...(body.manufacturer !== undefined
        ? { manufacturer: body.manufacturer }
        : {}),
      ...(body.warrantyInfo !== undefined
        ? { warrantyInfo: body.warrantyInfo }
        : {}),
      ...(body.userManual !== undefined ? { userManual: body.userManual } : {}),
      ...(body.vendorName !== undefined ? { vendorName: body.vendorName } : {}),
      ...(body.vendorContact !== undefined
        ? { vendorContact: body.vendorContact }
        : {}),
      ...(body.serviceCompanyName !== undefined
        ? { serviceCompanyName: body.serviceCompanyName }
        : {}),
      ...(body.serviceCompanyContact !== undefined
        ? { serviceCompanyContact: body.serviceCompanyContact }
        : {}),
      ...(body.purchaseDate !== undefined
        ? {
            purchaseDate: body.purchaseDate
              ? new Date(body.purchaseDate)
              : null,
          }
        : {}),
      ...(body.purchaseCost !== undefined
        ? { purchaseCost: body.purchaseCost }
        : {}),
      ...(body.replacementCost !== undefined
        ? { replacementCost: body.replacementCost }
        : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
  });

  await db.system.update({
    where: { id: systemId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(mapComponent(updated));
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { id: systemId, componentId } = await ctx.params;
  const db = getDb();

  const existing = await db.component.findFirst({
    where: { id: componentId, systemId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.component.delete({ where: { id: componentId } });
  await db.system.update({
    where: { id: systemId },
    data: { updatedAt: new Date() },
  });

  return new NextResponse(null, { status: 204 });
}
