import type { Company, Scheme } from '@shared/types'

const COMMON_KEYS = ['Cmaj', 'Amin', 'Dmaj', 'Dmin', 'F#min', 'Bbmaj', 'Gmin', 'Amaj', 'Emaj', 'Bmin']

interface ProjectDetailsFormProps {
  template: Scheme
  company: Company | null
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
}

export function ProjectDetailsForm({ template, company, values, onChange }: ProjectDetailsFormProps) {
  const isWestOne = template.id === 'preset-west-one-music-group-default'

  const update = (key: string, value: string) => {
    if (template.tokens.find((t) => t.key === 'version')?.renderPrefix && key === 'version') {
      value = value.replace(/^v?\s*/i, '').toLowerCase()
      if (value && !value.startsWith('v')) value = 'v' + value
    }
    onChange({ ...values, [key]: value })
  }

  /** For type token: use company.types if set, else token.allowedValues */
  const getOptionsForToken = (token: { key: string; allowedValues?: string[] }): string[] => {
    if (token.key === 'type' && company?.types?.length) return company.types
    return token.allowedValues ?? []
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Project details</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {template.tokens
          .filter((t) => t.key !== 'stem')
          .map((token) => {
            const val = values[token.key] ?? token.defaultValue ?? ''
            const isKey = token.key === 'key' && isWestOne
            const isBpm = token.key === 'bpm' && isWestOne
            const options = getOptionsForToken(token)

            return (
              <div key={token.id} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {token.label}
                  {token.required && <span className="text-red-500"> *</span>}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {options.length ? (
                    <>
                      {options.slice(0, 12).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => update(token.key, opt)}
                          className={`rounded border px-2 py-1 text-sm ${
                            val === opt
                              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'border-zinc-300 dark:border-zinc-600'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                      {isKey && (
                        <select
                          value={val}
                          onChange={(e) => update(token.key, e.target.value)}
                          className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-700"
                        >
                          <option value="">Other</option>
                          {COMMON_KEYS.map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  ) : null}
                  {isBpm ? (
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={val}
                      onChange={(e) => update(token.key, e.target.value.replace(/\D/g, ''))}
                      placeholder={token.example}
                      className="w-20 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-700"
                    />
                  ) : !options.length || (isKey && val && !COMMON_KEYS.includes(val)) ? (
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => update(token.key, e.target.value)}
                      placeholder={token.example}
                      className="min-w-[120px] flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-700"
                    />
                  ) : null}
                </div>
                {isBpm && val && (
                  <span className="text-xs text-zinc-500">Preview: {val}BPM</span>
                )}
              </div>
            )
          })}
      </div>
    </section>
  )
}
