
# План улучшения главной страницы

Цель: сохранить нынешний AI-first hero, но добавить доверие, контент ниже первого экрана и довести до уровня современного маркетплейса (Airbnb / Perplexity).

## 1. Hero — небольшие правки (без редизайна)

- Над заголовком — маленькая trust-плашка: «★ 4.9 · 120+ verified guides · 12 cities» (цифры из БД через `useGuides()` / `useCities()`).
- Подсказки (`SUGGESTIONS`) перевести через `t()` в `src/lib/i18n.tsx`, чтобы менялись с языком.
- Mobile padding: `py-16` → `py-10 md:py-24`, заголовок `text-3xl` → `text-4xl` на ≥380px.
- Микро-подпись под инпутом: «Powered by Hamroh AI · Free · No signup to try» — снимает барьер.

## 2. Новый блок «How it works» (3 шага)

После hero, перед категориями. 3 карточки в ряд (на мобайле — стэк):
1. Tell us your trip (иконка чата)
2. Get matched with a local (иконка карты)
3. Book & chat directly (иконка календаря)

Минималистично, в стиле Apple — иконка, заголовок, 1 строка описания. Никаких CTA внутри.

## 3. «Featured guides» — карусель

Новая секция между hero и «Browse by interest». Берём топ-6 гидов из `useGuides()` (отсортированы по `sort_order`/rating). Переиспользуем существующий `GuideCard`. Горизонтальный скролл на мобайле, grid 3×2 на desktop. Заголовок: «Meet our top guides».

## 4. «Latest from guides» — лента постов

Использовать уже готовые `GuidePostsPanel` / `useGuidePosts`. Сделать глобальный запрос: последние 8–12 постов от всех гидов (новый хук `useLatestPosts()` в `content-queries.ts`, без RLS-проблем — `guide_posts` уже public для visible=true).

Карточки как в `GuidePostsFeed`, но клик ведёт на профиль гида. Это «живое доказательство», что платформа активна.

## 5. «Popular cities»

Маленькая секция: 4–6 city-чипов с количеством гидов (`useCities()` + count). Клик → `/guides?city=<slug>`. Закрывает кейс «я знаю куда еду, покажи людей».

## 6. Social proof — отзывы

3 коротких отзыва (от существующих reviews в БД, top-rated). Карточки с аватаром, городом, 1–2 предложения, ★★★★★. Запрос: новый `useFeaturedReviews()` (top 3 with rating=5 и текстом ≥40 символов).

Если отзывов <3 — секцию скрываем (никаких заглушек).

## 7. Финальный CTA-блок

Перед футером: «Become a guide» баннер с градиентом бренда (turquoise→terracotta), кнопка → `/become-a-guide`. Закрывает supply-side воронку.

## 8. SEO

В `src/routes/index.tsx` `head()`:
- og:image (брендовый, можно сгенерить через imagegen — 1200×630)
- og:url, og:type=website
- twitter:card=summary_large_image
- JSON-LD `Organization` + `WebSite` с `SearchAction` (Hamroh AI как поиск)
- canonical: `https://hamroh-local-guide.lovable.app/`

## Порядок секций (итог)

```
[ Header ]
[ Hero + AI input + trust bar + suggestions ]
[ How it works (3 шага) ]
[ Featured guides (карусель) ]
[ Browse by interest (есть) ]
[ Popular cities ]
[ Latest from guides (лента постов) ]
[ Reviews (если есть данные) ]
[ Become a guide CTA ]
[ Footer ]
```

## Технические детали

- Новые файлы:
  - `src/components/home/HowItWorks.tsx`
  - `src/components/home/FeaturedGuides.tsx`
  - `src/components/home/PopularCities.tsx`
  - `src/components/home/LatestPosts.tsx`
  - `src/components/home/FeaturedReviews.tsx`
  - `src/components/home/BecomeGuideCTA.tsx`
  - `src/components/home/TrustBar.tsx`
- Расширить `src/lib/content-queries.ts`: `useLatestPosts`, `useFeaturedReviews`, `useGuidesCount`.
- Перевести `SUGGESTIONS` в `i18n.tsx` (ключи `hero.suggestions.*`).
- Все цвета — через токены (`--primary`, `--accent`), убрать хардкод `#62A1B1` / `#D5A08D` из новых компонентов; для существующего hero оставить как есть, чтобы не ломать.
- og:image сгенерировать через `imagegen` (premium, 1200×630, hamroh-брендинг).

## Что НЕ делаем сейчас

- Не трогаем структуру hero и AI-флоу (работает хорошо).
- Не добавляем видео-бэкграунд (тяжело, отвлекает).
- Не делаем тёмную тему — отдельная задача.

## Объём

~6 новых компонентов + 3 новых query + i18n ключи + SEO. Один заход.
