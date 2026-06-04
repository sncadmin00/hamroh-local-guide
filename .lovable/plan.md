## Plan

1. Make the steps animate with a reliable CSS class instead of inline animation shorthand.
2. Add a dedicated `.step-sequence-item` animation in `src/styles.css` that starts hidden and keeps its final visible state.
3. Apply staggered CSS delays to the three step items in `src/routes/index.tsx` so `1`, then `2`, then `3` appear one after another.
4. Respect reduced-motion settings so the steps remain visible for users who disable animations.

## Technical details

- Replace `style={{ animation: ... }}` with CSS variables like `--step-delay` to avoid inline shorthand issues.
- Use `animation-fill-mode: both` and an initial `opacity: 0` in the CSS class.
- Keep the existing layout/text unchanged.