import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { componentCreateData, mapSystem } from "@/lib/mappers";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  const db = getDb();
  const systems = await db.system.findMany({
    include: { components: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(systems.map(mapSystem));
}

export async function POST(req: Request) {
  const denied = await requireAuth();
  if (denied) return denied;
  const body = (await req.json()) as {
    name?: string;
    category?: string;
    notes?: string;
    components?: Array<Record<string, unknown>>;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const db = getDb();
  const components = Array.isArray(body.components) ? body.components : [];

  const created = await db.system.create({
    data: {
      name: body.name.trim(),
      category: body.category?.trim() || "Other",
      notes: body.notes ?? "",
      components: {
        create: components
          .filter((c) => String(c.name ?? "").trim())
          .map((c, i) =>
            componentCreateData(
              {
                name: String(c.name),
                location:
                  c.location == null ? undefined : String(c.location),
                modelNumber: c.modelNumber as string | undefined,
                productNumber: c.productNumber as string | undefined,
                serialNumber: c.serialNumber as string | undefined,
                manufacturer: c.manufacturer as string | undefined,
                warrantyInfo: c.warrantyInfo as string | undefined,
                userManual: c.userManual as string | undefined,
                vendorName: c.vendorName as string | undefined,
                vendorContact: c.vendorContact as string | undefined,
                serviceCompanyName: c.serviceCompanyName as string | undefined,
                serviceCompanyContact: c.serviceCompanyContact as
                  | string
                  | undefined,
                purchaseDate:
                  c.purchaseDate == null || c.purchaseDate === ''
                    ? null
                    : String(c.purchaseDate),
                purchaseCost:
                  c.purchaseCost == null ? null : Number(c.purchaseCost),
                replacementCost:
                  c.replacementCost == null
                    ? null
                    : Number(c.replacementCost),
                notes: c.notes as string | undefined,
              },
              i,
            ),
          ),
      },
    },
    include: { components: true },
  });

  return NextResponse.json(mapSystem(created), { status: 201 });
}
