---
id: PBI-005
title: Web UI — proje listesi, yıldızlama ve arşiv
status: test
assignee: mert
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
- [x] Yeni proje sadece adla açılır; key addan üretilir, çakışmaz ve "Değiştir" ile düzenlenebilir.
- [x] Sol üstteki Pano yazısı ana sayfaya götürür.
- [x] Dialog dışına tıklama ve Esc: boş formda kapanır; dolu formda sorar; kalıcı silme onayında kapanmaz.
- [x] Projeler listelenir; yıldızlılar en üstte, her grupta son güncellenen önce.
- [x] Yıldız ikonuna tıklayınca anında (optimistic) sıralama değişir, yenileyince kalıcıdır.
- [x] Arşivlenen proje ana listeden kalkar, "Arşiv" filtresinde görünür ve geri alınabilir.
- [x] Yeni proje formu geçersiz key'i (küçük harf, tekrar eden) açıklayıcı mesajla reddeder.
- [x] 375px genişlikte yatay scroll yok; light/dark sistemi takip eder; klavyeyle kullanılabilir.
- [x] Playwright testi: oluştur → yıldızla → arşivle → geri al akışı geçer.

## Test senaryoları (Mert)
1. http://localhost:5173 → Yeni proje aç, sadece ad yaz → altta key önerisi çıkar. "Değiştir" ile bozuk key dene → açıklayıcı hata. Sol üstteki Pano ana sayfaya götürür.
1b. Yeni projede yazı yazıp dışarı tıkla, Esc'e bas, Vazgeç'e bas → her birinde "Yazdıkların silinsin mi?" sorulur. Boş pencere dışarı tıklayınca kapanır.
2. Bir projeyi yıldızla → üste, büyük karta geçer; yenile → kalır.
3. … veya sağ tıkla arşivle → listeden çıkar; Arşiv görünümünde geri al; arşivde kalıcı silme proje adını ister.
4. Tarayıcıyı daralt ve sistem temasını koyu yap → taşma yok, renkler okunur.

## Test planı
1. 3 proje oluştur, birini yıldızla → en üste çıkmalı.
2. Birini arşivle → kaybolmalı; Arşiv filtresinde görünmeli; geri al.
3. Telefon genişliğinde ve dark modda kontrol et.

## Notlar / log
- 2026-11-06 claude:po işi codex'e (gpt-6.1-terra, high) terminalden verdi; react-query, react-router, Playwright ve shadcn component'leri önceden kuruldu.
- 2026-11-06 codex bitirdi ama ekran boş açılıyordu: yanlış `cn` importu, eksik `@` alias'ı, çalışmayan e2e script'i, 686 satırlık tek dosya. Geri gönderildi, düzeltti.
- 2026-11-06 claude:po e2e ile buldu: Codex tr.json'u bozuk encoding ile yazmış ("Ar?iv"). Dosya düzeltildi, bunu yakalayan test eklendi; BOM'lar temizlendi. Küçük düzeltmeler: sıfırda "Seni bekliyor" sade, boş "Yıldızlı" gizli.
- check: lint · typecheck temiz · test 25/25 · build geçti · e2e 2/2 (oluştur → yıldızla → arşivle → geri al; 375px dark) · 375px'te yatay taşma yok.

- 2026-11-06 mert testte geri gönderdi: key alanı gereksiz, Pano yazısı ana sayfaya gitmiyor, dialog dışına tıklama davranışı. claude:po kararları `decisions.md`'ye yazdı, işi codex'e (gpt-6.1-sol) verdi.

- 2026-11-06 codex (sol) yaptı; build ve e2e'yi çalıştıramadı. claude:po e2e ile gerçek hata buldu: pencere yeniden açılınca yazılı formda dışarıya ilk tıklama çalışmıyordu; kapatma kontrolü overlay'e alındı, odak yazı alanına dönüyor. check: lint · typecheck temiz · test 28/28 · build geçti · e2e 6/6 (iki kez).

## Done notu
