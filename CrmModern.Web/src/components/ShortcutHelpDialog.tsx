import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * E-2 — F1 kısayol yardımı. Standart tuş haritası (SAP GUI + ETA/LOGO fiş
 * tuşlarından esinlenir) tek yerde listelenir; operatör ezberlemek zorunda değil.
 */
export const SHORTCUT_GROUPS: { titleKey: string; rows: [string, string][] }[] = [
  {
    titleKey: 'shortcuts.groups.global',
    rows: [
      ['Ctrl+K', 'shortcuts.palette'],
      ['F1', 'shortcuts.help'],
      ['Shift+F1', 'shortcuts.guide'],
      ['F3', 'shortcuts.back'],
      ['F5', 'shortcuts.refresh'],
      ['Ctrl+B', 'shortcuts.toggleMenu'],
    ],
  },
  {
    titleKey: 'shortcuts.groups.lists',
    rows: [
      ['/', 'shortcuts.focusFilter'],
      ['F8', 'shortcuts.applyFilter'],
      ['↑ ↓', 'shortcuts.moveRow'],
      ['Enter', 'shortcuts.openRow'],
      ['Space', 'shortcuts.selectRow'],
      ['Shift+F10', 'shortcuts.rowMenu'],
    ],
  },
  {
    titleKey: 'shortcuts.groups.forms',
    rows: [
      ['Enter', 'shortcuts.nextField'],
      ['Shift+Enter', 'shortcuts.prevField'],
      ['F4', 'shortcuts.lookup'],
      ['Ctrl+S', 'shortcuts.save'],
      ['Ins', 'shortcuts.newLine'],
      ['Ctrl+Enter', 'shortcuts.confirmDialog'],
      ['Esc', 'shortcuts.closeDialog'],
    ],
  },
  {
    titleKey: 'shortcuts.groups.qc',
    rows: [
      ['O', 'shortcuts.qcApprove'],
      ['R', 'shortcuts.qcReject'],
    ],
  },
]

/** Kısayol tablosu — F1 penceresi ve Kullanım Kılavuzu "Klavye kısayolları" bölümü ortak kullanır. */
export function ShortcutTable() {
  const { t } = useTranslation()
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {SHORTCUT_GROUPS.map((g) => (
        <section key={g.titleKey} className="space-y-1.5">
          <h3 className="text-sm font-semibold">{t(g.titleKey)}</h3>
          <dl className="space-y-1 text-sm">
            {g.rows.map(([k, label]) => (
              <div key={k + label} className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t(label)}</dt>
                <dd><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{k}</kbd></dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}

export function ShortcutHelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{t('shortcuts.title')}</DialogTitle>
        </DialogHeader>
        <ShortcutTable />
      </DialogContent>
    </Dialog>
  )
}
