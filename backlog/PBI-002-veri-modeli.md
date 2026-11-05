---
id: PBI-002
title: Veri modeli, SQLite migration'ları ve core servisleri
status: backlog
assignee: -
priority: P1
created: 2026-11-05
updated: 2026-11-05
---

## Amaç
Projeler, PBI'lar, kabul kriterleri ve aktivite geçmişi güvenilir şekilde saklansın; REST, MCP ve CLI hep aynı iş kurallarını kullansın.

## Kapsam
**Dahil:** `packages/core` içinde: `bun:sqlite` bağlantısı (WAL modu), sıralı SQL migration sistemi (`migrations/001_init.sql` …, `schema_version` tablosu), zod şemaları, servis fonksiyonları, birim testleri.
**Hariç:** HTTP katmanı (PBI-003), UI.

## Bağlam
- Tablolar ve alanlar: `docs/architecture.md` → "Veri modeli" diyagramı. ID'ler ULID.
- Proje `key`: 2–10 büyük harf/rakam, benzersiz (ör. `PANO`). PBI anahtarı `KEY-number`; `number` proje içinde `next_number` ile artar, transaction içinde.
- Statüler: `backlog | in_progress | test | done`. `done`'a geçişte `done_at` set edilir, geri alınırsa null olur.
- `position` (REAL): kolon içi sıralama; araya ekleme için iki komşunun ortalaması.
- Her değişiklik `activity` tablosuna `actor` ile yazılır. Servisler `actor` parametresi alır.
- Servisler (öneri): `projects.list({includeArchived})`, `projects.create`, `projects.update`, `projects.star(id, bool)`, `projects.archive(id, bool)`, `items.list(projectKey, {status})`, `items.get(key)`, `items.create`, `items.update(key, patch)`, `items.move(key, status, position?)`, `items.assign(key, assignee)`, `criteria.add/check/remove`, `activity.list`, `notes.add`.
- Domain olayları için basit bir event emitter (`core.events.on('change', ...)`) — SSE (PBI-003) bunu dinleyecek.
- DB yolu `PANO_DATA_DIR` (varsayılan `~/.pano`), testlerde `:memory:`.

## Kabul kriterleri
- [ ] Boş DB'de migration'lar otomatik çalışır; tekrar çalıştırmak bir şey bozmaz.
- [ ] Aynı projede eşzamanlı 50 PBI oluşturma testinde numaralar benzersiz ve ardışıktır.
- [ ] Projeyi arşivlemek `list()` sonucundan çıkarır, `includeArchived` ile görünür; yıldızlılar önce sıralanır.
- [ ] Statü değişimi, atama ve kriter işaretleme `activity`'ye actor ile yazılır.
- [ ] Geçersiz girdiler (yanlış statü, bozuk key) zod hatasıyla reddedilir.
- [ ] `bun test` core testleri geçer; servislerin ≥ %85 satır kapsaması.

## Test planı
Otomatik testler yeterli; PO incelemesi için örnek bir seed script'i (`bun run seed`) 2 proje ve 8 PBI oluştursun.

## Notlar / log

## Done notu
