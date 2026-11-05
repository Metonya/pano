---
id: PBI-006
title: Web UI — kanban board ve PBI detay paneli
status: backlog
assignee: -
priority: P2
created: 2026-11-05
updated: 2026-11-05
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
- [ ] Kart sürüklenip başka kolona bırakılınca statü kalıcı olarak değişir; aktivitede "mert moved to test" görünür.
- [ ] Başka bir istemci (curl/agent) kart taşıyınca açık board yenilemeden 1 sn içinde güncellenir.
- [ ] Kart klavyeyle (Space ile tut, ok tuşlarıyla taşı) taşınabilir.
- [ ] Detay panelinde kriter işaretlenince karttaki ilerleme çubuğu güncellenir.
- [ ] Assignee filtresi ile "codex" seçilince sadece Codex'e atanmış kartlar görünür.
- [ ] Proje ayarında Test kolonu kapalıysa board 3 kolon gösterir.
- [ ] Toolbar'daki filtre menüsünde "İptal edilenleri göster" seçeneği iptal edilen PBI'ları gösterir.
- [ ] Kullanıcının açmadığı Done kartlarında küçük bir nokta var (metin yok, erişilebilir etiketi "Görülmedi"); kart açılınca kalkar.
- [ ] Kartlar klavyeyle odaklanıp Enter ile açılır; tüm etkileşimli öğelerde görünür focus halkası var; metin kontrastı AA (≥ 4.5:1).
- [ ] Mobilde kolonlar yatay kaydırılabilir sekmeler/şerit olarak çalışır, sayfa yatay taşmaz.
- [ ] Playwright testi: PBI oluştur → kriter ekle → sürükle → test → done akışı geçer.

## Test planı
1. Board'u aç, bir kartı Test'e sürükle; yenile → orada kalmalı.
2. Terminalde `pano task move PANO-3 done` (veya curl) → board kendiliğinden güncellenmeli.
3. Detay panelinde kriter işaretle, assignee değiştir.

## Notlar / log

## Done notu
