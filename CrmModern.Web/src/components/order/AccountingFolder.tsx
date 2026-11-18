import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Download, Eye, File as FileIcon, FileArchive, FileImage, FileSpreadsheet, FileText,
  FolderOpen, Trash2, Upload, X,
} from 'lucide-react'
import {
  getOrderFolder, getFolderCounts, uploadFolderFile, deleteFolderFile, deleteFolderLegacyFile, restoreFolderFile,
  fetchFolderFile, fetchFolderLegacyFile, fetchProformaPdf, saveBlob, folderFileError,
  isPreviewable, FOLDER_ACCEPT, type FolderFile, type FolderLegacyFile, type LegacyKind,
} from '@/api/orderFolder'
import { useUndoableDelete } from '@/hooks/useUndoableDelete'
import { downloadExcel, downloadPdf } from '@/api/orders'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SectionTitle } from '@/components/ui/section-title'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { FilePreviewDialog, type FilePreview } from '@/components/FilePreviewDialog'
import { useToast } from '@/components/ToastProvider'
import { toastApiError } from '@/lib/apiError'
import { Checkbox } from '@/components/ui/checkbox'
import { describeApiError } from '@/lib/axios'
import { useAuth } from '@/hooks/useAuth'
import { hideMoneyFor } from '@/lib/visibility'
import { cn, formatDate } from '@/lib/utils'
import type { AuthUser } from '@/types'

import { appLocale } from '@/lib/format'
/**
 * Muhasebe Klasörü — "her siparişin bir klasörü vardır".
 *
 * Tek kavram, tek pencere: Sipariş Detayı başlığı, Muhasebe · Klasörler, Tahsilat,
 * Muhasebe Onay ve Kontrol ekranları aynı `AccountingFolderDialog`'u açar.
 * Düğmedeki sayaç (`useFolderCounts`) klasörü açmadan dolu olup olmadığını gösterir.
 * Yükleme her zaman EKLER (üzerine yazmaz); silme ayrı eylemdir ve onay ister.
 */

export const FOLDER_COUNTS_KEY = ['order-folder-counts'] as const
export const folderKey = (no: string) => ['order-folder', no] as const

/** Klasörü görebilir mi? Parasal değer göremeyen kullanıcılar (Fabrika vb.) görmez. */
export function canSeeAccountingFolder(user: AuthUser | null | undefined): boolean {
  return !!user && !hideMoneyFor(user)
}

/** SiparisNo → muhasebe eki sayısı (tek sorgu, tüm ekranlar paylaşır). */
export function useFolderCounts() {
  const { getUser } = useAuth()
  const enabled = canSeeAccountingFolder(getUser())
  return useQuery({ queryKey: FOLDER_COUNTS_KEY, queryFn: getFolderCounts, enabled, staleTime: 30_000 })
}

// ── Düğme ───────────────────────────────────────────────────────────────────

interface ButtonProps {
  siparisNo: string
  onClick: () => void
  /** true → yalnız simge + sayaç (tablo satırları). */
  compact?: boolean
  className?: string
  disabled?: boolean
}

export function AccountingFolderButton({ siparisNo, onClick, compact = false, className, disabled }: ButtonProps) {
  const { t } = useTranslation()
  const { data: counts } = useFolderCounts()
  const n = counts?.[siparisNo] ?? 0
  const label = n > 0 ? t('folder.buttonWithCount', { count: n }) : t('folder.buttonEmpty')

  if (compact) {
    return (
      <Button size="xs" variant="outline" className={cn('tabular-nums', className)} disabled={disabled}
        aria-label={label} onClick={onClick}>
        <FolderOpen className="h-4 w-4" aria-hidden /> {t('folder.short')}
        <span className={cn('min-w-[1ch]', n === 0 && 'text-muted-foreground')}>({n})</span>
      </Button>
    )
  }
  return (
    <Button size="xs" variant="outline" className={className} disabled={disabled} title={label} onClick={onClick}>
      <FolderOpen className="h-3.5 w-3.5" /> {t('folder.button')}
      {n > 0 && <span className="rounded bg-muted px-1 text-2xs font-semibold tabular-nums text-foreground">{n}</span>}
    </Button>
  )
}

// ── Pencere ─────────────────────────────────────────────────────────────────

