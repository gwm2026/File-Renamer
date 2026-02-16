import { useState, useEffect } from 'react'
import type { CompanyTemplate, TokenDefinition } from '@shared/types'
import { parseFilename } from '@shared/parse'
import { renderPattern } from '@shared/template'
import { X } from 'lucide-react'

interface TemplateEditorProps {
  template: CompanyTemplate
  templates: CompanyTemplate[]
  onSave: (templates: CompanyTemplate[]) => void
  onClose: () => void
}

export function TemplateEditor({ template, templates, onSave, onClose }: TemplateEditorProps) {
  const [name, setName] = useState(template.name)
  const [pattern, setPattern] = useState(template.pattern)
  const [tokens, setTokens] = useState<TokenDefinition[]>([])

  useEffect(() => {
    setName(template.name)
    setPattern(template.pattern)
    setTokens([...template.tokens])
  }, [template])

  const [testParseInput, setTestParseInput] = useState('')
  const [parsedResult, setParsedResult] = useState<Record<string, string> | null>(null)

  const previewValues = tokens.reduce(
    (acc, t) => {
      acc[t.key] = t.defaultValue || t.example || ''
      return acc
    },
    {} as Record<string, string>
  )
  const livePreview = (() => {
    try {
      return renderPattern(pattern, previewValues, 'wav', { ...template, pattern, tokens })
    } catch {
      return '(invalid pattern)'
    }
  })()

  const handleParse = () => {
    const result = parseFilename(testParseInput, { ...template, pattern, tokens })
    setParsedResult(result)
  }

  const handleSave = () => {
    const updated: CompanyTemplate = {
      ...template,
      name: name.trim(),
      pattern: pattern.trim(),
      tokens,
    }
    const next = templates.map((t) => (t.id === template.id ? updated : t))
    onSave(next)
  }

  const addToken = () => {
    const key = 'token_' + Date.now()
    setTokens([
      ...tokens,
      {
        id: template.id + '-token-' + key,
        key,
        label: key,
        required: false,
        defaultValue: '',
        example: '',
      },
    ])
  }

  const removeToken = (id: string) => {
    setTokens(tokens.filter((t) => t.id !== id))
  }

  const updateToken = (id: string, patch: Partial<TokenDefinition>) => {
    setTokens(tokens.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-700">
          <h2 className="text-lg font-semibold">Edit template</h2>
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
            <label className="text-sm font-medium">Pattern</label>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="{artist} - {title}..."
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-700"
            />
            <p className="mt-1 text-xs text-zinc-500">Preview: {livePreview}</p>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Tokens</label>
              <button
                type="button"
                onClick={addToken}
                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                Add token
              </button>
            </div>
            <ul className="mt-2 space-y-2">
              {tokens.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2 rounded border border-zinc-200 p-2 dark:border-zinc-600">
                  <input
                    type="text"
                    value={t.key}
                    onChange={(e) => updateToken(t.id, { key: e.target.value.replace(/\W/g, '_') })}
                    placeholder="key"
                    className="w-24 rounded border px-2 py-1 text-sm font-mono"
                  />
                  <input
                    type="text"
                    value={t.label}
                    onChange={(e) => updateToken(t.id, { label: e.target.value })}
                    placeholder="Label"
                    className="w-28 rounded border px-2 py-1 text-sm"
                  />
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={t.required}
                      onChange={(e) => updateToken(t.id, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  <input
                    type="text"
                    value={t.example}
                    onChange={(e) => updateToken(t.id, { example: e.target.value })}
                    placeholder="Example"
                    className="w-24 rounded border px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeToken(t.id)}
                    className="text-red-600 hover:underline dark:text-red-400"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <label className="text-sm font-medium">Test parse</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={testParseInput}
                onChange={(e) => setTestParseInput(e.target.value)}
                placeholder="Paste filename to parse"
                className="flex-1 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-700"
              />
              <button
                type="button"
                onClick={handleParse}
                className="rounded bg-zinc-200 px-3 py-2 text-sm dark:bg-zinc-600"
              >
                Parse
              </button>
            </div>
            {parsedResult && (
              <pre className="mt-2 overflow-x-auto rounded bg-zinc-100 p-2 text-xs dark:bg-zinc-900">
                {JSON.stringify(parsedResult, null, 2)}
              </pre>
            )}
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
