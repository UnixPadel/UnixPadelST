import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { saveBlob } from '@/api/orderFolder'

export interface FilePreview {
  title: string
  fileName: string
  load: () => Promise<Blob>
}

/**
 * PDF ve görselleri uygulama içinde gösterir (blob URL). Excel/Word/ZIP gibi
 * türler buraya gelmez — çağıran yalnız indirme sunar. İçerik tek kez çekilir;
 * "İndir" aynı blob'u kaydeder (ikinci istek yok).
 */
export function FilePreviewDialog({ preview, onClose }: { preview: FilePreview | null; onClose: () => void }) {
  return (
    <Dialog open={!!preview} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent size="full" className="flex h-[88vh] flex-col gap-2 p-4">
        {preview && <PreviewBody key={preview.title} preview={preview} />}
      </DialogContent>
    </Dialog>
  )
}

function PreviewBody({ preview }: { preview: FilePreview }) {
  const { t } = useTranslation()
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    let made: string | null = null
    preview.load()
      .then((b) => {
        if (!alive) return
        made = URL.createObjectURL(b)
        setBlob(b)
        setUrl(made)
      })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false; if (made) URL.revokeObjectURL(made) }
  }, [preview])

  const isImage = !!blob?.type.startsWith('image/')

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 pr-8">
        <DialogTitle className="min-w-0 flex-1 truncate text-base" title={preview.fileName}>{preview.title}</DialogTitle>
        <Button size="xs" variant="outline" disabled={!blob} onClick={() => blob && saveBlob(blob, preview.fileName)}>
          <Download className="h-3.5 w-3.5" /> {t('folder.download')}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/40">
        {failed ? (
          <p className="p-8 text-center text-sm text-danger">{t('folder.previewError')}</p>
        ) : !url ? (
          <div className="h-full animate-pulse bg-muted" aria-busy aria-label={t('common.loading')} />
        ) : isImage ? (
          <div className="flex min-h-full items-center justify-center p-2">
            <img src={url} alt={preview.fileName} className="max-h-full max-w-full object-contain" />
          </div>
        ) : (
          <iframe src={url} title={preview.fileName} className="h-full w-full border-0 bg-white" />
        )}
      </div>
    </>
  )
}
