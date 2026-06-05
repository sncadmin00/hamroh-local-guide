## Cel'

Prevratit' odnostranichnuyu formu `/become-a-guide` v poshagoviy interaktivniy master s AI-pomoshchnikom, kotoriy:
- vedyot kandidata po shagam (odin ekran — odin vopros/blok),
- pomogaet napisat tekst "Pro sebya" na osnove korotkih otvetov,
- predlagaet udobnuyu zagruzku foto i syomku video pryamo s kamery,
- pokazyvaet progress i daet vozmozhnost vernut'sya nazad.

Backend (tablitsa `guide_applications`, buckety, notifikatsii) ostayotsya bez izmeneniy — menyaem tol'ko UX i dobavlyaem odnu AI server-funktsiyu.

---

## Shagi mastera

```text
1. Privetstvie       — chto eto, skol'ko zaymyot (~3 min), knopka "Nachat'"
2. Kontakty          — imya, email, telefon
3. Gorod i opyt      — gorod (select), let opyta
4. Yazyki            — chip-vybor (mozhno neskol'ko)
5. Spetsializatsiya  — chipy kategoriy + korotkiy text
6. Pro sebya s AI    — 3-4 bystryh voprosa -> AI sostavlyaet chernovik -> edit
7. Portret           — kamera ILI vybrat' foto
8. Foto turov        — do 5 shtuk, drag/multi-select, preview
9. Video-privetstvie — zapis' s kamery ILI zagruzka (opts.)
10. Proverka         — vsye dannye, knopka "Otpravit'"
11. Uspeh            — tekushchiy `submitted` ekran
```

Sverhu — progress-bar (`Shag X iz 10`), snizu — knopki "Nazad" / "Dalee". Validatsiya tekushchego shaga pered perehodom. Sostoyanie hranitsya v `localStorage` (`guide-application-draft-v1`), chtoby ne teryat' progress.

## AI-pomoshchnik dlya "Pro sebya"

Noviy server-fn `generateGuideBio` v `src/lib/guide-application.functions.ts`:
- vhod: `{ name, city, years, languages[], specializations[], answers: { highlight, style, why } }`
- vyzyvayet Lovable AI Gateway (`google/gemini-3-flash-preview`) cherez `createLovableAiGatewayProvider` iz `src/lib/ai-gateway.server.ts`
- `generateText` s sistemnym promptom: "Napishi tyoplyy, chestnyy tekst 'O sebe' dlya gida ot pervogo litsa, 3-5 predlozheniy, na yazyke otveta pol'zovatelya"
- vozvrashchaet `{ bio: string }`

Na shage 6:
- 3 korotkih `<textarea>`: "Chto vy obyazatel'no pokazhete?", "Kak vy vedete tury?", "Pochemu vam eto nravitsya?"
- knopka "Sostavit' s pomoshchyu AI" -> loader -> rezul'tat popadaet v `form.about`, kotoriy mozhno otredaktirovat'
- knopka "Peresostavit'" dlya novogo varianta

## Kamera dlya video i foto

Ispol'zuem native `<input type="file" accept="image/*" capture="user">` dlya portreta i `accept="video/*" capture="user"` dlya video — eto otkryvaet kameru na mobil'nyh ustroystvah. Dve knopki ryadom:
- "Snyat' kameroy" (s `capture`)
- "Vybrat' iz galerei" (bez `capture`)

Dlya foto turov — `multiple` vybor s preview-setkoy (kak seychas), plyus drag-and-drop zona.

## Tehnicheskie detali

**Noviye/izmenyaemiye fayly:**
- `src/routes/become-a-guide.tsx` — perepisat' kak `<Wizard>` s shagami. Vsya logika otpravki, validatsiya schemy i zagruzka v Supabase ostayutsya.
- `src/components/become-guide/WizardShell.tsx` — obyortka: progress, navigatsiya, animatsii perehodov (framer-motion uzhe est').
- `src/components/become-guide/steps/*.tsx` — po odnomu komponentu na shag (~10 faylov, kazhdyy malen'kiy).
- `src/lib/guide-application.functions.ts` — `generateGuideBio` server-fn (publichnaya, bez auth, t.k. zayavku mozhet podavat' negost').
- `src/lib/ai-gateway.server.ts` — uzhe sushchestvuet, pereispol'zuem.

**Sohranenie chernovika:** `useEffect` -> `localStorage`. Ochishchaem posle uspeshnoy otpravki. Fayly (File objects) ne serializuyutsya — sohranyaem tol'ko tekstovye polya.

**Animatsii:** lyogkiy fade/slide mezhdu shagami cherez Framer Motion `AnimatePresence`.

**Dostupnost':** focus na pervoye pole pri smene shaga, Enter = "Dalee" v poslednem pole, ARIA-live dlya progressa.

## Chego NE delaem

- Ne menyaem `guide_applications` shemu, RLS, buckety, admin-notifikatsii.
- Ne trogaem ostal'noy onboarding (CalendarPanel, GuideAIPanel i t.d.).
- Ne dobavlyaem golosovoy vvod (mozhno pozzhe).
