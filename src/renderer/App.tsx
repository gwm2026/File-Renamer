import { useState, useEffect, useCallback } from 'react'
import type { CompanyTemplate } from '@shared/types'
import { Sidebar } from './components/Sidebar'
import { MainPanel } from './components/MainPanel'

export default function App() {
  const [templates, setTemplates] = useState<CompanyTemplate[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [openEditorForId, setOpenEditorForId] = useState<string | null>(null)

  const loadTemplates = useCallback(async () => {
    try {
      const list = await window.schemerename.getTemplates()
      setTemplates(list)
      if (list.length && !selectedId) setSelectedId(list[0].id)
      if (selectedId && !list.some((t) => t.id === selectedId)) setSelectedId(list[0]?.id ?? null)
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => {
    loadTemplates()
  }, [])

  const selectedTemplate = templates.find((t) => t.id === selectedId) ?? null

  const handleSaveTemplates = async (next: CompanyTemplate[]) => {
    await window.schemerename.saveTemplates(next)
    setTemplates(next)
  }

  const handleAddCompany = () => {
    const newTemplate: CompanyTemplate = {
      id: 'new-' + Date.now(),
      name: 'New Company',
      pattern: '{name}',
      tokens: [{ id: 't1', key: 'name', label: 'Name', required: true, defaultValue: '', example: 'Example' }],
      rules: { sanitize: true, whitespace: true },
    }
    const next = [...templates, newTemplate]
    window.schemerename.saveTemplates(next).then(() => {
      setTemplates(next)
      setSelectedId(newTemplate.id)
      setOpenEditorForId(newTemplate.id)
    })
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-900">
        <p className="text-zinc-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-zinc-100 dark:bg-zinc-900">
      <Sidebar
        templates={templates}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAddCompany={handleAddCompany}
        onSaveTemplates={handleSaveTemplates}
      />
      <MainPanel
        templates={templates}
        selectedTemplate={selectedTemplate}
        onSelectTemplate={setSelectedId}
        onSaveTemplates={handleSaveTemplates}
        openEditorForId={openEditorForId}
        onClearOpenEditor={() => setOpenEditorForId(null)}
      />
    </div>
  )
}
