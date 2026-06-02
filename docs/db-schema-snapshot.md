# DB Schema Snapshot

_Generated: 2026-05-05T12:02:33.5863307Z_

**Connection:** OK — Server `b5l1shhnklxmq4ogmpjc-mysql.services.clever-cloud.com`, Database `b5l1shhnklxmq4ogmpjc`, ServerVersion `8.0.43-34`.

## Tablolar (46)

| Tablo | Yaklaşık Satır |
|---|---:|
| `BilesenBilgileri` | 74 |
| `ChatMessages` | 829 |
| `ClientCategories` | 75 |
| `ClientProjects` | 0 |
| `ClientResources` | 22 |
| `Clients` | 164 |
| `DestekTalepleri` | 0 |
| `DetayTablo` | 8182 |
| `DiscussionAssignedUsers` | 2 |
| `DiscussionParticipants` | 301 |
| `Discussions` | 159 |
| `EklemeGecmisi` | 8 |
| `ExcelIndir` | 0 |
| `FileStorage` | 0 |
| `GuncellemeKontrol` | 0 |
| `KategoriBilesenleri` | 93 |
| `KullaniciBilgileri` | 22 |
| `LojistikTablo` | 16 |
| `MeetingDocuments` | 0 |
| `MeetingNotes` | 0 |
| `MeetingParticipants` | 0 |
| `Meetings` | 2 |
| `MessageDocuments` | 272 |
| `MuhasebeIslemTablo` | 53 |
| `MusteriBilgileri` | 258 |
| `OznitelikTablo` | 92 |
| `Projects` | 2 |
| `SatinAlmaTalep` | 17 |
| `SatinAlmaTalepleri` | 0 |
| `SiparisAlTablo` | 287 |
| `SiparisIslemTablo` | 7218 |
| `SiparisOnaylari` | 2 |
| `SiparisTeslimatTablo` | 0 |
| `StokTablo` | 4 |
| `TalepOnaylari` | 0 |
| `TalepUrunleri` | 0 |
| `TamamlandiTablo` | 0 |
| `TaskAssignments` | 118 |
| `TaskClients` | 20 |
| `TaskProjects` | 15 |
| `Tasks` | 172 |
| `TeslimatBilgileri` | 14 |
| `TeslimatBilgisiTablo` | 60 |
| `UlkelerBilgileri` | 128 |
| `UrunKategorileri` | 32 |
| `UrunMaliyetTablo` | 0 |

## Kolon Detayları

### `BilesenBilgileri`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `BilesenID` | `int` | NO | PRI |  | auto_increment |
| `KategoriID` | `int` | YES |  | 0 |  |
| `BilesenAdi` | `varchar(150)` | NO |  |  |  |
| `Birim` | `enum('Set','M','M2','Kg','Pcs')` | YES |  | Set |  |
| `Stok` | `int` | YES |  | 0 |  |
| `Fiyat` | `int` | YES |  |  |  |
| `CreatedAt` | `datetime` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `UpdatedAt` | `datetime` | YES |  |  | on update CURRENT_TIMESTAMP |
| `Currency` | `enum('EUR','USD','TRY')` | NO |  | TRY |  |

### `ChatMessages`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `Id` | `int` | NO | PRI |  | auto_increment |
| `DiscussionId` | `int` | NO | MUL |  |  |
| `SenderId` | `int` | NO | MUL |  |  |
| `ReceiverId` | `int` | YES | MUL |  |  |
| `Content` | `text` | NO |  |  |  |
| `MessageType` | `tinyint` | NO |  | 0 |  |
| `IsEdited` | `tinyint(1)` | NO |  | 0 |  |
| `EditedAt` | `datetime` | YES |  |  |  |
| `CreatedAt` | `datetime` | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `FileReference` | `longtext` | YES |  |  |  |
| `HasFile` | `tinyint(1)` | YES |  | 0 |  |
| `FileName` | `varchar(255)` | YES |  |  |  |
| `MimeType` | `varchar(100)` | YES |  |  |  |
| `FileSize` | `bigint` | YES |  | 0 |  |
| `Duration` | `int` | YES |  |  |  |
| `TaskId` | `int` | YES | MUL |  |  |
| `IsSeen` | `tinyint(1)` | YES |  | 0 |  |
| `SeenAt` | `datetime` | YES |  |  |  |

### `ClientCategories`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | `int` | NO | PRI |  | auto_increment |
| `ClientId` | `int` | NO | MUL |  |  |
| `CategoryId` | `int` | NO | MUL |  |  |
| `createdAt` | `timestamp` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### `ClientProjects`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `client_id` | `int` | NO | PRI |  |  |
| `project_id` | `int` | NO | PRI |  |  |

### `ClientResources`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | `int` | NO | PRI |  | auto_increment |
| `client_id` | `int` | NO | MUL |  |  |
| `title` | `varchar(255)` | YES |  |  |  |
| `description` | `text` | YES |  |  |  |
| `fileUrl` | `varchar(512)` | YES |  |  |  |
| `voiceUrl` | `varchar(512)` | YES |  |  |  |
| `createdAt` | `datetime` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `createdBy` | `int` | NO | MUL |  |  |

### `Clients`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `id` | `int` | NO | PRI |  | auto_increment |
| `first_name` | `varchar(100)` | NO |  |  |  |
| `last_name` | `varchar(100)` | NO |  |  |  |
| `phone` | `varchar(20)` | YES |  |  |  |
| `email` | `varchar(150)` | YES | UNI |  |  |
| `details` | `text` | YES |  |  |  |
| `country` | `varchar(100)` | YES |  |  |  |
| `createdAt` | `timestamp` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `createdBy` | `varchar(100)` | YES |  |  |  |
| `modifiedAt` | `timestamp` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| `modifiedBy` | `varchar(100)` | YES |  |  |  |
| `City` | `varchar(100)` | YES |  |  |  |
| `Address` | `varchar(255)` | YES |  |  |  |
| `ImageUrl` | `varchar(500)` | YES |  |  |  |
| `ZipCode` | `varchar(20)` | YES |  |  |  |
| `VATNumber` | `varchar(50)` | YES |  |  |  |
| `projectId` | `int` | YES | MUL |  |  |
| `Platform` | `varchar(255)` | YES |  |  |  |
| `RequestedDate` | `datetime` | YES |  |  |  |
| `Progress` | `varchar(50)` | YES |  |  |  |

