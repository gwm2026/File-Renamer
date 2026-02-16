import type { PreviewRow } from '@shared/types'
import { AlertCircle } from 'lucide-react'

interface FilePreviewTableProps {
  rows: PreviewRow[]
  stemOverrides: Record<string, string>
  onStemChange: (path: string, stem: string) => void
}

export function FilePreviewTable({ rows, stemOverrides, onStemChange }: FilePreviewTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
        Select files and click Preview Rename to see results.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
            <th className="px-4 py-2 font-medium">Original name</th>
            <th className="px-4 py-2 font-medium">New name</th>
            <th className="px-4 py-2 font-medium">Stem</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Target folder</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.originalPath}
              className={`border-b border-zinc-100 dark:border-zinc-700 ${
                row.status !== 'ok' ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
              }`}
            >
              <td className="max-w-[200px] truncate px-4 py-2" title={row.originalPath}>
                {row.originalName}
              </td>
              <td className="max-w-[200px] truncate px-4 py-2" title={row.newName}>
                {row.newName}
              </td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={stemOverrides[row.originalPath] ?? row.stemOverride ?? ''}
                  onChange={(e) => onStemChange(row.originalPath, e.target.value)}
                  placeholder="Stem"
                  className="w-32 rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-700"
                />
              </td>
              <td className="px-4 py-2">
                {row.status === 'ok' ? (
                  <span className="text-green-600 dark:text-green-400">OK</span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    {row.status}
                    {row.warnings?.length ? ': ' + row.warnings.join('; ') : ''}
                  </span>
                )}
              </td>
              <td className="max-w-[150px] truncate px-4 py-2 text-zinc-500" title={row.targetFolder}>
                {row.targetFolder || '(in place)'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
