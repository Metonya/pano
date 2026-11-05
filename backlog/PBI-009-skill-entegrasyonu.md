---
id: PBI-009
title: Pano kendi kendini yönetsin — PO skill'ini ve md backlog'u pano'ya taşı
status: backlog
assignee: -
priority: P2
created: 2026-11-05
updated: 2026-11-05
---

## Amaç
Md + HTML geçici sisteminden çıkıp tüm projelerin PBI'larını pano'da yönetmek; Claude'un product-owner akışı doğrudan pano'yu kullansın.

## Kapsam
**Dahil:** `pano import <backlog-klasörü> --project KEY` komutu (`backlog/PBI-*.md` frontmatter + "Kabul kriterleri" checkbox'ları → item + criteria), pano repo'sunun backlog'unu içe aktarma, `~/.claude/skills/product-owner/SKILL.md` "Backlog'un yeri" bölümünün pano MCP/CLI'a göre güncellenmesi, repoya örnek `skills/pano/SKILL.md` (başka kullanıcıların agent'ları için).
**Hariç:** Ters yönde (pano → md) senkronizasyon.

## Bağlam
- Md şablonu: `~/.claude/skills/product-owner/SKILL.md` → "PBI şablonu". Statü eşlemesi: `in-progress` → `in_progress`.
- Body: frontmatter ve "Kabul kriterleri" bölümü hariç markdown olduğu gibi aktarılır.

## Kabul kriterleri
- [ ] `pano import backlog --project PANO` bu repodaki tüm PBI'ları statü, assignee, öncelik ve kriterleriyle aktarır; tekrar çalıştırınca kopya oluşturmaz.
- [ ] Product-owner skill'i güncellendikten sonra yeni bir Claude oturumunda talep → PBI pano'da oluşur, atama ve statü değişimleri board'da görünür.
- [ ] `skills/pano/SKILL.md` tek başına okunarak bir agent pano'ya bağlanıp iş yapabilir.

## Test planı
1. Import'u çalıştır, board'u md board ile karşılaştır.
2. Yeni oturumda küçük bir talep ver, PBI'nın pano'da açıldığını gör.

## Notlar / log

## Done notu
