import path from 'path'
import type {
  CompanyTemplate,
  PreviewRow,
  PreviewRenameArgs,
  ApplyRenameResult,
  PreviewStatus,
} from '../shared/types'
import { renderPattern } from '../shared/template'
import { sanitizeFilename } from '../shared/sanitize'
import { getDefaultTemplates as getPresets } from './presets'

export function getDefaultTemplates(): CompanyTemplate[] {
  return getPresets()
}

function getExtension(filePath: string): string {
  const i = filePath.lastIndexOf('.')
  return i > 0 ? filePath.slice(i + 1) : ''
}

function getDir(filePath: string): string {
  const last = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  return last <= 0 ? '' : filePath.slice(0, last)
}

export function previewRename(
  args: PreviewRenameArgs,
  templates: CompanyTemplate[],
  fsModule: Pick<typeof import('fs/promises'), 'stat'>
): PreviewRow[] {
  const template = templates.find((t) => t.id === args.templateId)
  if (!template) return []

  const targetDir = args.targetFolder ?? null
  const rows: PreviewRow[] = []
  const seenNewNames = new Set<string>()
  const sourcePaths = new Set(args.filePaths)

  for (const filePath of args.filePaths) {
    const ext = getExtension(filePath)
    const dir = getDir(filePath)
    const baseDir = targetDir ?? dir

    const batchValues = { ...args.batchValues }
    const stemOverride = args.fileStemOverrides?.[filePath]
    if (template.tokens.some((t) => t.key === 'stem')) {
      batchValues['stem'] = stemOverride ?? batchValues['stem'] ?? ''
    }

    let newName: string
    try {
      newName = renderPattern(template.pattern, batchValues, ext, template)
    } catch {
      rows.push({
        originalPath: filePath,
        originalName: filePath.split(/[/\\]/).pop() ?? filePath,
        newName: '',
        status: 'invalid_chars',
        targetFolder: baseDir,
        warnings: ['Failed to render pattern'],
      })
      continue
    }

    newName = sanitizeFilename(newName, template.rules)
    const hasExt = ext && newName.toLowerCase().endsWith('.' + ext.toLowerCase())
    if (ext && !hasExt) newName = newName + '.' + ext

    const targetPath = path.join(baseDir, newName)
    let status: PreviewStatus = 'ok'
    const warnings: string[] = []

    if (seenNewNames.has(newName)) {
      status = 'duplicate'
      warnings.push('Duplicate target filename in batch')
    }
    seenNewNames.add(newName)

    if (status === 'ok') {
      try {
        const st = await fsModule.stat(targetPath)
        if (st && !sourcePaths.has(targetPath)) {
          status = 'exists'
          warnings.push('Target file already exists on disk')
        }
      } catch {
        // file doesn't exist, ok
      }
    }

    rows.push({
      originalPath: filePath,
      originalName: filePath.split(/[/\\]/).pop() ?? filePath,
      newName,
      status,
      targetFolder: baseDir,
      warnings: warnings.length ? warnings : undefined,
      stemOverride,
    })
  }
  return rows
}

export async function applyRename(
  args: {
    operations: { fromPath: string; toPath: string }[]
    copyInsteadOfRename?: boolean
  },
  fsModule: typeof import('fs/promises')
): Promise<ApplyRenameResult> {
  const { operations, copyInsteadOfRename } = args
  if (!operations.length) return { success: true, applied: [] }

  if (copyInsteadOfRename) {
    const applied: { fromPath: string; toPath: string }[] = []
    for (const op of operations) {
      const dir = path.dirname(op.toPath)
      await fsModule.mkdir(dir, { recursive: true })
      await fsModule.copyFile(op.fromPath, op.toPath)
      applied.push(op)
    }
    return { success: true, applied }
  }

  const batchId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  const tempRecords: { original: string; temp: string; destination: string }[] = []

  try {
    for (let i = 0; i < operations.length; i++) {
      const { fromPath, toPath } = operations[i]
      const dir = getDir(fromPath)
      const tempPath = path.join(dir, '.schemerename_tmp_' + batchId + '_' + i)
      await fsModule.rename(fromPath, tempPath)
      tempRecords.push({ original: fromPath, temp: tempPath, destination: toPath })
    }
    const applied: { fromPath: string; toPath: string }[] = []
    for (const r of tempRecords) {
      await fsModule.rename(r.temp, r.destination)
      applied.push({ fromPath: r.original, toPath: r.destination })
    }
    return { success: true, applied }
  } catch (err: unknown) {
    for (let i = tempRecords.length - 1; i >= 0; i--) {
      const r = tempRecords[i]
      try {
        const st = await fsModule.stat(r.temp)
        if (st) await fsModule.rename(r.temp, r.original)
      } catch {
        try {
          const st = await fsModule.stat(r.destination)
          if (st) await fsModule.rename(r.destination, r.original)
        } catch {
          // ignore
        }
      }
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function undoLastRename(
  journal: import('../shared/types').RenameJournalEntry[],
  fsModule: typeof import('fs/promises')
): Promise<{ success: boolean; error?: string; undone?: boolean }> {
  if (!journal.length) return { success: false, error: 'No renames to undo' }
  const last = journal[journal.length - 1]
  try {
    for (const op of last.operations.slice().reverse()) {
      const stTo = await fsModule.stat(op.toPath).catch(() => null)
      const stFrom = await fsModule.stat(op.fromPath).catch(() => null)
      if (stTo && !stFrom) await fsModule.rename(op.toPath, op.fromPath)
      if (stTo && stFrom) await fsModule.unlink(op.toPath)
    }
    return { success: true, undone: true }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
