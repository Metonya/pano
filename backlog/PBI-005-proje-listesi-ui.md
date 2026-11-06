---
id: PBI-005
title: Web UI — proje listesi, yıldızlama ve arşiv
status: in-progress
assignee: codex
priority: P2
created: 2026-11-05
updated: 2026-11-06
---

## Amaç
Kullanıcı tüm projelerini tek ekranda görsün, önemli olanları yıldızlasın, bitenleri arşivleyip geri alabilsin.

## Kapsam
**Dahil:** `apps/web` içinde uygulama kabuğu (navigasyon, tema), proje listesi ekranı, yeni proje oluşturma (ad + key), yıldızla/arşivle/arşivden çıkar, arşiv filtresi, boş durum, light/dark, mobil.
**Hariç:** Board ekranı (PBI-006).

## Bağlam
- Ürün kuralları: `docs/product.md`.
- Tasarım: `docs/DESIGN.md` ve Claude Design ekranları (PBI-004 Done olmadan başlama).
- API: PBI-003 (`/api/v1/projects...`). Veri çekme için TanStack Query; SSE ile `project.updated` gelince listeyi yenile.
- shadcn component'leri, ikonlar `lucide-react`.

## Kabul kriterleri
- [ ] Projeler listelenir; yıldızlılar en üstte, her grupta son güncellenen önce.
- [ ] Yıldız ikonuna tıklayınca anında (optimistic) sıralama değişir, yenileyince kalıcıdır.
- [ ] Arşivlenen proje ana listeden kalkar, "Arşiv" filtresinde görünür ve geri alınabilir.
- [ ] Yeni proje formu geçersiz key'i (küçük harf, tekrar eden) açıklayıcı mesajla reddeder.
- [ ] 375px genişlikte yatay scroll yok; light/dark sistemi takip eder; klavyeyle kullanılabilir.
- [ ] Playwright testi: oluştur → yıldızla → arşivle → geri al akışı geçer.

## Test planı
1. 3 proje oluştur, birini yıldızla → en üste çıkmalı.
2. Birini arşivle → kaybolmalı; Arşiv filtresinde görünmeli; geri al.
3. Telefon genişliğinde ve dark modda kontrol et.

## Notlar / log
- 2026-11-06 claude:po işi codex'e (gpt-6.1-terra, high) terminalden verdi; react-query, react-router, Playwright ve shadcn component'leri önceden kuruldu.

## Done notu
