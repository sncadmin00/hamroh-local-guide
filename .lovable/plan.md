## Goal

Make guide cards visually identical to category cards so they stand out from the cream page background as crisp white squares.

## Reference (category card styling)

`PopularCategoriesCarousel.tsx`:
```
rounded-2xl bg-card
shadow-[0_6px_20px_-8px_rgba(0,0,0,0.18)]
ring-1 ring-black/5
hover: shadow-[0_12px_28px_-10px_rgba(0,0,0,0.25)]
```

## Change

Update the card surface in `src/components/GuideCard.tsx`:

- Replace `border border-border ... shadow-[var(--shadow-card)] ... hover:shadow-lg` with the exact category card classes above.
- Keep the existing `aspect-square` shape and inner layout (circular avatar, name/city/rating, languages, tours, "From $X").
- Keep the lift-on-hover transition (`-translate-y-0.5`) for parity with current motion.

## Result

Guide cards become solid white squares with the same soft shadow + faint ring used by category cards, popping off the cream background identically.
