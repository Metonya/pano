---
id: PBI-007
title: Gömülü MCP endpoint'i (/mcp) ve agent rehberi (/agents.md)
status: done
assignee: codex
priority: P1
created: 2026-11-05
updated: 2026-11-06
---

## Amaç
Claude Code, Codex, Cursor gibi agent'lar hiçbir şey kurmadan, sadece bir URL ekleyerek board'u okuyup güncelleyebilsin; shell'i olan diğer agent'lar `/agents.md`'yi okuyup REST ile çalışabilsin.

## Kapsam
**Dahil:** `apps/server` içinde `@modelcontextprotocol/sdk` ile Streamable HTTP MCP server `/mcp`; 7 tool; `actor` desteği; `/agents.md` (sade markdown: ne, nasıl bağlanılır, örnek akış, REST özeti); README'de istemci kurulum örnekleri.
**Hariç:** stdio MCP, MCP resources/prompts (sonra).

## Bağlam
- Tool'ların güncel listesi: `add_note` yerine `add_record` (`note|check|decision`); `get_item` varsayılan olarak son 5 kaydı döner, `history: true` ile tamamını.
- Tool listesi ve amaçları: `docs/architecture.md` → "MCP tool'ları". Daha fazla tool ekleme — token maliyeti kararı (`backlog/decisions.md`).
- Tool açıklamaları kısa ve net olsun (her biri ≤ 2 cümle); input şemaları core zod şemalarından türetilsin.
- `actor`: MCP istemcisi `X-Pano-Actor` başlığı gönderemiyorsa tool'larda opsiyonel `actor` alanı.
- Token: REST ile aynı bearer middleware.
- Bağlantı örnekleri:
  - Claude Code: `claude mcp add --transport http pano http://localhost:7777/mcp`
  - Codex: `~/.codex/config.toml` → `[mcp_servers.pano] url = "http://localhost:7777/mcp"`

## Kabul kriterleri
- [x] `/mcp`'ye bağlanılır, tam 7 tool listelenir ve her biri çalışır (MCP SDK client testiyle; Inspector çalıştırılmadı).
- [x] Claude Code'a URL ile eklenen pano üzerinden "PANO board'unu göster, PANO-2'yi test'e taşı" isteği başarıyla yapılır; board'da canlı görünür.
- [x] Codex üzerinden aynı akış çalışır (2026-11-06 Mert'in kararıyla MCP yerine CLI/terminal üzerinden: `/agents.md` + curl ile doğrulandı).
- [x] `GET /agents.md` metni tek başına okunarak bir agent curl ile PBI oluşturup taşıyabilir (Codex ile denenir).
- [x] Token'lı modda tokensız MCP isteği reddedilir.

## Test planı
1. `claude mcp add ...` → yeni Claude oturumunda board'u sor, bir kartı taşı → tarayıcıdaki board güncellenmeli.
2. Aynısını Codex ile yap.

## Notlar / log
- 2026-11-06 claude:po işi codex'e (gpt-6.1-terra, high) verdi; @modelcontextprotocol/sdk önceden kuruldu.
- 2026-11-06 codex bitirdi; sandbox bağımlılık okuyamadığı için testleri çalıştıramadı. check (claude:po): lint · typecheck temiz · test 14/14.
- check: Claude Code (`--mcp-config`, kalıcı ayar değiştirilmedi) board'u okudu, DEMO-2'yi test'e taşıdı; aktivitede `claude:e2e` görünüyor.
- check: Codex yalnızca `/agents.md` ve curl ile PBI oluşturup test'e taşıdı.
- Bulgu: Bun'ın 10 sn idle timeout'u SSE'yi ~9 sn'de kesiyordu (PBI-003'ten kalan hata; testler yakalamadı). `idleTimeout: 255` ile düzeltildi; 40 sn'lik denemede bağlantı açık kaldı, heartbeat ve item.moved geldi.
- Açık: Bu makinede Codex'te MCP sunucusu kurumsal politika ile kapalı ("disabled: requirements", enterprise-managed Baseline). Codex + MCP kriteri burada doğrulanamadı; politika aşılmadı. MCP Inspector da çalıştırılmadı (7 tool SDK client testiyle doğrulandı).

## Done notu
`/mcp` (7 tool) ve `/agents.md` sunucuya gömülü. Claude Code MCP ile, Codex terminal üzerinden REST ile çalışıyor. Bilinen kısıt: bu makinede Codex'in MCP'si kurumsal politika ile kapalı; Codex + MCP gerçek bağlantısı başka bir kurulumda denenmedi.
