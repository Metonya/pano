---
id: PBI-010
title: Paketleme ve dağıtım — tek dosya binary (Win/Mac/Linux) + Docker image
status: backlog
assignee: -
priority: P2
created: 2026-11-05
updated: 2026-11-05
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
- [ ] `bun run build:bin` yerel platform için tek dosya üretir; başka hiçbir dosya olmadan çalışır ve UI açılır.
- [ ] Tag atınca release workflow 5 binary'yi ve Docker image'ı yayınlar.
- [ ] `docker run -p 7777:7777 -e PANO_TOKEN=x -v pano-data:/data ghcr.io/metonya/pano` ile UI açılır, container yeniden başlayınca veri kalır.
- [ ] Docker imajı < 150 MB.
- [ ] README'de Windows, macOS, Linux ve Docker kurulumları adım adım yazılı.

## Test planı
1. Windows binary'yi indirip çift tıkla/terminalden çalıştır → UI açılmalı.
2. Docker komutunu çalıştır, proje oluştur, container'ı yeniden başlat → proje durmalı.

## Notlar / log

## Done notu
