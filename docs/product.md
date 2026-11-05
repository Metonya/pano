# Pano — Ürün

> Durum: v0.1 taslağı (2026-11-05). Mimari: [architecture.md](architecture.md) · Kararlar: [../backlog/decisions.md](../backlog/decisions.md)

## Kimin için, ne için

**Tek başına proje geliştiren ve işi AI agent'lara yaptıran kişi.** Kişi işi AI'a chat'ten verir; AI PBI'ları açar, agent'lara dağıtır, ilerletir ve kapatır. Kişi Pano'ya **bakarak** projenin ne durumda olduğunu görür.

Pano bir **gözlem ve kontrol paneli**dir, iş yönetim formu değildir:

- İşi AI yönetir. Kullanıcı karta dokunmak zorunda değildir ama dokunabilir.
- Her şey kayıt altındadır: kim, ne zaman, neyi neden değiştirdi.
- Pano agent çalıştırmaz. Sadece takip eder; agent'lar MCP, CLI veya REST ile Pano'yu günceller.

## Kullanıcının cevap alması gereken sorular

| Soru | Pano'da nerede |
|---|---|
| Proje ne aşamada? Ne zaman başladım, kaç iş kaldı? | Proje özeti: başlangıç tarihi, açık/kapalı sayıları, öncelik dağılımı |
| Şu an ne yapılıyor, hangi agent'ta? | Board: In Progress kartları ve atanan agent |
| Benden ne bekleniyor? | "Seni bekliyor" listesi: sana atanmış Test kartları |
| Bitenlere baktım mı? | Done kartlarında "görülmedi" işareti |
| Bu iş nasıl değişti? Büyüdü mü, iptal mi oldu? | Kartın aktivite geçmişi: her değişikliğin eski ve yeni hali |

## Akış

```
Backlog → In Progress → (Test) → Done
                 ↑          │
                 └─ geri gönder (not + ekran görüntüsü)
İptal: her aşamadan; kart silinmez, "İptal edilenler" filtresinde kalır.
```

- **AI kendi testini In Progress içinde yapar.** Unit test, build, lint, kendi fonksiyonel kontrolü (hangi araçla yapacağına kendi karar verir). Sonuçlar kartta **check** kaydı olarak görünür ("unit test: 42/42 geçti"). Başarısız testler kartı kolonlar arasında gidip gelmez; kayıt olarak düşer.
- **Test kolonu = insanın doğrulaması.** AI, kendi doğrulayamadığı veya kullanıcının görmesi gereken işleri (UI, his, iş kuralı) test senaryolarıyla birlikte kullanıcıya atar ve chat'te "PANO-12 testte seni bekliyor" der.
- **Kullanıcı:** senaryoları ekler/çıkarır/düzenler; "Onayla" → Done, "Geri gönder" → In Progress (not ve ekran görüntüsüyle). Bu tek bir hareket ve tek bir kayıt olur.
- **Varsayılan:** AI basit ve insan testi gerektirmeyen işleri kendisi Done'a çeker.

### Proje ayarları (sade)

| Ayar | Varsayılan |
|---|---|
| Test kolonu açık | Açık (kapatılırsa AI her işi kendi testiyle kapatır) |
| AI işi Done'a çekebilir | Evet (insan testi gerekmeyen işler için) |
| Tamamlanma tanımı (Definition of Done) | Serbest metin + madde listesi, ör. "unit test var, lint temiz, CI yeşil". Projeden projeye değişir (Sonar, pipeline vb.); Pano sadece kaydeder ve AI'a gösterir |

## Agent'lar

- **Orkestratör (ana agent)** iş yapmaz; PBI açar, agent'lara dağıtır, sonucu doğrular, kartları günceller.
- **Alt agent'lar** (`claude:<ad>`, `codex`) işi yapar; atama alanında görünür.
- Kullanıcının UI'dan yaptığı atama ("codex'e ver") sadece bir **talep kaydı**dır; orkestratör bir sonraki kontrolünde görür ve uygular.

## Açık konular (bilerek sonraya bırakıldı)

- Kullanıcı kartı geri gönderince AI'ın anında haberdar olması (`pano watch`, webhook). v0.1'de orkestratör bir sonraki oturumda/kontrolde görür.
- Proje kararları ve dokümanlarının Pano'daki yeri (repo'da mı kalsın, Pano'da mı görünsün).
- Ürün tanıtım sayfası (GitHub Pages).
- Çok kullanıcı / takım kullanımı.
