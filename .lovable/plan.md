## Hero image edges

Update `src/components/home/HeroSearch.tsx` so the hero photo has crisp edges on three sides and only fades on the left:

- Remove the top fade overlay (`linear-gradient(180deg, var(--background)…)`) so the sky meets the header with a clean edge.
- Remove the bottom fade overlay so the bottom of the photo is a sharp line against the cream background.
- Keep the right edge untouched (no overlay there today — stays sharp).
- Add a new left-side fade overlay: a horizontal gradient from `var(--background)` at 0% to `transparent` around 25–35%, full height, `pointer-events-none`, sitting above the image. This blends the left edge of the photo into the app's cream background.
- Header text/search currently sit over the image; with the top fade gone, keep header readability via the existing text-shadow on the H1/subtitle (already in place). No header restyle needed.

No other components or tokens change.