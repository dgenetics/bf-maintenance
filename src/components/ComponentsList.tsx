import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react'
import type { SystemComponent, SystemComponentInput } from '../types'
import { emptyComponentInput, formatMoney, parseMoney } from '../lib/utils'
import { Button, Card, Field, Input, Textarea } from './ui'

function moneyToInput(value: number | null): string {
  if (value == null) return ''
  return String(value)
}

function dateToInput(value: string | null): string {
  if (!value) return ''
  return value.slice(0, 10)
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

function toInput(part: SystemComponent): SystemComponentInput {
  const { id: _id, ...rest } = part
  return rest
}

function ComponentFields({
  value,
  onChange,
  onBlurSave,
  autoFocusName,
}: {
  value: SystemComponentInput
  onChange: (patch: Partial<SystemComponentInput>) => void
  onBlurSave?: () => void
  autoFocusName?: boolean
}) {
  return (
    <div className="space-y-2">
      <Field label="Component name">
        <Input
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          onBlur={onBlurSave}
          placeholder="Component name"
          autoFocus={autoFocusName}
        />
      </Field>
      <Field label="Location">
        <Input
          value={value.location}
          onChange={(e) => onChange({ location: e.target.value })}
          onBlur={onBlurSave}
          placeholder="House, barn, office…"
        />
      </Field>

      <p className="pt-1 text-[10px] font-semibold tracking-wide text-forest-800 uppercase">
        Identification
      </p>
      <Field label="Manufacturer">
        <Input
          value={value.manufacturer}
          onChange={(e) => onChange({ manufacturer: e.target.value })}
          onBlur={onBlurSave}
        />
      </Field>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Field label="Model #">
          <Input
            value={value.modelNumber}
            onChange={(e) => onChange({ modelNumber: e.target.value })}
            onBlur={onBlurSave}
          />
        </Field>
        <Field label="SKU">
          <Input
            value={value.productNumber}
            onChange={(e) => onChange({ productNumber: e.target.value })}
            onBlur={onBlurSave}
          />
        </Field>
        <Field label="Serial #">
          <Input
            value={value.serialNumber}
            onChange={(e) => onChange({ serialNumber: e.target.value })}
            onBlur={onBlurSave}
          />
        </Field>
      </div>

      <p className="pt-1 text-[10px] font-semibold tracking-wide text-forest-800 uppercase">
        Warranty & manual
      </p>
      <Field label="Warranty info">
        <Textarea
          rows={2}
          value={value.warrantyInfo}
          onChange={(e) => onChange({ warrantyInfo: e.target.value })}
          onBlur={onBlurSave}
          placeholder="Coverage period, expiration, claim phone, policy #…"
        />
      </Field>
      <Field label="User manual">
        <Input
          value={value.userManual}
          onChange={(e) => onChange({ userManual: e.target.value })}
          onBlur={onBlurSave}
          placeholder="URL or filing note"
        />
        {isUrl(value.userManual) && (
          <a
            href={value.userManual.trim()}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-forest-800 hover:underline"
          >
            Open manual <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </Field>

      <p className="pt-1 text-[10px] font-semibold tracking-wide text-forest-800 uppercase">
        Vendor / installer
      </p>
      <Field label="Name">
        <Input
          value={value.vendorName}
          onChange={(e) => onChange({ vendorName: e.target.value })}
          onBlur={onBlurSave}
        />
      </Field>
      <Field label="Contact info">
        <Textarea
          rows={2}
          value={value.vendorContact}
          onChange={(e) => onChange({ vendorContact: e.target.value })}
          onBlur={onBlurSave}
          placeholder="Phone, email, account #…"
        />
      </Field>

      <p className="pt-1 text-[10px] font-semibold tracking-wide text-forest-800 uppercase">
        Maintenance / repair
      </p>
      <Field label="Company name">
        <Input
          value={value.serviceCompanyName}
          onChange={(e) => onChange({ serviceCompanyName: e.target.value })}
          onBlur={onBlurSave}
        />
      </Field>
      <Field label="Contact info">
        <Textarea
          rows={2}
          value={value.serviceCompanyContact}
          onChange={(e) =>
            onChange({ serviceCompanyContact: e.target.value })
          }
          onBlur={onBlurSave}
          placeholder="Phone, email, after-hours…"
        />
      </Field>

      <p className="pt-1 text-[10px] font-semibold tracking-wide text-forest-800 uppercase">
        Purchase & replacement
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Purchase date">
          <Input
            type="date"
            value={dateToInput(value.purchaseDate)}
            onChange={(e) =>
              onChange({
                purchaseDate: e.target.value
                  ? new Date(e.target.value + 'T12:00:00').toISOString()
                  : null,
              })
            }
            onBlur={onBlurSave}
          />
        </Field>
        <Field label="Purchase cost">
          <Input
            inputMode="decimal"
            value={moneyToInput(value.purchaseCost)}
            onChange={(e) =>
              onChange({ purchaseCost: parseMoney(e.target.value) })
            }
            onBlur={onBlurSave}
            placeholder="0"
          />
        </Field>
      </div>
      <Field label="Replacement cost">
        <Input
          inputMode="decimal"
          value={moneyToInput(value.replacementCost)}
          onChange={(e) =>
            onChange({ replacementCost: parseMoney(e.target.value) })
          }
          onBlur={onBlurSave}
          placeholder="Current estimate"
        />
      </Field>

      <p className="pt-1 text-[10px] font-semibold tracking-wide text-forest-800 uppercase">
        Notes
      </p>
      <Field label="Notes">
        <Textarea
          rows={2}
          value={value.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          onBlur={onBlurSave}
        />
      </Field>
    </div>
  )
}

/**
 * Fully local draft while editing. Saves only on blur / unmount / collapse —
 * never mid-keystroke — so React state + API responses cannot clobber typing.
 */
function EditableComponent({
  part,
  onUpdate,
  onDraftName,
}: {
  part: SystemComponent
  onUpdate: (
    id: string,
    patch: Partial<SystemComponentInput>,
  ) => void | Promise<void>
  onDraftName?: (name: string) => void
}) {
  const [draft, setDraft] = useState<SystemComponentInput>(() => toInput(part))
  const draftRef = useRef(draft)
  const dirtyRef = useRef(false)
  const onUpdateRef = useRef(onUpdate)
  const partId = part.id

  draftRef.current = draft
  onUpdateRef.current = onUpdate

  // Only re-seed when opening a different component
  useEffect(() => {
    setDraft(toInput(part))
    dirtyRef.current = false
    onDraftName?.(part.name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partId])

  function flush() {
    if (!dirtyRef.current) return
    dirtyRef.current = false
    void onUpdateRef.current(partId, draftRef.current)
  }

  useEffect(() => {
    return () => {
      if (dirtyRef.current) {
        dirtyRef.current = false
        void onUpdateRef.current(partId, draftRef.current)
      }
    }
  }, [partId])

  return (
    <ComponentFields
      value={draft}
      onChange={(patch) => {
        dirtyRef.current = true
        setDraft((d) => {
          const next = { ...d, ...patch }
          draftRef.current = next
          if (patch.name !== undefined) onDraftName?.(patch.name)
          return next
        })
      }}
      onBlurSave={flush}
    />
  )
}

export function ComponentsList({
  systemId,
  components,
  onAdd,
  onUpdate,
  onDelete,
  onDuplicate,
}: {
  systemId: string
  components: SystemComponent[]
  onAdd: (input: SystemComponentInput) => void | Promise<void | SystemComponent>
  onUpdate: (
    id: string,
    patch: Partial<SystemComponentInput>,
  ) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
  onDuplicate: (
    id: string,
  ) => SystemComponent | undefined | Promise<SystemComponent | undefined>
}) {
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<SystemComponentInput>(() =>
    emptyComponentInput(),
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Live title while editing so the row header doesn't lag / fight the input
  const [liveNames, setLiveNames] = useState<Record<string, string>>({})

  async function submitNew() {
    if (!draft.name.trim()) return
    await onAdd({ ...draft, name: draft.name.trim() })
    setDraft(emptyComponentInput())
    setShowForm(false)
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-forest-800 uppercase">
            System components
          </h3>
          <p className="mt-0.5 text-xs text-muted">
            Costs, IDs, vendor, warranty, and service info
            {components.length > 0 ? ` · ${components.length}` : ''}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {showForm && (
        <div className="mb-3 space-y-2 rounded-xl border border-forest-600/20 bg-forest-50/40 p-3">
          <ComponentFields
            value={draft}
            onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            autoFocusName
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowForm(false)
                setDraft(emptyComponentInput())
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!draft.name.trim()}
              onClick={() => void submitNew()}
            >
              Add component
            </Button>
          </div>
        </div>
      )}

      {components.length === 0 && !showForm ? (
        <p className="text-sm text-muted">
          No components yet. Add outdoor units, tanks, controllers, etc.
        </p>
      ) : (
        <ul className="divide-y divide-cream-200">
          {components.map((part) => {
            const open = expandedId === part.id
            const displayName = liveNames[part.id] ?? part.name
            const summary = [
              part.location,
              part.manufacturer,
              part.modelNumber,
              part.serialNumber && `S/N ${part.serialNumber}`,
            ]
              .filter(Boolean)
              .join(' · ')

            const badges = [
              part.warrantyInfo.trim() && 'Warranty',
              part.userManual.trim() && 'Manual',
              part.vendorName.trim() && 'Vendor',
              part.serviceCompanyName.trim() && 'Service',
            ].filter(Boolean)

            return (
              <li key={part.id} className="py-2 first:pt-0 last:pb-0">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    className="mt-0.5 text-muted hover:text-ink"
                    aria-expanded={open}
                    aria-label={open ? 'Collapse' : 'Expand'}
                    onClick={() =>
                      setExpandedId((cur) => (cur === part.id ? null : part.id))
                    }
                  >
                    {open ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() =>
                      setExpandedId((cur) => (cur === part.id ? null : part.id))
                    }
                  >
                    <p className="font-medium text-ink">{displayName}</p>
                    <p className="truncate text-xs text-muted">
                      {summary || 'No model/serial yet — expand to edit'}
                      {!open && part.replacementCost != null
                        ? ` · replace ${formatMoney(part.replacementCost)}`
                        : ''}
                    </p>
                    {!open && badges.length > 0 && (
                      <p className="mt-0.5 truncate text-xs text-forest-800">
                        {badges.join(' · ')}
                      </p>
                    )}
                  </button>
                  <Link
                    to={`/assets/${systemId}/components/${part.id}`}
                    className="mt-0.5 text-muted hover:text-forest-800"
                    title="Maintenance schedules"
                    aria-label={`Maintenance for ${displayName}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CalendarClock className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    className="mt-0.5 text-muted hover:text-forest-800"
                    aria-label={`Duplicate ${displayName}`}
                    title="Duplicate"
                    onClick={() => {
                      void (async () => {
                        const copy = await onDuplicate(part.id)
                        if (copy) setExpandedId(copy.id)
                      })()
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="mt-0.5 text-muted hover:text-red-700"
                    aria-label={`Delete ${displayName}`}
                    title="Delete"
                    onClick={() => {
                      if (confirm(`Remove ${displayName} from this system?`)) {
                        void onDelete(part.id)
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {open && (
                  <div className="mt-2 ml-6 rounded-xl bg-cream-100/80 p-3">
                    <EditableComponent
                      key={part.id}
                      part={part}
                      onUpdate={onUpdate}
                      onDraftName={(name) =>
                        setLiveNames((m) => ({ ...m, [part.id]: name }))
                      }
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
