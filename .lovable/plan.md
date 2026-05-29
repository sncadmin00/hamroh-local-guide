Move the "Find a guide" search bar from its current position inside the hero section down to a standalone floating bar placed between the hero banner and the "Travel like a local" features section.

What changes:
- Remove the search bar markup from inside the hero section in `src/routes/index.tsx`.
- Add a new section immediately after the hero's closing `</section>` tag, containing the same search bar styled as a floating card (`-mt-8 relative z-10`) so it overlaps the bottom of the hero slightly.
- Keep the search bar's styling (rounded-2xl, shadow, backdrop blur) and the "All cities" / "Find a guide" CTA intact.
- The AI assistant CTA and trust badges remain inside the hero.