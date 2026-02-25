import { useState, useEffect } from 'react'
import type { Company } from '@shared/types'
import { X, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'

interface CompanySettingsModalProps {
  company: Company
  companies: Company[]
  onSave: (companies: Company[]) => void
  onClose: () => void
}

export function CompanySettingsModal({ company, companies, onSave, onClose }: CompanySettingsModalProps) {
  const [name, setName] = useState(company.name)
  const [types, setTypes] = useState<string[]>(company.types)

  useEffect(() => {
    setName(company.name)
    setTypes([...company.types])
  }, [company])

  const handleSave = () => {
    const updated: Company = { ...company, name: name.trim(), types }
    const next = companies.map((c) => (c.id === company.id ? updated : c))
    onSave(next)
  }

  const addType = () => {
    setTypes([...types, ''])
  }

  const removeType = (index: number) => {
    setTypes(types.filter((_, i) => i !== index))
  }

  const updateType = (index: number, value: string) => {
    setTypes(types.map((t, i) => (i === index ? value : t)))
  }

  const moveUp = (index: number) => {
    if (index <= 0) return
    const next = [...types]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setTypes(next)
  }

  const moveDown = (index: number) => {
    if (index >= types.length - 1) return
    const next = [...types]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    setTypes(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-700">
          <h2 className="text-lg font-semibold">Company settings</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <label className="text-sm font-medium">Company name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Types</label>
              <button
                type="button"
                onClick={addType}
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                <Plus className="h-4 w-4" />
                Add type
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Custom list for the Type token (e.g. STEM, MIX, INVOICE). Used in scheme dropdowns when the pattern has a type token.
            </p>
            <ul className="mt-2 space-y-2">
              {types.map((type, index) => (
                <li key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={type}
                    onChange={(e) => updateType(index, e.target.value)}
                    placeholder="Type name"
                    className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-700"
                  />
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="rounded p-1 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-700"
                      title="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(index)}
                      disabled={index === types.length - 1}
                      className="rounded p-1 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-700"
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeType(index)}
                      className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-200 p-4 dark:border-zinc-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
