---
id: PBI-007
title: Gömülü MCP endpoint'i (/mcp) ve agent rehberi (/agents.md)
status: backlog
assignee: -
priority: P1
created: 2026-11-05
updated: 2026-11-05
---

## Amaç
Claude Code, Codex, Cursor gibi agent'lar hiçbir şey kurmadan, sadece bir URL ekleyerek board'u okuyup güncelleyebilsin; shell'i olan diğer agent'lar `/agents.md`'yi okuyup REST ile çalışabilsin.

## Kapsam
**Dahil:** `apps/server` içinde `@modelcontextprotocol/sdk` ile Streamable HTTP MCP server `/mcp`; 7 tool; `actor` desteği; `/agents.md` (sade markdown: ne, nasıl bağlanılır, örnek akış, REST özeti); README'de istemci kurulum örnekleri.
**Hariç:** stdio MCP, MCP resources/prompts (sonra).

## Bağlam
- Tool listesi ve amaçları: `docs/architecture.md` → "MCP tool'ları". Daha fazla tool ekleme — token maliyeti kararı (`backlog/decisions.md`).
- Tool açıklamaları kısa ve net olsun (her biri ≤ 2 cümle); input şemaları core zod şemalarından türetilsin.
- `actor`: MCP istemcisi `X-Pano-Actor` başlığı gönderemiyorsa tool'larda opsiyonel `actor` alanı.
- Token: REST ile aynı bearer middleware.
- Bağlantı örnekleri:
  - Claude Code: `claude mcp add --transport http pano http://localhost:7777/mcp`
  - Codex: `~/.codex/config.toml` → `[mcp_servers.pano] url = "http://localhost:7777/mcp"`

## Kabul kriterleri
- [ ] MCP Inspector ile `/mcp`'ye bağlanılır, tam 7 tool listelenir ve her biri çalışır.
- [ ] Claude Code'a URL ile eklenen pano üzerinden "PANO board'unu göster, PANO-2'yi test'e taşı" isteği başarıyla yapılır; board'da canlı görünür.
- [ ] Codex üzerinden aynı akış çalışır.
- [ ] `GET /agents.md` metni tek başına okunarak bir agent curl ile PBI oluşturup taşıyabilir (Codex ile denenir).
- [ ] Token'lı modda tokensız MCP isteği reddedilir.

## Test planı
1. `claude mcp add ...` → yeni Claude oturumunda board'u sor, bir kartı taşı → tarayıcıdaki board güncellenmeli.
2. Aynısını Codex ile yap.

## Notlar / log

## Done notu
