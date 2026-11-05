# Pano — Mimari

> Durum: v0.1 taslağı (2026-11-05). Kararlar: [`backlog/decisions.md`](../backlog/decisions.md)

## Tek cümlede

**Pano tek bir çalıştırılabilir dosyadır.** İçinde web arayüzü, REST API, MCP endpoint'i, CLI ve SQLite veritabanı vardır. Kullanıcı ister binary'yi çalıştırır, ister Docker image'ını; agent'lar MCP, CLI veya düz REST ile bağlanır.

## Bileşen çizimi

```mermaid
flowchart LR
  subgraph Clients["İstemciler"]
    B["Tarayıcı<br/>(insan)"]
    CC["Claude Code / Codex / Cursor<br/>(MCP over HTTP)"]
    SH["Shell'i olan agent<br/>(pano CLI veya curl)"]
  end

  subgraph Bin["pano binary — bun build --compile"]
    direction TB
    H["Hono HTTP server<br/>127.0.0.1:7777"]
    WEB["/  · Web UI<br/>(React + shadcn, gömülü statik)"]
    API["/api/v1 · REST<br/>+ OpenAPI"]
    MCP["/mcp · MCP<br/>(Streamable HTTP, 7 tool)"]
    SSE["/api/v1/events · SSE<br/>(canlı güncelleme)"]
    DOC["/agents.md<br/>(agent rehberi)"]
    CORE["core<br/>(domain servisleri + zod şemaları)"]
    CLI["CLI modu<br/>pano task move ..."]
    H --> WEB & API & MCP & SSE & DOC
    API --> CORE
    MCP --> CORE
    SSE -.olaylar.- CORE
  end

  DB[("SQLite<br/>~/.pano/pano.db")]

  B --> H
  CC --> MCP
  SH --> CLI
  SH -.curl.-> API
  CLI -->|HTTP| API
  CORE --> DB
```

**Altın kural:** iş kuralları sadece `core` içinde. REST ve MCP ince adaptörlerdir; aynı servisleri çağırır. CLI, çalışan sunucunun REST API'sine HTTP ile konuşur (DB'ye doğrudan dokunmaz), böylece SSE olayları her değişiklikte tetiklenir ve board canlı güncellenir.

## Çalışma modları

| Komut | Ne yapar |
|---|---|
| `pano serve` | Sunucuyu başlatır (varsayılan `127.0.0.1:7777`, DB `~/.pano/pano.db`) |
| `pano project list` / `pano board <KEY>` | Projeleri / board'u terminalde gösterir |
| `pano task create\|show\|move\|assign\|check ...` | PBI işlemleri |
| `pano mcp-config <claude\|codex\|cursor>` | İlgili istemci için MCP bağlantı komutunu/JSON'unu yazdırır |
| Docker | `docker run -p 7777:7777 -v pano-data:/data ghcr.io/metonya/pano` |

