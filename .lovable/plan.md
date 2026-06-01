
# План: трекинг источника + OG-картинки

Делаем 2 задачи параллельно — они независимы.

## 1. Трекинг источника заказов (`?src=...`)

### База
Миграция: добавить колонку `source TEXT NOT NULL DEFAULT 'web'` в `bookings`.
Допустимые значения: `web`, `instagram`, `facebook`, `telegram`, `whatsapp`, `other`.

### Фронт — захват источника
- Новый хук `src/hooks/useTrackSource.ts`: при первом визите читает `?src=...` из URL, валидирует против whitelist, сохраняет в `sessionStorage` (ключ `bookingSource`). Если уже есть — не перезаписывает.
- Подключить в `src/routes/__root.tsx` внутри `RootComponent`.

### Фронт — запись в заказ
В `src/routes/book.$guideId.tsx` в `handleSubmit`:
- Читать `sessionStorage.getItem('bookingSource')` (fallback `'web'`).
- Добавить `source` в `bookings.insert({...})`.

### Админка — `src/routes/admin.tsx`
- Колонка **«Источник»** в таблице заказов с цветными бейджами:
  - Web — серый, Instagram — розовый, Facebook — синий, Telegram — голубой, WhatsApp — зелёный, Other — outline.
- Фильтр по источнику (select сверху таблицы).
- Мини-статистика: количество заказов по каналам за последние 30 дней (карточки с цифрами).

## 2. OG-картинки

### Что есть сейчас
- `__root.tsx` — есть `og:title/description/type`, но **нет `og:image`**.
- `guides.$guideId.tsx` — нужно проверить и добавить `og:image` из `guide.photo` (фото гида = идеальная share-картинка).
- `index.tsx` — нужна общая брендовая og-картинка.

### Что делаем
1. **Сгенерировать одну дефолтную OG-картинку** (1200×630) для главной и фоллбэка — `src/assets/og-default.jpg`. Стиль: тёплая travel-эстетика, надпись «Sancho — Explore with locals».
2. **`__root.tsx`**: добавить дефолтный `og:image` + `twitter:image` (абсолютный URL через `import.meta.env.VITE_*` или хардкод preview-домена).
   - ВАЖНО по знаниям TanStack: `og:image` лучше ставить только на листовых маршрутах, иначе перекрывает детские. Поэтому либо ставим только на index.tsx, либо принимаем, что детские (guide page) переопределят своим.
   - Делаем второй вариант: дефолт в root, override в `guides.$guideId.tsx`.
3. **`guides.$guideId.tsx`**: в `head()` добавить `og:title` = имя гида + город, `og:description` = краткое bio, `og:image` = `guide.photo` (абсолютный URL), `og:type: 'profile'`.
4. **`index.tsx`**: оставляет дефолт от root.

### Абсолютные URL
Для preview/published хостинга используем `https://hamroh-local-guide.lovable.app` как базу (из knowledge). Фото гидов уже абсолютные (Supabase storage) — оставляем как есть.

## Порядок выполнения
1. Миграция БД (`source` колонка) — отдельным шагом, ждём подтверждения.
2. Параллельно: хук + book-форма + админка (источник).
3. Параллельно: генерация OG-картинки + правки `head()` в root и guide-странице.

## Что пользователь сделает САМ потом
В соцсетях везде ставит ссылки:
- Instagram bio → `sancho.app/?src=instagram`
- Telegram канал → `sancho.app/?src=telegram`
- WhatsApp статус → `sancho.app/?src=whatsapp`
- Facebook страница → `sancho.app/?src=facebook`
