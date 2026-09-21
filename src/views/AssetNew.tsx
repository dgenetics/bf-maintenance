import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useData } from '../context/DataContext'
import type { AssetInput } from '../types'
import { emptyAssetInput } from '../lib/utils'
import { AssetFormFields } from '../components/AssetFormFields'
import { Button, Card, PageHeader, StickySaveBar } from '../components/ui'

export function AssetNew() {
  const { addAsset } = useData()
  const navigate = useNavigate()
  const [value, setValue] = useState<AssetInput>(() => emptyAssetInput())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.name.trim()) return
    const asset = await addAsset({
      ...value,
      name: value.name.trim(),
    })
    navigate(`/assets/${asset.id}`, { replace: true })
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <PageHeader
        title="Add system"
        subtitle="System on the house or property"
      />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <AssetFormFields
            value={value}
            onChange={(patch) => setValue((prev) => ({ ...prev, ...patch }))}
          />
          <StickySaveBar>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!value.name.trim()}>
              Save
            </Button>
          </StickySaveBar>
        </form>
      </Card>
    </div>
  )
}
