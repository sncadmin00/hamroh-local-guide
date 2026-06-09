## Цель
Применить мягкий светло-серый фон (`#F7F9FC` — текущий `--secondary`) ко всему сайту, а карточки оставить белыми, чтобы они слегка выделялись с тонкой тенью/бордером.

## Что меняем

### 1. Глобальный фон (`src/styles.css`)
- `--background: #F7F9FC` (вместо чистого белого)
- `--card: #FFFFFF` (остаётся белым — контраст с фоном)
- `--popover: #FFFFFF`
- `--secondary`: оставить `#F7F9FC` (совпадает с фоном — секции вроде Featured Tour перестают визуально «выделяться полосой», что и есть цель выравнивания)
- `--border`: оставить `#E5E9F0` для лёгкого контура карточек
- Dark mode не трогаем (пользователь говорил про основной светлый вид)

### 2. Карточки — белые, мягкое выделение
Проверить, что компоненты карточек используют `bg-card` (а не `bg-background` / `bg-white` хардкод). Точечно поправить там, где сейчас:
- Tour cards, Guide cards, Blog cards, FAQ items, Popular cities, Browse by interest, Spotlight — заменить `bg-white` / `bg-background` на `bg-card`
- Добавить/проверить `border border-border` + лёгкая тень (`shadow-sm` или `shadow-[0_1px_3px_rgba(15,23,42,0.04)]`) для деликатного отрыва от фона

### 3. Секции с tinted фоном
- `SpotlightTourCarousel` — убрать `bg-secondary/40` обёртку (теперь весь сайт такой), оставить просто контейнер
- Любые другие секции с `bg-secondary` / `bg-muted` — проверить, нужны ли они ещё (скорее всего убрать, чтобы был ровный фон)

### 4. Header / Footer
- Header: можно оставить белым (`bg-card` или `bg-background/80 backdrop-blur`) — обсудим
- Footer: оставить как есть либо чуть темнее фона

## Файлы под правку (ориентировочно)
- `src/styles.css` — токены
- `src/components/home/SpotlightTourCarousel.tsx` — снять локальный фон
- Карточные компоненты в `src/components/home/*`, `src/components/guides/*`, `src/components/tours/*`, `src/components/blog/*` — `bg-white` → `bg-card`
- Header (`SiteHeader.tsx`) при необходимости

## Уточнения
1. Footer оставляем тёмным/как сейчас, или тоже светлый `#F7F9FC`?
2. Header — белый (контраст с фоном) или такой же `#F7F9FC` (бесшовно)?
3. Карточки: тонкий бордер `#E5E9F0` + еле заметная тень — ок? Или только тень без бордера?
