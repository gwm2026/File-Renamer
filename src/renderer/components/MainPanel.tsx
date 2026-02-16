import { useState, useCallback, useEffect } from 'react'
import type { CompanyTemplate, PreviewRow } from '@shared/types'
import { ProjectDetailsForm } from './ProjectDetailsForm'
import { FilePreviewTable } from './FilePreviewTable'
import { TemplateEditor } from './TemplateEditor'
import { Pencil, FileAudio, FolderOpen } from 'lucide-react'
import { extractStemsFromFilePaths } from '@shared/stemExtractor'

interface MainPanelProps {
  templates: CompanyTemplate[]
  selectedTemplate: CompanyTemplate | null
  onSelectTemplate: (id: string) => void
  onSaveTemplates: (templates: CompanyTemplate[]) => void
  openEditorForId?: string | null
  onClearOpenEditor?: () => void
}

export function MainPanel({
  templates,
  selectedTemplate,
  onSelectTemplate,
  onSaveTemplates,
  openEditorForId,
  onClearOpenEditor,
}: MainPanelProps) {
  const [batchValues, setBatchValues] = useState<Record<string, string>>({})
  const [filePaths, setFilePaths] = useState<string[]>([])
  const [fileStemOverrides, setFileStemOverrides] = useState<Record<string, string>>({})
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [targetFolder, setTargetFolder] = useState<string | null>(null)
  const [copyInsteadOfRename, setCopyInsteadOfRename] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CompanyTemplate | null>(null)
  const [journalCount, setJournalCount] = useState(0)

  useEffect(() => {
    if (openEditorForId && selectedTemplate?.id === openEditorForId) {
      setEditorOpen(true)
      setEditingTemplate(selectedTemplate)
      onClearOpenEditor?.()
    }
  }, [openEditorForId, selectedTemplate?.id, onClearOpenEditor])

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
    if (!selectedTemplate) return
    const rows = await window.schemerename.previewRename({
      templateId: selectedTemplate.id,
      batchValues,
      fileStemOverrides: Object.keys(fileStemOverrides).length ? fileStemOverrides : undefined,
      filePaths,
      targetFolder: targetFolder ?? undefined,
      copyInsteadOfRename,
    })
    setPreviewRows(rows)
  }

  const handleApply = async () => {
    const okRows = previewRows.filter((r) => r.status === 'ok')
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
      setPreviewRows([])
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

  const hasWarnings = previewRows.some((r) => r.status !== 'ok')
  const canApply = previewRows.length > 0 && !hasWarnings

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-4 border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex flex-1 items-center gap-3">
          <select
            value={selectedTemplate?.id ?? ''}
            onChange={(e) => onSelectTemplate(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700"
          >
            <option value="">Select company</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setEditingTemplate(selectedTemplate ?? null)
              setEditorOpen(true)
            }}
            className="flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600"
          >
            <Pencil className="h-4 w-4" />
            Edit template
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {selectedTemplate ? (
          <>
            <ProjectDetailsForm
              template={selectedTemplate}
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
                {selectedTemplate.tokens.some((t) => t.key === 'stem') && (
                  <button
                    type="button"
                    onClick={handleStemExtractor}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
                  >
                    Stem Extractor
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
                rows={previewRows}
                stemOverrides={fileStemOverrides}
                onStemChange={updateStemOverride}
              />
            </section>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 py-16 dark:border-zinc-600">
            <p className="text-zinc-500 dark:text-zinc-400">Select a company from the dropdown to start.</p>
          </div>
        )}
      </div>

      {editorOpen && editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          templates={templates}
          onSave={(next) => {
            onSaveTemplates(next)
            setEditorOpen(false)
            setEditingTemplate(null)
          }}
          onClose={() => {
            setEditorOpen(false)
            setEditingTemplate(null)
            onClearOpenEditor?.()
          }}
        />
      )}
    </main>
  )
}
