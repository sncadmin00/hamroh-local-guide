Редизайн главной страницы в направлении **Premium Editorial Minimalist** с анимацией glow вокруг input на hover.

## Общее настроение
Тёплый кремовый фон (#FBF9F6), крупный серифный заголовок Playfair Display, чистый body-шрифт Plus Jakarta Sans, акцентные цвета бирюзовый → терракотовый. Минималистично, премиально, тревел-настроение.

## Что меняем

### 1. Шрифты (src/routes/__root.tsx)
В head links заменить текущие Google Fonts на:
- `Playfair Display:ital,wght@0,400..900;1,400..900`
- `Plus Jakarta Sans:wght@300,400,500,600`

### 2. Дизайн-токены (src/styles.css)
- `--font-display`: `"Playfair Display", Georgia, serif`
- `--font-sans`: `"Plus Jakarta Sans", system-ui, sans-serif`
- Фон страницы: тёплый кремовый (`#FBF9F6` или близкий oklch)
- Добавить градиентные токены для glow-эффекта input

### 3. Главная страница (src/routes/index.tsx) — полный редизайн героя

**Иконка / логотип героя:**
- Заменить текущий sparkle-иконку в заголовке на крупную (96×96px), с закруглёнными углами (rounded-3xl)
- Градиент фона иконки: от бирюзового (#62A1B1) через зелёный (#8BB5A9) к терракотовому (#D5A08D)
- Размытый glow за иконкой на фоне (blur-2xl, opacity-20, масштаб 150%)

**Заголовок:**
- "What's up?" — `text-7xl font-display font-semibold tracking-tight text-slate-900`

**Подзаголовок:**
- `text-lg text-slate-500 max-w-lg font-light`
- Выделенный фрагмент "a verified local guide" — `text-slate-900 font-medium`

**Input-блок (ключевой момент):**
- Заменить textarea на input для компактности
- Высокий input (`h-20`), очень закруглённые края (`rounded-[2.2rem]`)
- Белый фон, тонкая рамка `border-slate-100`, мягкая тень
- **Glow на hover:** абсолютный блок за input с `bg-gradient-to-r` от бирюзового к терракотовому, `blur`, `opacity-0` по умолчанию, `group-hover:opacity-100` с плавным переходом (`transition duration-1000 group-hover:duration-200`)
- Круглая кнопка микрофона и круглая кнопка отправки справа внутри input
- Кнопка отправки: бирюзовый фон (#8BB5A9), белая стрелка, hover темнее

**Suggestion chips:**
- Закруглённые (`rounded-full`), border-slate-100, bg-white/50
- Текст slate-500, hover: border-slate-200 + text-slate-800

**Вторичная ссылка:**
- "Prefer to browse? Find a guide manually →" — подчёркнутая, text-slate-400, hover text-slate-900

**Социальные иконки:**
- Минималистичные круглые кнопки с border, hover: scale-110
- WhatsApp — зелёный, Telegram — синий

### 4. Удалить / упростить
- Убрать WhatsApp и Telegram из шапки главной (оставить только в футере / меню)
- Убрать лишние отступы, сделать компактнее

## Не трогаем
- SiteHeader — оставляем как есть (логотип + навигация)
- SiteFooter — используем существующий компонент
- Функциональность AI-чата, логина, навигации — без изменений
- i18n-переводы — оставляем вызовы `t()` на тех же ключах