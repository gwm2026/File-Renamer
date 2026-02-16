import { useState, useCallback, useEffect, useMemo } from 'react'
import type { Company, Scheme, PreviewRow, PreviewStatus } from '@shared/types'
import { ProjectDetailsForm } from './ProjectDetailsForm'
import { FilePreviewTable } from './FilePreviewTable'
import { SchemeEditor } from './SchemeEditor'
import { CompanySettingsModal } from './CompanySettingsModal'
import { Pencil, FileAudio, FolderOpen, Plus, Trash2, Settings } from 'lucide-react'
import { extractStemsFromFilePaths } from '@shared/stemExtractor'
import { renderPattern } from '@shared/template'
import { sanitizeFilename } from '@shared/sanitize'

function getExtension(filePath: string): string {
  const i = filePath.lastIndexOf('.')
  return i > 0 ? filePath.slice(i + 1) : ''
}
function getDir(filePath: string): string {
  const last = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  return last <= 0 ? '' : filePath.slice(0, last)
}
function getBasename(filePath: string): string {
  return filePath.split(/[/\\]/).pop() ?? filePath
}

interface MainPanelProps {
  companies: Company[]
  selectedCompany: Company | null
  selectedScheme: Scheme | null
  onSelectCompany: (companyId: string) => void
  onSelectScheme: (schemeId: string) => void
  onSaveCompanies: (companies: Company[]) => void
  openEditorForSchemeId?: string | null
  onClearOpenEditor?: () => void
}