### `DestekTalepleri`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `TalepID` | `int` | NO | PRI |  | auto_increment |
| `MusteriID` | `int` | YES | MUL |  |  |
| `Konu` | `varchar(255)` | YES |  |  |  |
| `Aciklama` | `text` | YES |  |  |  |
| `Tarih` | `datetime` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `Durum` | `enum('Açık','Kapalı','Devrede')` | YES |  |  |  |

### `DetayTablo`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `DetayID` | `int` | NO | PRI |  | auto_increment |
| `SiparisNo` | `varchar(100)` | NO |  |  |  |
| `Detay` | `text` | NO |  |  |  |

### `DiscussionAssignedUsers`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `Id` | `int` | NO | PRI |  | auto_increment |
| `DiscussionId` | `int` | NO | MUL |  |  |
| `AssignedUserId` | `int` | NO | MUL |  |  |
| `AssignedByUserId` | `int` | NO | MUL |  |  |
| `AssignedAt` | `datetime` | NO |  |  |  |

### `DiscussionParticipants`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `Id` | `int` | NO | PRI |  | auto_increment |
| `DiscussionId` | `int` | NO | MUL |  |  |
| `UserId` | `int` | NO | MUL |  |  |
| `Role` | `tinyint` | NO |  | 0 |  |
| `JoinedAt` | `datetime` | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `JoinedByUserId` | `int` | NO | MUL |  |  |

### `Discussions`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `Id` | `int` | NO | PRI |  | auto_increment |
| `Title` | `varchar(200)` | NO |  |  |  |
| `Description` | `text` | YES |  |  |  |
| `Status` | `tinyint` | NO |  | 0 |  |
| `CreatedByUserId` | `int` | NO | MUL |  |  |
| `CreatedAt` | `datetime` | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `UpdatedByUserId` | `int` | YES | MUL |  |  |
| `IsSeen` | `tinyint(1)` | YES |  | 0 |  |
| `UpdatedAt` | `datetime` | YES |  |  |  |
| `SenderId` | `int` | YES | MUL |  |  |
| `ReceiverId` | `int` | YES | MUL |  |  |
| `ClientId` | `int` | YES | MUL |  |  |

### `EklemeGecmisi`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `EklemeID` | `int` | NO | PRI |  | auto_increment |
| `KategoriID` | `int` | YES | MUL |  |  |
| `KullaniciID` | `int` | YES | MUL |  |  |
| `Miktar` | `int` | NO |  |  |  |
| `EklemeTarihi` | `datetime` | YES |  |  |  |
| `Aciklama` | `text` | YES |  |  |  |

### `ExcelIndir`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `ID` | `int` | NO | PRI |  | auto_increment |
| `Excel` | `mediumblob` | NO |  |  |  |

### `FileStorage`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `Id` | `int` | NO | PRI |  | auto_increment |
| `MessageId` | `int` | NO | MUL |  |  |
| `FileName` | `varchar(255)` | NO |  |  |  |
| `MimeType` | `varchar(100)` | NO |  |  |  |
| `FileSize` | `bigint` | NO |  |  |  |
| `FileData` | `longblob` | NO |  |  |  |
| `CreatedAt` | `datetime` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### `GuncellemeKontrol`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `ID` | `int` | NO | PRI |  | auto_increment |
| `GuncellemeVersiyon` | `varchar(40)` | YES |  |  |  |

### `KategoriBilesenleri`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `PrimaryKey` | `int` | NO | PRI |  | auto_increment |
| `KategoriID` | `int` | NO |  |  |  |
| `BilesenID` | `int` | NO |  |  |  |
| `Adet` | `int` | YES |  | 1 |  |

### `KullaniciBilgileri`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `KullaniciID` | `int` | NO | PRI |  | auto_increment |
| `Durum` | `enum('Aktif','Pasif')` | NO |  |  |  |
| `KullaniciAdi` | `varchar(71)` | NO |  |  |  |
| `Ad` | `varchar(35)` | NO |  |  |  |
| `Soyad` | `varchar(35)` | NO |  |  |  |
| `Sifre` | `varchar(25)` | NO |  |  |  |
| `Email` | `varchar(100)` | NO |  |  |  |
| `Telefon` | `varchar(25)` | NO |  |  |  |
| `YetkiTuru` | `enum('Yonetici','Temsilci','Muhasebe','Fabrika','Lojistik','Gozlemci')` | NO |  |  |  |
| `OlusturmaTarihi` | `datetime` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `SatinAlmaYetkisi` | `tinyint(1)` | NO |  | 0 |  |

### `LojistikTablo`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `ID` | `int` | NO | PRI |  | auto_increment |
| `KullaniciAdi` | `int` | YES |  |  |  |
| `SiparisNo` | `varchar(50)` | YES |  |  |  |
| `FirmaAdi` | `varchar(30)` | YES |  |  |  |
| `LojistikCesit` | `varchar(10)` | YES |  |  |  |
| `Fiyat` | `decimal(10,2)` | YES |  |  |  |
| `LNot` | `text` | YES |  |  |  |

