---
id: PBI-008
title: pano CLI (aynı binary içinde)
status: done
assignee: codex
priority: P2
created: 2026-11-05
updated: 2026-11-06
---

## Amaç
Terminal kullananlar ve shell'i olan agent'lar, MCP kurmadan ve token harcamadan board'u kısa komutlarla yönetebilsin.

## Kapsam
**Dahil:** `apps/server/src/main.ts` alt komut ayrıştırma: `serve`, `project list|create|star|archive`, `board <KEY>`, `task create|show|move|assign|check|note`, `mcp-config <claude|codex|cursor>`, `--json` çıktı seçeneği, `PANO_URL`/`PANO_TOKEN`/`PANO_ACTOR` env değişkenleri, `--help`.
**Hariç:** Etkileşimli TUI.

## Bağlam
- CLI DB'ye doğrudan erişmez; `PANO_URL` (varsayılan `http://127.0.0.1:7777`) üzerindeki REST API'yi çağırır (bkz. mimari "Altın kural"). Sunucu kapalıysa "pano serve ile başlat" diye açıklayıcı hata.
- Hafif kalsın: ek CLI framework'ü yerine `util.parseArgs` yeterli.
- Çıktılar insan için okunaklı tablo; `--json` ile makine için.

## Kabul kriterleri
- [x] `pano task create PANO "Başlık" --criteria "A" --criteria "B"` PBI oluşturur ve key'i yazdırır.
- [x] `pano task move PANO-3 test` board'da canlı görünür; aktivitede `PANO_ACTOR` değeri yazar.
- [x] `pano board PANO` 4 kolonu terminalde okunaklı gösterir.
- [x] Her komut `--json` ile geçerli JSON döner.
- [x] `pano mcp-config claude` doğru `claude mcp add` komutunu yazdırır.

## Test planı
1. `pano serve` aç; ikinci terminalde örnek komutları çalıştır, board'u tarayıcıda izle.

## Notlar / log
- 2026-11-06 claude:po işi codex'e (gpt-6.1-sol) terminalden verdi.
- 2026-11-06 codex bitirdi; sandbox tam test çalıştıramadı. check (claude:po): lint · typecheck temiz · test 23/23 · build geçti · gerçek sunucuda proje ve PBI oluşturma (Türkçe karakterler doğru), taşıma, board, --json, mcp-config denendi; aktivitede `PANO_ACTOR` görünüyor; gerekçesiz iptal ve kapalı sunucu kısa hata ile exit 1.

## Done notu
`bun run pano ...` ile proje ve PBI işlemleri terminalden yapılıyor; CLI sadece REST API'yi çağırıyor. Tek dosya `pano` komutu PBI-010 ile gelecek. Bilinen not: `pano board` iptal edilenleri göstermez.
