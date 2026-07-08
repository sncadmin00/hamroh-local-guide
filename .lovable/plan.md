# Web: гибкая ценовая модель — форма тура и страница бронирования

Серверная часть уже готова (миграция, `readTourPricing`/`computeBasePrice`, `price-quote`/`create-booking`). Осталось привести веб к тем же полям и контракту.

## Что делаем

### 1. Форма тура гида (`src/routes/guide.tsx` + `guide-portal.functions.ts`)

Заменить блок «Pricing» новой моделью.

- Три чекбокса: **Fixed price** / **Per person** / **By group** — гид включает любые (минимум один обязателен).
- Под каждым — свои поля, показываются только когда режим включён:
  - Fixed → одна цена за тур.
  - Per person → цена × взрослых.
  - By group → редактор диапазонов (`min` / `max` / `price`, кнопки «Add tier» / «Remove»). Клиентская валидация: без пересечений, отсортированы, `min≤max`, `price>0`.
- Поле **Max guests** (число или пусто) — жёсткий потолок вместимости (транспорт на 4 и т.д.).
- Подпись рядом с «Children»: «Не считаются в цене и вместимости. Старше 13 — добавляйте во взрослых».

Список туров (карточки в кабинете гида): показывать все включённые режимы кратко (`Fixed $50 · Per person $30 · By group 1–2 $50 / 3–4 $120`).

Сервер (`saveGuideTour` в `guide-portal.functions.ts`): принимает новые поля, валидирует, пишет в новые колонки `pricing_modes`, `fixed_price`, `per_person_price`, `group_tiers`, `max_guests`. Старые колонки (`pricing_mode`, `group_prices`, `price_from`) — заполняем «best-effort» для совместимости старых читателей, но не считаем их источником правды.

### 2. Страница бронирования (`src/routes/book.$slug.tsx`)

- Убираем UI-выбор категорий (`private/small/group/large`).
- Показываем инпут **Adults** (ограничен `max_guests` если задан) и **Children (0–13)** (отдельно, не в цене).
- Если у тура включено больше одного режима — блок «Choose how to pay» с превью цены для каждого способа при текущем `adults`. Клиент выбирает.
- Если включён один — используется молча.
- Расчёт финальной цены — через `price-quote` (не считаем на клиенте, только предпросмотр).
- В `createBooking` шлём `pricing_mode` — тот, который выбрал клиент.
- Ошибки от сервера показываем как есть (`"This tour accepts up to N guests"`, `"Please choose a pricing option"` и т.д.).

### 3. Страница тура (`src/routes/tours_.$slug.tsx`)

Блок «Pricing» показывает все включённые режимы:

```text
Fixed price:      $50
Per person:       $30 / adult
By group:
  1 person       $50
  2 people       $80
  3–4 people     $120
  5–8 people     $180
Up to 8 guests
```

Убираем прежний рендер `private/small/group/large`.

### 4. Админ-панель туров (`src/components/admin/ToursPanel.tsx`)

Тот же редактор, что у гида (переиспользуем один компонент). Админ может править любые туры.

### 5. Общие утилиты (`src/lib/content-queries.ts`)

- Тип `TourRow` расширить новыми полями.
- Функция `resolveTourPrice` — переписать под новую модель или убрать (не используется после правок выше).
- Функция `offeredCategories` — удалить (больше не нужна).

## Порядок работ (одним заходом)

1. Общий компонент `PricingModeEditor` (форма) + `PricingModeDisplay` (отображение) в `src/components/tours/`.
2. `content-queries.ts`: типы + чтение новых полей.
3. Форма гида (`guide.tsx`) + `saveGuideTour` (`guide-portal.functions.ts`) — использовать компонент.
4. Админ-панель — тот же компонент.
5. `tours_.$slug.tsx` — новый блок Pricing.
6. `book.$slug.tsx` — выбор режима, интеграция с `price-quote`.

## Технические детали

- Ключевые серверные функции уже есть: `quoteBookingCore`, `createBookingCore`, `readTourPricing`, `computeBasePrice`, endpoints `/api/public/hooks/price-quote`, `/api/public/hooks/create-booking`.
- Старые колонки БД остаются на переходный период — читатели, которые ещё не обновлены, продолжают видеть цены благодаря legacy-fallback в `readTourPricing`.
- Валидация тиров зеркалится в БД (`validate_group_tiers`), в клиенте (форма) и в `computeBasePrice`.
- i18n подписи — RU/EN/UZ через существующий `useI18n()`.

## Что НЕ делаем в этой итерации

- Не удаляем старые колонки (`pricing_mode`, `group_prices`, `price_from`) — снесём отдельной миграцией, когда все туры пересохранят.
- Не трогаем мобильное приложение — контракт уже отправлен, они интегрируются параллельно.
- Не добавляем «клиент видит все режимы, а сервер выбирает самый дешёвый» — оставляем ручной выбор клиента, как договорились.
