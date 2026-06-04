# Упростить иконки соцсетей в футере

## Что делаем
Оставить в футере только реальные соцсети проекта (Instagram и Telegram). Убрать заглушки TikTok, YouTube и X/Twitter.

## Изменения

### `src/components/SiteFooter.tsx`
- Удалить иконку TikTok (ссылка на `@yourhandle`)
- Удалить иконку YouTube (ссылка на `@yourhandle`)
- Удалить иконку X/Twitter (ссылка на `@yourhandle`)
- Оставить Instagram (`https://www.instagram.com/hamrohguides/`)
- Оставить Telegram (`https://t.me/hamroh`)
- Убрать неиспользуемые импорты `Youtube`, `Music2`, `Twitter` из `lucide-react`

### Telegram-ссылка
Пользователь указал, что Telegram-канал будет. Вопрос: какая именно ссылка на канал?
- Сейчас стоит `https://t.me/hamroh` — это правильная ссылка или нужно обновить?