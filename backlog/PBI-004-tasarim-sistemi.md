---
id: PBI-004
title: Tasarım dili ve ekran tasarımları (Claude Design)
status: in-progress
assignee: claude:po
priority: P1
created: 2026-11-05
updated: 2026-11-05
---

## Amaç
Pano'nun Apple tarzı, sade ve akıcı görünümünü kodlamadan önce birlikte karar vererek belirlemek; UI PBI'ları (005, 006) bu tasarıma göre yapılacak.

## Kapsam
**Dahil:** Tasarım kararları (yoğunluk, renk, tema, navigasyon), Claude Design üzerinde ekran tasarımları: proje listesi (yıldız/arşiv), board (4 kolon), PBI detay paneli, boş durumlar, light/dark, mobil. Ek ekranlar (2026-11-05 ürün kararlarıyla): Test'teki kartın detayı (senaryolar, onayla / geri gönder + ekran görüntüsü), "Seni bekliyor" listesi, aktivite geçmişi ve değişiklik farkı, proje özeti şeridi, proje ayarları, "görülmedi" işareti, iptal edilenler filtresi. Uygulama ayarları ekranı (dil, görünüm, sürüm/güncelleme; PBI-014). Sonuçların `docs/DESIGN.md`'ye token'larla (renk, font, radius, spacing, motion) yazılması.
**Hariç:** React kodu.

## Bağlam
- Referanslar: `apple-design-sistemi` skill'i; Apple HIG, Emil Kowalski apple-design, impeccable.style, shadcn/ui, Koboyo icons.
- Veri alanları: `docs/architecture.md` → Veri modeli (kartta: key, başlık, öncelik, assignee, kriter ilerlemesi).

## Kabul kriterleri
- [x] Tasarım kararları Mert ile birlikte verildi ve `backlog/decisions.md`'ye yazıldı.
- [ ] Claude Design'da proje listesi, board ve PBI detay ekranları light + dark hazır, Mert onayladı.
- [ ] `docs/DESIGN.md` token'ları ve component kurallarını içerir; bir geliştirici agent sadece bu dosyayla UI'ı tutarlı kurabilir.

## Test planı
Mert tasarımları Claude Design'da inceler, yorumlar; onaylanınca Done.

## Notlar / log
- 2026-11-05 claude:po tasarım kararları için çalışmaya başladı.
- 2026-11-05 Kararlar alındı (ferah, sol sidebar, ortada sheet, Apple mavisi). İlk 5 ekran Claude Design'da: https://claude.ai/artifact/CGbiEtLAeiTVBijmAw7SvK (Projeler, Board, Board mobil, PBI detayı, Board dark). Mert'in yorumu bekleniyor.
- 2026-11-05 Ürün kararları değişti (`docs/product.md`): detay sheet'indeki "Codex'e ata" butonu kaldırılacak; ek ekranlar kapsama alındı.
- 2026-11-05 claude:design canvas'ı güncelledi: "Codex'e ata" kaldırıldı; board'a proje özeti şeridi, "Seni bekliyor" (sidebar + Test kartı), "görülmedi" işaretli Done kartı, "İptal edilenler" filtresi eklendi; yeni ekranlar: PBI detayı (Test — seni bekliyor), PBI geçmişi (diff'li), Proje ayarları; mobil güncellendi. Render ile kontrol edilmedi.
- 2026-11-05 Açık: Projeler ekranındaki Pano kartı eski sayıları gösteriyor (7/1/0/0 → 11/1/1/1 olmalı); yayın izni reddedildiği için düzeltilemedi. → Sonradan düzeltildi.
- 2026-11-05 claude:design-review Impeccable + Apple HIG denetimi: 6.5/10, 18 bulgu (`docs/reviews/2026-11-05-tasarim-denetimi.md`).
- 2026-11-05 claude:design denetim düzeltmelerini uyguladı: macOS toolbar, tek satır özet, kartta görülmedi noktası, durum popup'ı, macOS buton sırası, focus halkası ve AA kontrast, İngilizce durum adları, gerçek diff örneği; yeni Uygulama ayarları ekranı (Genel, Görünüm, Agent bağlantısı, Hakkında). Uygulanmayanlar: inspector paneli ve akıllı liste kutuları (Mert'in kararı), öncelik "!!" işaretleri, mobil dark varyantı. Render ile kontrol edilmedi.

## Done notu
