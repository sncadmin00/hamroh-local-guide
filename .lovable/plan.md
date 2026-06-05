## Проблема

Форма "Как с вами связаться?" не подставляет данные автоматически, потому что в коде нет логики чтения текущего пользователя Supabase — `form` инициализируется пустыми строками, а потом перезаписывается только из черновика в `localStorage`. Google-логин даёт нам `email` и `user_metadata.full_name` / `name`, но мы их никуда не подставляем.

## План

Добавить в `src/routes/become-a-guide.tsx` `useEffect`, который при монтировании читает текущего пользователя и подставляет значения в поля **только если они пустые** (чтобы не затирать черновик и ввод пользователя):

1. Вызвать `supabase.auth.getUser()`.
2. Если пользователь есть — взять:
   - `email` → `user.email`
   - `full_name` → `user.user_metadata.full_name || user.user_metadata.name`
   - `phone` → `user.phone` (если есть)
3. Обновить `setForm((f) => ({ ...f, full_name: f.full_name || nameFromAuth, email: f.email || emailFromAuth, phone: f.phone || phoneFromAuth }))`.
4. Подписаться на `onAuthStateChange`, чтобы если человек логинится прямо на странице — поля тоже подтянулись.

Telegram не подставляем — Google его не отдаёт.

Никакие другие файлы и логика не трогаются.
