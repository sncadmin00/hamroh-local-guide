Удалить секцию "Свежее от гидов" (LatestPosts) с главной страницы.

1. Убрать импорт `LatestPosts` и `<LatestPosts />` из `src/routes/index.tsx`.
2. Удалить неиспользуемые i18n-ключи `latest.title` и `latest.subtitle` из `src/lib/i18n.tsx`.

Компонент `LatestPosts.tsx` и хук `useLatestPosts` остаются в кодовой базе (могут пригодиться позже), но больше не рендерятся на главной.