## Что делаем

При подтверждении брони гидом (статус → `confirmed`) клиент получает email со ссылкой «Скачать PDF» + кнопка «Скачать PDF» в кабинете `/my-bookings`. PDF на языке брони (ru/en/uz), содержит все детали тура и брони.

## Изменения в БД

Добавить два поля в таблицу `tours`:
- `meeting_point` — место встречи (текст)
- `end_point` — место окончания тура (текст)

Эти поля гид заполняет в редакторе тура (TourEditor) — два новых текстовых поля.

## PDF — что попадёт в файл

Шапка:
- Логотип Hamroh, статус «Подтверждено», номер брони

Блок «Тур»:
- Название тура, город
- Описание (короткое + полное)
- Длительность
- Категории (chips)
- Языки
- Highlights / Что включено / Что не включено
- Транспорт включён (да/нет)

Блок «Бронирование»:
- Дата, время начала, длительность
- Место встречи (`meeting_point`)
- Место окончания (`end_point`)
- Гости (взрослые/дети), язык тура, тип группы
- Итоговая стоимость
- Заметки клиента

Блок «Гид»:
- Имя, фото, телефон/телеграм (если есть), рейтинг

Футер: контакты Hamroh, ссылка на бронь.

## Технические детали

**Генерация PDF**
- Используем `pdf-lib` (чистый JS, работает в Cloudflare Workers, без нативных бинарей)
- Подгружаем шрифт с поддержкой кириллицы/латиницы (например, Noto Sans, встроенный в проект как Uint8Array из assets)

**Server function**: `src/lib/booking-pdf.functions.ts`
- `generateBookingPdf({ bookingId, token? })` — возвращает `{ pdfBase64, filename }`
- Доступ:
  - Авторизованный клиент брони → через `requireSupabaseAuth`
  - По публичной ссылке из email → через одноразовый/привязанный к booking токен (HMAC от `booking_id` + `WEBHOOK_SECRET` или новое поле `bookings.pdf_token`)

**Публичный route**: `src/routes/api/public/bookings/$id/pdf.ts`
- GET с query `?token=...`
- Проверяет HMAC, читает бронь сервис-ролью, генерит PDF, возвращает `application/pdf` (скачивание)

**Триггер при подтверждении**
- В `booking.functions.ts` / `guide-portal.functions.ts` (где статус меняется на `confirmed`) после успешного апдейта:
  - Сгенерировать `pdf_token` (HMAC)
  - Отправить шаблон `booking-confirmation-client` (уже есть) с новым полем `templateData.pdfUrl = https://hamroh-local-guide.lovable.app/api/public/bookings/{id}/pdf?token=...`
  - В шаблоне добавить кнопку «Скачать PDF подтверждение»

**Кабинет клиента** (`/my-bookings`)
- В карточке брони со статусом `confirmed` — кнопка «Скачать PDF», вызывает server fn `generateBookingPdf`, скачивает blob

**i18n PDF**
- Берём `bookings.locale` (ru/en/uz)
- Все подписи в PDF локализованы через словарь в `src/lib/booking-pdf-i18n.ts`
- Текстовые поля тура берём из `title_ru/uz/en`, `short_description_*`, `description_md_*` по locale, с фолбэком на базовый

## Файлы (создать/изменить)

- migration: добавить `meeting_point`, `end_point` в `tours`
- `src/components/guide/TourEditor.tsx` — два новых input поля
- `src/lib/booking-pdf-i18n.ts` — словарь подписей
- `src/lib/booking-pdf.functions.ts` — server fn + helper `buildBookingPdf()`
- `src/routes/api/public/bookings/$id/pdf.ts` — публичный download endpoint
- `src/lib/email-templates/booking-confirmation-client.tsx` — добавить кнопку «Скачать PDF»
- `src/lib/booking.functions.ts` / `guide-portal.functions.ts` — при `status=confirmed` передавать `pdfUrl` в `templateData`
- `src/routes/my-bookings.tsx` — кнопка «Скачать PDF» для подтверждённых броней
- `src/assets/fonts/NotoSans-Regular.ttf` (+ Bold) — для встраивания в PDF

## Замечания

- Email-вложения в текущей очереди не поддерживаются (payload без attachments); поэтому PDF доставляется ссылкой в письме + кнопкой в кабинете. Это покрывает выбранный вариант «оба».
- Токен в публичной ссылке — HMAC от `booking_id`, секрет хранится в env, без БД-таблицы токенов. Ссылка живёт пока существует бронь.
