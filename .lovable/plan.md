## Новая цветовая палитра

Заменяем тёплый кремовый фон на чистый белый и переводим основной бренд на глубокий синий. Бирюзовый остаётся как поддерживающий акцент, а золотой добавляется только для премиум-маркеров.

### Токены (значения)

| Роль | Цвет | Где используется |
|---|---|---|
| Background (основной фон) | `#FFFFFF` | body, hero, карточки на белом |
| Surface / Light background | `#F7F9FC` | секции-разделители, muted-блоки, hover-фоны |
| Foreground (текст) | `#0F172A` | заголовки и основной текст |
| Primary (бренд) | `#082A78` | CTA-кнопки, ссылки, search-кнопка, активные состояния |
| Accent (бирюзовый, сохраняем) | `#1F9BB4` | иконки trust-bar, выделения, вторичные акценты |
| Gold (премиум, ≤5% UI) | `#C99A3D` | бейдж Verified Guide, звёзды рейтингов, метка Premium Guide, Special Experience |
| Border | мягкий нейтральный на основе `#0F172A` с низкой непрозрачностью | разделители, поля ввода |

### Где конкретно появится золотой (≤5%)
- Бейдж "Verified Guide" в `GuideCard` / `GuideBadges`
- Иконка/цифра звёзд в рейтингах (`GuideReviews`, карточки гидов)
- Метка "Premium" у избранных гидов (`FeaturedGuides`, `SpotlightGuideCarousel`)
- Лента "Special Experience" в `SpotlightTourCarousel` / `SpotlightBanner`

Везде остальное — без золотого: обычные кнопки, ссылки, иконки навигации, trust-bar остаются в navy/бирюзе/нейтрали.

### Что меняется визуально
- Фон сайта становится чисто-белым, без кремового подтона. Секции, которые сейчас выделяются кремом, переходят на очень светлый `#F7F9FC`.
- Главные CTA (`Find guide`, `Book`, `Become a guide`) — глубокий navy `#082A78` вместо текущего бирюзового.
- Бирюзовый остаётся: в иконках trust-bar, в hover/focus, как вторичный визуальный голос. Градиент `--gradient-hero` пересобирается из navy → турeкоиз.
- Заголовки и body — почти-чёрный `#0F172A` (сейчас уже близко, но переводим в точное значение).
- Тени и shadow-elegant перекрашиваются с бирюзы на navy для согласованности.
- Dark-режим адаптируется параллельно: фон тёмно-navy, текст белый, primary — осветлённый navy/turquoise.

### Технические детали

Все изменения — в `src/styles.css` (CSS-first Tailwind v4 через `@theme inline`).

- Переписываем токены в `:root`:
  - `--background: #FFFFFF`
  - `--foreground: #0F172A`
  - `--card: #FFFFFF`
  - `--muted: #F7F9FC`, `--secondary: #F7F9FC`
  - `--primary: #082A78`, `--ring: #082A78`
  - `--accent: #1F9BB4` (бирюзовый, бывший primary, теперь accent)
  - Добавляем новые токены: `--gold: #C99A3D`, `--gold-foreground: #FFFFFF`
  - `--border`/`--input`: нейтральный slate с низкой непрозрачностью
- Регистрируем `--color-gold` / `--color-gold-foreground` в блоке `@theme inline`, чтобы появились утилиты `bg-gold`, `text-gold`, `border-gold`.
- Обновляем `--gradient-hero`, `--gradient-warm`, `--shadow-elegant`, `--shadow-card` на новые базовые цвета.
- Адаптируем `.dark` блок: navy-фон, светлый текст, осветлённый primary.

Точечные правки в компонентах, где сейчас захардкожены старые бренд-цвета (не через токены):
- `src/components/home/WhyHamroh.tsx` — иконки в `#8BB5A9` → `bg-accent/15 text-accent`
- `src/components/home/BecomeGuideCTA.tsx` — inline-градиент `#8BB5A9 → #62A1B1 → #D5A08D` пересобирается на navy → turquoise
- `src/components/home/TrustBar.tsx` — `text-slate-600` → `text-muted-foreground` (использовать токен)
- Бейджи Verified / Premium / Rating — заменить текущие цвета на `bg-gold/15 text-gold` или сплошной `bg-gold text-gold-foreground` в зависимости от веса
- Письма (`src/lib/email-templates/_brand.ts`) — `BRAND.primary` → `#082A78`, добавить `BRAND.gold = '#C99A3D'`, чтобы транзакционные письма остались в одной палитре

Поведенческой логики никакой не трогаем — только токены, цвета и пара inline-стилей. Картинки/иконки/копирайт остаются как есть.

### Что не меняется
- Структура страниц, типографика, отступы, размеры
- Логика поиска, бронирования, авторизации
- Иконки и фотографии
- Языки сайта