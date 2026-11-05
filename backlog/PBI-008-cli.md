---
id: PBI-008
title: pano CLI (aynı binary içinde)
status: backlog
assignee: -
priority: P2
created: 2026-11-05
updated: 2026-11-05
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
- [ ] `pano task create PANO "Başlık" --criteria "A" --criteria "B"` PBI oluşturur ve key'i yazdırır.
- [ ] `pano task move PANO-3 test` board'da canlı görünür; aktivitede `PANO_ACTOR` değeri yazar.
- [ ] `pano board PANO` 4 kolonu terminalde okunaklı gösterir.
- [ ] Her komut `--json` ile geçerli JSON döner.
- [ ] `pano mcp-config claude` doğru `claude mcp add` komutunu yazdırır.

## Test planı
1. `pano serve` aç; ikinci terminalde örnek komutları çalıştır, board'u tarayıcıda izle.

## Notlar / log

## Done notu
