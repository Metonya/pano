# Pano: Tasarım sistemi

> Durum: v0.1, onaylandı (2026-11-06, Mert). Ekranlar: [Claude Design canvas](https://claude.ai/artifact/CGbiEtLAeiTVBijmAw7SvK) · Ürün: [product.md](product.md) · Denetim: [reviews/2026-11-05-tasarim-denetimi.md](reviews/2026-11-05-tasarim-denetimi.md)
>
> Bu dosya tek başına yeterli olmalı: UI'ı kuran agent buradaki token'lar ve kurallar dışında bir değer uydurmaz. Değer yoksa sorar, yeni bir değer eklerse bu dosyayı da günceller.

Hedef stack: React + Vite + Tailwind v4 + shadcn/ui + lucide-react.

## 1. İlkeler

1. **Operate modu.** Pano bir iş aracıdır: taranabilirlik, tutarlılık ve tanıdık macOS kalıpları, ifade gücünden önce gelir. Marka küçük detaylarda yaşar.
2. **macOS hissi.** Sol sidebar, ince yarı saydam toolbar, ortada açılan sheet, tek accent rengi (Apple mavisi), sistem fontu.
3. **Sadece kritik bilgi.** Kullanıcının sürekli bakmadığı bilgi ekranda durmaz; ayrıntıya bir tıkla ulaşılır. Tekrar eden metrik kutuları yoktur.
4. **İşi AI yapar, kontrol kullanıcıdadır.** Kullanıcıdan bir şey bekleniyorsa (Test) en görünür sinyal odur: turuncu "Seni bekliyor".
5. **Hiyerarşi:** boşluk > ağırlık > boyut > renk. Bir ekranda tek birincil aksiyon.
6. **Erişilebilir, çizildiği gibi.** Gerçek `<button>`/`<a>`/`<input>`, görünür focus, AA kontrast, sadece renkle anlam yok, mobilde 44px dokunma alanı.

## 2. Token'lar

### Renkler

| Token                            | Light                                                         | Dark                                                          | Kullanım                                                                   |
| -------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `bg`                             | `#f5f5f7`                                                     | `#000000`                                                     | Sayfa zemini                                                               |
| `sidebar`                        | `#fbfbfd`                                                     | `#161617`                                                     | Sidebar zemini                                                             |
| `toolbar`                        | `rgba(245,245,247,0.82)`                                      | `rgba(0,0,0,0.72)`                                            | Toolbar, `backdrop-filter: saturate(180%) blur(20px)` ile                  |
| `card`                           | `#ffffff`                                                     | `#1c1c1e`                                                     | Kart, input zemini                                                         |
| `sheet`                          | `#ffffff`                                                     | `#2c2c2e`                                                     | Sheet/dialog (dark'ta bir kademe açık)                                     |
| `window`                         | `#f5f5f7`                                                     | `#1c1c1e`                                                     | Uygulama ayarları penceresi                                                |
| `text`                           | `#1d1d1f`                                                     | `#f5f5f7`                                                     | Ana metin                                                                  |
| `muted`                          | `#636366`                                                     | `#a1a1a6`                                                     | İkincil metin, ikonlar                                                     |
| `placeholder`                    | `#636366`                                                     | `#aeaeb2`                                                     | Input/textarea placeholder (temaya duyarlı; tek etiket olarak kullanılmaz) |
| `skeleton`                       | `rgba(0,0,0,0.07)`                                            | `rgba(255,255,255,0.10)`                                      | Yükleme iskeleti çubukları                                                 |
| `notice-bg`                      | `rgba(0,0,0,0.035)`                                           | `rgba(255,255,255,0.04)`                                      | Bağlantı şeridi zemini (sakin, uyarı rengi değil)                          |
| `tooltip-bg` / `tooltip-fg`      | `#1d1d1f` / `#ffffff`                                         | `#f5f5f7` / `#1d1d1f`                                         | İpucu baloncuğu                                                            |
| `line`                           | `rgba(0,0,0,0.08)`                                            | `rgba(255,255,255,0.10)`                                      | Kenarlık, ayraç (ayarlar penceresinde 0.10 / 0.12)                         |
| `field`                          | `rgba(0,0,0,0.05)`                                            | `rgba(255,255,255,0.08)`                                      | Segment zemini, sayı rozeti, kod bloğu                                     |
| `track`                          | `rgba(0,0,0,0.08)`                                            | `rgba(255,255,255,0.12)`                                      | İlerleme çubuğu zemini                                                     |
| `primary`                        | `#0071e3`                                                     | `#0071e3`                                                     | Birincil buton zemini, switch açık, avatar (beyaz metinle)                 |
| `accent`                         | `#0071e3`                                                     | `#0a84ff`                                                     | Görülmedi noktası, In Progress noktası, link-buton                         |
| `accent-text`                    | `#0058b0`                                                     | `#4da3ff`                                                     | Açık mavi zemin üstündeki metin, link                                      |
| `accent-soft`                    | `rgba(0,113,227,0.10)`                                        | `rgba(10,132,255,0.18)`                                       | Assignee chip, aktif sidebar öğesi, bilgi bandı                            |
| `active-border`                  | `rgba(0,113,227,0.35)`                                        | `rgba(10,132,255,0.55)`                                       | Üzerinde çalışılan (In Progress) kartın kenarlığı                          |
| `focus`                          | `#0071e3`                                                     | `#0a84ff`                                                     | `:focus-visible` halkası                                                   |
| `selection`                      | `rgba(0,113,227,0.22)`                                        | `rgba(10,132,255,0.30)`                                       | `::selection`                                                              |
| `p1` / `p1-bg`                   | `#d70015` / `rgba(215,0,21,0.08)`                             | `#ff6961` / `rgba(255,105,97,0.15)`                           | Yüksek öncelik                                                                 |
| `wait` / `wait-bg` / `wait-line` | `#8a4b00` / `rgba(255,159,10,0.14)` / `rgba(255,159,10,0.35)` | `#ffb340` / `rgba(255,159,10,0.18)` / `rgba(255,159,10,0.40)` | "Seni bekliyor", Test durumu                                               |
| `on-wait`                        | `#ffffff`                                                     | `#1c1c1e`                                                     | `wait` zeminli sayı rozetindeki metin                                      |
| `star`                           | `#ff9f0a`                                                     | `#ffb340`                                                     | Yıldız (sadece ikon, metin değil)                                          |
| `success` / `success-bg`         | `#1c6e30` / `rgba(52,199,89,0.14)`                            | `#30d158` / `rgba(48,209,88,0.16)`                            | Geçti, check kayıtları, "Pano güncel"                                      |
| `progress`                       | `#248a3d`                                                     | `#30d158`                                                     | İlerleme çubuğu dolgusu, Done noktası                                      |
| `danger`                         | `#c4001a`                                                     | `#ff6961`                                                     | Yıkıcı buton metni ("PBI'yı iptal et…")                                    |
| `fail` / `fail-bg`               | `#b8001a` / `rgba(255,59,48,0.10)`                            | `#ff6961` / `rgba(255,105,97,0.16)`                           | Kaldı                                                                      |
| `diff-del` / `diff-del-bg`       | `#9e0016` / `rgba(255,59,48,0.08)`                            | `#ff8a84` / `rgba(255,105,97,0.14)`                           | Diff'te silinen satır                                                      |
| `diff-add` / `diff-add-bg`       | `#1c6e30` / `rgba(52,199,89,0.12)`                            | `#4cd964` / `rgba(48,209,88,0.14)`                            | Diff'te eklenen satır                                                      |
| `scrim`                          | `rgba(0,0,0,0.30)`                                            | `rgba(0,0,0,0.60)`                                            | Sheet arkası                                                               |
| `shadow-card`                    | `0 1px 2px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.04)`     | `none`                                                        | Kart                                                                       |
| `shadow-sheet`                   | `0 30px 90px rgba(0,0,0,0.30)`                                | aynı                                                          | Sheet                                                                      |

Durum noktaları: Backlog `muted`, In Progress `accent`, Test `star`/turuncu `#ff9f0a`, Done `progress`.

### Kontrast

Hesaplanan çiftler (WCAG 2.x, hepsi ≥ 4.5:1 hedefli):

- `muted #636366` / `bg #f5f5f7` ≈ 5.4 · / `card #fff` ≈ 5.9
- Beyaz / `primary #0071e3` ≈ 4.6 (light ve dark'ta aynı buton zemini bu yüzden)
- `accent-text #0058b0` / `accent-soft` (beyaz üstünde) ≈ 6.0
- `wait #8a4b00` / `wait-bg` (beyaz üstünde) ≈ 5.6
- `p1 #d70015` / `p1-bg` ≈ 5.2
- `success #1c6e30` / `success-bg` ≈ 5.9
- Dark: `muted #a1a1a6` / `card #1c1c1e` ≈ 6.7 · `accent-text #4da3ff` / `#1c1c1e` ≈ 6.3
- Placeholder: light `#636366` / `field` (beyaz üstünde ≈ `#f2f2f2`) ≈ 5.4 · dark `#aeaeb2` / `field` (sheet `#2c2c2e` üstünde ≈ `#3a3a3c`) ≈ 5.1. Eski `#636366` dark sheet alanında 1.8'di (Codex incelemesi).

> Öncelik: **Yüksek / Orta / Düşük** (API: `high/medium/low`). Yalnız Yüksek `p1`/`p1-bg` renkli rozet kullanır. Orta ve Düşük sade 12px `muted` metindir; kartta varsayılan Orta gösterilmez, Düşük gösterilir. Yeni renk çifti eklersen kontrastını hesapla ve buraya yaz.

### CSS değişkenleri

```css
:root {
  --bg: #f5f5f7;
  --sidebar: #fbfbfd;
  --toolbar: rgba(245, 245, 247, 0.82);
  --card: #ffffff;
  --sheet: #ffffff;
  --window: #f5f5f7;
  --text: #1d1d1f;
  --muted: #636366;
  --line: rgba(0, 0, 0, 0.08);
  --placeholder: #636366;
  --skeleton: rgba(0, 0, 0, 0.07);
  --notice-bg: rgba(0, 0, 0, 0.035);
  --tooltip-bg: #1d1d1f;
  --tooltip-fg: #ffffff;
  --field: rgba(0, 0, 0, 0.05);
  --track: rgba(0, 0, 0, 0.08);
  --primary: #0071e3;
  --accent: #0071e3;
  --accent-text: #0058b0;
  --accent-soft: rgba(0, 113, 227, 0.1);
  --active-border: rgba(0, 113, 227, 0.35);
  --focus: #0071e3;
  --selection: rgba(0, 113, 227, 0.22);
  --p1: #d70015;
  --p1-bg: rgba(215, 0, 21, 0.08);
  --wait: #8a4b00;
  --wait-bg: rgba(255, 159, 10, 0.14);
  --wait-line: rgba(255, 159, 10, 0.35);
  --on-wait: #ffffff;
  --star: #ff9f0a;
  --progress: #248a3d;
  --success: #1c6e30;
  --success-bg: rgba(52, 199, 89, 0.14);
  --danger: #c4001a;
  --fail: #b8001a;
  --fail-bg: rgba(255, 59, 48, 0.1);
  --diff-del: #9e0016;
  --diff-del-bg: rgba(255, 59, 48, 0.08);
  --diff-add: #1c6e30;
  --diff-add-bg: rgba(52, 199, 89, 0.12);
  --scrim: rgba(0, 0, 0, 0.3);
  --shadow-card: 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 14px rgba(0, 0, 0, 0.04);
  --shadow-sheet: 0 30px 90px rgba(0, 0, 0, 0.3);
  color-scheme: light;
}

/* Koyu tema: kullanıcı "Koyu" seçtiyse */
:root[data-theme="dark"] {
  /* aşağıdaki blokla aynı değerler */
}

/* "Otomatik": data-theme yoksa veya "auto" ise sistemi takip eder */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* aşağıdaki değerler */
  }
}

/* Dark değerleri (iki seçiciye de uygulanır) */
:root[data-theme="dark"] {
  --bg: #000000;
  --sidebar: #161617;
  --toolbar: rgba(0, 0, 0, 0.72);
  --card: #1c1c1e;
  --sheet: #2c2c2e;
  --window: #1c1c1e;
  --text: #f5f5f7;
  --muted: #a1a1a6;
  --line: rgba(255, 255, 255, 0.1);
  --placeholder: #aeaeb2;
  --skeleton: rgba(255, 255, 255, 0.1);
  --notice-bg: rgba(255, 255, 255, 0.04);
  --tooltip-bg: #f5f5f7;
  --tooltip-fg: #1d1d1f;
  --field: rgba(255, 255, 255, 0.08);
  --track: rgba(255, 255, 255, 0.12);
  --primary: #0071e3;
  --accent: #0a84ff;
  --accent-text: #4da3ff;
  --accent-soft: rgba(10, 132, 255, 0.18);
  --active-border: rgba(10, 132, 255, 0.55);
  --focus: #0a84ff;
  --selection: rgba(10, 132, 255, 0.3);
  --p1: #ff6961;
  --p1-bg: rgba(255, 105, 97, 0.15);
  --wait: #ffb340;
  --wait-bg: rgba(255, 159, 10, 0.18);
  --wait-line: rgba(255, 159, 10, 0.4);
  --on-wait: #1c1c1e;
  --star: #ffb340;
  --progress: #30d158;
  --success: #30d158;
  --success-bg: rgba(48, 209, 88, 0.16);
  --danger: #ff6961;
  --fail: #ff6961;
  --fail-bg: rgba(255, 105, 97, 0.16);
  --diff-del: #ff8a84;
  --diff-del-bg: rgba(255, 105, 97, 0.14);
  --diff-add: #4cd964;
  --diff-add-bg: rgba(48, 209, 88, 0.14);
  --scrim: rgba(0, 0, 0, 0.6);
  --shadow-card: none;
  color-scheme: dark;
}
```

Uygulamada dark değerlerini tek bir kaynakta tut (ör. `tokens.css` içinde bir mixin veya build adımı) ve hem `[data-theme="dark"]` hem `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` seçicisine uygula. Tema `localStorage`'dan `<head>` içindeki küçük bir inline script ile ilk boyamadan önce okunur (yanıp sönme yok).

### Tailwind v4 eşlemesi

```css
@import "tailwindcss";
@theme inline {
  --color-bg: var(--bg); --color-sidebar: var(--sidebar); --color-toolbar: var(--toolbar);
  --color-card: var(--card); --color-sheet: var(--sheet);
  --color-fg: var(--text); --color-muted: var(--muted); --color-line: var(--line);
  --color-field: var(--field); --color-track: var(--track);
  --color-primary: var(--primary); --color-accent: var(--accent);
  --color-accent-text: var(--accent-text); --color-accent-soft: var(--accent-soft);
  --color-p1: var(--p1); --color-p1-bg: var(--p1-bg);
  --color-wait: var(--wait); --color-wait-bg: var(--wait-bg);
  --color-star: var(--star); --color-progress: var(--progress);
  --color-success: var(--success); --color-success-bg: var(--success-bg);
  --color-danger: var(--danger); --color-fail: var(--fail); --color-fail-bg: var(--fail-bg);
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, monospace;
  --radius-sm: 8px; --radius-md: 10px; --radius-lg: 12px; --radius-xl: 16px; --radius-sheet: 24px;
  --shadow-card: var(--shadow-card); --shadow-sheet: var(--shadow-sheet);
}
```

shadcn token'ları bunlara bağlanır: `--background → --bg`, `--foreground → --text`, `--card → --card`, `--popover → --sheet`, `--primary → --primary` (`--primary-foreground: #fff`), `--muted-foreground → --muted`, `--border`/`--input → --line`, `--ring → --focus`, `--destructive → --danger`, `--radius: 10px`.

## 3. Tipografi

Font: `-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif` (macOS'ta SF, diğerlerinde Inter; Inter `400/500/600/700` yüklenir). Kod ve yol: `ui-monospace, "SF Mono", Menlo, monospace`, 12px. `-webkit-font-smoothing: antialiased`.

| Rol                          | Boyut / ağırlık                      | Satır    | Letter-spacing | Nerede                                        |
| ---------------------------- | ------------------------------------ | -------- | -------------- | --------------------------------------------- |
| Toolbar başlığı              | 26 / 700                             | 1.25     | −0.025em       | Board, Projeler toolbar'ı                     |
| Sheet başlığı                | 24 / 700                             | 1.25     | −0.02em        | Dialog başlığı                                |
| Marka                        | 19 / 600                             | 1        | −0.02em        | Sidebar'daki "Pano"                           |
| Mobil başlık                 | 34 / 700                             | 1.1      | −0.03em        | Sadece mobil (iOS Large Title)                |
| Kart başlığı / bölüm başlığı | 15 / 600                             | 1.35     | −0.01em        | Kart `h3`, kolon `h2`, sheet bölüm `h3`       |
| Gövde                        | 15 / 400                             | 1.45–1.6 | 0              | Sheet içeriği, senaryo adımı, zaman çizelgesi |
| Liste / sidebar              | 14 / 500                             | -        | 0              | Sidebar öğeleri, ikincil butonlar             |
| Küçük metin / buton          | 13 / 500–600                         | 1.45     | 0              | Toolbar butonu, segment, özet satırı, meta    |
| Caption                      | 12 / 600 (anahtar) veya 400 (yardım) | -        | 0              | PBI anahtarı, öncelik rozeti, yardım metni    |

Sayılar (PBI anahtarı, kolon sayısı, kriter ilerlemesi `1/3`, saat) `font-variant-numeric: tabular-nums`. 12px altı metin yok (avatar harfi 9–10px, `aria-hidden`; mobil segment etiketi 11px istisna).

## 4. Boşluk, radius, boyut

- **Ritim:** 4/8. Kullanılan aralıklar: 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32.
- **Sidebar:** `flex: 1 1 260px; max-width: 280px`, padding `28px 18px`, bölüm arası 26px, öğe yüksekliği 40px ("Seni bekliyor" 44px).
- **Toolbar:** 52px, padding `0 16px 0 28px`, `position: sticky; top: 0`, alt kenarda `1px solid var(--line)`.
- **İçerik:** padding `18px 28px 56px`, bloklar arası 22px.
- **Board kolonu:** 4 kolon `repeat(4, minmax(0,1fr))`, gap 20px, `min-width: 960px` (dar ekranda yatay kaydırma kutusu). Kolon içi kart arası 12px. Kolon arka planı yok.
- **Kart:** padding `16px 18px`, iç gap 10px, radius 16px, kenarlık `1px solid var(--line)` (In Progress kartı `--active-border`).
- **Sheet:** `max-width: 760px`, radius 24px, üstten 64px boşluk, başlık bölümü padding `28px 32px 20px`, içerik bölümleri `14–16px 32px`, footer padding `18px 32px`.

| Kontrol                 | Masaüstü                                              | Mobil                |
| ----------------------- | ----------------------------------------------------- | -------------------- |
| Toolbar ikon butonu     | 36×32, radius 8                                       | 44×44, radius 22     |
| Toolbar birincil butonu | 32, padding `0 12px 0 10px`, radius 8                 | 44 daire (ikon)      |
| Sheet footer butonu     | 36, padding `0 14–18px`, radius 10                    | ≥44                  |
| Durum popup / segment   | 30–32, radius 8 (segment zemini radius 10, padding 3) | 52px segment (radius 12) |
| Geçti/Kaldı             | 32, radius 8                                          | ≥44                  |
| Rozet (öncelik)         | 20–22, radius 10–11                                   | aynı                 |
| Assignee chip           | 24 (kartta), 28 (sheet), radius tam                   | 26                   |
| Switch                  | 38×22, topuz 18                                       | aynı, satır ≥44      |

Radius ölçeği: 6 (focus halkası), 8 (küçük kontrol), 10 (buton, segment), 12 (alan, liste kutusu), 14 (senaryo satırı), 16 (kart), 20 (proje kartı), 24 (sheet), tam (pill, chip, avatar).

## 5. Layout

```
┌ sidebar 260–280 ┬ toolbar 52 (sticky, translucent) ───────────────┐
│ Pano            │ Proje adı ★                 ⫶ filtre  🔍  [+ Yeni PBI] │
│ Seni bekliyor 1 ├────────────────────────────────────────────────┤
│ Projeler        │ özet satırı (ilerleme · kalan · başlangıç · yüksek) │
│ Agent'lar       │ Backlog │ In Progress │ Test │ Done            │
│ …               │  kartlar …                                      │
│ Arşiv · Ayarlar │                                                 │
└─────────────────┴────────────────────────────────────────────────┘
```

- Kök: `display: flex; flex-wrap: wrap`. Sidebar `flex: 1 1 260px`, içerik `flex: 999 1 560px; min-width: 0` (dar ekranda sidebar üste geçer).
- **Masaüstünde kabuk ekrana sığar (100dvh):** board'da sayfa kaymaz, üst bar ve özet sabittir, yalnız kolonlar kendi içinde kayar. Diğer sayfalar içerik alanında kayar. 700px altında normal sayfa kaydırması.
- **Sayfa hiçbir genişlikte yatay kaymaz.** Sadece board grid'i kendi `overflow-x: auto` kutusunda kayar.
- **Mobil (< 640px):** toolbar yerine iOS tarzı üst bölüm (geri linki "Projeler", ikon butonlar, 34px başlık, özet satırı, turuncu "Seni bekliyor" satırı). Kolon görünümü tam genişlikte dört eşit segmenttir (`role="tablist"`, `grid-template-columns: repeat(4, minmax(0, 1fr))`): 390px ekranda 358×52px; üstte 17/600 sayı, altta 11px Backlog / In Progress / Test / Done etiketi (`white-space: nowrap`). Seçili segment light temada beyaz `card` zemindir; altında seçili kolonun kartları tek sütun. Kenar boşluğu 16px.
- Proje ayarları ve PBI detayı board'un üstünde sheet; uygulama ayarları bulunulan sayfanın üstünde açılan macOS Settings penceresi; `/settings` adresi de bunu açar (720 geniş, üstte ikonlu sekmeler).

## 6. Component kuralları

**Logo:** Pano logosu üç kolonlu bir board ikonudur.

Her bileşende: gerçek HTML elemanı, `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; border-radius: 6px }`, `outline: none` hiçbir yerde yok.

**Sidebar öğesi**: `<a>`; ikon (18px lucide veya 22px renkli proje karesi, radius 6) + ad + sağda sayı (12px, tabular). Aktif: `accent-soft` zemin, `accent-text` metin, `aria-current="page"`. "Seni bekliyor": `wait-bg` zemin, `wait` metin, sayı rozeti `wait` zemin / `on-wait` metin; proje listesinin üstünde. Tek "Projeler" listesi vardır: yıldızlılar üstte; satırda sağa yaslı yıldız butonu (yıldızlıda dolu ve hep görünür, yıldızsızda hover/focus'ta boş), tıklama projeye gitmez. Bölüm başlığı 12/600 `muted`. _shadcn:_ `Sidebar` (menu button) veya düz liste.

**Toolbar ve ikon buton**: `role="toolbar"` + `aria-label`. Solda `h1` (26/700) + yıldız toggle (`aria-pressed`), boşluk, sağda ikon butonlar (filtre, arama, proje ayarları) ve birincil buton. İkon butonlarda `aria-label` zorunlu. Filtre menüsü: atanan, öncelik, "İptal edilenleri göster" (checkbox item), aktifken "Filtreyi temizle"; seçim menüyü kapatmaz, aktif filtre ikonda sayı rozetiyle görünür. Arama ikonu tıklanınca alana açılır; boşken odak kaybında ve Esc ile kapanır. _shadcn:_ `Button variant="ghost" size="icon"`, `DropdownMenu`.

**Butonlar ve sheet footer sırası**: Birincil: `primary` zemin, beyaz, 600. İkincil: şeffaf, `1px line` kenarlık, `text`. Yıkıcı: şeffaf, `line` kenarlık, `danger` metin, sonu "…" (onay ister). Footer sırası macOS: **solda yıkıcı/ikincil işlem, sağda "Vazgeç" + varsayılan (birincil)**. Örnekler: `Geri gönder | Vazgeç  Onayla`, `Projeyi arşivle | Vazgeç  Kaydet`. Progress detayında footer yoktur; kapatma header X veya Esc ile, "PBI'yı iptal et…" header’daki "Diğer işlemler" (…) menüsündedir. Test ve ayarlar footer’ları kalır. Return varsayılanı, Esc vazgeçi tetikler. Bir ekranda tek birincil. _shadcn:_ `Button` (default/outline/ghost, destructive yerine outline + danger metin).

**PBI kartı**: `<article>`; başlık `<h3><a href>` (kart detayı açar; tüm kart değil başlık link'tir, focus halkası başlıkta).

- Üst satır: numara (12/600 `muted`, tabular; proje içinde `#4`) · Yüksek rozeti (`p1-bg`/`p1`); Orta gizli, Düşük sade 12px `muted` metin · sağda görülmedi noktası.
- **Görülmedi noktası:** 8×8 `accent` daire, metin yok; 24×24 odaklanabilir `<button aria-label="Görülmedi, açınca kalkar">` içinde. Odak veya hover'da ipucu baloncuğu (`role="tooltip"`, `tooltip-bg`/`tooltip-fg`, 12/500, radius 8): "Görülmedi, açınca kalkar". Kural: kullanıcı kartı açınca kalkar; kart Done'dan çıkıp yeniden Done olursa tekrar görünür. _shadcn:_ `Tooltip`.
- Alt satır: assignee chip (`accent-soft` zemin, `accent-text` metin, 16px `primary` avatar + baş harf, `aria-hidden` avatar) · kriter ilerlemesi (4px çubuk `track`/`progress`, `aria-hidden`; yanında metin `1/3`).
- Test'te kullanıcıyı bekleyen kart: `wait-line` kenarlık + "Seni bekliyor" rozeti (`wait-bg`/`wait`, metinli). In Progress'teki kart: `active-border`.
- Durumlar: hover'da `translateY(-1px)` + biraz daha belirgin gölge; basılıyken `scale(0.985)`; sürüklenirken gölge `shadow-sheet`'in hafifi.
- Klavye: başlık link'iyle açılır; taşıma için dnd-kit klavye sensörü (Space tut, oklar, Space bırak) + kart menüsünde "Taşı…" alternatifi.

**Kolon başlığı**: 8px durum noktası (`aria-hidden`) + `h2` (15/600) + sayı rozeti (22px, `field` zemin, `muted`, 12/600, tabular). Altında "Ekle" ghost butonu (40px). Çok kart varsa "N PBI daha" ikincil buton.

**Özet satırı:** toolbar altında tek `<button aria-haspopup="dialog">`: 160×4 ilerleme çubuğu + metin `**1 / 14 tamamlandı** · 13 kaldı · 5 Kas'ta başladı · 6 yüksek öncelikli · Son güncelleme 2 dk önce` (13px `muted`, ilk parça 600 `text`, süreler tabular) + küçük chevron. Tıklayınca yaklaşık 360px, ekranın kullanılabilir yüksekliğinde kaydırılabilen popover: iptal sayısı, son 7 gün, önceliğe göre kalan ve açılıştan bugüne günlük ilerleme. 180 günden uzun projelerde ilk ve son gün dahil en fazla 180 eşit aralıklı örnek gösterilir. Grafik başlıksız, legendsız ve eksensiz iki basamaklı alandır: arkada `track` toplam iş, önde `progress` biten iş, aradaki alan kalan iştir. 320×160 SVG içinde çizim x=8..216, y=48..144; sağdaki 12px tabular doğrudan etiketler `28 iş` (`muted`) ve `25 bitti` (`success`, 600), en az 20 birim aralıklı. Etiketler dolgu dışında AA kontrastla okunur. Altta seçili dilin `Intl` biçiminde açılış tarihi ve sağda “Bugün” bulunur; günlük veri UTC günlerini temsil eder. Fare ve dokunma en yakın örnekte dikey `text` çizgisi ve üstte sabit, ortalı `tooltip-bg`/`tooltip-fg` baloncuğu gösterir: `6 Kas · 25 / 28 bitti`. Odaklanabilir grafikte sol/sağ ok örnekler arasında ilerler, seçim `aria-live` ile okunur; SVG `role="img"` ve özet etiketi taşır. Baloncuk yalnız opacity ile 120ms geçiş yapar, reduced-motion'da geçiş kapalıdır. İki günden az veride grafik yerine “Bugün açıldı, 5 iş tamamlandı”, sıfır tamamlananda “Bugün açıldı, henüz tamamlanan iş yok” gösterilir; boş proje açıklaması korunur. Kutu/kart yok. _shadcn:_ `Popover`.

**Veri yaşı**: "Son güncelleme N dk önce" özet satırında; SSE ile her olayda sıfırlanır. Sidebar Agent'lar satırı: nokta + ad + sağda `#4 · 3 dk önce` (iş + son kayıttan geçen süre). 30 dk'dan uzun kayıt yoksa satır `muted` noktayla "35 dk'dır sessiz" der; uyarı rengi kullanılmaz, "takıldı" denmez (kesin bilgi değil).

**Bağlantı şeridi**: sunucuya ulaşılamazsa toolbar'ın hemen altında tam genişlik, 40px, `notice-bg` zemin, alt `line` kenarlık, `role="status"`: wifi-off ikonu (`muted`) + "Sunucuya bağlanılamıyor: gösterilen veri 5 dk önceki." + sağda "Tekrar dene" ikincil buton (28px). Kırmızı/turuncu değil; içerik görünür kalır. Bağlantı gelince kendiliğinden kalkar.

**Sheet (PBI detayı)**: _shadcn `Dialog`_ (shadcn `Sheet` kenardan kayar, burada **kullanılmaz**). `role="dialog" aria-modal="true" aria-labelledby`. Scrim `--scrim`; toolbar ve sidebar dahil tüm sayfayı örter (overlay `z-index: 10`, toolbar `2`). Başlık bölümü: anahtar + öncelik + sağda `Detay | Geçmiş · N` (`role="tablist"`, segment görünümü) + kapat X (36px, `aria-label="Kapat"`), `h2` başlık (24/700), altında durum popup'ı. Başlık tıklanınca yerinde düzenlenir.

- **Özellik satırı (2026-11-06):** başlığın altında Durum, Öncelik, Atanan popup menüleri ile Kabul kriterleri sayısı ve Güncellendi tek satırdadır. Uzun açıklama kısaltılır, "Tümünü göster" ile açılır. Test'teki kart durum menüsünden In Progress'e alınırsa geri gönderme notu açılır.
- **Durum popup'ı:** `<button aria-haspopup="menu">In Progress ▾</button>` (32px, `line` kenarlık, 14/600); menüde Backlog, In Progress, Test (proje ayarında kapalıysa yok), Done. İptal durum popup’ında yer almaz; header’daki "Diğer işlemler" (…) menüsündedir. _shadcn:_ `DropdownMenu` + `DropdownMenuRadioGroup`.
- Progress meta satırı: üç eşit sütunlu grid, `align-items: start`; 12px `muted` etiketler 16px satır yüksekliğiyle aynı hizada; 15px değerler ve atanan chip’i 24px satır yüksekliğiyle aynı hizada. Kabul kriterleri: `padding: 6px 0`, `min-height: 36px`, `box-sizing: border-box`, satır ayıracı yok.
- Modlar: **Detay** (meta: atanan, kriterler, güncellenme; Amaç; Kabul kriterleri checkbox listesi; son kayıtlar + "Tüm geçmişi göster"), **Test** (aşağıda), **Geçmiş** (aşağıda), **Proje ayarları** (aşağıda).

**Test modu ve senaryo satırı**: üstte `wait-bg` bilgi bandı: "Claude · PO bu işi test etmeni istiyor". Senaryo satırı: 14px radius kutu, `line` kenarlık, padding `14px 16px`; numara · adım (15px) + altında beklenen metin (13px `muted`, görünür etiket yok) · `role="group" aria-label="Senaryo N sonucu"` içinde iki `aria-pressed` buton **Geçti** (✓ ikon + metin, seçiliyken `success-bg`/`success`) ve **Kaldı** (✕ ikon + metin, `fail-bg`/`fail`) · `…` menüsü (Düzenle, Sil…). Düzenleme kartın içinde açılır, silme satır içi onay ister. Kaldı işaretlenince kartta "Ne oldu?" notu açılır. Altında "Senaryo ekle" accent ghost butonu. "AI'ın kendi testleri": check rozetleri (30px pill, `success-bg`/`success`, ✓ ikon + metin, ör. "Unit 18/18 geçti"). _shadcn:_ `ToggleGroup type="single"`.

**Onay kuralı (Test footer'ı)**: Herhangi bir senaryo **Kaldı** ise: "Onayla" `aria-disabled="true"` (şeffaf, `line` kenarlık, `muted` metin, `cursor: not-allowed`, `aria-describedby` ile nedene bağlı) ve **"Geri gönder" varsayılan/birincil** olur. Neden footer'ın solunda: ünlem ikonu + `fail` renkli 13/600 "1 senaryo kaldı: onaylamak için düzelt veya geri gönder". İşaretlenmemiş senaryo onayı engellemez; altında `muted` bilgi "1 senaryo işaretlenmedi". Kaldı yoksa: solda "Geri gönder" ikincil, sağda "Vazgeç" + "Onayla" birincil. Footer: `[neden/bilgi] … Vazgeç · Onayla · Geri gönder(birincil)`.

**Geri gönderme formu + ekran görüntüsü**: "Geri gönder"e basılınca altta açılır; kalan senaryolar ve notları özetlenir, senaryo notu varsa genel not zorunlu değildir. Birden çok ekran görüntüsü eklenir, her biri küçük resimle görünür ve tek tek kaldırılır. `<label for>` "Geri gönderme notu (zorunlu)" + `textarea required aria-required` (12px radius, `field` zemin, 15px, placeholder "Ne düzeltilmeli?") + altında 13px `muted` yardım: "Claude · PO bir sonraki kontrolde görecek. Not ve ekler tek kayıt olarak geçmişe yazılır." Ekler: küçük resim (120×84, 12px radius, dosya adı · boyut) sağ üstte 24px "Kaldır" ikon butonu (`aria-label="hata.png ekini kaldır"`); bırakma kutusu dashed `line` kenarlık, "Ekran görüntüsünü yapıştır, sürükle veya" + görünür **"Dosya seç…"** butonu (gizli `<input type="file" accept="image/png,image/jpeg">`) + "PNG veya JPG, en fazla 10 MB". Not boşken gönderilmeye çalışılırsa alan altında `fail` renkli hata; yükleme hatası ekin altında yazılır, not kaybolmaz.

**Aktivite zaman çizelgesi ve diff**: Kayıtlar güne göre gruplanır (12/600 `muted` gün başlığı, her gün bir `<ol>`); her `<li>`: solda 10px nokta + dikey çizgi (`aria-hidden`), sağda tek satır olay (14px, aktör 600) ve sağa yaslı saat (12px `muted`). Statü geçişi renkli istasyon rozetleriyle okunur: `● Backlog → ● In Progress`; nokta rengi hedef statünün rengidir (Backlog `muted`, In Progress `accent`, Test `star`, Done `progress`, İptal `danger`). Filtre pill'leri: **Önemli** (varsayılan) · Kararlar · Testler · Tümü (`aria-pressed`). Önemli'de yalnız görüntüleme, sıralama, kriter işaretleme ve senaryo sonucu kayıtları gizlenir; silinen ve düzenlenen senaryo veya kriter metniyle görünür (eski ve yeni hal). Testler: AI testleri, senaryo sonuçları, onay ve geri gönderme. "Neden" satırı yalnız gerçek gerekçe varsa çıkar. Hiçbir kayıt silinmez. Geri gönderme notu alıntı kutusunda görünür. Düzenleme kaydında "Neden: …" satırı ve "Değişikliği göster" (`aria-expanded`). Diff: mono olmayan 13px, satır başına `−` / `+` işareti **ve** renk (`diff-del-bg`/`diff-del`, `diff-add-bg`/`diff-add`), padding `4px 12px`, 10px radius kap. Check kaydı ✓/✕ ikonla.

**Switch**: `<button role="switch" aria-checked>` 38×22, açıkken `primary` zemin (yeşil değil), kapalıyken `track`; topuz 18px beyaz, `0 1px 2px rgba(0,0,0,0.25)`. Etiket `aria-labelledby` ile bağlı; altta 12px `muted` açıklama. _shadcn:_ `Switch`.

**Görünüm seçici**: `<fieldset>` + `<legend>Tema:</legend>`; üç `<label>`: 96×64 önizleme (radius 8; Açık `#f5f5f7`/`#fff`, Koyu `#000`/`#1c1c1e`, Otomatik yarı yarıya) + `<input type="radio" name="theme">` + metin. Seçili önizleme `2px primary` kenarlık. Varsayılan Otomatik. _shadcn:_ `RadioGroup`.

**Uygulama ayarları penceresi**: 720 geniş, radius 12, `window` zemin; 30px pencere başlığı (seçili sekme adı, 13/600 `muted`); `role="tablist"` 4 ikonlu sekme (96×56, ikon 22px + 12px etiket; seçili `field`-koyusu zemin + `accent-text`): Genel, Görünüm, Agent bağlantısı, Hakkında. İçerik macOS form ızgarası: `grid-template-columns: 180px 1fr`, etiketler sağa yaslı 13px ve ":" ile biter. Yeni sürüm bandı `accent-soft` + `accent-text` ("v0.2.0 hazır · Sürüm notları · Güncelleme komutunu göster").

**Proje kartı (Projeler ekranı)**: radius 20, padding 24; 44px renkli kare + ad (18/600) + anahtar; açıklama (boşsa hiç gösterilmez, proje ayarlarından değiştirilir); bekleyen test varsa açıklamanın altında `<a>` rozet "1 test seni bekliyor" (28px pill, `wait-bg`/`wait`, ikon + metin, Seni bekliyor listesine gider); 4 durum sayısı (20/600 tabular + 12px etiket); alt satır son güncelleme + çalışan agent. Yıldız toggle ikonlu; yanında sağ üstte `aria-label="Diğer işlemler"` (…) ikon butonu bulunur; sidebar proje satırlarında da aynı buton vardır. Buton ve sağ tık aynı macOS menüsünü açar (`role="menu"`, öğeler `button role="menuitem"`): "Proje ayarları" (bulunulan sayfada açılır; yıldız kartın kendi butonundadır), "Projeyi arşivle…", ayırıcı, "Kalıcı olarak sil… (önce arşivle)". Son öğe aktif projede gri ve devre dışıdır; kalıcı silme yalnız arşivde, proje adı yazılarak onaylanır. Pano referans kartında menü açık gösterilir. Diğer projeler kompakt satır kartı (padding `20px 24px`); bekleyen test varsa sağda aynı rozetin küçük hali. Bekleyen test yoksa rozet hiç yok.

**Seni bekliyor listesi**: sidebar'daki "Seni bekliyor" tüm projeleri kapsayan sayfaya gider (`aria-current="page"` iken `wait-line` iç kenarlık). Toolbar başlığı "Seni bekliyor"; altında 13px `muted` "Test etmeni bekleyen işler. AI bir işi bitirip sana test için gönderdiğinde burada görünür. N iş · en eski önce". Satır kartı doğrudan açar. Proje grupları: 22px proje karesi + `h2` proje adı + sağda "N iş"; boş grup gösterilmez. Satır `<a>` (min 64px, radius 14, `wait-line` kenarlık, `card` zemin): anahtar + öncelik · başlık (15/600, uzun başlık `overflow-wrap: anywhere`) · "3 senaryo · Claude · PO" (13px `muted`) · chevron. Hiç iş yoksa boş durum: "Seni bekleyen iş yok".

**Boş, yükleme ve hata durumları**: hepsi aynı kalıp, ortalanmış, 360px min yükseklik kart içinde: 52px `field` zeminli kare içinde 26px `muted` ikon + başlık (17/600) + tek satır açıklama (14px `muted`, max 280px) + en fazla tek aksiyon.

- **Boş proje:** board ikonu, "Henüz PBI yok", "AI'a ilk işini ver; açtığı PBI'lar burada görünür.", ikincil "Agent bağlantısını göster" (uygulama ayarlarına).
- **Yükleme:** başlık yerine 13/600 `muted` "Board yükleniyor…", `aria-busy="true"`; 3 iskelet kart (`skeleton` çubuklar, kart ölçüleriyle aynı). Animasyon sadece opacity nabzı (1.6s) ve sadece `prefers-reduced-motion: no-preference` iken.
- **Hata:** wifi-off ikonu, "Sunucuya ulaşılamadı", "Pano çalışıyor mu? Terminalde `pano serve` ile başlat.", birincil "Tekrar dene". (Veri önceden yüklendiyse tam sayfa hata yerine bağlantı şeridi kullanılır.)
- Dashed kutu sadece bırakma alanında.

**Dialog konumu**: Tüm dialoglar üstten yaklaşık 10vh sabitlenir, yatay ortalanır; en fazla 80vh yüksekliğinde içeriği kaydırılır. İçerik büyüdüğünde üst kenar sabit kalır.

**Dialog/Sheet kapatma**: Boş veya değişmemiş formlar ve salt okunur pencereler dışarı tıklama ve Esc ile kapanır. Her pencerede sağ üstte kapat X vardır. Değişmiş formda dışarı tıklama, Esc, X ve Vazgeç aynı pencerenin içinde “Kaydedilmemiş değişikliklerin var” sorusunu gösterir: varsayılan odak “Düzenlemeye devam et”, diğer seçenek “Kaydetmeden kapat”. İkinci modal açılmaz; Oluştur/Kaydet bu soruyu tetiklemez. Kalıcı silme penceresinde dışarı tıklama engellenir; Esc ve Vazgeç onay metni için soru sormadan kapatır. Ortak `ManagedDialog` bu davranışı sağlar; salt okunur kullanımda `dirty` verilmez.

## 7. Motion

- Dokunulan/sürüklenen her şey **spring**: damping 1.0 (zıplama yok), response 0.3–0.4s. Momentumlu bırakmada damping 0.8. Sheet/dialog: damping 0.8, response 0.3. (Framer Motion: `type: "spring", bounce: 0, duration: 0.35`.)
- Geri bildirim pointer-down'da başlar; geçişler kesilebilir, animasyon sırasında input kilitlenmez.
- Sadece `transform` ve `opacity`. Sheet tetikleyicisinden (kart) büyüyerek gelir, aynı yoldan kapanır; scrim opacity ile.
- Kart taşınınca yerleşim değişimi `layout` animasyonuyla (FLIP), SSE ile gelen değişiklikler de aynı şekilde.
- Hover 120ms, renk geçişleri 150ms `ease-out`.
- `prefers-reduced-motion: reduce` → slide/spring yerine 150ms cross-fade; `prefers-reduced-transparency` → toolbar opak `--bg`.

## 8. Metin ve dil

- Arayüz 14 dilde çalışır (PANO-27). Seçici sırası ve adları: English (en), Türkçe (tr), Azərbaycan (az), 中文 (zh, basitleştirilmiş), हिन्दी (hi), Español (es), Deutsch (de), Français (fr), Português (pt), 日本語 (ja), Nederlands (nl), 한국어 (ko), Svenska (sv), Polski (pl).
- Açılışta önce tarayıcıdaki kayıtlı seçim kullanılır. Kayıt yoksa `navigator.languages` sırasıyla taranır ve desteklenen ilk taban dil seçilir (`pt-BR` → `pt`, `zh-TW` → `zh`). Eşleşme yoksa English kullanılır. Sunucu ayarı tarayıcı tercihini ezmez. HTML `lang` seçili dili izler.
- Metinler `apps/web/src/i18n/<kod>.json` anahtarlarından gelir; koda sabit metin yazılmaz. English geri dönüş için gömülüdür; diğer diller yalnızca seçildiğinde dinamik yüklenir. İlk render çeviri yüklenene kadar bekler, `t()` eşzamanlı kalır. Eksik anahtar English'e döner.
- Yeni çeviriler makine çevirisidir; doğal ve kısa bir ton hedeflenmiştir, ana dili konuşanların incelemesiyle iyileştirilebilir. Anahtar ve yer tutucu eşitliği ile karakter bozulmaları test edilir.
- **Bilinen teknik terimler her dilde İngilizce kalır:** Backlog, In Progress, Test, Done, PBI, MCP, CLI, build, Key, Token, Definition of Done. Zorlama çeviri yok.
- PBI numarası proje içinde (board, kart, detay ve mobil) `#N`; projeler arası listelerde ve bağlantılarda (Seni bekliyor, Projeler rozetleri), commit ve agent komutlarında `KEY-N` (`PANO-4`).
- Sentence case ("Yeni PBI", "Seni bekliyor"); Title Case ve TAMAMI BÜYÜK yok.
- Tarih/saat seçili dille `Intl.DateTimeFormat`, göreli zaman `Intl.RelativeTimeFormat` ile gösterilir. Türkçe kısa göreli metinler korunur ("az önce", "2 dk önce"). Özetin açılış günü ve grafiğin "Bugün" etiketi kullanıcının yerel gününe göre seçilir; grafik API'sine tarayıcının saat dilimi gönderilir. TR "5 Kas 2026, 23:10"; EN "Nov 5, 2026, 11:10 PM".
- Ton: sakin, kısa, kullanıcıya "sen" diye hitap ("Seni bekliyor", "Ne düzeltilmeli?"). Aktörler okunaklı ad + rol ile gösterilir: `Claude · PO`, `Claude · Tasarım`, `Codex`, `Mert`; avatar baş harfi büyüktür. Teknik kimlik (`claude:po`) API’de ve geçmiş ayrıntısında küçük `muted` metin olarak kalabilir.
- Yıkıcı aksiyon etiketleri "…" ile biter ve onay ister.
- Dolgu metin, uydurma metrik, lorem ipsum yok; bilinmeyen değer `[yer tutucu]`.

## 9. Yapılmayacaklar

- Board'da metrik/özet kutuları (tek satır özet var).
- Başlık üstünde küçük üst etiket (eyebrow, ör. "PANO").
- "Yeni · görülmedi" gibi metin rozetleri, görülmedi sadece nokta.
- Ayrı "İptal edilenler" butonu, filtre menüsünde.
- Kolon arka plan kutuları.
- Emoji; gradient; sol kenar şeritli kart; parlama/neon.
- Sadece renkle anlam (öncelik metinli, geçti/kaldı ikon + metinli, diff − / + işaretli).
- `outline: none` veya focus'u gizleyen herhangi bir stil.
- Kenardan kayan shadcn `Sheet` (detay ortada `Dialog`).
- Durum seçimi için segmented control (popup kullanılır; segment sadece görünüm geçişi için).
- Yeşil switch, mavi dışında ikinci bir accent.
- 12px altında okunacak metin (mobil segmentlerin 11px etiketi hariç); masaüstünde 32px altı, mobilde 44px altı tıklama alanı.
- Agent'a doğrudan iş başlatan buton ("Codex'e ata"), Pano agent çalıştırmaz.

## 10. Ekran referansları

Test detayında sıralama: Ne değişti, Nasıl denerim, test senaryoları, AI'ın kendi testleri, açıklama, kriterler; altta sabit Onayla / Geri gönder alanı (Geri ata 2026-11-06'da kaldırıldı: tek kavram "Geri gönder"). Kalan senaryo onayı engeller; işaretsiz senaryo uyarı verir.

[Claude Design canvas](https://claude.ai/artifact/CGbiEtLAeiTVBijmAw7SvK), artboard'lar:

| Artboard                                         | İçerik                                                                                                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Projeler (`Main`)                                | Toolbar, yıldızlı proje kartları, diğer projeler                                                                                                   |
| Board                                            | Sidebar, toolbar, özet satırı (veri yaşıyla), 4 kolon, kart durumları; `connection` tweak'i: ok / stale (agent sessiz) / offline (bağlantı şeridi) |
| Board, mobil (`Mobile`)                         | 390×844, kolon sekmeleri, "Seni bekliyor" satırı                                                                                                   |
| PBI detayı (In Progress) (`Detail`)              | Detay sekmesi, durum popup'ı, header işlem menüsü; footer yok                                                                                                        |
| Board, dark (`BoardDark`)                       | Dark token'ları                                                                                                                                    |
| PBI detayı (Test, seni bekliyor) (`TestDetail`) | Senaryolar, AI testleri, onay kuralı (Onayla pasif + neden), geri gönderme notu + ekler                                                            |
| PBI geçmişi (`History`)                          | Zaman çizelgesi, filtreler, diff                                                                                                                   |
| Proje ayarları (`Settings`)                      | Test kolonu, AI Done'a çekebilir, Definition of Done                                                                                               |
| Uygulama ayarları (`AppSettings`)                | Genel, Görünüm, Agent bağlantısı, Hakkında                                                                                                         |
| Seni bekliyor (`Waiting`)                        | Tüm projelerdeki bekleyen testler, proje gruplu liste                                                                                              |
| Boş, yükleme ve hata durumları (`States`)        | Boş proje, iskelet yükleme, sunucu hatası, görülmedi ipucu                                                                                         |
