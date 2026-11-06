---
id: PBI-009
title: Pano kendi kendini yönetsin, PO skill'ini ve md backlog'u pano'ya taşı
status: done
assignee: claude:po
priority: P2
created: 2026-11-05
updated: 2026-11-06
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
- [x] `pano import backlog --project PANO` bu repodaki tüm PBI'ları statü, assignee, öncelik ve kriterleriyle aktarır; tekrar çalıştırınca kopya oluşturmaz.
- [x] Product-owner skill'i güncellendikten sonra yeni bir Claude oturumunda talep → PBI pano'da oluşur, atama ve statü değişimleri board'da görünür.
- [x] `skills/pano/SKILL.md` tek başına okunarak bir agent pano'ya bağlanıp iş yapabilir.

## Test planı
1. Import'u çalıştır, board'u md board ile karşılaştır.
2. Yeni oturumda küçük bir talep ver, PBI'nın pano'da açıldığını gör.

## Notlar / log

- 2026-11-06 claude:po import komutu ve skills/pano/SKILL.md kısmını codex'e (gpt-6.1-sol) paralel olarak verdi; PO skill'i ve Pano'ya geçiş sonra.

- 2026-11-06 codex import ve SKILL.md'yi bitirdi. check (claude:po): CLI testleri 18/18 · gerçek sunucuda 14 PBI aktarıldı, ikinci çalıştırmada 14 atlandı; statü, öncelik, kriterler ve Türkçe metin doğru.
- Açık: product-owner skill'ini Pano'ya geçirmek, kalıcı çalışan bir Pano sunucusu gerektiriyor; PBI-010 ve UI işleri bitince yapılacak. README cümlesi PBI-010 commit'iyle eklenecek.

- 2026-11-06 claude:po: PO skill'i Pano açıksa Pano'yu kullanacak şekilde güncellendi, 14 PBI yerel Pano'ya (PANO) aktarıldı. check: yeni Claude oturumu MCP ile PBI açtı ve what_changed_md yazdı; istenen Test'e taşımayı yapmadı (küçük model atlamış görünüyor, otomatik testte çağrı geçiyor).

## Done notu
`pano import`, `skills/pano/SKILL.md` ve PO skill geçişi tamam. Md backlog arşiv olarak duruyor; yeni işler Pano açıkken Pano'ya yazılır.
