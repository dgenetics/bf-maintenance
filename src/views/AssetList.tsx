import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Wrench } from 'lucide-react'
import { useData } from '../context/DataContext'
import {
  ASSET_CATEGORIES,
  normalizeCategory,
  systemReplacementTotal,
  type Asset,
  type AssetCategory,
  type AssetInput,
} from '../types'
import { emptyAssetInput, formatMoney } from '../lib/utils'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { AssetFormFields } from '../components/AssetFormFields'
import { Button, Card, Input, PageHeader } from '../components/ui'

export function AssetList() {
  const { assets, addAsset } = useData()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const addRequested = params.get('add') === '1'

  const [addOpen, setAddOpen] = useState(false)
  const [value, setValue] = useState<AssetInput>(() => emptyAssetInput())
  const [saving, setSaving] = useState(false)

  function setQuery(next: string) {
    const trimmed = next
    if (trimmed.trim()) {
      params.set('q', trimmed)
    } else {
      params.delete('q')
    }
    setParams(params, { replace: true })
  }

  function openAdd() {
    setValue(emptyAssetInput())
    setAddOpen(true)
  }

  function closeAdd() {
    setAddOpen(false)
    setValue(emptyAssetInput())
  }

  useEffect(() => {
    if (!addRequested) return
    setValue(emptyAssetInput())
    setAddOpen(true)
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('add')
        return next
      },
      { replace: true },
    )
  }, [addRequested, setParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.name.trim() || saving) return
    setSaving(true)
    try {
      const asset = await addAsset({
        ...value,
        name: value.name.trim(),
      })
      closeAdd()
      navigate(`/assets/${asset.id}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...assets]
      .filter((a) => {
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
  }, [assets, query])

  const sections = useMemo(() => {
    const byCategory = new Map<AssetCategory, Asset[]>()
    for (const cat of ASSET_CATEGORIES) {
      byCategory.set(cat, [])
    }
    for (const asset of filtered) {
      const bucket = normalizeCategory(asset.category)
      byCategory.get(bucket)!.push(asset)
    }

    return [...ASSET_CATEGORIES]
      .map((cat) => ({ category: cat, items: byCategory.get(cat) ?? [] }))
      .filter((section) => section.items.length > 0)
  }, [filtered])

  const filtering = Boolean(query.trim())
  const subtitle = filtering
    ? `${filtered.length} of ${assets.length} system${assets.length === 1 ? '' : 's'}`
    : `${assets.length} system${assets.length === 1 ? '' : 's'}`

  return (
    <div>
      <PageHeader
        title="Systems"
        subtitle={subtitle}
      />

      <div className="mb-4">
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
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={assets.length === 0 ? 'No systems yet' : 'No matches'}
          description={
            assets.length === 0
              ? 'Add the first system for the house or property.'
              : 'Try a different search.'
          }
          action={
            assets.length === 0 ? (
              <Button size="sm" onClick={openAdd}>
                Add system
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.category}>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-forest-800 uppercase">
                {section.category}
              </h3>
              <div className="flex flex-wrap items-start gap-2">
                {section.items.map((asset) => {
                  const replaceTotal = systemReplacementTotal(asset)
                  const partCount = asset.components.length
                  return (
                    <Link
                      key={asset.id}
                      to={`/assets/${asset.id}`}
                      className="block w-fit max-w-full"
                    >
                      <Card className="!p-3">
                        <p className="font-semibold text-ink">{asset.name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {partCount > 0
                            ? `${partCount} part${partCount === 1 ? '' : 's'}`
                            : 'No parts yet'}
                        </p>
                        {replaceTotal > 0 ? (
                          <p className="mt-1 text-xs font-semibold tabular-nums text-muted">
                            {formatMoney(replaceTotal)}
                          </p>
                        ) : null}
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {addOpen && (
        <Modal
          title="Add system"
          onClose={closeAdd}
          footer={
            <>
              <Button type="button" variant="secondary" onClick={closeAdd}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="asset-new-form"
                disabled={!value.name.trim() || saving}
              >
                Save
              </Button>
            </>
          }
        >
          <form id="asset-new-form" onSubmit={handleSubmit} className="space-y-4">
            <AssetFormFields
              value={value}
              onChange={(patch) => setValue((prev) => ({ ...prev, ...patch }))}
            />
          </form>
        </Modal>
      )}
    </div>
  )
}
