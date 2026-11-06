---
id: PBI-001
title: Monorepo iskeleti, lint/test ve CI
status: done
assignee: codex
priority: P1
created: 2026-11-05
updated: 2026-11-06
---

## Amaç

Tüm geliştiricilerin (insan ve agent) aynı komutlarla kurup, test edip, build alabildiği boş ama çalışan bir proje iskeleti.

## Kapsam

**Dahil:** Bun workspaces monorepo (`apps/server`, `apps/web`, `packages/core`), TypeScript strict, Biome (lint+format), `bun test`, GitHub Actions CI (lint + typecheck + test), `.gitignore`, `README` kurulum bölümü, `AGENTS.md` (agent'lar için repo kuralları; `CLAUDE.md` bunu import eder).
**Hariç:** İş mantığı, UI ekranları, release paketleme (PBI-010).

## Bağlam

- Mimari: `docs/architecture.md` ("Repo yapısı" ve "Teknoloji seçimleri").
- Bun 1.3+ kullan. Node'a bağımlılık olmasın.
- `apps/server/src/main.ts` sadece `GET /api/v1/health` → `{ "ok": true, "version": "<package.json version>" }` dönsün.
- `apps/web`: Vite + React + TS + Tailwind v4 + shadcn/ui init edilmiş (`pnpm dlx` yerine `bunx shadcn@latest init`), tek sayfada "Pano" yazsın.
- `packages/core`: boş `index.ts` + örnek bir birim test.
- Kök `package.json` script'leri: `dev` (server + web birlikte), `build`, `test`, `lint`, `typecheck`.
- Commit mesajları Türkçe, teknik terimler İngilizce (bkz. `AGENTS.md`'ye bu kuralı da yaz).

## Kabul kriterleri

- [x] Temiz klonda `bun install && bun run test && bun run lint && bun run typecheck` hatasız geçer.
- [x] `bun run dev` ile `http://localhost:7777/api/v1/health` `{"ok":true,...}` döner ve web dev server açılır.
- [x] GitHub Actions CI push ve PR'da çalışır, yeşildir.
- [x] `AGENTS.md` repo yapısını, komutları ve commit kuralını anlatır.

## Test planı

1. Repoyu yeni bir klasöre klonla → `bun install` → `bun run dev`.
2. Tarayıcıda web sayfasını ve health endpoint'ini aç → ikisi de çalışmalı.

## Notlar / log

- 2026-11-06 claude:po işi codex'e (gpt-6.1-terra, high) verdi.
- 2026-11-06 codex iskeleti yazdı; sandbox Bun'ın geçici klasörüne izin vermediği için kurulum ve kontrolleri çalıştıramadı.
- 2026-11-06 claude:po `bun install` yaptı, lockfile oluştu. Biome markdown dosyalarını da biçimlendirip PBI başlık bloğunu bozuyordu; sadece kod klasörlerine sınırlandı. check: lint temiz · typecheck temiz · test 2/2 geçti · build geçti · dev'de `/api/v1/health` → `{"ok":true,"version":"0.1.0"}`, Vite proxy üzerinden de çalışıyor.
- 2026-11-06 Mert push'u onayladı. check: CI yeşil, ubuntu 16 sn, windows 44 sn (run 42113071724). checkout action'ı Node 20 uyarısı için v5'e yükseltildi.

## Done notu
Bun monorepo (server/web/core), Biome, TypeScript strict, bun test ve Windows+Ubuntu CI çalışıyor; health endpoint'i var. İnsan testi gerektirmediği için AI kapattı. Bilinen kısıt: shadcn/ui CLI ile değil elle yapılandırıldı; ilk UI PBI'ında `shadcn add` ile doğrulanacak.
