Rebrand from **Hamroh** to **Sancho** across the entire codebase.

### Scope
Replace every user-facing occurrence of "Hamroh" with "Sancho" in copy, meta tags, page titles, AI prompts, and translations. No layout, logic, or database changes.

### Files to update
1. **src/routes/__root.tsx** — title, og:title
2. **src/routes/index.tsx** — title, description
3. **src/routes/guides.tsx** — title
4. **src/routes/explore.tsx** — title, og:title
5. **src/routes/explore.$slug.tsx** — title, description
6. **src/routes/book.$guideId.tsx** — title
7. **src/routes/guides.$guideId.tsx** — title
8. **src/routes/how-it-works.tsx** — title, description, og:title
9. **src/routes/become-a-guide.tsx** — title, description
10. **src/routes/login.tsx** — title, logo text, subtitle, account prompt text
11. **src/routes/settings.tsx** — title, logo text
12. **src/routes/admin.tsx** — title, logo text
13. **src/routes/ai.tsx** — title
14. **src/routes/ai.$threadId.tsx** — footer attribution text
15. **src/routes/api/chat.ts** — AI system prompt persona name
16. **src/components/SiteHeader.tsx** — logo text
17. **src/components/SiteFooter.tsx** — logo text, copyright line
18. **src/lib/i18n.tsx** — "Hamroh AI" in hero.subtitle (en/uz/ru)

### Out of scope
- No database migrations
- No visual design changes
- No functionality changes
- File names and internal code references stay as-is