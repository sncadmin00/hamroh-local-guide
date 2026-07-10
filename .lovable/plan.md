## Публичные хуки для мобильной верификации гида

Добавить два публичных эндпоинта (`/api/public/hooks/*`), чтобы мобилка не дёргала TanStack server functions напрямую. Загрузка файлов в Storage — с клиента (мобилки) напрямую через Supabase JS, хуки только пишут в `guides` и корректно сбрасывают флаги верификации.

### 1. `POST /api/public/hooks/submit-identity`
Аналог `submitIdentity`. Требует авторизации (Bearer access token в заголовке).

Тело:
```json
{ "phone": "string 5..40", "passport_path": "string, e.g. {guide_id}/passport-....jpg" }
```

Логика:
- Находит `guides` по `user_id = auth.uid()`.
- Проверяет, что `passport_path` начинается с `{guide.id}/` (защита от чужой папки).
- UPDATE `guides` одним апдейтом:
  - `identity_phone`, `identity_passport_url = passport_path`
  - `identity_submitted_at = now()`
  - `identity_verified = false`, `identity_rejected_reason = null`
- Ответ: `{ ok: true }`.

Storage контракт для мобилки:
- Бакет `guide-identity` (приватный).
- Путь на запись: `{guide_id}/passport-{timestamp}.{ext}` (jpg/png/pdf).
- RLS уже настроена: гид пишет/читает только свою папку.

### 2. `POST /api/public/hooks/submit-license`
Новый self-serve флоу — сейчас `licensed` ставит только админ.

Тело:
```json
{ "license_path": "string, e.g. {guide_id}/license-....pdf" }
```

Логика:
- Находит `guides` по `user_id = auth.uid()`.
- Проверяет префикс `{guide.id}/`.
- UPDATE `guides`:
  - `license_url = license_path`
  - `licensed = false` (сбрасывается на непроверенный)
  - `licensed_at = null`
- Отправляет админу in-app уведомление (`notifications`, тип `license_review`) — аналогично identity submit.
- Ответ: `{ ok: true }`.

Триггер `prevent_guide_trust_field_tampering` в текущем виде запретит выставить `licensed=false` из-под гида. Модифицируем триггер: разрешить гиду ставить `licensed = false` (только «понижение» + при этом должен обновляться `license_url`); подъём `licensed = true` по-прежнему только у админа/сервисной роли. Аналогично для `licensed_at`.

Формат файла — JPEG/PNG/PDF, ограничение размера проверяем на сервере (макс 10 MB) и на клиенте.

### 3. `GET /api/public/hooks/my-verification`
Обёртка над `getMyVerification` для мобилки. Возвращает статусы + свежие signed URL на `passport` / `license` / `intro_video`:

```json
{
  "identity": { "verified": bool, "phone": "...", "submitted_at": "...", "rejected_reason": "...", "passport_signed_url": "..." },
  "license":  { "licensed": bool, "submitted_at": "...", "license_signed_url": "..." },
  "intro_video": { "verified": bool, "submitted_at": "...", "rejected_reason": "...", "video_signed_url": "..." }
}
```

TTL signed URL — 1 час.

### Что НЕ делаем
- `submit-intro-video` не создаём — гид грузит видео-открытку из веб-профиля, отдельного мобильного хука не нужно.
- Веб-кабинет (`VerificationPanel.tsx`, `ProfilePanel.tsx`) не трогаем — они продолжают вызывать server functions.

### Файлы
- Новые route-файлы:
  - `src/routes/api/public/hooks/submit-identity.ts`
  - `src/routes/api/public/hooks/submit-license.ts`
  - `src/routes/api/public/hooks/my-verification.ts`
- Миграция: доработать `prevent_guide_trust_field_tampering`, чтобы разрешить гиду понижать `licensed` до `false` вместе с обновлением `license_url`.

### Технические детали для мобилки
- Все хуки требуют `Authorization: Bearer <supabase access_token>`; внутри хука клиент создаётся через `SUPABASE_URL` + publishable key и передаёт токен → RLS работает как обычный пользователь.
- Мобилка сначала грузит файл в Storage напрямую (`supabase.storage.from('guide-identity').upload(path, file)`), потом дёргает хук с получившимся `path`.
- Путь всегда `{guide_id}/...`, где `guide_id` мобилка получит из `/api/public/hooks/my-verification` (там же в ответе можно вернуть `guide_id`).
