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
  /** Optional grouping (HVAC, appliance, water, etc.) */
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
  'Appliance',
  'Water',
  'Electrical',
  'Plumbing',
  'Outdoor',
  'Security',
  'Other',
] as const

/** Sum of component replacement costs for a system. */
export function systemReplacementTotal(asset: Asset): number {
  return asset.components.reduce((sum, c) => sum + (c.replacementCost ?? 0), 0)
}

/** Sum of component purchase costs for a system. */
export function systemPurchaseTotal(asset: Asset): number {
  return asset.components.reduce((sum, c) => sum + (c.purchaseCost ?? 0), 0)
}