### `MeetingDocuments`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `document_id` | `bigint unsigned` | NO | PRI |  | auto_increment |
| `meeting_id` | `int` | YES |  |  |  |
| `document_name` | `varchar(255)` | NO |  |  |  |
| `file_path` | `varchar(500)` | NO |  |  |  |
| `file_size` | `bigint` | YES |  |  |  |
| `file_type` | `varchar(100)` | YES |  |  |  |
| `uploaded_by` | `int` | YES |  |  |  |
| `upload_date` | `timestamp` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### `MeetingNotes`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `note_id` | `bigint unsigned` | NO | PRI |  | auto_increment |
| `meeting_id` | `int` | YES |  |  |  |
| `note_content` | `text` | NO |  |  |  |
| `created_by` | `int` | YES |  |  |  |
| `created_at` | `timestamp` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `updated_at` | `timestamp` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### `MeetingParticipants`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `participant_id` | `bigint unsigned` | NO | PRI |  | auto_increment |
| `meeting_id` | `int` | YES | MUL |  |  |
| `user_id` | `int` | YES |  |  |  |
| `role` | `varchar(50)` | YES |  | participant |  |
| `attendance_status` | `varchar(50)` | YES |  | pending |  |
| `added_at` | `timestamp` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### `Meetings`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `meeting_id` | `bigint unsigned` | NO | PRI |  | auto_increment |
| `title` | `varchar(255)` | NO |  |  |  |
| `description` | `text` | YES |  |  |  |
| `meetingDate` | `timestamp` | NO |  |  |  |
| `durationMinutes` | `int` | YES |  | 60 |  |
| `location` | `varchar(255)` | YES |  |  |  |
| `meetingType` | `varchar(50)` | YES |  | in-person |  |
| `status` | `varchar(50)` | YES |  | scheduled |  |
| `createdBy` | `int` | YES |  |  |  |
| `clientId` | `int` | YES |  |  |  |
| `createdAt` | `timestamp` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `updatedAt` | `timestamp` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `ModifiedBy` | `int` | YES | MUL |  |  |
| `ModifiedAt` | `datetime` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |

### `MessageDocuments`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `Id` | `int` | NO | PRI |  | auto_increment |
| `MessageId` | `int` | NO | MUL |  |  |
| `FileName` | `varchar(255)` | NO |  |  |  |
| `OriginalFileName` | `varchar(255)` | NO |  |  |  |
| `FileSize` | `bigint` | NO |  |  |  |
| `MimeType` | `varchar(100)` | NO |  |  |  |
| `FilePath` | `varchar(500)` | NO |  |  |  |
| `UploadedAt` | `datetime` | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `IDriveUrl` | `varchar(500)` | YES |  |  |  |
| `BucketName` | `varchar(100)` | YES |  |  |  |
| `FileKey` | `varchar(300)` | YES |  |  |  |

### `MuhasebeIslemTablo`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `ID` | `int` | NO | PRI |  | auto_increment |
| `KullaniciID` | `int` | NO |  |  |  |
| `MusteriID` | `int` | NO |  |  |  |
| `SiparisNo` | `varchar(50)` | YES |  |  |  |
| `OdenenMiktar` | `decimal(10,2)` | NO |  |  |  |
| `Tarih` | `date` | NO |  |  |  |

### `MusteriBilgileri`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `MusteriID` | `int` | NO | PRI |  | auto_increment |
| `MusteriAd` | `varchar(50)` | NO |  |  |  |
| `Telefon` | `varchar(40)` | YES |  |  |  |
| `ZipKod` | `varchar(30)` | YES |  |  |  |
| `E_Mail` | `varchar(100)` | YES |  |  |  |
| `Adres` | `text` | YES |  |  |  |
| `VATNumarasi` | `varchar(75)` | YES |  |  |  |
| `UlkelerID` | `int` | YES | MUL |  |  |

### `OznitelikTablo`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `OznitelikID` | `int` | NO | PRI |  | auto_increment |
| `BilesenID` | `int` | NO |  |  |  |
| `OznitelikAdı` | `varchar(100)` | NO |  |  |  |
| `Fiyat` | `int` | YES |  | 0 |  |

### `Projects`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `Id` | `int` | NO | PRI |  | auto_increment |
| `Title` | `varchar(255)` | NO |  |  |  |
| `Details` | `text` | YES |  |  |  |
| `CreatedByUserId` | `int` | YES |  |  |  |
| `CreatedAt` | `datetime` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `UpdatedByUserId` | `int` | YES |  |  |  |
| `UpdatedAt` | `datetime` | YES |  |  | on update CURRENT_TIMESTAMP |
| `Status` | `enum('NotStarted','InProgress','OnHold','Completed')` | NO |  | NotStarted |  |
| `EstimationTime` | `varchar(50)` | YES |  |  |  |
| `StartDate` | `date` | YES |  |  |  |
| `EndDate` | `date` | YES |  |  |  |

### `SatinAlmaTalep`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `TalepID` | `int` | NO | PRI |  | auto_increment |
| `UrunAdi` | `varchar(255)` | NO |  |  |  |
| `UrunTuru` | `varchar(500)` | NO |  |  |  |
| `UrunMaliyeti` | `decimal(18,2)` | NO |  |  |  |
| `AlinanYer` | `varchar(255)` | NO |  |  |  |
| `Notlar` | `text` | YES |  |  |  |
| `TalepEdenKullaniciAdi` | `varchar(100)` | NO |  |  |  |
| `Departman` | `varchar(50)` | NO | MUL |  |  |
| `TalepTarihi` | `datetime` | NO | MUL | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `Durum` | `varchar(30)` | NO | MUL | Onay Bekliyor |  |
| `RedNotu` | `text` | YES |  |  |  |
| `OnIzlemeYapan` | `varchar(100)` | YES |  |  |  |
| `OnIzlemeTarihi` | `datetime` | YES |  |  |  |
| `IslemYapanKullanici` | `varchar(100)` | YES |  |  |  |
| `IslemTarihi` | `datetime` | YES |  |  |  |
| `TalepTipi` | `varchar(50)` | NO | MUL | SatinAlma |  |
| `SiparisNo` | `varchar(100)` | YES | MUL |  |  |
| `MusteriAdi` | `varchar(255)` | YES |  |  |  |
| `ToplamSiparis` | `decimal(18,2)` | YES |  |  |  |
| `KaporaBakiyesi` | `decimal(18,2)` | YES |  |  |  |
| `KalanBakiyeTalep` | `decimal(18,2)` | YES |  |  |  |
| `PesinYuzde` | `decimal(10,4)` | YES |  |  |  |
| `Maliyet` | `decimal(18,2)` | YES |  |  |  |
| `MaliyetDetayi` | `text` | YES |  |  |  |
| `Kar` | `decimal(18,2)` | YES |  |  |  |
| `SirketAdi` | `varchar(255)` | YES |  |  |  |
| `Birim` | `varchar(50)` | YES |  |  |  |
| `Miktar` | `decimal(10,2)` | YES |  |  |  |
| `Fiyat` | `decimal(18,2)` | YES |  |  |  |
| `FiyatTipi` | `varchar(50)` | YES |  |  |  |
| `ToplamTutar` | `decimal(18,2)` | YES |  |  |  |
| `OdemeTuru` | `varchar(50)` | YES |  |  |  |
| `OdenenTutar` | `decimal(18,2)` | YES |  |  |  |
| `OdemeTutari` | `decimal(18,2)` | YES |  |  |  |
| `OdemeVadeSuresi` | `varchar(50)` | YES |  |  |  |
| `OdemeVadeTutari` | `decimal(18,2)` | YES |  |  |  |
| `OdemeVadeTarihi` | `date` | YES |  |  |  |
| `OdemeBelgeNo` | `varchar(100)` | YES |  |  |  |
| `OdemeBankaAdi` | `varchar(100)` | YES |  |  |  |
| `OdemeIslemTarihi` | `datetime` | YES |  |  |  |
| `OdemeKartTipi` | `varchar(100)` | YES |  |  |  |
| `OdemeTaksitSayisi` | `int` | YES |  |  |  |
| `OdemeAciklama` | `text` | YES |  |  |  |
| `MuhasebeYapanKullanici` | `varchar(100)` | YES |  |  |  |
| `MuhasebeTarihi` | `datetime` | YES |  |  |  |

