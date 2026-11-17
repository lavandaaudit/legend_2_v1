# VIKTOR LEGEND 2: КАРПАТИ — TABOR SURVIVAL

**Частина 2** саги IBONARIUM. Продовження «IBONARIUM: KYIV — THE LAST SIGNAL»
(перша частина: https://lavandaaudit.github.io/legend_v5/).

Гра — чиста статика: **ОДИН ФАЙЛ `index.html`** у корені (CSS, усі 9 JS-модулів
та PNG-активи першої частини у base64 вбудовані всередину, нуль зовнішніх
запитів). Працює офлайн, подвійним кліком, у прев'ю та на будь-якому хостингу.

## Повний склад пакунка

```
index.html          — ВЕСЬ ГРА В ОДНОМУ ФАЙЛІ (публікується на GitHub Pages)
.nojekyll           — щоб GitHub Pages не чіпав файли
README.md           — цей файл
CHANGELOG.txt       — повний список фіч + патчі
index.dev.html      — джерело розробки (теги <script src>)
style.css           — стиль консолі IBONARIUM / HUD / панелей
js/                 — 9 модулів розробки:
   palette.js         палітра + піксель-хелпери + час
   audio.js           WebAudio: SFX і мелодії
   v5assets.js        PNG-активи ПЕРШОЇ ЧАСТИНИ у base64 (генерується)
   sprites.js         герої (пропорції v5, 5 кольорів), гуцули, тварини
   world.js           генерація Карпат (Чорногора, Ґорґани, Мармароси)
   ents.js            група, селяни, тварини, риби, доручення
   sys.js             виживання, погода, ГУЛЯНКА, «5 Г», квести, сейв
   gfx.js             ізо-рендер, погода, ніч/вогонь, тріп, полароїди
   main.js            цикл, керування, панелі, магазини, сходження
assets/             — 47 PNG першої частини (Kenney CC0): дачі, цегляні хати,
                      крамниця, гараж, авто ВАЗ/Lanos/SUV/Truck, дерева,
                      кущ, паркан, ліхтар, гірські валуни
tools/
   build_inline.py    перезбірка index.html зі style.css + js/
   gen_v5assets.py    генератор js/v5assets.js з PNG у assets/
```

> Гравцю потрібен ТІЛЬКИ `index.html`. Решта — для розробки й повторного
> використання активів.

## Швидкий старт

```bash
python3 -m http.server 8080     # необов'язково
# відкрий http://localhost:8080  або просто подвійний клік на index.html
```

Старт: після екрана BIOS клікни/тапни будь-де → меню → **НОВА ГРА**.

## Як запушити в НОВИЙ репозиторій (GitHub Pages)

```bash
# 1. створи новий порожній репозиторій на GitHub (наприклад legend_karpaty)
# 2. розпакуй архів — вміст папки legend_karpaty/ кладемо в корінь репо:
cd legend_karpaty
git init
git add -A
git commit -m "VIKTOR LEGEND 2: КАРПАТИ — v1.3 «ЛЕГЕНДАРНА П'ЯТІРКА»"
git branch -M main
git remote add origin https://github.com/<ТВІЙ-НІК>/legend_karpaty.git
git push -u origin main
# 3. увімкни Pages:
#    Settings → Pages → Build and deployment →
#    Source: «Deploy from a branch» → Branch: main / Folder: / (root) → Save
# 4. гра буде тут:
#    https://<ТВІЙ-НІК>.github.io/legend_karpaty/
```

Варіант Б (як перша частина): скопіююй `index.html` у папку `legend_v6/`
репозиторію `lavandaaudit.github.io` — гра буде на
`https://lavandaaudit.github.io/legend_v6/`.

> Не мішай файли частин в одній папці — index.html у частин різні.

## Розробка

```bash
# правиш js/ чи style.css → перезбираєш одиночний файл:
python3 tools/build_inline.py
# змінив PNG у assets/ → перегенеровуєш base64-модуль:
python3 tools/gen_v5assets.py
```

Для дев-запуску з окремими файлами: `python3 -m http.server 8080` з кореня
і відкрий `index.dev.html`.

## Керування

| Клавіша | Дія |
|---|---|
| WASD / стрілки | рух (у воду — плавання) |
| SHIFT | біг |
| E | дія: збір, рубка, двері, діалоги, рибалка |
| M / I | багаж і крафт |
| TAB | велика карта (клік = маршрут) |
| Q | гулянка |
| T | МАНДРІВКИ: сходження на вершини, озера, кордони, Шацькі |
| G | група (доручення) |
| J | журнал |
| 1–4 | їсти / пити / спати / відпочити |
| V | повний екран |
| ESC | збереження |

Мобільно: віртуальний джойстик + кнопки E/RUN/MAP/BAG/ГРУПА/ГУЛЯНКА;
діалоги й панелі завжди ПОВЕРХ кнопок, інфоблоки стиснуті під телефон.

## Кредити

Активи першої частини (будівлі, авто, дерева, реквізит) —
[Kenney](https://kenney.nl), ліцензія CC0 1.0. Гра кодом: піксель-арт
малюється прямо на canvas, PNG — у base64 всередині index.html.

---
© IBONARIUM GAMEWORKS • Київ • 17.11.2026 • v1.3 «ЛЕГЕНДАРНА П'ЯТІРКА»
