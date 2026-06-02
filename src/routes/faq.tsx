import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpCircle, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Hamroh" },
      { name: "description", content: "Frequently asked questions about booking local guides with Hamroh." },
      { property: "og:title", content: "FAQ — Hamroh" },
      { property: "og:description", content: "Frequently asked questions about booking local guides with Hamroh." },
    ],
  }),
  component: FaqPage,
});

const faqData: Record<string, { question: { en: string; uz: string; ru: string }; answer: { en: string; uz: string; ru: string } }[]> = {
  en: [
    {
      question: { en: "What is Hamroh?", uz: "Hamroh nima?", ru: "Что такое Hamroh?" },
      answer: { en: "Hamroh is a platform that connects travelers with verified local guides. You can browse, chat, and book personalized tours and experiences directly.", uz: "Hamroh — sayyohlarni tasdiqlangan mahalliy hamrohlar bilan uchtiruvchi platforma. Siz shaxsiy sayohatlar va tajribalarni to'g'ridan-to'g'ri ko'rib chiqishingiz, suhbatlashishingiz va bron qilishingiz mumkin.", ru: "Hamroh — это платформа, которая соединяет путешественников с проверенными местными гидами. Вы можете просматривать, общаться и бронировать персональные туры и впечатления напрямую." },
    },
    {
      question: { en: "How do I book a guide?", uz: "Hamrohni qanday bron qilaman?", ru: "Как забронировать гида?" },
      answer: { en: "Find a guide you like, open their profile, pick your dates, and send a booking request. The guide will confirm or suggest alternatives within a short time.", uz: "Sizga yoqqan hamrohni toping, uning profilini oching, sanalarni tanlang va bron so'rovini yuboring. Hamroh qisqa vaqt ichida tasdiqlaydi yoki alternativani taklif qiladi.", ru: "Найдите понравившегося гида, откройте его профиль, выберите даты и отправьте запрос на бронирование. Гид подтвердит или предложит альтернативу в короткие сроки." },
    },
    {
      question: { en: "Are the guides verified?", uz: "Hamrohlar tasdiqlanganmi?", ru: "Гиды проверены?" },
      answer: { en: "Yes. Every guide on Hamroh goes through a verification process including license checks, interviews, and traveler reviews.", uz: "Ha. Hamrohdagi har bir hamroh litsenziya tekshiruvi, suhbat va sayyohlarning sharhlarini o'z ichiga olgan tasdiqlash jarayonidan o'tadi.", ru: "Да. Каждый гид на Hamroh проходит процесс проверки, включающий проверку лицензии, собеседование и отзывы путешественников." },
    },
    {
      question: { en: "How much does it cost?", uz: "Narxi qancha?", ru: "Сколько это стоит?" },
      answer: { en: "Each guide sets their own rates. Prices are shown clearly on the guide's profile before you book. There are no hidden fees.", uz: "Har bir hamroh o'z narxlarni belgilaydi. Narxlar bron qilishdan oldin hamroh profilingda aniq ko'rsatilgan. Yashirin to'lovlar yo'q.", ru: "Каждый гид устанавливает свои тарифы. Цены чётко указаны в профиле гида до бронирования. Никаких скрытых платежей." },
    },
    {
      question: { en: "Can I cancel my booking?", uz: "Bronni bekor qilish mumkinmi?", ru: "Могу ли я отменить бронирование?" },
      answer: { en: "Yes. You can cancel from your My Bookings page. Cancellation policies depend on the guide's terms and how close the start date is.", uz: "Ha. Siz bronni 'Mening bronlarim' sahifasidan bekor qilishingiz mumkin. Bekor qilish siyosati hamroh shartlariga va boshlanish sanasiga qarab belgilanadi.", ru: "Да. Вы можете отменить бронирование на странице 'Мои бронирования'. Условия отмены зависят от правил гида и того, насколько близка дата начала." },
    },
    {
      question: { en: "What languages do guides speak?", uz: "Hamrohlar qaysi tillarni biladi?", ru: "На каких языках говорят гиды?" },
      answer: { en: "Our guides speak multiple languages including English, Russian, Uzbek, French, German, Korean, and more. Language skills are listed on each profile.", uz: "Bizning hamrohlarimiz ingliz, rus, o'zbek, fransuz, nemis, koreys va boshqa tillarni biladi. Til bilish darajasi har bir profilda ko'rsatilgan.", ru: "Наши гиды говорят на многих языках, включая английский, русский, узбекский, французский, немецкий, корейский и другие. Языковые навыки указаны в каждом профиле." },
    },
    {
      question: { en: "How do I become a guide?", uz: "Hamroh qanday bo'lish mumkin?", ru: "Как стать гидом?" },
      answer: { en: "Go to the 'Become a guide' page, fill out the application form, and submit your documents. Our team will review your application and get in touch.", uz: "'Hamroh bo'lish' sahifasiga o'ting, ariza shaklini to'ldiring va hujjatlaringizni yuboring. Bizning jamoamiz arizangizni ko'rib chiqib, siz bilan bog'lanadi.", ru: "Перейдите на страницу 'Стать гидом', заполните форму заявки и отправьте свои документы. Наша команда рассмотрит заявку и свяжется с вами." },
    },
    {
      question: { en: "How do I contact my guide before the tour?", uz: "Sayohatdan oldin hamroh bilan qanday bog'lanish mumkin?", ru: "Как связаться с гидом перед экскурсией?" },
      answer: { en: "Once your booking is confirmed, a chat is opened between you and your guide. You can coordinate details, ask questions, and plan your itinerary there.", uz: "Broningiz tasdiqlangandan so'ng, siz va hamrohingiz o'rtasida chat ochiladi. U yerda tafsilotlarni muvofiqlashtirishingiz, savollar berishingiz va marshrutni rejalashtirishingiz mumkin.", ru: "После подтверждения бронирования между вами и гидом открывается чат. Там можно согласовать детали, задать вопросы и спланировать маршрут." },
    },
    {
      question: { en: "What if I have a problem during my trip?", uz: "Sayohatim davomida muammo yuzaga kelsa-chi?", ru: "Что если возникнут проблемы во время поездки?" },
      answer: { en: "You can message our support team through the app or contact us via email. We are available to help resolve any issues quickly.", uz: "Siz ilova orqali qo'llab-quvvatlash jamoamizga xabar yuborishingiz yoki elektron pochta orqali bog'lanishingiz mumkin. Biz har qanday muammolarni tez hal qilish uchun siz bilan birgamiz.", ru: "Вы можете написать в нашу службу поддержки через приложение или связаться с нами по электронной почте. Мы готовы быстро помочь решить любые проблемы." },
    },
    {
      question: { en: "Is payment secure?", uz: "To'lov xavfsizmi?", ru: "Оплата безопасна?" },
      answer: { en: "Yes. All payments are processed securely. Your financial information is encrypted and never shared with guides directly.", uz: "Ha. Barcha to'lovlar xavfsiz tarzda amalga oshiriladi. Sizning moliyaviy ma'lumotlaringiz shifrlanadi va to'g'ridan-to'g'ri hamrohlarga uzatilmaydi.", ru: "Да. Все платежи обрабатываются безопасно. Ваша финансовая информация шифруется и никогда не передаётся гидам напрямую." },
    },
  ],
};

