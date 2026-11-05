---
id: PBI-011
title: Web UI — PBI aktivite geçmişi ve değişiklik karşılaştırması
status: backlog
assignee: -
priority: P2
created: 2026-11-05
updated: 2026-11-05
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
- [ ] Bir PBI üzerinde yapılan tüm değişiklikler zaman sırasıyla, kim ve ne zaman bilgisiyle listelenir.
- [ ] Body'si değiştirilmiş bir PBI'da "değişikliği göster" eski ve yeni hali eklenen/silinen satırlar renklendirilmiş halde gösterir.
- [ ] İptal edilen PBI'nın geçmişinde iptal nedeni görünür.
- [ ] `check` kayıtları geçti/kaldı olarak ayırt edilir (renk + ikon, sadece renk değil).
- [ ] 200 kayıtlı bir PBI'da geçmiş akıcı açılır (sayfalama veya sanal liste).

## Test planı
1. Seed'deki bir PBI'nın başlığını ve body'sini iki kez değiştir, iptal et → geçmişte üç düzenleme ve iptal nedeni görünmeli.
2. "Değişikliği göster" ile farkın doğru olduğunu kontrol et.

## Notlar / log

## Done notu
