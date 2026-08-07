-- Serbest Metin (Free Writing / Özel Kalem) desteği için
-- SiparisIslemTablo'ya iki yeni kolon eklenir.
-- Bu kolonlar yalnız serbest kalem satırlarında (KategoriID = NULL, BilesenID = NULL) dolu olur.

ALTER TABLE SiparisIslemTablo ADD COLUMN SBilesenAdi VARCHAR(200) NULL;
ALTER TABLE SiparisIslemTablo ADD COLUMN SBirim VARCHAR(50) NULL;