### `SatinAlmaTalepleri`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `TalepID` | `int` | NO | PRI |  | auto_increment |
| `KullaniciID` | `int` | NO | MUL |  |  |
| `OlusturmaTarihi` | `datetime` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `Durum` | `enum('Beklemede','MuhasebeOnay','YoneticiOnay','Tamamlandi','Reddedildi')` | YES |  | Beklemede |  |
| `Aciklama` | `text` | YES |  |  |  |

### `SiparisAlTablo`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `SiparisAlID` | `int` | NO | PRI |  | auto_increment |
| `MusteriId` | `int` | YES | MUL |  |  |
| `ClientId` | `int` | YES |  |  |  |
| `SiparisNo` | `varchar(50)` | YES |  |  |  |
| `TeklifNo` | `varchar(50)` | YES |  |  |  |
| `MusteriAd` | `varchar(50)` | YES |  |  |  |
| `MTelefon` | `varchar(30)` | NO |  |  |  |
| `MMail` | `varchar(70)` | NO |  |  |  |
| `MUlke` | `varchar(50)` | NO |  |  |  |
| `MVATNumarasi` | `varchar(50)` | NO |  |  |  |
| `MZipKod` | `varchar(30)` | YES |  |  |  |
| `MAdres` | `text` | NO |  |  |  |
| `SiparisNotu` | `text` | YES |  |  |  |
| `KullaniciID` | `int` | YES |  |  |  |
| `UpdatedBy` | `int` | YES | MUL |  |  |
| `UpdatedAt` | `datetime` | YES |  |  |  |
| `STelefon` | `varchar(20)` | YES |  |  |  |
| `SFax` | `varchar(20)` | YES |  |  |  |
| `SWeb` | `varchar(50)` | YES |  |  |  |
| `SE_Mail` | `varchar(50)` | YES |  |  |  |
| `SVatNumarasi` | `varchar(20)` | YES |  |  |  |
| `SUlke` | `varchar(50)` | YES |  |  |  |
| `SAdres` | `text` | YES |  |  |  |
| `Montaj` | `varchar(10)` | YES |  |  |  |
| `Teslimat` | `varchar(10)` | YES |  |  |  |
| `MontajFiyat` | `decimal(10,2)` | YES |  |  |  |
| `PesinYüzde` | `int` | NO |  |  |  |
| `TeslimatFiyat` | `decimal(10,2)` | YES |  |  |  |
| `TeslimatÇeşiti` | `varchar(10)` | YES |  |  |  |
| `ParaTipi` | `varchar(10)` | YES |  |  |  |
| `Indirim` | `decimal(10,2)` | YES |  | 0.00 |  |
| `Kdv` | `decimal(10,2)` | YES |  | 0.00 |  |
| `ToplamFiyat` | `decimal(10,2)` | YES |  | 0.00 |  |
| `BrutToplamFiyat` | `decimal(10,2)` | YES |  | 0.00 |  |
| `OdenenMiktar` | `decimal(10,2)` | YES |  | 0.00 |  |
| `OdemeDurum` | `varchar(20)` | YES |  | Beklemede |  |
| `MAdet` | `int` | YES |  | 1 |  |
| `MTeslimat` | `int` | YES |  | 1 |  |
| `TTeslimAlanAdi` | `varchar(255)` | YES |  |  |  |
| `TIlgiliKisi` | `varchar(255)` | YES |  |  |  |
| `TTelefon` | `varchar(20)` | YES |  |  |  |
| `TAltTelefon` | `varchar(20)` | YES |  |  |  |
| `TE_Mail` | `varchar(255)` | YES |  |  |  |
| `TVATNumarasi` | `varchar(50)` | YES |  |  |  |
| `TZipKod` | `varchar(30)` | YES |  |  |  |
| `TUlke` | `varchar(40)` | NO |  |  |  |
| `TAdres` | `text` | YES |  |  |  |
| `Tarih` | `date` | NO |  |  |  |
| `Kontrol` | `varchar(15)` | NO |  | Kontrol |  |
| `Ek` | `mediumblob` | YES |  |  |  |
| `MuhasebeEk` | `mediumblob` | YES |  |  |  |
| `Muhasebe` | `tinyint(1)` | YES |  | 0 |  |
| `Fabrika` | `tinyint(1)` | YES |  | 0 |  |
| `SatinAlma` | `tinyint(1)` | YES |  | 0 |  |
| `Uretim` | `tinyint(1)` | YES |  | 0 |  |
| `Lojistik` | `tinyint(1)` | YES |  | 0 |  |
| `Red` | `text` | YES |  |  |  |
| `SiparisMiTeklifMi` | `enum('Teklif','Siparis','Planlama','Uretim','Hazir','Lojistik','Tamamlandi','Iptal')` | YES |  |  |  |
| `Sirket` | `enum('Unixpadel','ArsSport','AselCocuk','')` | YES |  | Unixpadel |  |
| `STarih` | `date` | YES |  |  |  |
| `KontrolNot` | `text` | YES |  |  |  |
| `FabrikaNot` | `text` | YES |  |  |  |
| `LojistikNot` | `text` | YES |  |  |  |
| `status` | `enum('Draft','Approved')` | YES |  | Draft |  |
| `SatinAlmaDurumu` | `varchar(20)` | NO |  | Beklemede |  |
| `SatinAlmaAciklama` | `text` | YES |  |  |  |
| `SatinAlmaOnayKullanici` | `varchar(100)` | YES |  |  |  |
| `SatinAlmaTarih` | `datetime` | YES |  |  |  |

