import { STORAGE_PREFIX } from './storage'

const FORMAT = 'axedex-save'
const VERSION = 1

interface SaveFile {
  format: typeof FORMAT
  version: number
  exportedAt: string
  data: Record<string, string>
}

function ownKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(`${STORAGE_PREFIX}:`)) keys.push(k)
  }
  return keys
}

/** Downloads every AXEdex key from localStorage as a JSON backup. */
export function exportSave(): void {
  const data: Record<string, string> = {}
  for (const k of ownKeys()) data[k] = localStorage.getItem(k) ?? ''
  const file: SaveFile = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), data }
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `axedex-save-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Validates and restores a backup. Throws a Russian, user-facing message on failure. */
export async function importSave(file: File): Promise<void> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('Файл пошкоджено або це не збереження.')
  }
  const save = parsed as Partial<SaveFile>
  if (save.format !== FORMAT || typeof save.data !== 'object' || !save.data) {
    throw new Error('Це не файл збереження AXEdex.')
  }
  const entries = Object.entries(save.data).filter(([k, v]) => k.startsWith(`${STORAGE_PREFIX}:`) && typeof v === 'string')
  if (!entries.some(([k]) => k === `${STORAGE_PREFIX}:casino`)) {
    throw new Error('У файлі немає даних гаманця.')
  }
  for (const k of ownKeys()) localStorage.removeItem(k)
  for (const [k, v] of entries) localStorage.setItem(k, v)
}

/** Asks the browser not to evict our data under storage pressure. */
export function requestPersistentStorage(): void {
  try {
    void navigator.storage?.persist?.()
  } catch {
    /* not supported */
  }
}
