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
