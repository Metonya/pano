---
id: PBI-011
title: Web UI — PBI aktivite geçmişi ve değişiklik karşılaştırması
status: done
assignee: codex
priority: P2
created: 2026-11-05
updated: 2026-11-06
---

## Amaç

Kullanıcı bir işin hayatını baştan sona görebilsin: kim açtı, ne zaman kime atandı, nereye taşındı, kapsamı nasıl büyüdü veya küçüldü, neden iptal edildi, AI'ın kendi testleri ne sonuç verdi.

## Kapsam

**Dahil:** PBI detay sheet'inde zaman çizelgesi (yeniden eskiye); kayıt türüne göre tek satırlık özet ("claude · po durumu In Progress yaptı · 22:31"); `check` kayıtları geçti/kaldı rozetiyle; `edited` kayıtlarında "değişikliği göster" ile başlık/body/kriterlerin eski ve yeni halinin satır satır karşılaştırması; `reason` varsa satırın altında; geri gönderme kayıtlarında not ve ekran görüntüsü küçük resimleri; "sadece kararlar / sadece testler" filtresi.
**Hariç:** Bir eski hali geri yükleme (sonra).

## Bağlam

- Ürün kuralları: `docs/product.md` (hiçbir şey silinmez; agent'a varsayılan olarak özet gider).
- Veri: `activity` tablosu `kind`, `before_json`, `after_json`, `message` (bkz. `docs/architecture.md` → Veri modeli). API: `GET /items/:key/activity`.
- Metin farkı için hafif bir kütüphane (`diff`) yeterli; markdown'ı render etmeden satır bazında göster.
- Tasarım: `docs/DESIGN.md` + Claude Design "PBI detayı" ekranı.

## Kabul kriterleri

- [x] Bir PBI üzerinde yapılan tüm değişiklikler zaman sırasıyla, kim ve ne zaman bilgisiyle listelenir.
- [x] Body'si değiştirilmiş bir PBI'da "değişikliği göster" eski ve yeni hali eklenen/silinen satırlar renklendirilmiş halde gösterir.
- [x] PBI iptali gerekçe isteyen bir onay penceresiyle yapılır (gerekçe zorunlu); iptal edilen PBI'nın geçmişinde neden ve önceki durumu görünür, iptal geri alınabilir.
- [x] `check` kayıtları geçti/kaldı olarak ayırt edilir (renk + ikon, sadece renk değil).
- [x] 200 kayıtlı bir PBI'da geçmiş akıcı açılır (sayfalama veya sanal liste).

## Test planı

1. Seed'deki bir PBI'nın başlığını ve body'sini iki kez değiştir, iptal et → geçmişte üç düzenleme ve iptal nedeni görünmeli.
2. "Değişikliği göster" ile farkın doğru olduğunu kontrol et.

## Notlar / log

- 2026-11-06 claude:po codex'e (gpt-6.1-sol) paralel verdi.

- 2026-11-06 codex bitirdi. check (claude:po): lint · typecheck temiz · test 59/59 · build geçti · e2e 18/18 · token e2e 1/1; ekran kontrol edildi.

## Done notu
Geçmiş sekmesi: zaman çizelgesi, filtreler, satır bazlı fark, iptal gerekçesi ve geri alma, 50'şerli yükleme.
