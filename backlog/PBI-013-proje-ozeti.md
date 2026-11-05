---
id: PBI-013
title: Proje özeti — proje ne aşamada, bir bakışta
status: backlog
assignee: -
priority: P2
created: 2026-11-05
updated: 2026-11-05
---

## Amaç
Kullanıcı Pano'yu açtığında "ne zaman başladım, kaç iş bitti, kaç iş kaldı, şu an ne yapılıyor, benden ne bekleniyor" sorularına tek ekranda cevap alsın.

## Kapsam
**Dahil:** Board'un üstünde (veya proje sayfasında) özet şeridi: başlangıç tarihi ve geçen gün; toplam / tamamlanan / kalan / iptal; önceliğe göre kalan işler (P1–P3); şu an çalışan agent'lar ve kartları; "Seni bekliyor" sayısı; görülmemiş Done sayısı; son 7 günde tamamlanan iş sayısı ve basit bir burn-up çizgisi (toplam vs tamamlanan, günlük).
**Hariç:** Tahmini bitiş tarihi, sprint/velocity.

## Bağlam
- Ürün soruları: `docs/product.md` → "Kullanıcının cevap alması gereken sorular".
- Veri `projects.created_at`, `items` ve `activity`'den hesaplanır; yeni tablo gerekmez. API: `GET /projects/:key/summary`.
- Çizgi grafik hafif olsun (SVG ile kendimiz çizebiliriz; kütüphane gerekirse küçük bir tane).
- Tasarım: `docs/DESIGN.md`; bu ekran PBI-004'te Claude Design'a eklenecek.

## Kabul kriterleri
- [ ] Özet, seed projesinde doğru sayıları gösterir (testle doğrulanır).
- [ ] Bir kart Done'a taşınınca özet sayfa yenilemeden güncellenir.
- [ ] Burn-up çizgisi son 30 günü gösterir; boş projede açıklayıcı boş durum çıkar.
- [ ] Sayılar ekran okuyucuyla anlamlı okunur (görünmez etiketler).

## Test planı
1. Seed projesini aç → özet sayılarını board ile karşılaştır.
2. Bir kartı Done'a çek → özet anında değişmeli.

## Notlar / log

## Done notu
