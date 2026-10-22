import { forwardRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getCarriers } from '@/api/logistics'
import { Combobox, type ComboboxProps } from '@/components/ui/combobox'

/**
 * SR-6 — taşıyıcı seçici (Sevk dialogu ve Lojistik Teklif formundaki kopyanın
 * tek hali). Kayıtlı firmalardan yazarak seçilir; listede yoksa yazılan ad
 * olduğu gibi kullanılır (eski "Diğer" + ayrı metin kutusu adımı kalktı).
 */
export const CarrierPicker = forwardRef<HTMLInputElement, Omit<ComboboxProps, 'options' | 'onValueChange' | 'value'> & {
  value: string
  onChange: (v: string) => void
}>(function CarrierPicker({ value, onChange, ...rest }, ref) {
  const { t } = useTranslation()
  const { data: carriers = [], isLoading } = useQuery({ queryKey: ['carriers'], queryFn: getCarriers })
  const options = useMemo(() => carriers.map((c) => ({ value: c, label: c })), [carriers])
  return (
    <Combobox
      ref={ref}
      options={options}
      value={value}
      allowCustom
      loading={isLoading}
      placeholder={t('logistics.carrier.pickOrType')}
      onValueChange={(v) => onChange(v.trim())}
      {...rest}
    />
  )
})
