import { useState, useEffect, useCallback } from 'react'
import type { Company, Scheme } from '@shared/types'
import { Sidebar } from './components/Sidebar'
import { MainPanel } from './components/MainPanel'

function createDefaultScheme(companyId: string): Scheme {
  const schemeId = companyId + '-default'
  return {
    id: schemeId,
    name: 'Default',
    pattern: '{name}',
    tokens: [
      { id: schemeId + '-token-name', key: 'name', label: 'Name', required: true, defaultValue: '', example: 'Example' },
    ],
    rules: { sanitize: true, whitespace: true },
  }
}

export default function App() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [openEditorForSchemeId, setOpenEditorForSchemeId] = useState<string | null>(null)

  const loadCompanies = useCallback(async () => {
    try {
      const list = await window.schemerename.getCompanies()
      setCompanies(list)
      if (list.length) {
        if (!selectedCompanyId || !list.some((c) => c.id === selectedCompanyId)) {
          setSelectedCompanyId(list[0].id)
          setSelectedSchemeId(list[0].schemes[0]?.id ?? null)
        } else {
          const company = list.find((c) => c.id === selectedCompanyId)
          const schemeIds = company?.schemes.map((s) => s.id) ?? []
          if (!selectedSchemeId || !schemeIds.includes(selectedSchemeId)) {
            setSelectedSchemeId(company?.schemes[0]?.id ?? null)
          }
        }
      } else {
        setSelectedCompanyId(null)
        setSelectedSchemeId(null)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedCompanyId, selectedSchemeId])

  useEffect(() => {
    loadCompanies()
  }, [])

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) ?? null
  const selectedScheme = selectedCompany?.schemes.find((s) => s.id === selectedSchemeId) ?? selectedCompany?.schemes[0] ?? null

  useEffect(() => {
    if (selectedCompany && selectedSchemeId && !selectedCompany.schemes.some((s) => s.id === selectedSchemeId)) {
      setSelectedSchemeId(selectedCompany.schemes[0]?.id ?? null)
    }
  }, [selectedCompanyId, selectedCompany, selectedSchemeId])

  const handleSaveCompanies = async (next: Company[]) => {
    setCompanies(next)
    await window.schemerename.saveCompanies(next)
  }

  const handleAddCompany = () => {
    const companyId = 'new-' + Date.now()
    const newCompany: Company = {
      id: companyId,
      name: 'New Company',
      types: [],
      schemes: [createDefaultScheme(companyId)],
    }
    const next = [...companies, newCompany]
    window.schemerename.saveCompanies(next).then(() => {
      setCompanies(next)
      setSelectedCompanyId(newCompany.id)
      setSelectedSchemeId(newCompany.schemes[0].id)
      setOpenEditorForSchemeId(newCompany.schemes[0].id)
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
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onSelectCompany={setSelectedCompanyId}
        onAddCompany={handleAddCompany}
        onSaveCompanies={handleSaveCompanies}
      />
      <MainPanel
        companies={companies}
        selectedCompany={selectedCompany}
        selectedScheme={selectedScheme}
        onSelectCompany={setSelectedCompanyId}
        onSelectScheme={setSelectedSchemeId}
        onSaveCompanies={handleSaveCompanies}
        openEditorForSchemeId={openEditorForSchemeId}
        onClearOpenEditor={() => setOpenEditorForSchemeId(null)}
      />
    </div>
  )
}
