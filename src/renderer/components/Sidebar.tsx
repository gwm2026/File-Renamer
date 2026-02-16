import { FolderPlus, Building2 } from 'lucide-react'
import type { Company } from '@shared/types'

interface SidebarProps {
  companies: Company[]
  selectedCompanyId: string | null
  onSelectCompany: (id: string) => void
  onAddCompany: () => void
  onSaveCompanies: (companies: Company[]) => void
}

export function Sidebar({ companies, selectedCompanyId, onSelectCompany, onAddCompany }: SidebarProps) {
  return (
    <aside className="flex w-60 flex-col border-r border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="border-b border-zinc-200 p-3 dark:border-zinc-700">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Companies</h2>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {companies.length === 0 ? (
          <p className="rounded-md px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
            No companies yet. Add one to get started.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {companies.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelectCompany(c.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    selectedCompanyId === c.id
                      ? 'bg-zinc-200 dark:bg-zinc-600'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  <Building2 className="h-4 w-4 shrink-0 text-zinc-500" />
                  <span className="truncate">{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
      <div className="border-t border-zinc-200 p-2 dark:border-zinc-700">
        <button
          type="button"
          onClick={onAddCompany}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700"
        >
          <FolderPlus className="h-4 w-4" />
          Add Company
        </button>
      </div>
    </aside>
  )
}
