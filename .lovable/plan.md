## Лента постов гида — ручная загрузка в кабинете

Добавить в кабинет гида (`/guide`) новую вкладку **«Posts»**, где гид сам загружает карточки для своей публичной ленты. Без OAuth, без Meta, без автосинхронизации.

### Что увидит гид

Новая 4-я вкладка рядом с Availability / Bookings / Referral:

- Список своих карточек (миниатюра + caption + платформа + статус видимости)
- Кнопка **+ Add post** → форма:
  - Загрузка изображения (drag&drop, jpg/png/webp, до ~5 МБ)
  - Caption (текст, до 500 символов)
  - Platform (Instagram / Facebook / TikTok / YouTube / Other)
  - Тумблер Visible
- На каждой карточке: кнопки **Edit**, **Hide/Show**, **Delete**, стрелки ↑/↓ для порядка
- Лимит — до 20 постов на гида (мягкий, чтобы лента не разрасталась)

### Что увидит клиент

Ничего нового — компонент `GuidePostsFeed` на странице гида уже готов и уже не кликабелен. Просто начнёт показывать реальные карточки вместо «hasn't posted yet».

### Технические детали

**Storage:** новый публичный бакет `guide-posts` (отдельно от `guide-photos`, чтобы политики не смешивались). RLS на `storage.objects`:
- public read для `bucket_id = 'guide-posts'`
- insert/update/delete только если `(storage.foldername(name))[1]` равен id гида, которым владеет `auth.uid()` (через `is_guide_owner`)
- admin может всё

**База:** таблица `guide_posts` уже есть, ничего менять не надо. Поле `url` сделаем опциональным в форме — гид может оставить пустым (миграция не нужна, в БД оно `NOT NULL DEFAULT ''`… проверю: сейчас `NOT NULL` без default, надо будет либо добавить default `''`, либо всегда писать пустую строку из формы. Пойдём вторым путём — без миграции).

**Server functions** (новый файл `src/lib/guide-posts.functions.ts`):
- `listMyGuidePosts()` — все посты гида включая скрытые
- `createMyGuidePost({ platform, caption, thumbnail_url, url? })`
- `updateMyGuidePost({ id, ... })`
- `deleteMyGuidePost({ id })` — удаляет и файл из storage
- `reorderMyGuidePost({ id, direction })` — меняет `sort_order` с соседом
- `toggleMyGuidePostVisible({ id })`

Все защищены `requireSupabaseAuth` + проверкой `is_guide_owner` через RLS (политика `Guide owner manages own posts` уже есть).

**Загрузка файла:** прямо из браузера через `supabase.storage.from('guide-posts').upload(...)` в папку `<guideId>/<uuid>.<ext>`, потом публичный URL пишем в `thumbnail_url`.

**UI:** новый компонент `GuidePostsPanel` в `src/routes/guide.tsx` + маленький `PostForm` (dialog или inline). Дизайн — в стиле существующих панелей.

### Файлы

- create `src/lib/guide-posts.functions.ts`
- edit `src/routes/guide.tsx` — добавить вкладку и панель
- create `src/components/GuidePostsPanel.tsx` (чтобы `guide.tsx` не распух)
- storage: создать бакет `guide-posts` (public)
- migration: RLS-политики на `storage.objects` для нового бакета

### Что НЕ делаем

- Никаких OAuth, никакого Meta App, никакой автосинхронизации
- В админке отдельной формы тоже не делаем — у админа уже есть полный доступ через RLS, если понадобится модерация, добавим позже
- Лента на странице гида и кнопки клиента не меняются