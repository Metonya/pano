---
id: PBI-002
title: Veri modeli, SQLite migration'ları ve core servisleri
status: in-progress
assignee: codex
priority: P1
created: 2026-11-05
updated: 2026-11-06
---

## Amaç
Projeler, PBI'lar, kabul kriterleri ve aktivite geçmişi güvenilir şekilde saklansın; REST, MCP ve CLI hep aynı iş kurallarını kullansın.

## Kapsam
**Dahil:** `packages/core` içinde: `bun:sqlite` bağlantısı (WAL modu), sıralı SQL migration sistemi (`migrations/001_init.sql` …, `schema_version` tablosu), zod şemaları, servis fonksiyonları, birim testleri.
**Hariç:** HTTP katmanı (PBI-003), UI.

## Bağlam
- Tablolar ve alanlar: `docs/architecture.md` → "Veri modeli" diyagramı. ID'ler ULID.
- Proje `key`: 2–10 büyük harf/rakam, benzersiz (ör. `PANO`). PBI anahtarı `KEY-number`; `number` proje içinde `next_number` ile artar, transaction içinde.
- Statüler: `backlog | in_progress | test | done | cancelled`. `done`'a geçişte `done_at` set edilir, geri alınırsa null olur. Akış kuralları: `docs/product.md` → Akış.
- Proje ayarları: `test_column`, `ai_can_close`, `dod_md` (bkz. product.md → Proje ayarları). `test_column=0` iken `test` statüsüne geçiş reddedilir.
- **Hiçbir kayıt silinmez.** PBI iptali `cancelled` statüsüdür. Her `update`'te değişen alanların eski ve yeni hali `activity.before_json/after_json`'a yazılır; opsiyonel `reason` alanı `message`'a gider.
- `test_scenarios` (adımlar, beklenen, sonuç, yazan) ve `attachments` (metadata; dosyalar `PANO_DATA_DIR/attachments/`) tabloları.
- `items.markSeen(key)`: kullanıcının kartı gördüğünü kaydeder (`seen_at`); `seen_at < done_at` olan Done kartları "görülmedi" sayılır.
- `position` (REAL): kolon içi sıralama; araya ekleme için iki komşunun ortalaması.
- Her değişiklik `activity` tablosuna `actor` ile yazılır. Servisler `actor` parametresi alır. Agent'ın kendi test sonuçları `kind: check` kaydıdır, statü değiştirmez.
- Servisler (öneri): `projects.list({includeArchived})`, `projects.create`, `projects.update`, `projects.star(id, bool)`, `projects.archive(id, bool)`, `items.list(projectKey, {status})`, `items.get(key)`, `items.create`, `items.update(key, patch)`, `items.move(key, status, position?)`, `items.assign(key, assignee)`, `criteria.add/check/remove`, `activity.list`, `records.add(key, {kind: note|check|decision})`, `scenarios.add/update/remove`, `attachments.add`.
- Domain olayları için basit bir event emitter (`core.events.on('change', ...)`) — SSE (PBI-003) bunu dinleyecek.
- DB yolu `PANO_DATA_DIR` (varsayılan `~/.pano`), testlerde `:memory:`.

## Kabul kriterleri
- [ ] Boş DB'de migration'lar otomatik çalışır; tekrar çalıştırmak bir şey bozmaz.
- [ ] Aynı projede eşzamanlı 50 PBI oluşturma testinde numaralar benzersiz ve ardışıktır.
- [ ] Projeyi arşivlemek `list()` sonucundan çıkarır, `includeArchived` ile görünür; yıldızlılar önce sıralanır.
- [ ] Statü değişimi, atama, düzenleme ve kriter işaretleme `activity`'ye actor ve eski/yeni haliyle yazılır.
- [ ] Bir PBI'nın başlık ve body'si 3 kez değiştirildiğinde geçmişten her ara hal geri okunabilir.
- [ ] İptal edilen PBI board listesinde görünmez, `status=cancelled` ile listelenir; silme servisi yoktur.
- [ ] `test_column=0` olan projede `test`'e taşıma açıklayıcı hatayla reddedilir.
- [ ] Geçersiz girdiler (yanlış statü, bozuk key) zod hatasıyla reddedilir.
- [ ] `bun test` core testleri geçer; servislerin ≥ %85 satır kapsaması.

## Test planı
Otomatik testler yeterli; PO incelemesi için örnek bir seed script'i (`bun run seed`) 2 proje ve 8 PBI oluştursun.

## Notlar / log
- 2026-11-06 claude:po işi codex'e (gpt-6.1-terra, high) verdi; zod ve ulid önceden kuruldu.

## Done notu
