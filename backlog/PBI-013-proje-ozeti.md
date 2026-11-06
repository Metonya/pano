---
id: PBI-013
title: Proje özeti — proje ne aşamada, bir bakışta
status: done
assignee: codex
priority: P2
created: 2026-11-05
updated: 2026-11-06
---

## Amaç
Kullanıcı Pano'yu açtığında "ne zaman başladım, kaç iş bitti, kaç iş kaldı, şu an ne yapılıyor, benden ne bekleniyor" sorularına tek ekranda cevap alsın.

## Kapsam
**Dahil:** Board toolbar'ının altında **tek ince satır**: ilerleme çubuğu (tamamlanan/toplam) + kısa metin (ör. "13 kaldı · 5 Kas'ta başladı · 6 yüksek öncelikli"). Ayrıntı (iptal sayısı, son 7 gün, burn-up) satıra tıklayınca açılan küçük bir popover'da. "Seni bekliyor" sidebar'da, görülmemiş Done sayısı burada tekrar edilmez (2026-11-05 kararı).
**Hariç:** Tahmini bitiş tarihi, sprint/velocity.

## Bağlam
- Ürün soruları: `docs/product.md` → "Kullanıcının cevap alması gereken sorular".
- Veri `projects.created_at`, `items` ve `activity`'den hesaplanır; yeni tablo gerekmez. API: `GET /projects/:key/summary`.
- Çizgi grafik hafif olsun (SVG ile kendimiz çizebiliriz; kütüphane gerekirse küçük bir tane).
- Tasarım: `docs/DESIGN.md`; bu ekran PBI-004'te Claude Design'a eklenecek.

## Kabul kriterleri
- [x] Özet, seed projesinde doğru sayıları gösterir (testle doğrulanır).
- [x] Bir kart Done'a taşınınca özet sayfa yenilemeden güncellenir.
- [x] Burn-up çizgisi son 30 günü gösterir; boş projede açıklayıcı boş durum çıkar.
- [x] Sayılar ekran okuyucuyla anlamlı okunur (görünmez etiketler).

## Test planı
1. Seed projesini aç → özet sayılarını board ile karşılaştır.
2. Bir kartı Done'a çek → özet anında değişmeli.

## Notlar / log

- 2026-11-06 claude:po codex'e (gpt-6.1-sol) paralel verdi.

- 2026-11-06 codex bitirdi. check (claude:po): lint · typecheck temiz · test 49/49 · e2e 14/14; özet satırı ve API ekranda görüldü.

## Done notu
Board'da tek satır özet, tıklayınca iptal sayısı, öncelik dağılımı, son 7 gün ve burn-up. Kısıt: popover görsel olarak Mert tarafından denenmedi.
