Большой объём — предлагаю порядок и состав изменений. После approve пройду по списку батчами.

## Что сделаю

### 3. Юридические страницы
- `src/routes/terms.tsx`, `src/routes/privacy.tsx`, `src/routes/refund-policy.tsx`
- Шаблонный текст RU/UZ/EN (адаптируем позже под юриста)
- Ссылки в `SiteFooter`

### 4. 404 / Error boundary
- Уже есть `notFoundComponent` и `errorComponent` в `__root.tsx` — добавлю локализацию + проверю что ключевые роуты с loader'ами имеют свои boundaries
- Добавлю `errorComponent`/`notFoundComponent` в `guides.$guideId`, `book.$guideId`, `explore.$slug`, `ai.$threadId`

### 5. Форма обратной связи
- Миграция: таблица `feedback` (id, user_id?, name, email, message, page, created_at) + RLS
- Server fn `submitFeedback` (валидация zod) + email админам через существующий email pipeline
- Страница `src/routes/contact.tsx` + ссылка в футере

### 6. Аналитика событий
- Миграция: таблица `analytics_events` (id, user_id?, event, props jsonb, created_at) + RLS (insert для всех, select только admin)
- Хелпер `src/lib/analytics.ts` → `trackEvent(name, props)`
- Инструментирую: signup, guide_view, booking_created, booking_cancelled, ai_prompt

### 7. Локализация UI (RU/UZ/EN)
- Расширю `src/lib/i18n.tsx` ключами для SiteHeader, SiteFooter, главных CTA на index, guides, my-bookings, login
- Не буду переводить admin/guide cabinet (внутренние) — оставлю EN
- Полный аудит всех страниц — пометка TODO для остального

### 8. Мобильная адаптация (375px)
- Проверю/поправлю SiteHeader (бургер), index hero, guides grid, booking форму, my-bookings, messages
- Скриншоты через preview не нужны — пройдусь по классам

### 9. About / Team
- `src/routes/about.tsx` с миссией, командой (плейсхолдер), контактами
- Ссылка в футере

### 10. og:image для динамики
- `guides.$guideId`: og:image = photo гида (из loader data)
- `explore.$slug` (статьи): og:image = cover_image статьи
- Абсолютные URL

### 11. sitemap.xml + robots.txt
- `src/routes/sitemap[.]xml.ts` — статические роуты + динамика (guides published, articles published, cities)
- `public/robots.txt` с `Sitemap:` директивой

### 12. Реферальные ссылки гидов
- Миграция: добавить `referral_code` в `guides` (unique) + таблица `referral_clicks` (id, guide_id, ref_source, ip_hash?, created_at)
- Хелпер: `?ref=<code>` на любом URL → cookie + лог в `referral_clicks`
- Кабинет гида: блок «Моя ссылка» с copy-to-clipboard + счётчик кликов

## Технические заметки
- Все таблицы с `GRANT` для `authenticated`/`service_role`
- Все server fn под `requireSupabaseAuth` где нужна авторизация
- og:image — абсолютные URL через `SITE_URL` константу
- Аналитика: insert разрешён всем (включая anon) для landing, select — только admin

## Что НЕ делаю в этом проходе
- Полный перевод admin/guide cabinet
- Реальные юр.тексты (только шаблоны)
- Реальные фото команды на About
- Brevo рассылка по статьям (отложено ранее)
