import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, Wrench } from 'lucide-react'
import { useData } from '../context/DataContext'
import { ASSET_CATEGORIES, systemReplacementTotal } from '../types'
import { formatMoney } from '../lib/utils'
import { EmptyState } from '../components/EmptyState'
import { Button, Card, Input, PageHeader, Select } from '../components/ui'

export function AssetList() {
  const { assets } = useData()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const category = params.get('category') ?? 'all'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...assets]
      .filter((a) => {
        if (category !== 'all' && a.category !== category) return false
        if (!q) return true
        const hay = [
          a.name,
          a.category,
          a.notes,
          ...a.components.flatMap((c) => [
            c.name,
            c.location,
            c.manufacturer,
            c.modelNumber,
            c.productNumber,
            c.serialNumber,
            c.vendorName,
            c.serviceCompanyName,
            c.warrantyInfo,
          ]),
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [assets, category, query])

  return (
    <div>
      <PageHeader
        title="Systems"
        subtitle={`${assets.length} system${assets.length === 1 ? '' : 's'}`}
        action={
          <Link to="/assets/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </Link>
        }
      />

      <div className="mb-4 space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, model, serial, vendor…"
            aria-label="Search systems"
          />
        </div>
        <Select
          value={category}
          onChange={(e) => {
            const next = e.target.value
            if (next === 'all') {
              params.delete('category')
            } else {
              params.set('category', next)
            }
            setParams(params, { replace: true })
          }}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {ASSET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={assets.length === 0 ? 'No systems yet' : 'No matches'}
          description={
            assets.length === 0
              ? 'Add the first system for the house or property.'
              : 'Try a different search or category filter.'
          }
          action={
            assets.length === 0 ? (
              <Link to="/assets/new">
                <Button size="sm">Add system</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((asset) => (
            <Link key={asset.id} to={`/assets/${asset.id}`}>
              <Card className="mb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">
                      {asset.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {asset.category}
                    </p>
                    <p className="mt-1 truncate text-xs text-forest-800">
                      {asset.components.length > 0
                        ? `${asset.components.length} part${asset.components.length === 1 ? '' : 's'}: ${asset.components.map((c) => c.name).join(', ')}`
                        : 'No components yet'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                      Replace
                    </p>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatMoney(systemReplacementTotal(asset) || null)}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
