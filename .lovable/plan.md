## Cel

1. Pochistit shapku v stile Airbnb: ubrat lishnie ikonki, sdelat dyhaniya i bolshe vozduxa.
2. Dobavit Wishlist: serdechki na karto4kah gidov, turov i gorodah; otdelnaya stranica /wishlist; gostevoy rezhim cherez localStorage s migraciey v BD posle login.

---

## 1. Chistka shapki (SiteHeader)

**Ubirayem:**
- WhatsApp i Telegram ikonki iz desktop-shapki (ostavlyaem v mobile sheet menu, oni tam uzhe est).
- Yarkuyu BOOK pill iz centra/spravo \u2014 zamenyaem na obychnyy menu-link "Book" v navigacii (chtoby ne kri4al cvetom).
- "Sign in" knopku iz desktop-shapki \u2014 prevrashchaem v krugluyu avatar-ikonku v stile Airbnb (User icon esli ne zalogen, initsialy esli zalogen) \u2014 klik otkryvaet to zhe Sheet-menu.

**Dobavlyaem:**
- Heart-ikonku Wishlist sprava ot logo (na desktop) i v Sheet menu (na mobile). Klik vedet na /wishlist.

**Itog:** sleva logo, po centru chistyy nav (Find a guide / Tours / Cities / Become a guide), sprava \u2014 wishlist heart, jazyk, krugloe menu (avatar + gamburger v odnom pille, kak v Airbnb).

```text
[logo Hamroh]    Find a guide   Tours   Cities   Become a guide    [\u2661] [RU \u25be]  [\u2630 \u29be]
```

---

## 2. Wishlist (dannye)

**Novaya tablica `public.wishlists`:**
```sql
create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  item_type text not null check (item_type in ('guide','tour','city')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

grant select, insert, delete on public.wishlists to authenticated;
grant all on public.wishlists to service_role;

alter table public.wishlists enable row level security;
create policy "Users view own wishlist" on public.wishlists for select to authenticated using (auth.uid() = user_id);
create policy "Users add to own wishlist" on public.wishlists for insert to authenticated with check (auth.uid() = user_id);
create policy "Users remove from own wishlist" on public.wishlists for delete to authenticated using (auth.uid() = user_id);
```

**Gostevoy rezhim:**
- Kogda yuzer ne zalogen \u2014 wishlist hranitsya v `localStorage` po klyuchu `hamroh:wishlist` kak `[{type, id}, ...]`.
- Posle uspeshnogo login \u2014 migraciya: prochitat localStorage, vyzvat server-fn `migrateGuestWishlist` (insert ... on conflict do nothing), o4istit localStorage.

---

## 3. Wishlist (client)

**Hook `useWishlist()`** v `src/hooks/useWishlist.ts`:
- Vozvrashchaet `items: Set<string>` (klyuch `${type}:${id}`), `toggle(type, id)`, `isWishlisted(type, id)`.
- Pri zaloge \u2014 podpisyvaetsya na TanStack Query (`['wishlist', userId]`) cherez server-fn `listWishlist`.
- Mutaciya cherez `addWishlistItem` / `removeWishlistItem` server-fns, s optimisticheskim apdeitom.
- Pri otsutstvii sessii \u2014 chitaet/pishet localStorage, broadcastit cherez kustomnoe event `wishlist:change`.

**Komponent `<WishlistHeart>`** v `src/components/WishlistHeart.tsx`:
- `<WishlistHeart type="guide" id={...} className="..." />`
- Render: krugloe poluprozra4noe kabashon s `Heart` iz lucide; pri active \u2014 `fill="currentColor"` cveta `destructive` (krasnyy).
- Stop propagation pri klike (chtoby ne triggerit Link na karto4ke).
- Toast "Saved to wishlist" / "Removed".

**Gde stavim serdechko:**
- `GuideCard` \u2014 absolutno v pravom-verxnem uglu kartinki.
- Karto4ka tura v `TopTours` i `ExploreTabs` \u2014 to zhe samoe.
- Stranica gida `/guides/$guideId` \u2014 ryadom s imenem.
- Stranica tura `/tours/$slug` \u2014 ryadom s zagolovkom.
- Chip goroda v `PopularCities` \u2014 malenkoe serdechko vnutri chipa sprava (toggle pri klike, ne perehod).

---

## 4. Stranica `/wishlist`

Novyy fayl `src/routes/wishlist.tsx`:
- Hed: `<title>My wishlist \u00b7 Hamroh</title>` + noindex.
- Tri sekcii s tabami: Guides / Tours / Cities.
- Esli zalogen \u2014 podgruzhayut polnye obekty cherez Query (`useGuides`, `useTours`, `useCities`) i filtruyut po item_id iz wishlist.
- Esli gost \u2014 to zhe samoe, no source \u2014 localStorage.
- Pustoe sostoyanie: "Tap the heart on any guide, tour or city to save it here."

---

## 5. Server functions

`src/lib/wishlist.functions.ts`:
- `listWishlist` (GET, requireSupabaseAuth) \u2014 vozvrashchaet vse zapisi yuzera.
- `addWishlistItem({type, id})` (POST, auth, Zod validator).
- `removeWishlistItem({type, id})` (POST, auth).
- `migrateGuestWishlist({items})` (POST, auth) \u2014 bulk insert on conflict do nothing.

---

## 6. i18n keys

V `src/lib/i18n.tsx` dobavit:
- `wishlist.title` = "My wishlist"
- `wishlist.empty` = "Tap the heart on any guide, tour or city to save it here."
- `wishlist.tabs.guides|tours|cities`
- `wishlist.saved` = "Saved to wishlist"
- `wishlist.removed` = "Removed from wishlist"
- `nav.wishlist` = "Wishlist"

(s uz / ru perevodami)

---

## Chto NE menyaem

- `ExploreTabs`, `PopularCities` logiku (tolko vstavlyaem heart v markup chipa/kartochki).
- AI poisk pod shapkoy, hero text, footer.
- Lyubye drugie marshruty i RLS na sushchestvuyushchih tablicah.