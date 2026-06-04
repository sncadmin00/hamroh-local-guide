## Проблема

В шапке (`SiteHeader.tsx`) кнопка-пилюля всегда показывает обобщённую иконку `User` из lucide. После входа через Google/Apple мы никак не подтягиваем `avatar_url` из метаданных пользователя Supabase, поэтому иконка остаётся «пустой».

## Что сделать

В `src/components/SiteHeader.tsx`:

1. Добавить состояние `avatarUrl: string | null` и `displayName: string | null`.
2. В существующих `getSession()` и `onAuthStateChange` обработчиках читать:
   - `session.user.user_metadata.avatar_url` или `picture` (Google кладёт в `picture`, Apple обычно без фото),
   - `session.user.user_metadata.full_name` / `name` / `email` для инициалов.
3. Заменить блок-«аватар» внутри `<SheetTrigger>` (строки 102–104):
   - Если есть `avatarUrl` → `<img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" referrerPolicy="no-referrer" />`.
   - Иначе, если есть имя/почта → круг с инициалом (одна буква, `bg-secondary text-foreground/80`).
   - Иначе (гость) → текущая иконка `<User />`.
4. Добавить `onError` на `<img>`, который сбрасывает `avatarUrl` в `null` — на случай, если Google-картинка не загрузится (CORS / 403), чтобы откатиться к инициалу/иконке.

Меняем только презентацию в шапке, бизнес-логику и auth не трогаем.

## Технические детали

- `referrerPolicy="no-referrer"` нужен для аватарок Google (`lh3.googleusercontent.com`), иначе часть запросов возвращает 403.
- Инициал берём первым символом `full_name` → `name` → `email`, в `toUpperCase()`.
- Никаких новых запросов в БД — всё уже есть в `session.user.user_metadata`.