### `SiparisIslemTablo`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `SiparisID` | `int` | NO | PRI |  | auto_increment |
| `SiparisNo` | `varchar(50)` | YES |  |  |  |
| `TeklifNo` | `varchar(50)` | YES |  |  |  |
| `KategoriID` | `int` | YES |  |  |  |
| `BilesenID` | `int` | YES |  |  |  |
| `OznitelikAdi` | `varchar(40)` | YES |  |  |  |
| `Adet` | `int` | YES |  |  |  |
| `Fiyat` | `decimal(10,2)` | YES |  |  |  |

### `SiparisOnaylari`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `OnayID` | `int` | NO | PRI |  | auto_increment |
| `SiparisNo` | `varchar(50)` | NO | MUL |  |  |
| `KullaniciID` | `int` | NO |  |  |  |
| `OnayDurumu` | `varchar(20)` | NO |  | Beklemede |  |
| `Aciklama` | `text` | YES |  |  |  |
| `OnayTarih` | `datetime` | YES |  |  |  |

### `SiparisTeslimatTablo`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `SiparisID` | `int` | NO | PRI |  | auto_increment |
| `SiparisNo` | `varchar(50)` | YES |  |  |  |
| `TeklifNo` | `varchar(50)` | YES |  |  |  |
| `Montaj` | `varchar(10)` | YES |  |  |  |
| `Teslimat` | `varchar(10)` | YES |  |  |  |
| `MontajFiyat` | `decimal(10,2)` | YES |  |  |  |
| `TeslimatFiyat` | `decimal(10,2)` | YES |  |  |  |
| `TeslimatÇeşiti` | `varchar(10)` | YES |  |  |  |
| `TTeslimAlanAdi` | `varchar(255)` | YES |  |  |  |
| `TIlgiliKisi` | `varchar(255)` | YES |  |  |  |
| `TTelefon` | `varchar(20)` | YES |  |  |  |
| `TAltTelefon` | `varchar(20)` | YES |  |  |  |
| `TE_Mail` | `varchar(255)` | YES |  |  |  |
| `TVATNumarasi` | `varchar(50)` | YES |  |  |  |
| `TZipKod` | `varchar(30)` | YES |  |  |  |
| `TUlke` | `varchar(40)` | YES |  |  |  |
| `TAdres` | `text` | YES |  |  |  |

### `StokTablo`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `ID` | `int` | NO | PRI |  | auto_increment |
| `Urun` | `varchar(50)` | NO |  |  |  |
| `Adet` | `int` | NO |  | 0 |  |

### `TalepOnaylari`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `OnayID` | `int` | NO | PRI |  | auto_increment |
| `TalepID` | `int` | NO | MUL |  |  |
| `OnaylayanID` | `int` | YES | MUL |  |  |
| `OnayTarihi` | `datetime` | YES |  |  |  |
| `Durum` | `enum('Beklemede','Onaylandi','Reddedildi')` | YES |  | Beklemede |  |
| `OnayMuhasebe` | `tinyint(1)` | NO |  |  |  |
| `OnayAdmin` | `tinyint(1)` | NO |  |  |  |

### `TalepUrunleri`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `UrunID` | `int` | NO | PRI |  | auto_increment |
| `TalepID` | `int` | YES | UNI |  |  |
| `UrunAdi` | `varchar(255)` | NO |  |  |  |
| `Miktar` | `int` | NO |  |  |  |
| `BirimFiyat` | `varchar(255)` | NO |  |  |  |
| `fiyat` | `double(10,2)` | NO |  |  |  |
| `MuhasebeOnay` | `varchar(10)` | NO |  |  |  |
| `AdminOnay` | `varchar(10)` | NO |  |  |  |
| `Durum` | `varchar(50)` | NO |  | Onaylanmadı |  |

### `TamamlandiTablo`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `ID` | `int` | NO | PRI |  | auto_increment |
| `SiparisNo` | `varchar(50)` | YES |  |  |  |
| `KullaniciAdi` | `int` | YES |  |  |  |
| `Tarih` | `date` | YES |  |  |  |

### `TaskAssignments`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `Id` | `int` | NO | PRI |  | auto_increment |
| `TaskId` | `int` | NO | MUL |  |  |
| `UserId` | `int` | NO | MUL |  |  |
| `AssignedAt` | `datetime` | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### `TaskClients`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `Id` | `int` | NO | PRI |  | auto_increment |
| `TaskId` | `int` | NO | MUL |  |  |
| `ClientId` | `int` | NO |  |  |  |
| `AssignedAt` | `timestamp` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### `TaskProjects`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `Id` | `int` | NO | PRI |  | auto_increment |
| `TaskId` | `int` | NO | MUL |  |  |
| `ProjectId` | `int` | NO |  |  |  |
| `AssignedAt` | `timestamp` | YES |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