interface DialogProps {
  siparisNo: string | null
  onClose: () => void
  /** true → pencere açılınca dosya seçici de açılır (listelerdeki "+" düğmesi). */
  autoPick?: boolean
}

export function AccountingFolderDialog({ siparisNo, onClose, autoPick = false }: DialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={!!siparisNo} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent size="lg" className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b px-5 pb-3 pr-12 pt-5">
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
            {t('folder.titleWithNo', { no: siparisNo })}
          </DialogTitle>
        </div>
        {siparisNo && <FolderBody key={siparisNo} siparisNo={siparisNo} autoPick={autoPick} />}
      </DialogContent>
    </Dialog>
  )
}

interface UploadItem { id: number; name: string; pct: number; error?: string }

function FolderBody({ siparisNo, autoPick }: { siparisNo: string; autoPick: boolean }) {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const undoable = useUndoableDelete()
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const seq = useRef(0)
  const picked = useRef(false)
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [preview, setPreview] = useState<FilePreview | null>(null)

  const [showDeleted, setShowDeleted] = useState(false)
  const { data: folder, isLoading, isError } = useQuery({
    queryKey: [...folderKey(siparisNo), showDeleted],
    queryFn: () => getOrderFolder(siparisNo, showDeleted),
  })

  const refresh = useCallback(() => Promise.all([
    qc.invalidateQueries({ queryKey: folderKey(siparisNo) }),
    qc.invalidateQueries({ queryKey: FOLDER_COUNTS_KEY }),
  ]), [qc, siparisNo])

  // "+" ile açıldıysa: klasör yüklenip yetki doğrulanınca dosya seçiciyi bir kez aç.
  useEffect(() => {
    if (autoPick && folder?.canManage && !picked.current) {
      picked.current = true
      inputRef.current?.click()
    }
  }, [autoPick, folder?.canManage])

  const fmtSize = (b: number) => {
    const nf = (n: number, d: number) => n.toLocaleString(appLocale(), { maximumFractionDigits: d })
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${nf(b / 1024, 0)} KB`
    return `${nf(b / (1024 * 1024), 1)} MB`
  }

  const patch = (id: number, p: Partial<UploadItem>) =>
    setUploads((u) => u.map((x) => (x.id === id ? { ...x, ...p } : x)))

  const addFiles = async (files: File[]) => {
    if (files.length === 0) return
    const items = files.map((file) => {
      const rule = folderFileError(file)
      return { file, item: { id: ++seq.current, name: file.name, pct: 0, error: rule ? t(`folder.${rule}`) : undefined } as UploadItem }
    })
    setUploads((u) => [...items.map((x) => x.item), ...u])
    let ok = 0
    // Tek tek gönder: her dosyanın kendi ilerlemesi + hatası olur, istek sınırına takılmaz.
    for (const { file, item } of items) {
      if (item.error) continue
      try {
        await uploadFolderFile(siparisNo, file, (pct) => patch(item.id, { pct }))
        ok++
        setUploads((u) => u.filter((x) => x.id !== item.id))
        await refresh()
      } catch (e) {
        patch(item.id, { error: describeApiError(e) || t('folder.uploadFailed') })
      }
    }
    if (ok > 0) toast({ title: t('folder.uploaded', { count: ok }), description: siparisNo, variant: 'success' })
  }

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key)
    try { await fn() } catch (e) { toastApiError(toast, t('folder.actionFailed'), e) } finally { setBusy(null) }
  }

  const download = (key: string, load: () => Promise<Blob>, name: string) =>
    run(key, async () => saveBlob(await load(), name))

  // K5 — silme yumuşaktır: onaydan sonra 10 sn "Geri al" (restore ucu).
  const remove = async <R,>(name: string, del: () => Promise<R>, key: string, undo: (r: R) => Promise<unknown>) => {
    const ok = await confirm({
      title: t('folder.deleteTitle', { name }),
      description: t('folder.deleteDesc'),
      impact: [t('common.undoHint')],
      confirmLabel: t('folder.delete'),
      destructive: true,
    })
    if (!ok) return
    await run(key, async () => {
      const r = await del()
      await refresh()
      undoable({ title: t('folder.deleted'), name, restore: () => undo(r), onRestored: refresh })
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-5" aria-busy>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}
      </div>
    )
  }
  if (isError || !folder) {
    return <p className="p-8 text-center text-sm text-danger">{t('folder.loadError')}</p>
  }

  const activeFiles = folder.dosyalar.filter((f) => !f.silindi)
  const deletedFiles = folder.dosyalar.filter((f) => f.silindi)
  const fileCount = activeFiles.length + (folder.oncekiMuhasebeEk ? 1 : 0)
  const legacyRow = (kind: LegacyKind, f: FolderLegacyFile, title: string, deletable: boolean) => {
    const load = () => fetchFolderLegacyFile(siparisNo, kind)
    return (
      <FileRow key={`legacy-${kind}`} name={title} fileName={f.ad} tip={f.tip}
        meta={fmtSize(f.boyut)}
        busyKey={busy} rowKey={`legacy-${kind}`}
        onView={isPreviewable(f.tip) ? () => setPreview({ title, fileName: f.ad, load }) : undefined}
        onDownload={() => download(`legacy-${kind}`, load, f.ad)}
        onDelete={deletable ? () => remove(title, () => deleteFolderLegacyFile(siparisNo), `legacy-${kind}`,
          (ekId) => (ekId ? restoreFolderFile(siparisNo, ekId) : Promise.resolve())) : undefined}
      />
    )
  }

  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5 pt-4 text-sm">
      {folder.canManage && (
        <div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); void addFiles(Array.from(e.dataTransfer.files)) }}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-md border-2 border-dashed px-4 py-4 text-center transition-colors',
              dragging ? 'border-primary bg-primary/5' : 'border-border-strong bg-card',
            )}
          >
            <p className="flex flex-wrap items-center justify-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span>{t('folder.dropHint')}</span>
              <Button size="xs" onClick={() => inputRef.current?.click()}>{t('folder.chooseFiles')}</Button>
            </p>
            <p className="text-xs text-muted-foreground">{t('folder.rules')}</p>
            <input ref={inputRef} type="file" multiple accept={FOLDER_ACCEPT} className="sr-only" tabIndex={-1}
              aria-label={t('folder.chooseFiles')}
              onChange={(e) => { const fs = Array.from(e.target.files ?? []); e.target.value = ''; void addFiles(fs) }} />
          </div>
          {uploads.length > 0 && (
            <ul className="mt-2 space-y-1" aria-live="polite">
              {uploads.map((u) => (
                <li key={u.id} className={cn('flex items-center gap-2 rounded-md border px-2 py-1.5',
                  u.error ? 'border-danger/40 bg-danger-soft text-danger-soft-foreground' : 'bg-card')}>
                  <span className="min-w-0 flex-1 truncate" title={u.name}>{u.name}</span>
                  {u.error ? (
                    <>
                      <span className="shrink-0 text-xs">{u.error}</span>
                      <Button type="button" size="xs" variant="ghost" className="shrink-0"
                        onClick={() => setUploads((x) => x.filter((y) => y.id !== u.id))}>
                        <X className="h-4 w-4" aria-hidden /> {t('common.close')}
                      </Button>
                    </>
                  ) : (
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-1.5 w-24 overflow-hidden rounded bg-muted">
                        <span className="block h-full bg-primary transition-[width]" style={{ width: `${u.pct}%` }} />
                      </span>
                      {t('folder.uploading')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {folder.canSeeProforma && (
        <section className="space-y-1.5">
          <SectionTitle>{t('folder.sections.proforma')} <span className="font-normal text-muted-foreground">· {t('folder.sections.proformaHint')}</span></SectionTitle>
          <FileRow name={t('folder.proformaExcel')} tip="application/vnd.ms-excel" busyKey={busy} rowKey="pf-excel"
            onDownload={() => run('pf-excel', () => downloadExcel(siparisNo))} />
          <FileRow name={t('folder.proformaPdf')} tip="application/pdf" busyKey={busy} rowKey="pf-pdf"
            onView={() => setPreview({ title: t('folder.proformaPdf'), fileName: `Proforma_${siparisNo}.pdf`, load: () => fetchProformaPdf(siparisNo) })}
            onDownload={() => run('pf-pdf', () => downloadPdf(siparisNo))} />
        </section>
      )}

      <section className="space-y-1.5">
        <SectionTitle>{t('folder.sections.files')} <span className="font-normal text-muted-foreground">({fileCount})</span></SectionTitle>
        {fileCount === 0 && <p className="rounded-md border border-dashed px-3 py-3 text-muted-foreground">{t('folder.empty')}</p>}
        {activeFiles.map((f: FolderFile) => {
          const load = () => fetchFolderFile(siparisNo, f.ekID)
          const key = `f-${f.ekID}`
          return (
            <FileRow key={key} name={f.ad} tip={f.tip} rowKey={key} busyKey={busy}
              meta={[fmtSize(f.boyut), f.yukleyenAdSoyad, formatDate(f.tarih)].filter(Boolean).join(' · ')}
              onView={isPreviewable(f.tip) ? () => setPreview({ title: f.ad, fileName: f.ad, load }) : undefined}
              onDownload={() => download(key, load, f.ad)}
              onDelete={folder.canManage ? () => remove(f.ad, () => deleteFolderFile(siparisNo, f.ekID), key, () => restoreFolderFile(siparisNo, f.ekID)) : undefined}
            />
          )
        })}
        {folder.oncekiMuhasebeEk && legacyRow('muhasebe', folder.oncekiMuhasebeEk, t('folder.oncekiMuhasebeEk'), folder.canManage)}
        {folder.canManage && (
          <div className="pt-1">
            <Checkbox checked={showDeleted} onCheckedChange={setShowDeleted} label={t('undo.showDeleted')} />
          </div>
        )}
        {showDeleted && deletedFiles.length > 0 && (
          <ul className="space-y-1.5" aria-label={t('undo.showDeleted')}>
            {deletedFiles.map((f) => (
              <li key={`del-${f.ekID}`} className="flex flex-wrap items-center gap-2 rounded-md border border-dashed bg-muted px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-muted-foreground line-through decoration-1">{f.ad}</span>
                <span className="rounded bg-danger-soft px-1.5 text-xs font-medium text-danger-soft-foreground">{t('undo.deletedBadge')}{f.silinmeTarihi ? ` · ${formatDate(f.silinmeTarihi)}` : ''}</span>
                <Button size="xs" variant="outline" loading={busy === `r-${f.ekID}`}
                  onClick={() => run(`r-${f.ekID}`, async () => { await restoreFolderFile(siparisNo, f.ekID); await refresh() })}>
                  {t('undo.restore')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {folder.saticiEk && (
        <section className="space-y-1.5">
          <SectionTitle>{t('folder.sections.saticiEk')}</SectionTitle>
          {legacyRow('satici', folder.saticiEk, folder.saticiEk.ad, false)}
        </section>
      )}

      <FilePreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </div>
  )
}

// ── Satır ───────────────────────────────────────────────────────────────────

function iconFor(tip: string, name: string) {
  const n = name.toLowerCase()
  if (tip === 'application/pdf') return FileText
  if (tip.startsWith('image/')) return FileImage
  if (/\.(xlsx?|csv)$/.test(n) || tip.includes('excel') || tip.includes('spreadsheet')) return FileSpreadsheet
  if (/\.(zip|rar|7z)$/.test(n) || tip.includes('zip') || tip.includes('rar')) return FileArchive
  if (/\.(docx?|rtf|odt|txt)$/.test(n)) return FileText
  return FileIcon
}

interface RowProps {
  name: string
  fileName?: string
  tip: string
  meta?: string
  rowKey: string
  busyKey: string | null
  onView?: () => void
  onDownload: () => void
  onDelete?: () => void
}

function FileRow({ name, fileName, tip, meta, rowKey, busyKey, onView, onDownload, onDelete }: RowProps) {
  const { t } = useTranslation()
  const Icon = iconFor(tip, fileName ?? name)
  const busy = busyKey === rowKey
  return (
    <div className="flex items-center gap-2.5 rounded-md border bg-card px-2.5 py-1.5">
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium" title={fileName ?? name}>{name}</p>
        {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onView && (
          <Button size="xs" variant="ghost" onClick={onView} disabled={busy}>
            <Eye className="h-3.5 w-3.5" /> {t('folder.view')}
          </Button>
        )}
        <Button size="xs" variant="outline" onClick={onDownload} loading={busy} disabled={busy}>
          {!busy && <Download className="h-3.5 w-3.5" />} {t('folder.download')}
        </Button>
        {onDelete && (
          <Button size="xs" variant="ghost" className="text-danger hover:text-danger" disabled={busy}
            title={t('folder.delete')} aria-label={`${t('folder.delete')}: ${name}`} onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> {t('folder.delete')}
          </Button>
        )}
      </div>
    </div>
  )
}
