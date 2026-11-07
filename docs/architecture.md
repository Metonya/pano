# Pano: Mimari

> Durum: v0.1 taslağı (2026-11-05). Kararlar: [`decisions.md`](decisions.md)

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

  subgraph Bin["pano binary, bun build --compile"]
    direction TB
    H["Hono HTTP server<br/>127.0.0.1:7777"]
    WEB["/  · Web UI<br/>(React + shadcn, gömülü statik)"]
    API["/api/v1 · REST<br/>+ OpenAPI"]
    MCP["/mcp · MCP<br/>(Streamable HTTP, 8 tool)"]
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
| Docker | `docker run -p 127.0.0.1:7777:7777 -e PANO_LOCAL_DOCKER=1 -v pano-data:/data ghcr.io/metonya/pano` |

Ortam değişkenleri: `PANO_PORT`, `PANO_HOST`, `PANO_DATA_DIR`, `PANO_TOKEN`, `PANO_URL` (CLI'ın bağlanacağı sunucu), `PANO_USER` (insan kimliğinin varsayılanı).

## Güvenlik (v0.1)

- Varsayılan olarak yalnızca `127.0.0.1`'e bind olur; token gerekmez.
- Yerel Docker: `PANO_LOCAL_DOCKER=1` ile container içinde `0.0.0.0` dinlenir ve port sadece host `127.0.0.1` üzerinde yayınlanır. Token gerekmez; Host ve Origin kontrolleri tarayıcıdan gelen çapraz kaynak ve DNS rebinding isteklerini sınırlar. Yerel süreçler ve aynı Docker ağına erişebilen container'lar güvenilir kabul edilir; bu mod LAN'a veya güvenilmeyen ağa açılmaz.
- Diğer loopback dışı bağlantılarda `PANO_TOKEN` zorunludur; `/api` ve `/mcp` Bearer token ister. Uzaktan kullanım için HTTPS gerekir.
- Çok kullanıcılı hesaplar v0.1 kapsamı dışında.

## Veri modeli

```mermaid
erDiagram
  PROJECT ||--o{ ITEM : içerir
  ITEM ||--o{ CRITERION : "kabul kriteri"
  ITEM ||--o{ TEST_SCENARIO : "insan testi"
  ITEM ||--o{ ACTIVITY : "geçmiş"
  ITEM ||--o{ ATTACHMENT : "ekran görüntüsü"
  PROJECT {
    text id PK "ulid"
    text key UK "PANO"
    text name
    text description
    int starred "0/1"
    text archived_at "null = aktif"
    int test_column "1 = Test kolonu açık"
    int ai_can_close "1 = AI Done'a çekebilir"
    text dod_md "Definition of Done"
    int next_number
    text created_at "projenin başlangıcı"
    text updated_at
  }
  ITEM {
    text id PK "ulid"
    text project_id FK
    int number "PANO-12 -> 12"
    text title
    text body_md "amaç, kapsam, bağlam, test planı"
    text status "backlog|in_progress|test|done|cancelled"
    text priority "high|medium|low"
    text assignee "claude | codex:review | userName | null"
    real position "kolon içi sıra"
    text seen_at "kullanıcı son baktığında"
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
  TEST_SCENARIO {
    text id PK
    text item_id FK
    text steps_md "ne yap"
    text expected_md "ne görmelisin"
    text result "pending|passed|failed"
    text author "AI veya kullanıcı"
    real position
  }
  ATTACHMENT {
    text id PK
    text item_id FK
    text activity_id FK "geri gönderme notuna bağlı"
    text file_name
    text mime
    int size
  }
  ACTIVITY {
    text id PK
    text project_id FK
    text item_id FK "nullable"
    text actor "userName | claude:... | codex"
    text kind "created|moved|assigned|edited|check|note|sent_back|cancelled|usage|..."
    text before_json "değişen alanların eski hali"
    text after_json "yeni hali"
    text message "insan okuyacak tek satır"
    text created_at
  }
```

- PBI'nın anahtarı: `<PROJECT.key>-<number>` (ör. `PANO-12`). Agent'lar, commit mesajları ve projeler arası listeler bu anahtarı kullanır; proje içindeki arayüzde sadece `#12` görünür.
- Öncelik `high|medium|low`; arayüzde Yüksek / Orta / Düşük.
- Kabul kriterleri ayrı tablo: agent'lar tek tek `check` edebilir, board ilerleme çubuğu gösterir.
- Statüler sabit: `backlog`, `in_progress`, `test`, `done`, `cancelled`. Test kolonu proje ayarıyla kapatılabilir; `cancelled` kolon değil, filtredir. Akış kuralları: [product.md](product.md#akış).
- **Hiçbir şey silinmez, her değişiklik `activity`'de eski/yeni haliyle durur.** Bu kayıtlar UI'da insan için gösterilir; agent'lar varsayılan olarak sadece kartın güncel hali + son birkaç kaydı alır, geçmişin tamamını istediğinde ister. Böylece kayıt tutmak agent'ın token maliyetini büyütmez.
- Ekler (`ATTACHMENT`) dosya olarak `PANO_DATA_DIR/attachments/` altında, DB'de sadece metadata.

## MCP tool'ları (bilerek az)

Her MCP tool'u agent'ın her konuşmasında token harcar; bu yüzden az tool ile sınırlı (8; `record_usage` 2026-11-07'de Mert'in isteğiyle eklendi):

| Tool | Amaç |
|---|---|
| `list_projects` | Aktif projeler (yıldızlılar önce) ve proje ayarları |
| `get_board` | Bir projenin kolonları, kart özetleri, kullanıcıyı bekleyenler |
| `get_item` | PBI'nın güncel hali (body, kriterler, test senaryoları, son 5 kayıt); `history: true` ile tamamı |
| `create_item` | Yeni PBI (başlık, body, kriterler, öncelik) |
| `update_item` | Statü, assignee, başlık, body, öncelik, test senaryoları; `reason` alanı geçmişe yazılır |
| `check_criterion` | Kabul kriterini işaretle / kaldır |
| `add_record` | Karta kayıt düş: `note`, `check` (ör. "unit test 42/42 geçti") veya `decision` |

## Repo yapısı

```
pano/
├─ apps/
│  ├─ server/        # Hono: REST, MCP, SSE, agents.md, statik UI servis; main.ts = serve + CLI
│  └─ web/           # React + Vite + Tailwind + shadcn/ui
├─ packages/
│  └─ core/          # domain servisleri, zod şemaları, SQLite (bun:sqlite) + migration'lar
├─ docs/             # mimari, tasarım (DESIGN.md), kurulum
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

Çok kullanıcı / hesaplar, özelleştirilebilir kolonlar, sprint/takvim, bildirimler, agent'ı anında tetikleme (`pano watch`, webhook), GitHub senkronizasyonu. Bkz. [product.md → Açık konular](product.md#açık-konular-bilerek-sonraya-bırakıldı).