### `Tasks`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `Id` | `int` | NO | PRI |  | auto_increment |
| `Title` | `varchar(200)` | NO |  |  |  |
| `Description` | `text` | YES |  |  |  |
| `Status` | `enum('Backlog','Todo','InProgress','InReview','Done')` | NO |  | Backlog |  |
| `Priority` | `enum('Low','Medium','High','Urgent')` | NO |  | Medium |  |
| `DueDate` | `datetime` | YES |  |  |  |
| `EstimatedTime` | `varchar(50)` | YES |  |  |  |
| `SortOrder` | `int` | NO |  | 0 |  |
| `CreatedByUserId` | `int` | NO | MUL |  |  |
| `CreatedAt` | `datetime` | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `UpdatedByUserId` | `int` | YES | MUL |  |  |
| `UpdatedAt` | `datetime` | YES |  |  | on update CURRENT_TIMESTAMP |
| `AssignedUsers` | `json` | YES |  |  |  |
| `ProjectId` | `int` | YES | MUL |  |  |
| `ClientId` | `int` | YES |  |  |  |

### `TeslimatBilgileri`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `TeslimatID` | `int` | NO | PRI |  |  |
| `KullaniciID` | `int` | YES | MUL |  |  |
| `MusteriID` | `int` | YES | MUL |  |  |
| `KategoriID` | `int` | YES | MUL |  |  |
| `Miktar` | `int` | NO |  |  |  |
| `Fiyat` | `int` | YES |  |  |  |
| `TeslimatTarihi` | `datetime` | YES |  |  |  |
| `TeslimatBilgisi` | `text` | YES |  |  |  |

### `TeslimatBilgisiTablo`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `TeslimatBilgiID` | `int` | NO | PRI |  | auto_increment |
| `TeslimAlanAdi` | `varchar(100)` | NO |  |  |  |
| `IlgiliKisi` | `varchar(100)` | YES |  |  |  |
| `UlkeID` | `int` | YES |  |  |  |
| `ZipKod` | `varchar(30)` | YES |  |  |  |
| `TelUlkeKodu` | `varchar(15)` | YES |  |  |  |
| `Telefon` | `varchar(30)` | YES |  |  |  |
| `AltTelUlkeKodu` | `varchar(15)` | YES |  |  |  |
| `AltTelefon` | `varchar(30)` | YES |  |  |  |
| `E_Mail` | `varchar(255)` | YES |  |  |  |
| `VATNumarasi` | `varchar(50)` | YES |  |  |  |
| `Adres` | `text` | YES |  |  |  |

### `UlkelerBilgileri`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `UlkelerID` | `int` | NO | PRI |  | auto_increment |
| `UlkeAdi` | `varchar(100)` | NO |  |  |  |
| `Bolge` | `varchar(50)` | YES |  |  |  |
| `NumaraBirimi` | `varchar(10)` | NO |  |  |  |

### `UrunKategorileri`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `KategoriID` | `int` | NO | PRI |  | auto_increment |
| `KategoriAdi` | `varchar(50)` | NO |  |  |  |
| `Stok` | `int` | YES |  | 0 |  |
| `Fiyat` | `decimal(10,2)` | YES |  | 0.00 |  |
| `CreatedAt` | `datetime` | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
| `UpdatedAt` | `datetime` | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
| `CreatedBy` | `int` | YES |  |  |  |
| `UpdatedBy` | `int` | YES |  |  |  |
| `Currency` | `varchar(10)` | YES |  | TRY |  |
| `ImageUrl` | `varchar(500)` | YES |  |  |  |

### `UrunMaliyetTablo`

| Kolon | Tip | Null | Key | Default | Extra |
|---|---|---|---|---|---|
| `MaliyetID` | `int` | NO | PRI |  | auto_increment |
| `SiparisNo` | `varchar(50)` | NO |  |  |  |
| `KategoriID` | `int` | NO |  |  |  |
| `Malzeme` | `decimal(18,2)` | NO |  | 0.00 |  |
| `Iscilik` | `decimal(18,2)` | NO |  | 0.00 |  |
| `Nakliye` | `decimal(18,2)` | NO |  | 0.00 |  |
| `Diger` | `decimal(18,2)` | NO |  | 0.00 |  |
| `GirenKullanici` | `int` | NO |  |  |  |
| `GirisTarih` | `datetime` | NO |  | CURRENT_TIMESTAMP | DEFAULT_GENERATED |

## Foreign Keys

