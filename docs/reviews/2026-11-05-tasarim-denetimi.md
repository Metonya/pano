# Tasarım denetimi — 2026-11-05

Kapsam: Claude Design canvas'ındaki v0.1 ekranları (Projeler, Board, Mobil, PBI detayı, Test, Geçmiş, Proje ayarları, Dark). Yöntem: Impeccable (audit + critique, Operate modu) ve Apple HIG incelemesi. Kaynak koddan değerlendirildi, render edilmedi. Denetleyen: claude:design-review.

**Genel not:** 6.5/10. Impeccable sağlık skoru 13/20: erişilebilirlik 2/4, performans 4/4, tema 3/4, responsive 2/4, uygulama bütünlüğü 2/4.

## Yüksek öncelikli bulgular
- Kartlar klavyeyle açılamıyor; hiçbir yerde focus göstergesi yok (arama alanında `outline: none`).
- AA kontrastın altındaki metinler: kolon içindeki gri metin (~4.3), sayı rozeti (~3.9), atanan rozeti (~4.1), dark'ta birincil buton (~3.7).

## Orta öncelikli bulgular
- Özet şeridindeki 6 eşit metrik kartı kolon sayılarını tekrar ediyor (Impeccable "hero-metric" kalıbı).
- Başlık üstündeki küçük "PANO" etiketi (Impeccable'da yasak kalıp).
- Durum adları dil karışık: "In Progress / Done" ve mobilde "Devam".
- Durum seçici buton grubu olarak yapılmış; popup menü olmalı. Detay/Geçmiş geçişi tablist olmalı.
- Bazı kontroller 30–32px; mobilde 44px'in altında.
- Geçmiş ekranında diff örneğinde eski ve yeni satır aynı; ayrıca yapılmamış bir "erişilebilirlik kontrolü geçti" kaydı var.
- Sheet'te X ile kapatma macOS'a uymuyor: Esc ile kapanmalı, altta buton olmalı.

## Düşük öncelikli bulgular
Done'daki PANO-0 gerçek bir PBI değil; dolgu metinler; switch yeşil yerine accent renk olmalı; placeholder, seçim ve scrollbar temalı değil; bazı renkler token yerine doğrudan yazılmış.

## Apple yapsaydı
1. Başlık ve aksiyonlar ikonlu birleşik bir toolbar'da olurdu.
2. Reminders'taki gibi sidebar'ın tepesinde akıllı liste kutuları olurdu (Seni bekliyor, Yapılıyor, Görülmedi, Tümü).
3. Sidebar 13pt satırlı, yarı saydam materyalli olurdu.
4. Liste başlığı 40px Large Title yerine ~26pt bold olurdu.
5. Gezinirken sağda inspector paneli olurdu; sheet sadece karar anları için kullanılırdı.
6. Durum popup menüyle seçilirdi; segmented control görünüm geçişi için olurdu.
7. Kartlar daha sade olurdu: kolon arka planı yok, öncelik "!!" ile.
8. Sheet butonları macOS sırasında olurdu ve Return/Esc ile çalışırdı.
9. Dark modda sheet ve kart bir kademe açık olurdu.
10. Boş durumlar ikon, başlık ve tek satırdan oluşurdu.