Ortam değişkenleri: `PANO_PORT`, `PANO_HOST`, `PANO_DATA_DIR`, `PANO_TOKEN`, `PANO_URL` (CLI'ın bağlanacağı sunucu).

## Güvenlik (v0.1)

- Varsayılan olarak yalnızca `127.0.0.1`'e bind olur; token gerekmez.
- `PANO_HOST=0.0.0.0` (ör. Docker) ile açılırsa `PANO_TOKEN` **zorunlu**; tüm `/api` ve `/mcp` istekleri `Authorization: Bearer <token>` ister. Token yoksa sunucu başlamaz.
- Çok kullanıcılı hesaplar v0.1 kapsamı dışında.

## Veri modeli

```mermaid
erDiagram
  PROJECT ||--o{ ITEM : içerir
  ITEM ||--o{ CRITERION : "kabul kriteri"
  ITEM ||--o{ ACTIVITY : "geçmiş"
  PROJECT {
    text id PK "ulid"
    text key UK "PANO"
    text name
    text description
    int starred "0/1"
    text archived_at "null = aktif"
    int next_number
    text created_at
    text updated_at
  }
  ITEM {
    text id PK "ulid"
    text project_id FK
    int number "PANO-12 -> 12"
    text title
    text body_md "amaç, kapsam, bağlam, test planı"
    text status "backlog|in_progress|test|done"
    text priority "P1|P2|P3"
    text assignee "claude:pbi-12-dev | codex | mert | null"
    real position "kolon içi sıra"
    text created_at
    text updated_at
    text done_at
  }
  CRITERION {
    text id PK
    text item_id FK
    text text
    int done
    real position
  }
  ACTIVITY {
    text id PK
    text project_id FK
    text item_id FK "nullable"
    text actor "mert | claude:... | codex"
    text action "created|moved|assigned|checked|commented|..."
    text payload_json
    text created_at
  }
```

- PBI'nın görünen anahtarı: `<PROJECT.key>-<number>` (ör. `PANO-12`). Agent'lar ve commit mesajları bu anahtarı kullanır.
- Kabul kriterleri ayrı tablo: agent'lar tek tek `check` edebilir, board ilerleme çubuğu gösterir.
- Statüler v0.1'de sabit 4 tane. Özelleştirilebilir kolonlar sonraki sürüm.

## MCP tool'ları (bilerek az)

Her MCP tool'u agent'ın her konuşmasında token harcar; bu yüzden 7 tool ile sınırlı:

| Tool | Amaç |
|---|---|
| `list_projects` | Aktif projeler (yıldızlılar önce) |
| `get_board` | Bir projenin 4 kolonu, kart özetleri |
| `get_item` | PBI'nın tamamı (body, kriterler, son aktiviteler) |
| `create_item` | Yeni PBI (başlık, body, kriterler, öncelik) |
| `update_item` | Statü, assignee, başlık, body, öncelik değişikliği |
| `check_criterion` | Kabul kriterini işaretle / kaldır |
| `add_note` | PBI'ya log/not düş (ör. "testler geçti") |

## Repo yapısı

```
pano/
├─ apps/
│  ├─ server/        # Hono: REST, MCP, SSE, agents.md, statik UI servis; main.ts = serve + CLI
│  └─ web/           # React + Vite + Tailwind + shadcn/ui
├─ packages/
│  └─ core/          # domain servisleri, zod şemaları, SQLite (bun:sqlite) + migration'lar
├─ docs/             # mimari, tasarım (DESIGN.md), kurulum
├─ backlog/          # PBI'lar (pano kendi kendini yönetene kadar md)
└─ .github/workflows # CI + release (win/mac/linux binary, Docker image → ghcr.io)
```

## Teknoloji seçimleri

| Katman | Seçim | Neden |
|---|---|---|
| Runtime | Bun | TS'i doğrudan çalıştırır, `bun:sqlite` gömülü, `--compile` ile tek dosya |
| HTTP | Hono | Küçük, hızlı, Bun ile doğal; OpenAPI desteği (`@hono/zod-openapi`) |
| DB | SQLite (WAL modu) | Kurulumsuz, tek dosya, yedeği kopyala-yapıştır |
| Doğrulama | zod | REST, MCP ve CLI aynı şemaları paylaşır |
| MCP | `@modelcontextprotocol/sdk` Streamable HTTP | İstemciye ayrı kurulum gerekmez, sadece URL |
| UI | React + Vite + Tailwind + shadcn/ui + lucide | Apple tarzı tasarıma uygun, sahiplenilebilir component'ler |
| Drag & drop | dnd-kit | Erişilebilir, klavye desteği |
| Test | `bun test` + Playwright (UI) | Hızlı, tek araç zinciri |

## Sürüm 0.1 kapsamı dışında (bilinçli)

Çok kullanıcı / hesaplar, özelleştirilebilir kolonlar, sprint/takvim, bildirimler, dosya ekleri, GitHub senkronizasyonu.