| Tablo | Kolon | -> | Ref Tablo | Ref Kolon | Constraint |
|---|---|---|---|---|---|
| `ChatMessages` | `DiscussionId` | -> | `Discussions` | `Id` | `FK_ChatMessages_Discussion` |
| `ChatMessages` | `ReceiverId` | -> | `KullaniciBilgileri` | `KullaniciID` | `FK_ChatMessages_Receiver` |
| `ChatMessages` | `SenderId` | -> | `KullaniciBilgileri` | `KullaniciID` | `FK_ChatMessages_Sender` |
| `ChatMessages` | `TaskId` | -> | `Tasks` | `Id` | `FK_ChatMessages_Tasks` |
| `ClientCategories` | `CategoryId` | -> | `UrunKategorileri` | `KategoriID` | `ClientCategories_ibfk_2` |
| `ClientCategories` | `ClientId` | -> | `Clients` | `id` | `ClientCategories_ibfk_1` |
| `ClientProjects` | `client_id` | -> | `Clients` | `id` | `ClientProjects_ibfk_1` |
| `ClientProjects` | `project_id` | -> | `Projects` | `Id` | `ClientProjects_ibfk_2` |
| `ClientResources` | `client_id` | -> | `Clients` | `id` | `ClientResources_ibfk_1` |
| `ClientResources` | `createdBy` | -> | `KullaniciBilgileri` | `KullaniciID` | `ClientResources_ibfk_2` |
| `Clients` | `projectId` | -> | `Projects` | `Id` | `Clients_ibfk_1` |
| `DiscussionAssignedUsers` | `AssignedByUserId` | -> | `KullaniciBilgileri` | `KullaniciID` | `DiscussionAssignedUsers_ibfk_3` |
| `DiscussionAssignedUsers` | `AssignedUserId` | -> | `KullaniciBilgileri` | `KullaniciID` | `DiscussionAssignedUsers_ibfk_2` |
| `DiscussionAssignedUsers` | `DiscussionId` | -> | `Discussions` | `Id` | `DiscussionAssignedUsers_ibfk_1` |
| `DiscussionParticipants` | `DiscussionId` | -> | `Discussions` | `Id` | `FK_DiscussionParticipants_Discussion` |
| `DiscussionParticipants` | `JoinedByUserId` | -> | `KullaniciBilgileri` | `KullaniciID` | `FK_DiscussionParticipants_JoinedByUser` |
| `DiscussionParticipants` | `UserId` | -> | `KullaniciBilgileri` | `KullaniciID` | `FK_DiscussionParticipants_User` |
| `Discussions` | `ClientId` | -> | `Clients` | `id` | `FK_Discussions_Clients` |
| `Discussions` | `CreatedByUserId` | -> | `KullaniciBilgileri` | `KullaniciID` | `FK_Discussions_CreatedByUser` |
| `Discussions` | `ReceiverId` | -> | `KullaniciBilgileri` | `KullaniciID` | `Discussions_ibfk_2` |
| `Discussions` | `SenderId` | -> | `KullaniciBilgileri` | `KullaniciID` | `Discussions_ibfk_1` |
| `Discussions` | `UpdatedByUserId` | -> | `KullaniciBilgileri` | `KullaniciID` | `FK_Discussions_UpdatedByUser` |
| `FileStorage` | `MessageId` | -> | `ChatMessages` | `Id` | `FileStorage_ibfk_1` |
| `Meetings` | `ModifiedBy` | -> | `KullaniciBilgileri` | `KullaniciID` | `fk_meetings_modifiedby` |
| `MessageDocuments` | `MessageId` | -> | `ChatMessages` | `Id` | `FK_MessageDocuments_Message` |
| `SatinAlmaTalepleri` | `KullaniciID` | -> | `KullaniciBilgileri` | `KullaniciID` | `SatinAlmaTalepleri_ibfk_1` |
| `SiparisAlTablo` | `MusteriId` | -> | `MusteriBilgileri` | `MusteriID` | `FK_SiparisAlTablo_MusteriBilgileri` |
| `SiparisAlTablo` | `UpdatedBy` | -> | `KullaniciBilgileri` | `KullaniciID` | `FK_SiparisAlTablo_UpdatedBy` |
| `TalepOnaylari` | `OnaylayanID` | -> | `KullaniciBilgileri` | `KullaniciID` | `TalepOnaylari_ibfk_2` |
| `TalepOnaylari` | `TalepID` | -> | `SatinAlmaTalepleri` | `TalepID` | `TalepOnaylari_ibfk_1` |
| `TalepUrunleri` | `TalepID` | -> | `SatinAlmaTalepleri` | `TalepID` | `TalepUrunleri_ibfk_1` |
| `TaskAssignments` | `TaskId` | -> | `Tasks` | `Id` | `TaskAssignments_ibfk_1` |
| `TaskAssignments` | `UserId` | -> | `KullaniciBilgileri` | `KullaniciID` | `TaskAssignments_ibfk_2` |
| `Tasks` | `CreatedByUserId` | -> | `KullaniciBilgileri` | `KullaniciID` | `Tasks_ibfk_1` |
| `Tasks` | `ProjectId` | -> | `Projects` | `Id` | `FK_Tasks_Projects` |
| `Tasks` | `UpdatedByUserId` | -> | `KullaniciBilgileri` | `KullaniciID` | `Tasks_ibfk_2` |

## Indexler

