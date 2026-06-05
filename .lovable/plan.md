## Заменить "Телефон / WhatsApp" на отдельные поля Телефон и Telegram

### Изменения

**1. Миграция БД** — добавить колонку `telegram` в `guide_applications`:
```sql
ALTER TABLE public.guide_applications ADD COLUMN telegram text NOT NULL DEFAULT '';
```

**2. `src/routes/become-a-guide.tsx`**
- Лейбл `"Телефон / WhatsApp"` → `"Телефон"` (строка 253)
- Добавить новое поле `Telegram` (необязательное) под телефоном с placeholder `@username`
- В `FormState`, `emptyForm`, `finalSchema` добавить `telegram: z.string().trim().max(64).optional()` (или пустая строка)
- Передавать `telegram` при insert в Supabase (строка ~453)
- В summary-таблице (строка 720) добавить строку `["Telegram", form.telegram || "—"]`

**3. `src/lib/email-templates/guide-application-admin.tsx`**
- Добавить опциональное поле `telegram?: string` и вывод `<Text><b>Telegram:</b> {telegram}</Text>`
- Передавать `telegram` из вызывающего кода

**4. `src/routes/admin.tsx`**
- В типе заявки и в отображении (строка ~1609) добавить `telegram` рядом с email/phone

### Результат
Форма «Как с вами связаться?» спрашивает Имя, Email, Телефон, Telegram (необязательно). WhatsApp полностью убран из текста и логики.