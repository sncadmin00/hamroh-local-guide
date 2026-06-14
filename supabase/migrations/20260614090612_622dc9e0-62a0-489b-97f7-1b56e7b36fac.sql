-- ===== legal_offers =====
CREATE TABLE public.legal_offers (
  version text PRIMARY KEY,
  content_ru text NOT NULL,
  content_en text NOT NULL,
  content_uz text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.legal_offers TO anon, authenticated;
GRANT ALL ON public.legal_offers TO service_role;

ALTER TABLE public.legal_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read offers"
  ON public.legal_offers FOR SELECT
  USING (true);

CREATE POLICY "Admins manage offers"
  ON public.legal_offers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only one is_current = true at a time
CREATE UNIQUE INDEX legal_offers_one_current
  ON public.legal_offers ((is_current)) WHERE is_current = true;

-- ===== guide_offer_acceptances =====
CREATE TABLE public.guide_offer_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  version text NOT NULL REFERENCES public.legal_offers(version),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text,
  UNIQUE (guide_id, version)
);

CREATE INDEX guide_offer_acceptances_guide_idx
  ON public.guide_offer_acceptances (guide_id);

GRANT SELECT, INSERT ON public.guide_offer_acceptances TO authenticated;
GRANT ALL ON public.guide_offer_acceptances TO service_role;

ALTER TABLE public.guide_offer_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guides see own acceptances"
  ON public.guide_offer_acceptances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guides g
      WHERE g.id = guide_offer_acceptances.guide_id
        AND g.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Guides record own acceptance"
  ON public.guide_offer_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guides g
      WHERE g.id = guide_offer_acceptances.guide_id
        AND g.user_id = auth.uid()
    )
  );

-- ===== bookings columns =====
ALTER TABLE public.bookings
  ADD COLUMN offer_version text,
  ADD COLUMN offer_accepted_at timestamptz;

