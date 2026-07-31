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

### 7. Profil / Settings page — kompletní redesign
- Soubor: `src/app/pages/Profile.tsx`
- **Header (back šipka + grid-toggle + 3-dot menu) ZÁMĚRNĚ NEPŘEVZATO:** Telegram Settings je "pushed" obrazovka nad chat listem (single-stack navigace), proto tam dává smysl šipka zpět. PRIME má bottom-tab navigaci — Profile je vlastní tab, ne obrazovka nad něčím, takže "zpět" by nevedlo nikam smysluplně. Grid-toggle a 3-dot menu navíc nemají v PRIME žádnou akci k napojení (byly by to prázdná tlačítka). Pokud se objeví konkrétní use-case pro 3-dot menu (např. sdílet profil, nahlásit), doplnit pak.
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

### 10. Barevná paleta z chat-list screenshotu — PŘESNĚ NAPIPETOVÁNO uživatelem
Uživatel sám odebral hodnoty color-pickerem ze screenshotu. Toto jsou finální, potvrzené hodnoty (ne odhad):

| Element ve screenshotu | Přesná hodnota | Hex |
|---|---|---|
| Černé pozadí (main content / message area) | HSL(0, 0%, 0%) | `#000000` |
| Tmavě šedý povrch (karta/hover) | — | `#212121` |
| Tmavě šedé pozadí (sidebar) | — | `#181818` |
| Accent (selected row, FAB, odchozí bublina, linky) | HSL(249°, 64%, 50%) | `#462ED1` |

Poznámka: hue 249° je blue-violet/indigo, ne čistá fialová — takže tahle hodnota už sama odpovídá požadavku "víc do modra" oproti čistě fialovému tématu.

**Kam to zatím NENÍ aplikováno v kódu** (čeká se, protože se zatím netuší přesný cílový element — kandidát je FAB z bodu 2/8, jakmile bude jasné jeho umístění a chování):
- `#000000` / `#212121` / `#181818` jako nová neutral škála (nahradit nebo doplnit vedle stávající `#0e1621`/`#17212b`)
- `#462ED1` jako accent pro "aktuálně vybraný/aktivní" prvek s plnou (ne jen tintovanou) výplní

Existující `#3390ec` (accent používaný napříč appkou už teď — tlačítka, linky, FilterPill) se touhle změnou zatím nenahrazuje, dokud nebude potvrzeno, že se má nahradit globálně, nebo jen v novém prvku (FAB).

### 4–5. Chat list + app screenshoty — jen barvy
- Zdroj: chat list rows (avatary, jméno, poslední zpráva, čas) a celkový Telegram Web screenshot.
- Úkol: nekopírovat layout, jen převzít barevné hodnoty (pozadí sidebaru, pozadí chat-row, hover/selected stav řádku, barva času/sekundárního textu, unread badge) a zkontrolovat/doladit proti stávajícím proměnným v `src/styles/theme.css` (`--background`, `--card`, atd. — momentálně nejsou navázané na telegramové hex hodnoty, appka je používá jen ad-hoc jako `bg-[#17212b]` v jednotlivých komponentách).

---

## Hotovo

### 1. Font family
- `index.html` — přidán Google Fonts link (Roboto, 400/500/700/900 + italic).
- `src/styles/tailwind.css` — `--font-sans` theme proměnná nastavena na Telegram stack.
- `src/styles/theme.css` — `body` má `font-sans` třídu jako fallback.

### 6. Filter bar
- Nová sdílená komponenta `src/app/components/ui/FilterPill.tsx` (aktivní = `#2b5278` muted modrá, neaktivní = `#1c2733`, bez borderu).
- Nahrazeno v `Home.tsx` (byl tam duplicitní `PillFilter`, teď smazaný) a `Alerts.tsx`.
- Build ověřen (`npm run build` prošel).
