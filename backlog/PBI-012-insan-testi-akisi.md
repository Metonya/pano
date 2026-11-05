---
id: PBI-012
title: İnsan testi akışı — "Seni bekliyor", test senaryoları, onayla / geri gönder
status: backlog
assignee: -
priority: P1
created: 2026-11-05
updated: 2026-11-05
---

## Amaç

AI'ın tek başına doğrulayamadığı işler kullanıcıya açık senaryolarla gelsin; kullanıcı tek yerden "benden ne bekleniyor"u görsün, test edip onaylasın ya da notla geri göndersin.

## Kapsam

**Dahil:**

- Sidebar'da ve proje sayfasında **"Seni bekliyor"** listesi: Test'te olup kullanıcıya atanmış kartlar, sayı rozetiyle.
- PBI detay sheet'inde **Test senaryoları** bölümü: AI'ın yazdığı adımlar + beklenen sonuç; kullanıcı senaryo ekler, düzenler, siler (silinen senaryo geçmişte kalır); her senaryoya geçti/kaldı işareti.
- **Onayla** → Done (kayıt: "mert onayladı"). **Geri gönder** → In Progress, zorunlu not + isteğe bağlı ekran görüntüsü (yapıştır veya sürükle-bırak, PNG/JPG, ≤ 10 MB), atanan son AI agent'a döner.
- Proje ayarları ekranı: Test kolonu açık/kapalı, AI Done'a çekebilir mi, Definition of Done metni.
- Done kartlarında **"görülmedi"** işareti; kullanıcı kartı açınca kalkar. Proje özetinde "görülmemiş 3 tamamlanan iş".
  **Hariç:** Geri gönderilince AI'ı anında tetikleme (açık konu, `docs/product.md`).

## Bağlam

- Akış ve kurallar: `docs/product.md` → Akış, Proje ayarları.
- Veri: `test_scenarios`, `attachments`, `items.seen_at` (PBI-002). Ekler `POST /items/:key/attachments` (multipart) ile yüklenir, `PANO_DATA_DIR/attachments/` altında saklanır.
- Agent tarafı: `update_item` ile `status: test`, `assignee: mert` ve senaryolar tek çağrıda verilebilmeli; geri gönderme notu `get_item` cevabında en üstte görünmeli ki orkestratör bir sonraki kontrolünde hemen görsün.
- Tasarım: `docs/DESIGN.md` + Claude Design "PBI detayı" ekranı (Test durumundaki varyantı PBI-004'te eklenecek).

## Kabul kriterleri

- [ ] AI bir kartı senaryolarla kullanıcıya atadığında kart "Seni bekliyor" listesinde ve Test kolonunda görünür.
- [ ] Kullanıcı senaryo ekleyip düzenleyebilir; değişiklikler geçmişte görünür.
- [ ] "Onayla" kartı Done'a taşır; "Geri gönder" not olmadan gönderilemez, ekran görüntüsüyle birlikte kaydedilir ve kart In Progress'e, son AI agent'a döner.
- [ ] Geri gönderilen kartı `get_item` ile okuyan agent kullanıcının notunu ve ekin linkini ilk sırada alır.
- [ ] Test kolonu kapalı projede "Seni bekliyor" listesi ve Test kolonu görünmez.
- [ ] Görülmemiş Done kartları işaretli; açılınca işaret kalkar.
- [ ] Herhangi bir senaryo "Kaldı" ise Onayla devre dışıdır ve nedeni yazar; işaretlenmemiş senaryo onayı engellemez, sadece uyarı gösterir.
- [ ] Senaryo kaldırılabilir (geçmişte kalır); ek dosya seçici ile de eklenir ve kaldırılabilir; 10 MB üstü veya desteklenmeyen dosya açıklayıcı hata verir; yükleme hatasında not kaybolmaz.
- [ ] Proje ayarlarında Test kolonu kapatılırken Test'te kart varsa kullanıcıya sorulur: kartlar In Progress'e mi dönsün, Done'a mı alınsın; seçim geçmişe yazılır. Test kolonu kapalı ve "AI Done'a çekebilir" kapalı birlikte seçilemez (açıklama gösterilir).
- [ ] "Seni bekliyor" listesi tüm projelerdeki kullanıcıya atanmış Test kartlarını proje gruplu gösterir; Projeler ekranında her projede bekleyen test sayısı görünür.
- [ ] Playwright testi: senaryolu kart → kullanıcı geri gönderir (ekranla) → agent düzeltir → kullanıcı onaylar akışı geçer.

## Test planı

1. CLI ile bir kartı `test`'e al, sana ata, iki senaryo ekle → "Seni bekliyor"da görünmeli.
2. Bir senaryo ekle, birini kaldı işaretle, ekran görüntüsü yapıştırıp geri gönder → kart In Progress'e dönmeli.
3. CLI ile tekrar test'e al, onayla → Done ve geçmişte tüm adımlar.

## Notlar / log

## Done notu
