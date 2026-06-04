Заменить классы анимации на inline `style` с `animation` shorthand и `both` fill-mode, чтобы шаги 1, 2, 3 гарантированно появлялись по очереди.

В `src/routes/index.tsx` (блок «Steps above the search»):
- Убрать `opacity-0 animate-fade-in` из className
- Заменить inline style на: `{ animation: \`fade-in 0.6s ease-out ${i * 400}ms both\` }`

Keyframes `fade-in` уже добавлены в `src/styles.css` — проверить и при необходимости передобавить.