# Telegram UI/UX pass — instrukce pro implementaci

Cíl: PRIME UI má být zážitkově identické modernímu Telegramu (uživatelé přechází z Telegram skupiny, nemají se co nového učit). Barvy/layout základ už sedí (`#0e1621`, `#17212b`, `#3390ec`). Tento soubor je průběžný seznam konkrétních zadání podle screenshotů od uživatele — každá položka říká, který soubor upravit a jak.

---

## Otevřené položky

<!-- Nové položky se přidávají sem, ve formátu:

### [screen/komponenta]
- Soubor: `src/app/...`
- Co: popis změny podle screenshotu
- Reference: co přesně v Telegramu napodobit

-->

### 1. Font family (Telegram Web devtools)
- Soubor: `src/styles/fonts.css` (aktuálně prázdný — appka běží na Tailwind default font-sans, žádný custom font není nastaven)
- Co: nastavit globální font-family na Telegram Web stack:
  `"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif`
  (poznámka: "apple color emoji" ze screenshotu je emoji fallback font, není třeba ho replikovat)
- Nejspíš potřeba `@import` Roboto z Google Fonts (self-hosted nebo `<link>`), protože to není systémový font na Windows/Android ve všech verzích.
- Aplikovat přes `--font-sans` proměnnou / na `body` v `theme.css`, ne inline na komponenty.

### 2. Ikonka compose/edit (FAB) + hover stav
- Screenshot: fialový kulatý button s tužkou (normal stav), a tmavší/černý kruh s tenkým ringem (hover stav).
- V PRIME zatím **neexistuje** odpovídající FAB tlačítko — nejbližší kandidát je nějaká "create/edit" akce (např. admin "create event" nebo edit-avatar tlačítko v `Profile.tsx`). Než se kóduje, ujasnit kam přesně patří.
- Barvy nutno nasamplovat přesně ze screenshotu (fialová ~ #6C5DD3–#7C6FE0 rozsah, nutno ověřit pipetou), hover = ztmavená/černá verze se subtilním borderem.

### 6. Filter bar (segmentovaný pill tab)
- Screenshot: "Все / Personal" — dvě pill-tabs vedle sebe, aktivní má světlejší/modré pozadí, neaktivní tmavší.
- Aplikovat na filter tabs v `Home.tsx` (`PillFilter`) a filter tabs v `Alerts.tsx` — sjednotit vizuál podle referenční barevnosti (aktivní pill výraznější, ne jen border).

### 7. Profil / Settings page — kompletní redesign
- Soubor: `src/app/pages/Profile.tsx`
- Header: zpět šipka + titulek uprostřed + vpravo ikony (grid-layout toggle, tužka edit, 3-dot menu) — Profile.tsx zatím nemá header bar, potřeba přidat.
- Avatar velký uprostřed, jméno + status text pod ním (PRIME může místo "в сети" ukázat skill level / poslední aktivitu).
- 1. grouped karta: kontaktní údaje (telefon, username, bio) — ikona vlevo v kolečku, nad hodnotou malý šedý label. Blízké současnému `ContactRow`, jen doladit přesné odsazení/velikosti ikon podle screenshotu.
- 2. grouped karta: seznam položek s ikonou + label + volitelná hodnota vpravo (v PRIME zatím není potřeba všechny tyto konkrétní položky, ale je to referenční vzor pro jakýkoliv budoucí "seznam nastavení").
- 3. grouped karta: zvýrazněné/promo položky (barevná ikona hvězda apod.) — vzor pro cokoliv, co má vypadat jako "prémiová" akce.

### 8. FAB (compose) tlačítko + popup menu
- Screenshot: modré kulaté tlačítko vpravo dole → po kliknutí se ikona (tužka) změní na "X" a nad tlačítkem vyjede tmavá zaoblená karta s možnostmi (ikona + label na řádek), fade/scale animace.
- Toto je odpověď na otázku "kam FAB patří" — je to globální "vytvořit něco" akce s menu nabídkou, ne jen edit avatar.
- **OTEVŘENÁ OTÁZKA pro uživatele:** jaké 3 položky menu dává smysl v PRIME místo "Создать канал / Создать группу / Начать личный чат"? (Např. "Vytvořit event" pro admina?)
- Klíčový interakční detail k naimplementování: ikona na tlačítku se **morphuje** (tužka → X) při otevření/zavření menu — ne jen zmizí/objeví se.

### 9. Attachment ikonka (paperclip) — stejný morph vzor
- Screenshot: paperclip ikonka u textového inputu, po kliknutí vyjede nad inputem menu (Фото/Файл/Опрос/Список), a samotná ikonka se při otevření mění (natočí/změní barvu) — stejný princip jako FAB v bodě 8.
- Nejde o přidání file-attachmentů do PRIME (není chat appka) — jde o obecný vzor: **kdekoliv v appce máme ikonku, co po kliknutí otevírá popup menu, ikonka by se měla vizuálně morphovat, ne jen static zůstat**. Vytvořit jako sdílený vzor/komponentu, použít i pro FAB v bodě 8 a pro libovolné budoucí kebab/3-dot menu.

### 4–5. Chat list + app screenshoty — jen barvy
- Zdroj: chat list rows (avatary, jméno, poslední zpráva, čas) a celkový Telegram Web screenshot.
- Úkol: nekopírovat layout, jen převzít barevné hodnoty (pozadí sidebaru, pozadí chat-row, hover/selected stav řádku, barva času/sekundárního textu, unread badge) a zkontrolovat/doladit proti stávajícím proměnným v `src/styles/theme.css` (`--background`, `--card`, atd. — momentálně nejsou navázané na telegramové hex hodnoty, appka je používá jen ad-hoc jako `bg-[#17212b]` v jednotlivých komponentách).

---

## Hotovo

<!-- Po dokončení přesunout položku sem -->