-- ===== seed initial offer v1.0 =====
INSERT INTO public.legal_offers (version, is_current, content_ru, content_en, content_uz)
VALUES (
  'v1.0',
  true,
  E'# Публичная оферта Hamroh\n\n**Версия v1.0**\n\n## 1. Общие положения\nНастоящая публичная оферта (далее — «Оферта») регулирует отношения между платформой Hamroh (далее — «Платформа») и пользователями: гидами и клиентами. Использование Платформы означает полное и безоговорочное принятие условий настоящей Оферты.\n\n## 2. Предмет\nПлатформа предоставляет сервис для поиска, бронирования и проведения экскурсий и туров с участием независимых гидов. Платформа не является туроператором и выступает посредником.\n\n## 3. Обязанности гида\n- Достоверно описывать туры и предоставлять качественные услуги.\n- Соблюдать законодательство Республики Узбекистан.\n- Своевременно подтверждать бронирования и быть на связи с клиентом.\n- Выплачивать комиссию Платформы согласно действующим тарифам.\n\n## 4. Обязанности клиента\n- Указывать достоверные данные при бронировании.\n- Соблюдать правила, установленные гидом (время, дресс-код, поведение).\n- Оплачивать тур согласно выбранному способу (онлайн или наличными гиду).\n\n## 5. Оплата и комиссии\nПри онлайн-оплате Платформа удерживает комиссию из суммы оплаты и переводит остаток гиду. При оплате наличными гид перечисляет комиссию Платформы по ежемесячному счёту (Net Settlement Statement).\n\n## 6. Отмена и возврат\nУсловия отмены регулируются Refund Policy, размещённой на сайте.\n\n## 7. Ответственность\nПлатформа не несёт ответственности за действия гидов и клиентов вне рамок Сервиса. Гид несёт полную ответственность за качество и безопасность оказываемых услуг.\n\n## 8. Изменения\nПлатформа вправе обновлять условия Оферты. Новая версия требует повторного принятия.\n\n## 9. Контакты\nПо всем вопросам: support@hamroh.uz',
  E'# Hamroh Public Offer\n\n**Version v1.0**\n\n## 1. General\nThis public offer (the "Offer") governs the relationship between the Hamroh platform (the "Platform") and its users — guides and clients. Using the Platform constitutes full acceptance of this Offer.\n\n## 2. Subject\nThe Platform provides a service for discovering, booking and conducting tours and experiences with independent guides. The Platform is not a tour operator and acts as an intermediary.\n\n## 3. Guide obligations\n- Provide accurate descriptions and quality services.\n- Comply with the laws of the Republic of Uzbekistan.\n- Confirm bookings promptly and stay in touch with the client.\n- Pay the Platform commission according to the current rates.\n\n## 4. Client obligations\n- Provide accurate information at booking.\n- Follow rules set by the guide (timing, dress code, behaviour).\n- Pay for the tour via the chosen method (online or cash to the guide).\n\n## 5. Payments and commissions\nFor online payments the Platform withholds commission and transfers the remainder to the guide. For cash payments the guide settles the Platform commission via a monthly Net Settlement Statement.\n\n## 6. Cancellation and refund\nCancellation terms are governed by the Refund Policy published on the website.\n\n## 7. Liability\nThe Platform is not responsible for actions of guides or clients outside the Service. The guide bears full responsibility for the quality and safety of the services provided.\n\n## 8. Changes\nThe Platform may update the Offer. A new version requires re-acceptance.\n\n## 9. Contacts\nFor all inquiries: support@hamroh.uz',
  E'# Hamroh ommaviy oferta\n\n**Versiya v1.0**\n\n## 1. Umumiy qoidalar\nUshbu ommaviy oferta (keyingi o''rinlarda — «Oferta») Hamroh platformasi (keyingi o''rinlarda — «Platforma») va foydalanuvchilar — gidlar va mijozlar o''rtasidagi munosabatlarni tartibga soladi. Platformadan foydalanish Ofertaning to''liq qabul qilinishini bildiradi.\n\n## 2. Predmet\nPlatforma mustaqil gidlar bilan birga sayohat va ekskursiyalarni topish, bron qilish va o''tkazish uchun xizmat ko''rsatadi. Platforma turoperator emas va vositachi sifatida ishlaydi.\n\n## 3. Gidning majburiyatlari\n- Turlarni aniq tasvirlash va sifatli xizmat ko''rsatish.\n- O''zbekiston Respublikasi qonunchiligiga rioya qilish.\n- Bronlarni o''z vaqtida tasdiqlash va mijoz bilan aloqada bo''lish.\n- Joriy tariflar bo''yicha Platforma komissiyasini to''lash.\n\n## 4. Mijozning majburiyatlari\n- Bron qilishda to''g''ri ma''lumotlarni ko''rsatish.\n- Gid belgilagan qoidalarga rioya qilish (vaqt, kiyim, xulq-atvor).\n- Tanlangan usul orqali (onlayn yoki naqd gidga) tur uchun to''lov qilish.\n\n## 5. To''lovlar va komissiyalar\nOnlayn to''lovlarda Platforma komissiyani ushlab qoladi va qolgan summani gidga o''tkazadi. Naqd to''lovlarda gid Platforma komissiyasini oylik hisob-kitob (Net Settlement Statement) orqali to''laydi.\n\n## 6. Bekor qilish va qaytarish\nBekor qilish shartlari saytda joylashtirilgan Refund Policy bilan tartibga solinadi.\n\n## 7. Javobgarlik\nPlatforma Xizmatdan tashqari gidlar va mijozlarning harakatlari uchun javobgar emas. Gid ko''rsatilayotgan xizmatlarning sifati va xavfsizligi uchun to''liq javobgar.\n\n## 8. O''zgartirishlar\nPlatforma Oferta shartlarini yangilashga haqli. Yangi versiya qayta qabul qilishni talab qiladi.\n\n## 9. Aloqa\nBarcha savollar bo''yicha: support@hamroh.uz'
);