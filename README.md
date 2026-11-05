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

## API örnekleri (curl)

Sunucu çalışırken aşağıdaki komutlarla proje ve PBI oluşturup Test'e taşıyabilirsiniz:

```sh
curl -X POST http://127.0.0.1:7777/api/v1/projects -H 'Content-Type: application/json' -d '{"key":"DEMO","name":"Demo"}'
curl -X POST http://127.0.0.1:7777/api/v1/projects/DEMO/items -H 'Content-Type: application/json' -H 'X-Pano-Actor: codex:dev' -d '{"title":"İlk PBI","priority":"high"}'
curl -X POST http://127.0.0.1:7777/api/v1/items/DEMO-1/move -H 'Content-Type: application/json' -H 'X-Pano-Actor: codex:dev' -d '{"status":"test"}'
curl http://127.0.0.1:7777/api/v1/items/DEMO-1/activity
```

Olayları dinlemek için taşıma komutundan önce başka bir terminalde `curl -N 'http://127.0.0.1:7777/api/v1/events?project=DEMO'` çalıştırın. `PANO_TOKEN` ayarlıysa health dışındaki isteklere `-H 'Authorization: Bearer TOKEN'` ekleyin. OpenAPI belgesi `/api/v1/openapi.json` adresindedir.
