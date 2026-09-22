/** A piece of equipment that is part of a larger system. */
export interface SystemComponent {
  id: string
  name: string
  /** Where this part lives (house, barn, office, etc.) */
  location: string
  /** Identification */
  modelNumber: string
  productNumber: string
  serialNumber: string
  manufacturer: string
  warrantyInfo: string
  /** URL or note about where the manual is kept */
  userManual: string
  /** Vendor / installer */
  vendorName: string
  vendorContact: string
  /** Maintenance / repair company */
  serviceCompanyName: string
  serviceCompanyContact: string
  /** Purchase date for this part (ISO string) */
  purchaseDate: string | null
  /** Original purchase cost for this part */
  purchaseCost: number | null
  /** Current estimated replacement cost for this part */
  replacementCost: number | null
  notes: string
}

export type SystemComponentInput = Omit<SystemComponent, 'id'>

/** A house/property system made up of one or more components. */
export interface Asset {
  id: string
  /** System name */
  name: string
  /** Optional grouping (HVAC, Culinary, Water, etc.) */
  category: string
  notes: string
  /** Pieces of equipment that make up this system */
  components: SystemComponent[]
  createdAt: string
  updatedAt: string
}

export type AssetInput = Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>

export interface AppData {
  version: number
  assets: Asset[]
}

export const ASSET_CATEGORIES = [
  'HVAC',
  'Culinary',
  'Laundry',
  'Water',
  'Electrical',
  'Plumbing',
  'Farm Equipment',
  'Vehicles',
  'Security',
  'Structures',
  'Other',
] as const

export type AssetCategory = (typeof ASSET_CATEGORIES)[number]

const LEGACY_CATEGORY_MAP: Record<string, AssetCategory> = {
  Appliance: 'Culinary',
  Outdoor: 'Farm Equipment',
}

/** Map legacy / unknown category strings onto the locked set. */
export function normalizeCategory(s: string): AssetCategory {
  const trimmed = (s ?? '').trim()
  if (!trimmed) return 'Other'
  if ((ASSET_CATEGORIES as readonly string[]).includes(trimmed)) {
    return trimmed as AssetCategory
  }
  if (Object.prototype.hasOwnProperty.call(LEGACY_CATEGORY_MAP, trimmed)) {
    return LEGACY_CATEGORY_MAP[trimmed]!
  }
  return 'Other'
}

/** Sum of component replacement costs for a system. */
export function systemReplacementTotal(asset: Asset): number {
  return asset.components.reduce((sum, c) => sum + (c.replacementCost ?? 0), 0)
}

/** Sum of component purchase costs for a system. */
export function systemPurchaseTotal(asset: Asset): number {
  return asset.components.reduce((sum, c) => sum + (c.purchaseCost ?? 0), 0)
}
