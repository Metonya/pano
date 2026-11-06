---
id: PBI-010
title: Paketleme ve dağıtım — tek dosya binary (Win/Mac/Linux) + Docker image
status: done
assignee: codex
priority: P2
created: 2026-11-05
updated: 2026-11-06
---

## Amaç
Herkes kendi platformunda tek adımda kurup kullanabilsin: indir-çalıştır binary veya Docker.

## Kapsam
**Dahil:** Web UI build'inin binary'ye gömülmesi, `bun build --compile` ile `windows-x64`, `linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64` hedefleri, çok aşamalı `Dockerfile` (son imaj küçük, non-root, `/data` volume, `PANO_HOST=0.0.0.0`), GitHub Actions release workflow'u (tag `v*` → binary'ler GitHub Release'e, image `ghcr.io/metonya/pano`'ya), README kurulum bölümü (her OS + Docker + docker compose örneği).
**Hariç:** Homebrew/winget/npm paketleri (sonra), imzalama/notarization.

## Bağlam
- Mimari: "Çalışma modları" ve "Güvenlik" bölümleri. Docker'da token zorunlu olduğu için örnek compose `PANO_TOKEN` içerir.
- Statik dosyaları gömme: Bun `import ... with { type: "file" }` veya build sırasında üretilen asset manifest.

## Kabul kriterleri
- [x] `bun run build:bin` yerel platform için tek dosya üretir; başka hiçbir dosya olmadan çalışır ve UI açılır.
- [ ] Tag atınca release workflow 5 binary'yi ve Docker image'ı yayınlar.
- [x] `docker run -p 7777:7777 -e PANO_TOKEN=x -v pano-data:/data ghcr.io/metonya/pano` ile UI açılır, container yeniden başlayınca veri kalır.
- [x] Docker imajı < 150 MB.
- [x] README'de Windows, macOS, Linux ve Docker kurulumları adım adım yazılı.

## Test planı
1. Windows binary'yi indirip çift tıkla/terminalden çalıştır → UI açılmalı.
2. Docker komutunu çalıştır, proje oluştur, container'ı yeniden başlat → proje durmalı.

## Notlar / log

- 2026-11-06 claude:po codex'e (gpt-6.1-terra, high) paralel olarak verdi.

- 2026-11-06 codex iki turda bitirdi; ilk binary migration'ları diskte aradığı için hiç açılmıyordu (claude:po testi yakaladı), SQL'ler gömüldü. Web'e token giriş ekranı eklendi.
- check (claude:po): lint · typecheck temiz · test 41/41 · e2e 11/11 · token e2e 1/1 · `dist/pano.exe` (117 MB) ayrı klasörden açıldı: UI, SPA yolu, /agents.md, CLI, token zorunluluğu çalışıyor; canlı bağlantı kurulup kopunca yeniden bağlanıyor.
- Açık: Docker Desktop kapalı olduğu için imaj, veri kalıcılığı ve 150 MB sınırı denenmedi; release workflow tag atılmadan doğrulanamaz.

- 2026-11-06 claude:po: son binary ile boş klasörde uçtan uca akış geçti. Docker Desktop 10 dk içinde açılmadı (`dockerDesktopLinuxEngine` yok); imaj, kalıcılık ve 150 MB sınırı hâlâ denenmedi, Dockerfile hiç derlenmedi. Release workflow'u tag atılana kadar doğrulanamaz.

- 2026-11-06 claude:po: Docker Desktop bozuk socket dosyaları yüzünden açılmıyordu; `Dockerun` ve `docker-secrets-engine` klasörleri yeniden adlandırıldı. İmaj Debian'dan distroless'a alındı: katman toplamı ~120 MB, indirme ~50 MB (`docker images` 184 MB gösteriyor, sıkıştırılmış ve açılmış kopyayı birlikte sayıyor). check: token olmadan başlamıyor, token'sız istek 401, UI açılıyor, veri yeniden başlatmada kalıyor, non-root, sağlık kontrolü healthy.

## Done notu
Tek dosya binary (117 MB) ve Docker imajı çalışıyor. Açık kalan tek kriter: release workflow'u tag atılmadan doğrulanamaz (Mert isteyince). Sadece Windows binary'si elle denendi.
