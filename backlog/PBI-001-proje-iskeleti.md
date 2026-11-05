---
id: PBI-001
title: Monorepo iskeleti, lint/test ve CI
status: backlog
assignee: -
priority: P1
created: 2026-11-05
updated: 2026-11-05
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
- [ ] Temiz klonda `bun install && bun run test && bun run lint && bun run typecheck` hatasız geçer.
- [ ] `bun run dev` ile `http://localhost:7777/api/v1/health` `{"ok":true,...}` döner ve web dev server açılır.
- [ ] GitHub Actions CI push ve PR'da çalışır, yeşildir.
- [ ] `AGENTS.md` repo yapısını, komutları ve commit kuralını anlatır.

## Test planı
1. Repoyu yeni bir klasöre klonla → `bun install` → `bun run dev`.
2. Tarayıcıda web sayfasını ve health endpoint'ini aç → ikisi de çalışmalı.

## Notlar / log

## Done notu
