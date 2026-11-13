import { useState, useMemo } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  PackageCheck,
  Plus,
  Truck,
  RotateCcw,
  Trash2,
  Eye,
  Search,
  UploadCloud,
  FileEdit,
  ChevronDown,
} from 'lucide-react'
import {
  getStockItems,
  getStockItemDetail,
  createStock,
  addStockExit,
  undoStockExit,
  deleteStockItem,
} from '@/api/warehouseStock'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin } from '@/lib/permissions'
import { PageHeader } from '@/components/PageHeader'
import { FillPage, FillRegion } from '@/components/FillPage'
import { DataTable, type Column } from '@/components/DataTable'
import { RowActionsMenu } from '@/components/RowActionsMenu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { StockStatusBadge } from '@/components/warehouse/StockStatusBadge'
import { StockExitDialog } from '@/components/warehouse/StockExitDialog'
import { AddStockDialog } from '@/components/warehouse/AddStockDialog'
import { StockItemDrawer } from '@/components/warehouse/StockItemDrawer'
import { useToast } from '@/components/ToastProvider'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { describeApiError } from '@/lib/axios'
import type {
  StockItemListDto,
  StockItemDetailDto,
  CreateStockRequest,
  AddStockExitRequest,
} from '@/types'

type Row = StockItemListDto & Record<string, unknown>

