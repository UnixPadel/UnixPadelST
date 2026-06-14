// Uygulama genelinde paylaşılan sabitler.

// PROMPT-v3 §4.1: legacy teslimatCesiti1 combobox seçenekleri — sıra birebir.
// PROMPT-v7 §5: Sipariş/Teklif formu (Teslimat Şekli) ve Sevk dialogu (Taşıma
// Türü) tek kaynaktan paylaşsın diye buraya taşındı.
export const INCOTERMS = [
  'EXW', 'FCA', 'CPT', 'CIP', 'DAT', 'DAP', 'DDP', 'FAS', 'FOB', 'MCFR', 'CIF', 'CFR', 'CNF',
] as const