export function MainPanel({
  companies,
  selectedCompany,
  selectedScheme,
  onSelectCompany,
  onSelectScheme,
  onSaveCompanies,
  openEditorForSchemeId,
  onClearOpenEditor,
}: MainPanelProps) {
  const [batchValues, setBatchValues] = useState<Record<string, string>>({})
  const [filePaths, setFilePaths] = useState<string[]>([])
  const [fileStemOverrides, setFileStemOverrides] = useState<Record<string, string>>({})
  /** Status/warnings from last "Preview Rename" call (optional validation) */
  const [validationResult, setValidationResult] = useState<Record<string, { status: PreviewStatus; warnings?: string[] }>>({})
  const [targetFolder, setTargetFolder] = useState<string | null>(null)
  const [copyInsteadOfRename, setCopyInsteadOfRename] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingScheme, setEditingScheme] = useState<Scheme | null>(null)
  const [companySettingsOpen, setCompanySettingsOpen] = useState(false)
  const [journalCount, setJournalCount] = useState(0)

  const displayRows = useMemo((): PreviewRow[] => {
    if (filePaths.length === 0) return []
    const baseDir = targetFolder ?? undefined
    const rows: PreviewRow[] = filePaths.map((p) => ({
      originalPath: p,
      originalName: getBasename(p),
      path: getDir(p),
      extension: getExtension(p),
      newName: '',
      status: validationResult[p]?.status ?? 'ok',
      targetFolder: baseDir || getDir(p),
      warnings: validationResult[p]?.warnings,
      stemOverride: fileStemOverrides[p],
    }))
    if (!selectedScheme) return rows
    const scheme = selectedScheme
    const seenNewNames = new Set<string>()
    return rows.map((row) => {
      const ext = row.extension ?? getExtension(row.originalPath)
      const dir = row.path ?? getDir(row.originalPath)
      const baseDirForRow = targetFolder || dir
      const batch = { ...batchValues }
      if (scheme.tokens.some((t) => t.key === 'stem')) {
        batch['stem'] = fileStemOverrides[row.originalPath] ?? batchValues['stem'] ?? ''
      }
      let newName: string
      try {
        newName = renderPattern(scheme.pattern, batch, ext, scheme)
      } catch {
        return { ...row, newName: '', status: validationResult[row.originalPath]?.status ?? 'invalid_chars' as PreviewStatus, warnings: ['Failed to render pattern'] }
      }
      newName = sanitizeFilename(newName, scheme.rules)
      const hasExt = ext && newName.toLowerCase().endsWith('.' + ext.toLowerCase())
      if (ext && !hasExt) newName = newName + '.' + ext
      if (seenNewNames.has(newName)) {
        const dotIdx = newName.lastIndexOf('.')
        const base = dotIdx > 0 ? newName.slice(0, dotIdx) : newName
        const extPart = dotIdx > 0 ? newName.slice(dotIdx) : ''
        let n = 1
        while (seenNewNames.has(base + '_' + String(n).padStart(2, '0') + extPart)) n++
        newName = base + '_' + String(n).padStart(2, '0') + extPart
      }
      seenNewNames.add(newName)
      return {
        ...row,
        newName,
        targetFolder: baseDirForRow,
        status: validationResult[row.originalPath]?.status ?? 'ok',
      }
    })
  }, [filePaths, selectedScheme, batchValues, fileStemOverrides, targetFolder, validationResult])

  useEffect(() => {
    if (openEditorForSchemeId && selectedScheme?.id === openEditorForSchemeId) {
      setEditorOpen(true)
      setEditingScheme(selectedScheme)
      onClearOpenEditor?.()
    }
  }, [openEditorForSchemeId, selectedScheme?.id, onClearOpenEditor])

  const refreshJournal = useCallback(async () => {
    const journal = await window.schemerename.getRenameJournal()
    setJournalCount(journal.length)
  }, [])

  useEffect(() => {
    refreshJournal()
  }, [refreshJournal])

  const handleSelectFiles = async () => {
    const paths = await window.schemerename.selectFiles()
    if (paths.length) setFilePaths(paths)
  }

  const handleSelectTargetFolder = async () => {
    const folder = await window.schemerename.selectFolder()
    if (folder) setTargetFolder(folder)
  }

  const handleStemExtractor = () => {
    const stems = extractStemsFromFilePaths(filePaths)
    setFileStemOverrides(stems)
  }

  const handlePreview = async () => {
    if (!selectedScheme) return
    const rows = await window.schemerename.previewRename({
      schemeId: selectedScheme.id,
      batchValues,
      fileStemOverrides: Object.keys(fileStemOverrides).length ? fileStemOverrides : undefined,
      filePaths,
      targetFolder: targetFolder ?? undefined,
      copyInsteadOfRename,
    })
    const next: Record<string, { status: PreviewStatus; warnings?: string[] }> = {}
    rows.forEach((r) => {
      next[r.originalPath] = { status: r.status, warnings: r.warnings }
    })
    setValidationResult(next)
  }

  const handleApply = async () => {
    const okRows = displayRows.filter((r) => r.status === 'ok')
    const ops = okRows.map((r) => {
      const base = r.targetFolder.endsWith('/') || r.targetFolder.endsWith('\\') ? r.targetFolder : r.targetFolder + '/'
      return { fromPath: r.originalPath, toPath: base + r.newName }
    })
    if (!ops.length) return
    const result = await window.schemerename.applyRename({
      operations: ops,
      copyInsteadOfRename,
    })
    if (result.success) {
      setValidationResult({})
      setFilePaths([])
      refreshJournal()
    } else {
      alert(result.error ?? 'Rename failed')
    }
  }

  const handleUndo = async () => {
    const result = await window.schemerename.undoLastRename()
    if (result.success) refreshJournal()
    else alert(result.error ?? 'Undo failed')
  }

  const updateStemOverride = (path: string, stem: string) => {
    setFileStemOverrides((prev) => ({ ...prev, [path]: stem }))
  }

  const hasWarnings = displayRows.some((r) => r.status !== 'ok')
  const canApply = displayRows.length > 0 && !hasWarnings

  const handleAddScheme = () => {
    if (!selectedCompany) return
    const schemeId = selectedCompany.id + '-scheme-' + Date.now()
    const newScheme: Scheme = {
      id: schemeId,
      name: 'New scheme',
      pattern: '{name}',
      tokens: [
        { id: schemeId + '-token-name', key: 'name', label: 'Name', required: true, defaultValue: '', example: 'Example' },
      ],
      rules: { sanitize: true, whitespace: true },
    }
    const next = companies.map((c) =>
      c.id === selectedCompany.id ? { ...c, schemes: [...c.schemes, newScheme] } : c
    )
    onSaveCompanies(next)
    onSelectScheme(newScheme.id)
    setEditingScheme(newScheme)
    setEditorOpen(true)
  }

  const handleDeleteScheme = () => {
    if (!selectedCompany || !selectedScheme || selectedCompany.schemes.length <= 1) return
    if (!confirm(`Delete scheme "${selectedScheme.name}"?`)) return
    const nextSchemes = selectedCompany.schemes.filter((s) => s.id !== selectedScheme.id)
    const nextCompany = { ...selectedCompany, schemes: nextSchemes }
    const next = companies.map((c) => (c.id === selectedCompany.id ? nextCompany : c))
    onSaveCompanies(next)
    onSelectScheme(nextSchemes[0].id)
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-4 border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <select
            value={selectedCompany?.id ?? ''}
            onChange={(e) => onSelectCompany(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700"
          >
            <option value="">Select company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {selectedCompany && (
            <>
              <button
                type="button"
                onClick={() => setCompanySettingsOpen(true)}
                className="flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600"
                title="Company settings"
              >
                <Settings className="h-4 w-4" />
                Company settings
              </button>
              <select
                value={selectedScheme?.id ?? ''}
                onChange={(e) => onSelectScheme(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700"
              >
                {selectedCompany.schemes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddScheme}
                className="flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600"
              >
                <Plus className="h-4 w-4" />
                Add scheme
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingScheme(selectedScheme ?? null)
                  setEditorOpen(true)
                }}
                className="flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600"
              >
                <Pencil className="h-4 w-4" />
                Edit scheme
              </button>
              {selectedCompany.schemes.length > 1 && (
                <button
                  type="button"
                  onClick={handleDeleteScheme}
                  className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-1.5 text-sm text-red-600 dark:border-red-800 dark:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete scheme
                </button>
              )}
            </>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {selectedScheme ? (
          <>
            <ProjectDetailsForm
              template={selectedScheme}
              company={selectedCompany}
              values={batchValues}
              onChange={setBatchValues}
            />

            <section className="mt-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectFiles}
                  className="inline-flex items-center gap-2 rounded-md bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-600 dark:hover:bg-zinc-500"
                >
                  <FileAudio className="h-4 w-4" />
                  Select files
                </button>
                <button
                  type="button"
                  onClick={handleSelectTargetFolder}
                  className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
                >
                  <FolderOpen className="h-4 w-4" />
                  Target folder (optional)
                </button>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={copyInsteadOfRename}
                    onChange={(e) => setCopyInsteadOfRename(e.target.checked)}
                  />
                  Copy then rename
                </label>
                {selectedScheme.tokens.some((t) => t.key === 'stem') && (
                  <button
                    type="button"
                    onClick={handleStemExtractor}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
                  >
                    Extract suffix
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePreview}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Preview Rename
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!canApply}
                  className="rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Apply Rename
                </button>
                {journalCount > 0 && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="rounded-md border border-amber-500 px-3 py-2 text-sm text-amber-700 dark:text-amber-400"
                  >
                    Undo Last Rename
                  </button>
                )}
              </div>
              <FilePreviewTable
                rows={displayRows}
                stemOverrides={fileStemOverrides}
                onStemChange={updateStemOverride}
                perFileToken={selectedScheme.tokens.find((t) => t.key === 'stem') ?? null}
              />
            </section>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 py-16 dark:border-zinc-600">
            <p className="text-zinc-500 dark:text-zinc-400">Select a company from the dropdown to start.</p>
          </div>
        )}
      </div>

      {companySettingsOpen && selectedCompany && (
        <CompanySettingsModal
          company={selectedCompany}
          companies={companies}
          onSave={(next) => {
            onSaveCompanies(next)
            setCompanySettingsOpen(false)
          }}
          onClose={() => setCompanySettingsOpen(false)}
        />
      )}
      {editorOpen && editingScheme && selectedCompany && (
        <SchemeEditor
          company={selectedCompany}
          scheme={editingScheme}
          companies={companies}
          onSave={(next) => {
            onSaveCompanies(next)
            setEditorOpen(false)
            setEditingScheme(null)
          }}
          onClose={() => {
            setEditorOpen(false)
            setEditingScheme(null)
            onClearOpenEditor?.()
          }}
        />
      )}
    </main>
  )
}
