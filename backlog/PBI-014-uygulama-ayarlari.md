---
id: PBI-014
title: Uygulama ayarları — dil, görünüm, sürüm ve güncelleme
status: done
assignee: codex
priority: P2
created: 2026-11-05
updated: 2026-11-06
---

## Amaç
Pano'yu kuran herkes arayüzü kendi dilinde ve tercih ettiği görünümde kullanabilsin, hangi sürümde olduğunu ve yeni sürüm çıkıp çıkmadığını görebilsin.

## Kapsam
**Dahil:**
- **Uygulama ayarları ekranı** (proje ayarlarından ayrı; sidebar'ın altındaki "Ayarlar"dan açılır): Genel, Görünüm, Agent bağlantısı, Hakkında bölümleri.
- **Dil:** Türkçe ve English. Varsayılan tarayıcı/sistem dili; desteklenmiyorsa English. Tüm arayüz metinleri çeviri dosyalarından gelir; bilinen teknik terimler (Backlog, In Progress, Test, Done, PBI) her dilde İngilizce kalır (`apps/web/src/i18n/tr.json`, `en.json`); tarih/saat biçimi dile göre (`Intl.DateTimeFormat`). Agent'ların yazdığı PBI içerikleri çevrilmez.
- **Görünüm:** Açık / Koyu / Otomatik (sistemi takip eder, varsayılan). Seçim anında uygulanır, sayfa yenilemede kalır.
- **Hakkında:** sürüm numarası, build tarihi, veri klasörü yolu, veritabanı boyutu, lisans (MIT), GitHub linki.
- **Güncelleme kontrolü:** sunucu açılışta ve günde bir kez GitHub Releases'ten son sürümü kontrol eder (ayarla kapatılabilir; çevrimdışıysa sessizce geçer). Yeni sürüm varsa ayarlarda ve sidebar'ın altında sakin bir "Yeni sürüm: v0.2.0" bildirimi; tıklayınca sürüm notları linki ve kurulum türüne göre güncelleme komutu (binary: `pano update`; Docker: `docker pull ghcr.io/metonya/pano:latest` + yeniden başlat).
- **`pano update`** (CLI): yeni sürümün binary'sini indirir, SHA-256 checksum'ını release'teki dosyayla doğrular, mevcut binary'yi yedekleyip değiştirir; Docker içinde çalışıyorsa komut yerine Docker talimatı verir.
- `GET /api/v1/system` → `{ version, buildDate, dataDir, dbSize, latestVersion?, updateAvailable }`.
**Hariç:** Otomatik (kullanıcı onayı olmadan) güncelleme, ikiden fazla dil, kullanıcı başına ayar (tek kullanıcı).

## Bağlam
- Ayarlar sunucu tarafında `settings` tablosunda (anahtar/değer) saklanır; görünüm ve dil ayrıca `localStorage`'a yazılır ki ilk boyamada yanlış tema yanıp sönmesin.
- Sürüm `package.json`'dan build sırasında binary'ye gömülür (PBI-010 ile birlikte).
- Tasarım: `docs/DESIGN.md` + Claude Design'a "Uygulama ayarları" ekranı eklenecek (PBI-004).
- Ürün kuralları: `docs/product.md`.

## Kabul kriterleri
- [x] Sürükle-bırak ekran okuyucu duyuruları seçili dilde ve PBI numarasıyla okunur (teknik ID değil; PBI-006'dan devralındı).
- [x] Dil English yapılınca tüm arayüz (statüler, butonlar, boş durumlar, tarih biçimi) İngilizce görünür; eksik çeviri anahtarı CI'da test ile yakalanır.
- [x] Görünüm Açık/Koyu/Otomatik arasında anında değişir; Otomatik'te sistem teması değişince arayüz de değişir; yenilemede tema yanıp sönmez.
- [x] Hakkında bölümü doğru sürüm ve veri klasörünü gösterir.
- [x] Sahte bir release cevabıyla (test) yeni sürüm bildirimi görünür; güncelleme kontrolü kapatılınca hiç istek atılmaz.
- [x] `pano update` checksum uyuşmazsa binary'yi değiştirmez ve açıklayıcı hata verir; başarılı güncellemeden sonra `pano --version` yeni sürümü gösterir.

## Test planı
1. Ayarlardan dili English yap → board'u ve bir PBI'yı gez.
2. Görünümü Koyu, sonra Otomatik yap; sistem temasını değiştir.
3. Hakkında'da sürüm bilgisini kontrol et.

## Notlar / log

- 2026-11-06 claude:po codex'e (gpt-6.1-terra) paralel verdi.

- 2026-11-06 codex bitirdi. check (claude:po): lint · typecheck temiz · test 59/59 · build geçti · e2e 18/18 · token e2e 1/1; ekran kontrol edildi. Açık: repo private ve release yok, gerçek binary ile `pano update` uçtan uca denenemedi.

- 2026-11-06 codex `pano update` testlerini yazdı, Windows `.old` akışı ve hata durumunda geri yüklemeyi ekledi. check (claude:po): test 76/76.

## Done notu
Ayarlar ekranı, Türkçe/English, Açık/Koyu/Otomatik, sürüm ve güncelleme bildirimi, `pano update`. Bilinen kısıt: `pano update` sahte sunucuyla test edildi; gerçek release ile denenmedi (repo private, release yok).
