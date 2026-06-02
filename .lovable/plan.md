## Chto nado sdelat

V komponente `GuidePostsFeed.tsx`:

1. Zamenit obertyvayushchiy `<a>` element na `<div>`, chtoby kartochki postov ne byli klikabelnymi.
2. Ubrat atributy `href`, `target`, `rel`.
3. Ubrat effekty, assoczirovannye s ssylkoy: `hover:-translate-y-0.5`, `hover:shadow-[var(--shadow-elegant)]`, `group-hover:scale-105`, `transition-all`.
4. Ubrat import `ExternalLink`, poskolku on ispolzuetsya tolko dlya platformy "other" (link), a ssylki teper ne nujny.
5. Platforma "other" mozhet byt otobrajena s prostyim tekstovym labelom vmesto ikonki ssylki.

Itog: lenta postov ostaetsya vizualno priyatnoy, no polnostyu neklikabelnoy. Klient ne mozhet pereyti na post gidaa napryamuyu.