| Tablo | Index | Unique | Kolon(lar) |
|---|---|---|---|
| `BilesenBilgileri` | `PRIMARY` | YES | `BilesenID` |
| `ChatMessages` | `FK_ChatMessages_Discussion` | no | `DiscussionId` |
| `ChatMessages` | `FK_ChatMessages_Receiver` | no | `ReceiverId` |
| `ChatMessages` | `FK_ChatMessages_Sender` | no | `SenderId` |
| `ChatMessages` | `FK_ChatMessages_Tasks` | no | `TaskId` |
| `ChatMessages` | `PRIMARY` | YES | `Id` |
| `ClientCategories` | `CategoryId` | no | `CategoryId` |
| `ClientCategories` | `PRIMARY` | YES | `id` |
| `ClientCategories` | `unique_client_category` | YES | `ClientId,CategoryId` |
| `ClientProjects` | `PRIMARY` | YES | `client_id,project_id` |
| `ClientProjects` | `project_id` | no | `project_id` |
| `ClientResources` | `client_id` | no | `client_id` |
| `ClientResources` | `createdBy` | no | `createdBy` |
| `ClientResources` | `PRIMARY` | YES | `id` |
| `Clients` | `email` | YES | `email` |
| `Clients` | `PRIMARY` | YES | `id` |
| `Clients` | `projectId` | no | `projectId` |
| `DestekTalepleri` | `MusteriID` | no | `MusteriID` |
| `DestekTalepleri` | `PRIMARY` | YES | `TalepID` |
| `DetayTablo` | `PRIMARY` | YES | `DetayID` |
| `DiscussionAssignedUsers` | `AssignedByUserId` | no | `AssignedByUserId` |
| `DiscussionAssignedUsers` | `AssignedUserId` | no | `AssignedUserId` |
| `DiscussionAssignedUsers` | `PRIMARY` | YES | `Id` |
| `DiscussionAssignedUsers` | `unique_discussion_user` | YES | `DiscussionId,AssignedUserId` |
| `DiscussionParticipants` | `FK_DiscussionParticipants_JoinedByUser` | no | `JoinedByUserId` |
| `DiscussionParticipants` | `FK_DiscussionParticipants_User` | no | `UserId` |
| `DiscussionParticipants` | `PRIMARY` | YES | `Id` |
| `DiscussionParticipants` | `UQ_DiscussionParticipants_DiscussionUser` | YES | `DiscussionId,UserId` |
| `Discussions` | `FK_Discussions_Clients` | no | `ClientId` |
| `Discussions` | `FK_Discussions_CreatedByUser` | no | `CreatedByUserId` |
| `Discussions` | `FK_Discussions_UpdatedByUser` | no | `UpdatedByUserId` |
| `Discussions` | `PRIMARY` | YES | `Id` |
| `Discussions` | `ReceiverId` | no | `ReceiverId` |
| `Discussions` | `SenderId` | no | `SenderId` |
| `EklemeGecmisi` | `KategoriID` | no | `KategoriID` |
| `EklemeGecmisi` | `KullaniciID` | no | `KullaniciID` |
| `EklemeGecmisi` | `PRIMARY` | YES | `EklemeID` |
| `ExcelIndir` | `PRIMARY` | YES | `ID` |
| `FileStorage` | `MessageId` | no | `MessageId` |
| `FileStorage` | `PRIMARY` | YES | `Id` |
| `GuncellemeKontrol` | `PRIMARY` | YES | `ID` |
| `KategoriBilesenleri` | `PRIMARY` | YES | `PrimaryKey` |
| `KullaniciBilgileri` | `PRIMARY` | YES | `KullaniciID` |
| `LojistikTablo` | `PRIMARY` | YES | `ID` |
| `MeetingDocuments` | `document_id` | YES | `document_id` |
| `MeetingDocuments` | `PRIMARY` | YES | `document_id` |
| `MeetingNotes` | `note_id` | YES | `note_id` |
| `MeetingNotes` | `PRIMARY` | YES | `note_id` |
| `MeetingParticipants` | `meeting_id` | YES | `meeting_id,user_id` |
| `MeetingParticipants` | `participant_id` | YES | `participant_id` |
| `MeetingParticipants` | `PRIMARY` | YES | `participant_id` |
| `Meetings` | `fk_meetings_modifiedby` | no | `ModifiedBy` |
| `Meetings` | `meeting_id` | YES | `meeting_id` |
| `Meetings` | `PRIMARY` | YES | `meeting_id` |
| `MessageDocuments` | `FK_MessageDocuments_Message` | no | `MessageId` |
| `MessageDocuments` | `PRIMARY` | YES | `Id` |
| `MuhasebeIslemTablo` | `PRIMARY` | YES | `ID` |
| `MusteriBilgileri` | `fk_UlkelerID` | no | `UlkelerID` |
| `MusteriBilgileri` | `PRIMARY` | YES | `MusteriID` |
| `OznitelikTablo` | `PRIMARY` | YES | `OznitelikID` |
| `Projects` | `PRIMARY` | YES | `Id` |
| `SatinAlmaTalep` | `idx_departman` | no | `Departman` |
| `SatinAlmaTalep` | `idx_durum` | no | `Durum` |
| `SatinAlmaTalep` | `idx_durum_dept` | no | `Durum,Departman` |
| `SatinAlmaTalep` | `idx_siparis_no` | no | `SiparisNo` |
| `SatinAlmaTalep` | `idx_talep_tarihi` | no | `TalepTarihi` |
| `SatinAlmaTalep` | `idx_talep_tipi` | no | `TalepTipi` |
| `SatinAlmaTalep` | `PRIMARY` | YES | `TalepID` |
| `SatinAlmaTalepleri` | `KullaniciID` | no | `KullaniciID` |
| `SatinAlmaTalepleri` | `PRIMARY` | YES | `TalepID` |
| `SiparisAlTablo` | `FK_SiparisAlTablo_MusteriBilgileri` | no | `MusteriId` |
| `SiparisAlTablo` | `FK_SiparisAlTablo_UpdatedBy` | no | `UpdatedBy` |
| `SiparisAlTablo` | `PRIMARY` | YES | `SiparisAlID` |
| `SiparisIslemTablo` | `PRIMARY` | YES | `SiparisID` |
| `SiparisOnaylari` | `idx_siparis` | no | `SiparisNo` |
| `SiparisOnaylari` | `PRIMARY` | YES | `OnayID` |
| `SiparisOnaylari` | `uk_siparis_kullanici` | YES | `SiparisNo,KullaniciID` |
| `SiparisTeslimatTablo` | `PRIMARY` | YES | `SiparisID` |
| `StokTablo` | `PRIMARY` | YES | `ID` |
| `TalepOnaylari` | `OnaylayanID` | no | `OnaylayanID` |
| `TalepOnaylari` | `PRIMARY` | YES | `OnayID` |
| `TalepOnaylari` | `TalepID` | no | `TalepID` |
| `TalepUrunleri` | `PRIMARY` | YES | `UrunID` |
| `TalepUrunleri` | `TalepID` | YES | `TalepID` |
| `TalepUrunleri` | `TalepID_2` | YES | `TalepID` |
| `TalepUrunleri` | `UrunID` | YES | `UrunID` |
| `TalepUrunleri` | `UrunID_2` | YES | `UrunID` |
| `TamamlandiTablo` | `PRIMARY` | YES | `ID` |
| `TaskAssignments` | `PRIMARY` | YES | `Id` |
| `TaskAssignments` | `TaskId` | YES | `TaskId,UserId` |
| `TaskAssignments` | `UserId` | no | `UserId` |
| `TaskClients` | `PRIMARY` | YES | `Id` |
| `TaskClients` | `UK_TaskClients_TaskId_ClientId` | YES | `TaskId,ClientId` |
| `TaskProjects` | `PRIMARY` | YES | `Id` |
| `TaskProjects` | `UK_TaskProjects_TaskId_ProjectId` | YES | `TaskId,ProjectId` |
| `Tasks` | `CreatedByUserId` | no | `CreatedByUserId` |
| `Tasks` | `FK_Tasks_Projects` | no | `ProjectId` |
| `Tasks` | `PRIMARY` | YES | `Id` |
| `Tasks` | `UpdatedByUserId` | no | `UpdatedByUserId` |
| `TeslimatBilgileri` | `KategoriID` | no | `KategoriID` |
| `TeslimatBilgileri` | `KullaniciID` | no | `KullaniciID` |
| `TeslimatBilgileri` | `MusteriID` | no | `MusteriID` |
| `TeslimatBilgileri` | `PRIMARY` | YES | `TeslimatID` |
| `TeslimatBilgisiTablo` | `PRIMARY` | YES | `TeslimatBilgiID` |
| `UlkelerBilgileri` | `PRIMARY` | YES | `UlkelerID` |
| `UrunKategorileri` | `PRIMARY` | YES | `KategoriID` |
| `UrunMaliyetTablo` | `PRIMARY` | YES | `MaliyetID` |
