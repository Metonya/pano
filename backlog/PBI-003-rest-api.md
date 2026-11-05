---
id: PBI-003
title: REST API v1, OpenAPI, token auth ve canlı güncelleme (SSE)
status: in-progress
assignee: codex
priority: P1
created: 2026-11-05
updated: 2026-11-06
---

## Amaç
Web arayüzü, CLI ve agent'lar tek ve belgelenmiş bir API üzerinden çalışsın; bir agent kartı taşıdığında açık board anında güncellensin.

## Kapsam
**Dahil:** `apps/server` içinde Hono + `@hono/zod-openapi` ile `/api/v1` endpoint'leri, `/api/v1/openapi.json`, SSE `/api/v1/events`, bearer token middleware, hata formatı, entegrasyon testleri.
**Hariç:** MCP (PBI-006), CLI (PBI-007), UI.

## Bağlam
- Core servisleri PBI-002'de; endpoint'ler iş kuralı içermez, sadece servis çağırır.
- Endpoint'ler (öneri):
  - `GET/POST /projects`, `GET/PATCH /projects/:key`, `POST /projects/:key/star` `{starred}`, `POST /projects/:key/archive` `{archived}`
  - `GET /projects/:key/items?status=`, `POST /projects/:key/items`
  - `GET/PATCH /items/:itemKey`, `POST /items/:itemKey/move` `{status, position?}`, `POST /items/:itemKey/assign` `{assignee}`
  - `POST /items/:itemKey/criteria`, `PATCH/DELETE /criteria/:id`
  - `POST /items/:itemKey/notes`, `GET /items/:itemKey/activity`
  - `GET /events?project=KEY` (SSE: `item.created|item.updated|item.moved|project.updated`)
- `actor` başlığı: `X-Pano-Actor: claude:pbi-3-dev` (yoksa `anonymous`).
- Hata formatı: `{ "error": { "code": "not_found", "message": "..." } }`, uygun HTTP kodlarıyla.
- Auth: mimari dokümandaki "Güvenlik (v0.1)" bölümü. `0.0.0.0` + token yoksa sunucu açıklayıcı hata ile başlamaz.

## Kabul kriterleri
- [ ] Tüm endpoint'ler OpenAPI şemasında görünür; `openapi.json` geçerli bir OpenAPI 3.1 belgesidir.
- [ ] `curl` ile proje oluşturup PBI ekleyip `test`'e taşımak mümkün ve `activity`'de actor görünür.
- [ ] SSE'ye bağlı bir istemci, başka bir istemcinin yaptığı taşımayı 1 sn içinde alır.
- [ ] `PANO_HOST=0.0.0.0` ve token yokken sunucu başlamaz; token varken tokensız istek 401 alır.
- [ ] Entegrasyon testleri `bun test` ile geçer.

## Test planı
1. `bun run dev` → README'deki örnek `curl` komutlarıyla proje + PBI oluştur, taşı.
2. Bir terminalde `curl -N .../events` açıkken diğerinde PBI taşı → olay düşmeli.

## Notlar / log
- 2026-11-06 claude:po işi codex'e (gpt-6.1-terra, high) verdi; @hono/zod-openapi, zod ve @pano/core önceden eklendi.

## Done notu
