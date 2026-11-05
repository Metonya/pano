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
**Dahil:** Tasarım kararları (yoğunluk, renk, tema, navigasyon), Claude Design üzerinde ekran tasarımları: proje listesi (yıldız/arşiv), board (4 kolon), PBI detay paneli, boş durumlar, light/dark, mobil. Sonuçların `docs/DESIGN.md`'ye token'larla (renk, font, radius, spacing, motion) yazılması.
**Hariç:** React kodu.

## Bağlam
- Referanslar: `apple-design-sistemi` skill'i; Apple HIG, Emil Kowalski apple-design, impeccable.style, shadcn/ui, Koboyo icons.
- Veri alanları: `docs/architecture.md` → Veri modeli (kartta: key, başlık, öncelik, assignee, kriter ilerlemesi).

## Kabul kriterleri
- [ ] Tasarım kararları Mert ile birlikte verildi ve `backlog/decisions.md`'ye yazıldı.
- [ ] Claude Design'da proje listesi, board ve PBI detay ekranları light + dark hazır, Mert onayladı.
- [ ] `docs/DESIGN.md` token'ları ve component kurallarını içerir; bir geliştirici agent sadece bu dosyayla UI'ı tutarlı kurabilir.

## Test planı
Mert tasarımları Claude Design'da inceler, yorumlar; onaylanınca Done.

## Notlar / log
- 2026-11-05 claude:po tasarım kararları için çalışmaya başladı.

## Done notu