function FaqPage() {
  const { lang } = useI18n();
  const items = faqData.en;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <HelpCircle className="h-7 w-7" />
            </div>
            <h1 className="mt-6 font-display text-4xl md:text-5xl font-semibold">
              {lang === "ru" ? "Часто задаваемые вопросы" : lang === "uz" ? "Ko'p so'raladigan savollar" : "Frequently Asked Questions"}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {lang === "ru" ? "Всё, что нужно знать о бронировании гидов с Hamroh." : lang === "uz" ? "Hamroh bilan hamroh bron qilish haqida bilishingiz kerak bo'lgan hamma narsa." : "Everything you need to know about booking guides with Hamroh."}
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-3xl">
            <Accordion type="single" collapsible className="w-full">
              {items.map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-b border-border/60">
                  <AccordionTrigger className="text-left text-base font-semibold py-5 hover:no-underline">
                    {item.question[lang]}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                    {item.answer[lang]}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-24">
          <div className="mx-auto max-w-3xl rounded-3xl p-10 md:p-14 text-center" style={{ background: "var(--gradient-hero)" }}>
            <h2 className="font-display text-3xl font-semibold text-primary-foreground md:text-4xl">
              {lang === "ru" ? "Не нашли ответ?" : lang === "uz" ? "Javob topa olmadingizmi?" : "Still have questions?"}
            </h2>
            <p className="mt-3 text-lg text-primary-foreground/80">
              {lang === "ru" ? "Напишите нам, и мы с радостью поможем." : lang === "uz" ? "Bizga yozing, biz sizga yordam berishdan xursand bo'lamiz." : "Reach out and we will be happy to help."}
            </p>
            <Link
              to="/"
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-background px-7 text-sm font-semibold text-foreground transition-transform hover:scale-[1.02]"
            >
              {lang === "ru" ? "На главную" : lang === "uz" ? "Bosh sahifaga" : "Back to home"} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
