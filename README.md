# Pano

Agent'lar ve insanlar için hafif, açık kaynak proje yönetim board'u.
Tek dosya: web arayüzü + REST API + MCP + CLI + SQLite.

> Durum: planlama. Mimari: [docs/architecture.md](docs/architecture.md) · Backlog: [backlog/](backlog/) · Kararlar: [backlog/decisions.md](backlog/decisions.md)

## Kurulum ve geliştirme

Bun 1.3 veya daha yeni bir sürüm gerekir. Depo kökünde:

```sh
bun install
bun run dev
```

Web adresi terminalde gösterilir; API varsayılan olarak `http://localhost:7777` adresindedir. `PANO_PORT` ile API portu değiştirilebilir. Doğrulama için `bun run lint`, `bun run typecheck` ve `bun run test`; build için `bun run build` çalıştırın.

## CLI

Argümansız `bun run pano` yardım gösterir. Önce ayrı terminalde `bun run pano serve` çalıştırın:

```sh
bun run pano project create PANO "Pano"
bun run pano project list
bun run pano task create PANO "Başlık" --criteria "A" --criteria "B" --priority high
bun run pano task move PANO-1 test
bun run pano board PANO
bun run pano task show PANO-1 --json
bun run pano task assign PANO-1 codex
bun run pano task check PANO-1 <criterion-id>
bun run pano task note PANO-1 "Testler geçti"
bun run pano mcp-config claude
```

`PANO_URL` varsayılanı `http://127.0.0.1:7777`; `PANO_TOKEN` Bearer token, `PANO_ACTOR` geçmişteki aktördür. CLI yalnızca REST API kullanır. Tüm komutlarda `--help` ve `--json` kullanılabilir; hatalar stderr'e yazılır ve çıkış kodu 1 olur. `serve --json` başlangıç bilgisini yazdırıp sunucuyu açık tutar.

Durumlar: `backlog`, `in_progress` (`in-progress` de geçerli), `test`, `done`, `cancelled`; iptal için `--reason "Neden"` zorunlu. `project list --all` arşivleri içerir; `project star|archive KEY --off` işlemi geri alır. `task assign KEY none` atamayı kaldırır; `task check KEY ID --undo` kriteri kaldırır. Kriter ID'si `task show` çıktısındadır. `mcp-config codex` TOML, `mcp-config cursor` JSON üretir; `PANO_TOKEN` ayarlıysa Claude/Cursor çıktısı token içerir, Codex çıktısı ortam değişkenine başvurur. `--json` çıktısı metin yapılandırmalarını JSON string olarak döndürür.

## API örnekleri (curl)

Sunucu çalışırken aşağıdaki komutlarla proje ve PBI oluşturup Test'e taşıyabilirsiniz:

```sh
curl -X POST http://127.0.0.1:7777/api/v1/projects -H 'Content-Type: application/json' -d '{"key":"DEMO","name":"Demo"}'
curl -X POST http://127.0.0.1:7777/api/v1/projects/DEMO/items -H 'Content-Type: application/json' -H 'X-Pano-Actor: codex:dev' -d '{"title":"İlk PBI","priority":"high"}'
curl -X POST http://127.0.0.1:7777/api/v1/items/DEMO-1/move -H 'Content-Type: application/json' -H 'X-Pano-Actor: codex:dev' -d '{"status":"test"}'
curl http://127.0.0.1:7777/api/v1/items/DEMO-1/activity
```

Olayları dinlemek için taşıma komutundan önce başka bir terminalde `curl -N 'http://127.0.0.1:7777/api/v1/events?project=DEMO'` çalıştırın. `PANO_TOKEN` ayarlıysa health dışındaki isteklere `-H 'Authorization: Bearer TOKEN'` ekleyin. OpenAPI belgesi `/api/v1/openapi.json` adresindedir.

## MCP istemcileri

Claude Code: `claude mcp add --transport http pano http://localhost:7777/mcp`

Codex i?in `~/.codex/config.toml`:

```toml
[mcp_servers.pano]
url = "http://localhost:7777/mcp"
```

`PANO_TOKEN` ayarl?ysa istemci isteklerine `Authorization: Bearer TOKEN` ba?l???n? ekleyin. REST ve curl rehberi sunucunun `/agents.md` adresindedir.
