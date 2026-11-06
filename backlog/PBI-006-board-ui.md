---
id: PBI-006
title: Web UI, kanban board ve PBI detay paneli
status: done
assignee: codex
priority: P2
created: 2026-11-05
updated: 2026-11-06
---

## Amaç

Bir projenin işlerini Backlog / In Progress / Test / Done kolonlarında görmek, sürükleyerek taşımak, hangi agent'ın neyle uğraştığını bir bakışta anlamak.

## Kapsam

**Dahil:** Board ekranı (4 kolon), kart (key, başlık, öncelik, assignee rozeti, kriter ilerleme çubuğu), dnd-kit ile sürükle-bırak (kolon arası + kolon içi sıra, klavye desteği), PBI detay paneli (markdown body görüntüle/düzenle, kabul kriterleri ekle/işaretle, assignee/öncelik değiştir, aktivite geçmişi), yeni PBI oluşturma, arama/filtre (assignee, öncelik), SSE ile canlı güncelleme.
**Hariç:** Özel kolonlar, çoklu seçim. Test akışı ve aktivite geçmişi ekranları PBI-012 ve PBI-011'de.

## Bağlam

- Ürün kuralları: `docs/product.md`.
- Tasarım: `docs/DESIGN.md` + Claude Design board ve detay ekranları. Motion kuralları: spring, kesilebilir geçiş (`apple-design-sistemi` skill'i).
- API: PBI-003. Taşıma `POST /items/:key/move {status, position}`; optimistic update, hata olursa geri al + toast.
- Markdown render: `react-markdown` + `remark-gfm`; düzenleme basit textarea (v0.1).

## Kabul kriterleri
- [x] Kartın tamamı sürüklenir, kısa tıklama detayı açar; ayrı tutamaç yok.
- [x] Taşınan kart kaymaz, kırpılmaz; kolonda yatay scroll çıkmaz.
- [x] Kabul kriteri düzenlenip silinebilir (silinen geçmişte kalır).
- [x] Pencere içerik büyüyünce üst kenarından kaymaz.

- [x] Kart sürüklenip başka kolona bırakılınca statü kalıcı olarak değişir; aktivitede "mert moved to test" görünür.
- [x] Başka bir istemci (curl/agent) kart taşıyınca açık board yenilemeden 1 sn içinde güncellenir.
- [x] Kart klavyeyle (Space ile tut, ok tuşlarıyla taşı) taşınabilir.
- [x] Detay panelinde kriter işaretlenince karttaki ilerleme çubuğu güncellenir.
- [x] Assignee filtresi ile "codex" seçilince sadece Codex'e atanmış kartlar görünür.
- [x] Proje ayarında Test kolonu kapalıysa board 3 kolon gösterir.
- [x] Toolbar'daki filtre menüsünde "İptal edilenleri göster" seçeneği iptal edilen PBI'ları gösterir.
- [x] Kullanıcının açmadığı Done kartlarında küçük bir nokta var (metin yok, erişilebilir etiketi "Görülmedi"); kart açılınca kalkar.
- [x] Kartlar klavyeyle odaklanıp Enter ile açılır; tüm etkileşimli öğelerde görünür focus halkası var; metin kontrastı AA (≥ 4.5:1).
- [x] PBI sheet'i Esc ile kapanır; açıkken odak sheet içinde kalır, kapanınca açan karta geri döner; Detay/Geçmiş sekmeleri ok tuşlarıyla gezilir.
- [x] 50+ kartlı kolonda sıra sabittir (öncelik, sonra konum); kartlar kademeli yüklenir (ilk 30, kaydırdıkça devamı) ve kaydırma akıcıdır.
- [x] Çok uzun, boşluksuz başlıklar taşmaz (sözcük kırılır, en fazla 3 satır); tam başlık sheet'te görünür.
- [x] Özet satırında "Son güncelleme" zamanı görünür; SSE bağlantısı koparsa ince uyarı şeridi ve "Tekrar dene" çıkar, bağlantı dönünce kendiliğinden kalkar.
- [x] 30 dakikadır kayıt düşmeyen In Progress agent'ı sidebar'da "… dk'dır sessiz" olarak gösterilir ("takıldı" denmez); eşik sabit değer olarak koddadır.
- [x] Boş proje, yükleme ve hata durumları `docs/DESIGN.md`'deki gibi görünür.
- [x] Mobilde kolonlar yatay kaydırılabilir sekmeler/şerit olarak çalışır, sayfa yatay taşmaz.
- [x] Playwright testi: PBI oluştur → kriter ekle → sürükle → test → done akışı geçer.

## Test senaryoları (Mert)
1. http://localhost:5173/projects/SAMPLE → kartın herhangi bir yerinden sürükleyip In Progress'e bırak; kart kaymamalı, yenilemede orada kalmalı. Kısa tıklama detayı açar.
2. Terminalde `bun run pano task move SAMPLE-2 test` → board kendiliğinden güncellenmeli.
3. Karta tıkla: durum, atanan, kriter ekle/işaretle, açıklama düzenle; karttaki ilerleme hemen değişmeli. Yazı varken dışarı tıklama sorar, Esc karta döner.
4. Filtre, arama, Yeni PBI ve … menüsünden iptal (gerekçe ister).
5. Dar pencere ve koyu tema.

## Test planı

1. Board'u aç, bir kartı Test'e sürükle; yenile → orada kalmalı.
2. Terminalde `pano task move PANO-3 done` (veya curl) → board kendiliğinden güncellenmeli.
3. Detay panelinde kriter işaretle, assignee değiştir.

## Notlar / log

- 2026-11-06 claude:po işi codex'e (gpt-6.1-terra, high) terminalden verdi; dnd-kit, react-markdown ve remark-gfm önceden kuruldu.
- 2026-11-06 codex iki turda bitirdi. claude:po: gerçek tarayıcıda sürükleme ve klavyeyle taşıma çalışıyor; e2e seçicileri gerçek kullanıma göre düzeltildi. check: lint · typecheck temiz · test 32/32 · build geçti · e2e 11/11 (iki kez).
- Bilinen kısıt: dnd-kit ekran okuyucu duyuruları varsayılan İngilizce ve teknik ID içeriyor; PBI-014 çevirisinde ele alınacak.

- 2026-11-06 mert testte geri gönderdi: tutamaç yerine tüm kart sürüklensin, taşınan kart kayıp kırpılıyor, proje kartının tamamı açsın, pencere soru çıkınca zıplıyor, detay hizaları, kriter düzenle/sil. codex'e verildi.

- 2026-11-06 codex düzeltti. check (claude:po): typecheck temiz · test 40/40 · build geçti · e2e 11/11 (iki kez); detay penceresi ve kartlar ekranda kontrol edildi.

- 2026-11-06 mert onay beklemeden bitirmeyi istedi; insan testi claude:po tarafından e2e (11/11) ve ekranla yapıldı, Mert'in son testi yok.

## Done notu
Board, sürükle-bırak, canlı güncelleme, detay penceresi, kriter düzenleme, filtre, özet satırı ve sessiz agent göstergesi çalışıyor. Bilinen kısıt: sürükleme duyuruları PBI-014'te çevrilecek.