export function WarehouseStockPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const { t } = useTranslation()
  const { getUser } = useAuth()
  const user = getUser()

  const role = user?.yetkiTuru ?? ''
  const canMutate = role === 'Yonetici' || role === 'Lojistik' || isSuperAdmin(user)

  // Filters
  const [konum, setKonum] = useState<string>('Tumu')
  const [tamamlananlar, setTamamlananlar] = useState<boolean>(false)
  const [search, setSearch] = useState<string>('')
  const debouncedSearch = useDebouncedValue(search, 300)

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addMode, setAddMode] = useState<'upload' | 'manual'>('upload')
  const [exitModalOpen, setExitModalOpen] = useState(false)
  const [exitTarget, setExitTarget] = useState<StockItemListDto | null>(null)
  const [exitLoading, setExitLoading] = useState(false)

  // Drawer detail state
  const [detailId, setDetailId] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [undoingId, setUndoingId] = useState<number | null>(null)

  // Add menu dropdown
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['warehouse-stock', konum, tamamlananlar, debouncedSearch],
    queryFn: () =>
      getStockItems({
        konum: konum !== 'Tumu' ? konum : undefined,
        tamamlananlar,
        q: debouncedSearch || undefined,
      }),
    placeholderData: keepPreviousData,
  })

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['warehouse-stock-detail', detailId],
    queryFn: () => (detailId ? getStockItemDetail(detailId) : null),
    enabled: !!detailId && drawerOpen,
  })

  const items = useMemo(() => (data?.items ?? []) as Row[], [data?.items])
  const sayac = data?.sayac ?? { tumu: 0, antrepo: 0, depo: 0 }

  const handleOpenExit = (row: StockItemListDto) => {
    setExitTarget(row)
    setExitModalOpen(true)
  }

  const handleOpenDetail = (id: number) => {
    setDetailId(id)
    setDrawerOpen(true)
  }

  const handleSaveExit = async (req: AddStockExitRequest) => {
    if (!exitTarget) return
    setExitLoading(true)
    try {
      const exitId = await addStockExit(exitTarget.id, req)
      setExitModalOpen(false)
      void qc.invalidateQueries({ queryKey: ['warehouse-stock'] })
      void qc.invalidateQueries({ queryKey: ['warehouse-stock-detail', exitTarget.id] })

      const qtyDesc = req.tamami
        ? `${exitTarget.kalan} ${exitTarget.birim}`
        : `${req.miktar} ${exitTarget.birim}`

      toast({
        title: `${exitTarget.malAdi}: ${qtyDesc} araca yüklendi`,
        description: 'Çıkış başarıyla kaydedildi.',
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: 'Çıkış kaydedilemedi',
        description: describeApiError(err),
        variant: 'destructive',
      })
    } finally {
      setExitLoading(false)
    }
  }

  const handleUndoExit = async (exitId: number) => {
    setUndoingId(exitId)
    try {
      await undoStockExit(exitId)
      void qc.invalidateQueries({ queryKey: ['warehouse-stock'] })
      if (detailId) {
        void qc.invalidateQueries({ queryKey: ['warehouse-stock-detail', detailId] })
      }
      toast({
        title: 'Çıkış işlemi geri alındı',
        description: 'Miktar stoğa tekrar dahil edildi.',
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: 'Geri alma işlemi başarısız',
        description: describeApiError(err),
        variant: 'destructive',
      })
    } finally {
      setUndoingId(null)
    }
  }

  const handleDeleteItem = async (row: Row) => {
    const ok = await confirm({
      title: 'Stok Kalemini Sil',
      description: `"${row.malAdi}" kalemini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      confirmLabel: 'Evet, Sil',
      destructive: true,
    })
    if (!ok) return

    try {
      await deleteStockItem(row.id as number)
      void qc.invalidateQueries({ queryKey: ['warehouse-stock'] })
      toast({
        title: 'Stok kalemi silindi',
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: 'Silme işlemi başarısız',
        description: describeApiError(err),
        variant: 'destructive',
      })
    }
  }

  const handleSaveStock = async (req: CreateStockRequest, file?: File | null) => {
    try {
      await createStock(req, file)
      setAddModalOpen(false)
      void qc.invalidateQueries({ queryKey: ['warehouse-stock'] })
      toast({
        title: 'Yeni stok girişi kaydedildi',
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: 'Stok kaydedilemedi',
        description: describeApiError(err),
        variant: 'destructive',
      })
      throw err
    }
  }

  const columns: Column<Row>[] = [
    {
      key: 'beyannameNo',
      header: 'Beyanname No',
      sortable: true,
      className: 'w-40',
      render: (r) => (
        <span className="font-mono text-xs text-foreground font-medium">
          {(r.beyannameNo as string) || <span className="text-muted-foreground/60">—</span>}
        </span>
      ),
    },
    {
      key: 'konum',
      header: 'Konum',
      sortable: true,
      className: 'w-28',
      render: (r) => (
        <Badge
          variant={r.konum === 'Antrepo' ? 'info' : 'secondary'}
          className="px-2 py-0.5 text-xs font-semibold"
        >
          {r.konum as string}
        </Badge>
      ),
    },
    {
      key: 'malAdi',
      header: 'Mal',
      sortable: true,
      truncate: '20rem',
      render: (r) => (
        <div className="min-w-0 py-0.5">
          <p className="font-semibold text-sm text-foreground truncate">{r.malAdi as string}</p>
          {Boolean(r.ticariTanim) && (
            <p className="text-xs text-muted-foreground truncate max-w-sm mt-0.5">
              {r.ticariTanim as string}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'kalan',
      header: 'Kalan / Toplam Miktar',
      sortable: true,
      className: 'w-48',
      render: (r) => {
        const kalan = (r.kalan as number) ?? 0
        const miktar = (r.miktar as number) ?? 0
        const birim = (r.birim as string) ?? ''
        const pct = miktar > 0 ? Math.min(100, Math.max(0, (kalan / miktar) * 100)) : 0
        const isDone = kalan <= 0
        const isPartial = !isDone && kalan < miktar

        return (
          <div className="space-y-1.5 py-1 min-w-[130px]">
            <div className="flex items-baseline justify-between text-xs">
              <span className={`font-bold tabular-nums text-sm ${isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {kalan}
              </span>
              <span className="text-muted-foreground tabular-nums text-xs">
                / {miktar} {birim}
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isDone ? 'bg-muted-foreground/30' : isPartial ? 'bg-warning' : 'bg-primary'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      key: 'kapAdedi',
      header: 'Kap',
      sortable: true,
      className: 'w-28',
      render: (r) => {
        if (r.kapAdedi == null) return <span className="text-muted-foreground/60">—</span>
        return (
          <span className="text-xs tabular-nums text-foreground">
            {r.kalanKap ?? 0} / {r.kapAdedi as number} {((r.kapCinsi as string) || 'kap').toLowerCase()}
          </span>
        )
      },
    },
    {
      key: 'durum',
      header: 'Durum',
      sortable: true,
      className: 'w-36',
      render: (r) => (
        <StockStatusBadge
          status={r.durum as string}
          exitedQuantity={((r.miktar as number) ?? 0) - ((r.kalan as number) ?? 0)}
          unit={r.birim as string}
        />
      ),
    },
    {
      key: 'actions',
      pin: 'right',
      header: t('common.actions'),
      hideable: false,
      exportValue: false,
      render: (r) => (
        <div className="flex items-center gap-1.5 justify-end">
          {canMutate && (r.durum as string) !== 'Tamam' ? (
            <Button
              size="xs"
              variant="default"
              onClick={(e) => {
                e.stopPropagation()
                handleOpenExit(r as StockItemListDto)
              }}
              className="gap-1 font-semibold shadow-xs"
            >
              <Truck className="h-3.5 w-3.5" />
              <span>Araca Yükle</span>
            </Button>
          ) : (
            <Button
              size="xs"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                handleOpenDetail(r.id as number)
              }}
              className="gap-1 text-xs"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Detay</span>
            </Button>
          )}

          <RowActionsMenu
            row={r}
            actions={[
              {
                key: 'detail',
                label: 'Detay & Çıkış Geçmişi',
                icon: <Eye className="h-3.5 w-3.5" />,
                onSelect: (row) => handleOpenDetail(row.id as number),
              },
              {
                key: 'exit',
                label: 'Araca Yükle (Çıkış Yap)',
                icon: <Truck className="h-3.5 w-3.5" />,
                hidden: !canMutate || (r.durum as string) === 'Tamam',
                onSelect: (row) => handleOpenExit(row as StockItemListDto),
              },
              {
                key: 'delete',
                label: 'Kalemi Sil',
                destructive: true,
                separatorBefore: true,
                icon: <Trash2 className="h-3.5 w-3.5" />,
                hidden: !canMutate,
                onSelect: (row) => handleDeleteItem(row),
              },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <FillPage>
      <PageHeader
        density="compact"
        title="Antrepo & Depo Stokları"
        actions={
          canMutate ? (
            <div className="relative">
              <Button
                size="sm"
                className="gap-1.5 font-semibold"
                onClick={() => setAddMenuOpen(!addMenuOpen)}
              >
                <Plus className="h-4 w-4" />
                <span>Mal Ekle</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>

              {addMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setAddMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-56 rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-50 zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        setAddMenuOpen(false)
                        setAddMode('upload')
                        setAddModalOpen(true)
                      }}
                      className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-xs font-medium text-popover-foreground hover:bg-accent text-left transition-colors"
                    >
                      <UploadCloud className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-semibold">Beyanname Yükle</p>
                        <p className="text-[11px] text-muted-foreground">Yapay zekâ ile otomatik oku</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAddMenuOpen(false)
                        setAddMode('manual')
                        setAddModalOpen(true)
                      }}
                      className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-xs font-medium text-popover-foreground hover:bg-accent text-left transition-colors mt-0.5"
                    >
                      <FileEdit className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">Elle Bilgi Gir</p>
                        <p className="text-[11px] text-muted-foreground">Form üzerinden doğrudan ekle</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : undefined
        }
      />

      {/* Araç Çubuğu: Konum Segmentleri + Arama + Bitenleri Göster */}
      <div className="px-4 pt-2.5 pb-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b bg-card">
        {/* Segment Kontrol */}
        <div className="inline-flex rounded-lg bg-muted p-1 text-xs">
          <button
            type="button"
            onClick={() => setKonum('Tumu')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              konum === 'Tumu'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tümü ({sayac.tumu})
          </button>
          <button
            type="button"
            onClick={() => setKonum('Antrepo')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              konum === 'Antrepo'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Antrepo ({sayac.antrepo})
          </button>
          <button
            type="button"
            onClick={() => setKonum('Depo')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              konum === 'Depo'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Kendi Deposu ({sayac.depo})
          </button>
        </div>

        {/* Arama ve Bitenler Onay Kutusu */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              inputSize="sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mal veya beyanname no ara..."
              className="pl-8 text-xs h-8"
            />
          </div>

          <Checkbox
            id="show-finished"
            checked={tamamlananlar}
            onCheckedChange={(c) => setTamamlananlar(!!c)}
            label="Tamamı çıkanları göster"
            labelClassName="text-xs font-medium text-muted-foreground whitespace-nowrap"
          />
        </div>
      </div>

      <FillRegion className="pt-2">
        <DataTable
          fill
          tableId="warehouse-stock-table"
          exportFileName="antrepo-depo-stoklari"
          columns={columns}
          data={items}
          keyField="id"
          loading={isLoading}
          error={isError}
          density="compact"
          emptyMessage="Antrepoda veya depoda bekleyen stok bulunamadı."
          onRowClick={(r) => handleOpenDetail(r.id as number)}
        />
      </FillRegion>

      {/* Araca Yükle / Çıkış İşaretle Dialog */}
      <StockExitDialog
        item={exitTarget}
        open={exitModalOpen}
        onClose={() => setExitModalOpen(false)}
        onConfirm={handleSaveExit}
        loading={exitLoading}
      />

      {/* Yeni Stok Ekleme (Beyanname / Elle) Dialog */}
      <AddStockDialog
        open={addModalOpen}
        initialMode={addMode}
        onClose={() => setAddModalOpen(false)}
        onSave={handleSaveStock}
      />

      {/* Detay & Çıkış Geçmişi Çekmecesi */}
      <StockItemDrawer
        open={drawerOpen}
        detail={detailData ?? null}
        loading={detailLoading}
        onClose={() => setDrawerOpen(false)}
        onOpenExitDialog={() => {
          if (detailData) {
            handleOpenExit(detailData.item)
          }
        }}
        onUndoExit={handleUndoExit}
        undoingId={undoingId}
        canMutate={canMutate}
      />
    </FillPage>
  )
}
