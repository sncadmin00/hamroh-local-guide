
# Web = витрина + рабочее место. Мобилка = для туриста.

Цель: перестать копировать мобильный домашний экран на web. Web получает две чёткие роли — публичная маркетинг-витрина (SEO, шеринг, привлечение) и приватное рабочее место для гида и админа. Мобильные-по-природе фичи убираем с web.

## 1. Публичная витрина (переработка главной и информационных страниц)

**Главная (`src/routes/index.tsx`)** — переверстать из «клона мобилки» в лендинг Uzbekistan:
- Hero + AI-поиск (оставляем, работает как воронка).
- Popular categories (возвращаем — на витрине это ключевой SEO-блок).
- Featured guides (карусель, ссылки на профили).
- Spotlight tours (карусель с ценами).
- «Why Hamroh» / TrustBar (доверие).
- Featured reviews (соц.доказательство).
- Latest articles (SEO-контент).
- **Download the app** — крупный баннер с QR + сторами (главный CTA внизу).
- Footer.

**Убрать с главной web-версии:**
- `PersonalCard` с погодой/геолокацией — это утренний экран туриста *в поездке*, не витрина.
- `ReelsRow` / Watch — вертикальные видео на десктопе смотрятся плохо, они для мобилки.
- `TravelDiary` — приватный дневник, ему не место на публичной главной.
- `BudgetCalculator` — тревел-утилита «в поле».
- `NotificationBanner` / `NotificationsBell` в шапке главной для гостей — оставляем только для залогиненных.
- `ExploreCarousel` (смешанная лента) — заменяется отдельными кураторскими каруселями Guides / Tours / Articles.
- `MobileTabBar` — убираем с web совсем (это мобильный паттерн).

**Публичные разделы (уже есть, полируем SEO):**
- `/tours`, `/guides`, `/explore`, `/articles` — витринные списки с фильтрами.
- `/tours/$slug`, `/guides/$guideId`, `/explore/$slug` — детальные страницы, каждая со своим `head()`: title, description, og:title, og:description, og:image (из данных лоадера — фото тура/гида/места).
- `/about`, `/how-it-works`, `/become-a-guide`, `/contact`, `/faq` — маркетинг.
- Проверить sitemap.xml, robots.txt, canonical на каждой публичной странице.

## 2. Приватная зона туриста (лёгкая, а не полный кабинет)

Оставить на web то, что реально удобнее с большого экрана:
- `/my-bookings` — просмотр броней, скачивание PDF-ваучера.
- `/wishlist` — коллекции, планирование поездки.
- `/messages` — переписка с гидом (широкий чат удобнее клавиатуры).
- `/account` — профиль, настройки, язык, тема.

Убрать/скрыть на web:
- Travel Diary, Budget Calculator, Reels-лента, Watch — эти сущности остаются только в мобилке. В БД таблицы (`travel_diaries`, `trip_budgets`) сохраняем — мобилка ими пользуется, — но web-компоненты и роуты не показываем.
- На страницах туриста добавить мягкий баннер «Continue in the app» с deep-link.

## 3. Приватная зона гида и админа (усилить)

Кабинет гида (`/guide`) и админка (`/admin`) — основная ценность web для команды. Ничего радикально не меняем, только:
- Убеждаемся, что все табы (Calendar, Bookings, Earnings, Posts, Places, Profile, AI) работают на десктопе широкоформатно (двухколоночные раскладки где имеет смысл).
- В шапке гида/админа — быстрый переключатель «Web workspace» вместо туристических блоков.
- Кнопка «Get the app» для гидов — опциональна, приложение им нужно меньше.

## 4. Шапка и навигация

`SiteHeader.tsx`:
- Для гостей и туристов: Home / Guides / Tours / Explore / Articles / About + «Download app» кнопка справа.
- Для залогиненного гида: добавить пункт «Guide cabinet».
- Для админа: «Admin».
- Убрать `MobileTabBar` с web (нижний таббар — мобильный паттерн, на web дублирует шапку).

## 5. SEO-полировка (за одно)

- Уникальные `head()` на каждом публичном роуте (сейчас часть страниц наследует общие мета).
- `og:image` на leaf-роутах туров/гидов/статей из данных лоадера.
- JSON-LD: `TouristTrip` для туров, `Person` для гидов, `Article` для статей.
- Прогнать SEO-сканер после и починить findings.

## Файлы, которые правим

```text
src/routes/index.tsx                        — переверстать в лендинг-витрину
src/components/SiteHeader.tsx               — новая навигация, «Download app»
src/components/home/DownloadAppBanner.tsx   — НОВЫЙ (QR + сторы)
src/components/home/PopularCategoriesCarousel.tsx — вернуть на главную
src/components/home/FeaturedGuides.tsx      — вернуть
src/components/home/SpotlightTourCarousel.tsx — вернуть
src/components/home/FeaturedReviews.tsx     — вернуть
src/components/home/LatestPosts.tsx         — вернуть (Latest articles)
src/components/home/WhyHamroh.tsx / TrustBar.tsx — вернуть

# Удалить с главной (компоненты оставляем в репо — мобилка/будущее)
src/components/home/PersonalCard.tsx        — снять с index.tsx
src/components/home/ReelsRow.tsx            — снять
src/components/home/TravelDiary.tsx         — снять
src/components/home/BudgetCalculator.tsx    — снять
src/components/home/ExploreCarousel.tsx     — снять
src/components/home/MobileTabBar.tsx        — снять с layout web

# Мягкие «continue in app» баннеры
src/components/ContinueInAppBanner.tsx      — НОВЫЙ (для /my-bookings, /wishlist, /messages)

# SEO
src/routes/tours_.$slug.tsx, guides_.$guideId.tsx, explore.$slug.tsx
                                            — уточнить head() + og:image из loader
```

## Что НЕ трогаем

- Схема БД — без изменений.
- Мобильное приложение — вне рамок этой правки.
- Кабинеты гида и админа — только косметика шапки, логика бизнеса не меняется.
- i18n — переводы новых строк добавим по ходу.

## Критерии приёмки

1. Главная web выглядит как маркетинг-лендинг, а не как копия мобильного экрана. Reels, Diary, Budget, PersonalCard оттуда убраны.
2. Каждая публичная страница имеет уникальные title/description/og.
3. В шапке видна кнопка «Download the app», ведёт на баннер/сторы (пока placeholder-ссылки, если сторов ещё нет).
4. Кабинет гида и админка остаются полностью функциональны.
5. Кабинет туриста на web урезан до Bookings/Wishlist/Messages/Account с мягким «continue in app».

После аппрува начинаю с главной и шапки, потом SEO leaf-роутов, потом «continue in app» баннеры.
