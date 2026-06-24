import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Paperclip, Download, Trash2, Upload } from 'lucide-react'
import {
  getPurchaseAttachmentInfo,
  uploadPurchaseAttachment,
  downloadPurchaseAttachment,
  deletePurchaseAttachment,
} from '@/api/purchase'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ToastProvider'

// Backend ile aynı izinli uzantı listesi.
const ACCEPT = '.png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.txt,.xls,.xlsx,.csv,.rtf,.odt,.zip,.rar'

interface Props {
  talepId: number
  /** true ise yükle / değiştir / kaldır gösterilir (talep sahibi). Onay basamakları false. */
  canManage?: boolean
}

interface ApiErr { response?: { data?: { message?: string } } }

/**
 * Satın alma talebi ek dosyası — kendi kendine yeten bileşen.
 * İndirme her zaman; yükle/değiştir/kaldır yalnız canManage. Onay basamakları
 * (ön/ödeme/nihai detay modalları) read-only olarak aynı bileşeni kullanır.
 */
export function PurchaseAttachment({ talepId, canManage = false }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: info, isLoading } = useQuery({
    queryKey: ['purchase-attachment', talepId],
    queryFn: () => getPurchaseAttachmentInfo(talepId),
    enabled: talepId > 0,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['purchase-attachment', talepId] })

  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadPurchaseAttachment(talepId, file),
    onSuccess: () => { invalidate(); toast({ title: t('purchase.attachment.uploaded') }) },
    onError: (e: unknown) => toast({
      title: t('purchase.attachment.error'),
      description: (e as ApiErr)?.response?.data?.message,
      variant: 'destructive',
    }),
  })

  const deleteMut = useMutation({
    mutationFn: () => deletePurchaseAttachment(talepId),
    onSuccess: () => { invalidate(); toast({ title: t('purchase.attachment.removed') }) },
    onError: () => toast({ title: t('purchase.attachment.error'), variant: 'destructive' }),
  })

  const onDownload = async () => {
    try { await downloadPurchaseAttachment(talepId, info?.ad) }
    catch { toast({ title: t('purchase.attachment.notFound'), variant: 'destructive' }) }
  }

  return (
    <div className="rounded-md border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Paperclip className="h-4 w-4" />{t('purchase.attachment.title')}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
      ) : info ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm break-all">{info.ad}</span>
          <Button size="sm" variant="outline" onClick={onDownload}>
            <Download className="mr-1 h-3.5 w-3.5" />{t('purchase.attachment.download')}
          </Button>
          {canManage && (
            <Button size="sm" variant="ghost" className="text-destructive"
              disabled={deleteMut.isPending} onClick={() => deleteMut.mutate()}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />{t('purchase.attachment.remove')}
            </Button>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t('purchase.attachment.none')}</p>
      )}

      {canManage && (
        <div>
          <input ref={fileRef} type="file" accept={ACCEPT} className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadMut.mutate(f)
              e.target.value = ''   // aynı dosya tekrar seçilebilsin
            }} />
          <Button size="sm" variant="outline" disabled={uploadMut.isPending} onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-3.5 w-3.5" />
            {uploadMut.isPending ? t('purchase.attachment.uploading') : info ? t('purchase.attachment.replace') : t('purchase.attachment.upload')}
          </Button>
          <p className="mt-1 text-[10px] text-muted-foreground">{t('purchase.attachment.hint')}</p>
        </div>
      )}
    </div>
  )
}
