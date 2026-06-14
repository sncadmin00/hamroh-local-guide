import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Star, BadgeCheck, Zap, ArrowLeft, Check, Car, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PaymentMethods } from "@/components/PaymentMethods";
import { useTour, computeTourPrice, offeredCategories, GROUP_CATEGORY_MAX, GROUP_CATEGORY_LABEL, type GroupCategory } from "@/lib/content-queries";
import { getBookingSource } from "@/hooks/useTrackSource";
import { getGuideSlots, createBooking } from "@/lib/booking.functions";
import { useI18n } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import { getMyTelegramAccount } from "@/lib/telegram.functions";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";

export const Route = createFileRoute("/book/$slug")({
  head: () => ({ meta: [{ title: "Book a tour — Hamroh" }] }),
  component: BookPage,
});

function BookPage() {
  const { slug } = Route.useParams();
  const { data: tour, isLoading } = useTour(slug);
  const navigate = useNavigate();
  const { lang } = useI18n();
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slots, setSlots] = useState<Array<{ id: string; date: string; start_time: string; duration_minutes: number }>>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [telegramContact, setTelegramContact] = useState<{ telegram_user_id: number; telegram_chat_id: number | null; telegram_username: string | null } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [form, setForm] = useState({
    date: "",
    adults: 2,
    children: 0,
    category: null as GroupCategory | null,
    language: "",
    name: "",
    email: "",
    notes: "",
  });

  const fetchSlots = useServerFn(getGuideSlots);
  const createBookingFn = useServerFn(createBooking);
  const fetchTelegram = useServerFn(getMyTelegramAccount);

  useEffect(() => {
    if (!tour) return;
    fetchSlots({ data: { guide_id: tour.guide_id } })
      .then((rows) => setSlots(rows as typeof slots))
      .catch(() => setSlots([]));
  }, [tour, fetchSlots]);

  const loadTelegramContact = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setTelegramContact(null);
      return;
    }
    try {
      const result = await fetchTelegram();
      setTelegramContact(result.account as typeof telegramContact);
    } catch {
      setTelegramContact(null);
    }
  };

  useEffect(() => {
    loadTelegramContact();
  }, []);

  if (isLoading || !tour) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="container mx-auto px-4 py-24 text-center text-muted-foreground">Loading…</div>
        <SiteFooter />
      </div>
    );
  }

  const guide = tour.guides;
  const hasInstantSlots = slots.length > 0;
  const isInstantMode = hasInstantSlots && !!selectedSlot;
  const chosenSlot = slots.find((s) => s.id === selectedSlot) ?? null;
  const availableLanguages = tour.languages.length > 0 ? tour.languages : (guide?.languages ?? []);
  const currentLanguage = form.language || availableLanguages[0] || "";

  const handleFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const setAdults = (n: number) => setForm((f) => ({ ...f, adults: Math.min(50, Math.max(1, n)) }));
  const setChildren = (n: number) => setForm((f) => ({ ...f, children: Math.min(50, Math.max(0, n)) }));

  const categories = offeredCategories(tour);
  // Auto-pick category if not set
  const selectedCategory: GroupCategory | null = form.category
    ?? categories.find((c) => GROUP_CATEGORY_MAX[c] >= form.adults)
    ?? null;
  const adultsExceedAll = tour.pricing_mode === "by_group"
    && categories.length > 0
    && categories.every((c) => GROUP_CATEGORY_MAX[c] < form.adults);

  const computedPrice = computeTourPrice(tour, { category: selectedCategory, language: currentLanguage || null });
  const total = computedPrice ?? 0;
  const fee = Math.round(total * 0.05);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    if (hasInstantSlots && !selectedSlot) {
      toast.error("Please pick a time slot");
      return;
    }
    if (!form.email && !telegramContact?.telegram_chat_id) {
      toast.error("Add an email or link Telegram for booking updates");
      return;
    }
    setSubmitting(true);
    try {
      await createBookingFn({
        data: {
          tour_id: tour.id,
          slot_id: chosenSlot?.id ?? null,
          language: currentLanguage || undefined,
          date: chosenSlot?.date ?? form.date,
          start_time: chosenSlot?.start_time,
          duration_minutes: chosenSlot?.duration_minutes,
          adults: form.adults,
          children: form.children,
          group_category: tour.pricing_mode === "by_group" ? selectedCategory : null,
          customer_name: form.name,
          customer_email: form.email,
          customer_telegram_user_id: telegramContact?.telegram_user_id,
          customer_telegram_chat_id: telegramContact?.telegram_chat_id ?? undefined,
          customer_telegram_username: telegramContact?.telegram_username ?? undefined,
          notes: form.notes,
          source: getBookingSource(),
          locale: lang,
        },
      });
      setConfirmed(true);
      trackEvent("booking_created", { tour_id: tour.id, guide_id: tour.guide_id, instant: !!chosenSlot, total: total + fee });
      window.scrollTo({ top: 0 });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <section className="container mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold">You're booked!</h1>
          <p className="mt-3 text-muted-foreground">
            {guide?.name?.split(" ")[0] ?? "Your guide"} will meet you on{" "}
            <span className="font-medium text-foreground">{chosenSlot?.date ?? form.date}</span>. We've sent a confirmation to{" "}
            <span className="font-medium text-foreground">{form.email || "Telegram"}</span>.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/tours" className="rounded-full border border-input px-5 py-2.5 text-sm font-medium">Browse more tours</Link>
            <Link to="/" className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Back home</Link>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="container mx-auto px-4 pt-6">
        <button onClick={() => navigate({ to: "/tours/$slug", params: { slug: tour.slug } })} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to tour
        </button>
      </div>

      <section className="container mx-auto px-4 py-8 md:py-12">
        <h1 className="font-display text-4xl font-semibold md:text-5xl">Confirm your booking</h1>
        <p className="mt-2 text-muted-foreground">A few details and you're all set.</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl bg-card p-6 ring-1 ring-border/60 md:p-8">
            {hasInstantSlots ? (
              <div>
                <label className="text-sm font-medium inline-flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-accent" /> Pick an available slot (instant booking)
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {slots.map((s) => {
                    const on = selectedSlot === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSlot(s.id)}
                        className={`px-3 h-10 rounded-full text-sm ring-1 transition ${on ? "bg-accent text-accent-foreground ring-accent" : "bg-background ring-border hover:bg-muted"}`}
                      >
                        {s.date} · {s.start_time.slice(0, 5)} · {s.duration_minutes}m
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium">Date</label>
                <input type="date" required value={form.date} onChange={handleFieldChange} name="date" className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Adults</label>
                <div className="mt-2 inline-flex h-12 items-center rounded-xl border border-input bg-background">
                  <button type="button" onClick={() => setAdults(form.adults - 1)} disabled={form.adults <= 1} className="h-12 w-12 text-lg font-medium text-muted-foreground hover:text-foreground disabled:opacity-40">−</button>
                  <span className="w-10 text-center text-sm font-medium tabular-nums">{form.adults}</span>
                  <button type="button" onClick={() => setAdults(form.adults + 1)} className="h-12 w-12 text-lg font-medium text-muted-foreground hover:text-foreground">+</button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Children (under {tour.children_free_under})</label>
                <div className="mt-2 inline-flex h-12 items-center rounded-xl border border-input bg-background">
                  <button type="button" onClick={() => setChildren(form.children - 1)} disabled={form.children <= 0} className="h-12 w-12 text-lg font-medium text-muted-foreground hover:text-foreground disabled:opacity-40">−</button>
                  <span className="w-10 text-center text-sm font-medium tabular-nums">{form.children}</span>
                  <button type="button" onClick={() => setChildren(form.children + 1)} className="h-12 w-12 text-lg font-medium text-muted-foreground hover:text-foreground">+</button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Don't count toward the group size.</p>
              </div>
            </div>

            {tour.pricing_mode === "by_group" && categories.length > 0 && (
              <div>
                <label className="text-sm font-medium">Group size</label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {categories.map((c) => {
                    const active = selectedCategory === c;
                    const tooSmall = GROUP_CATEGORY_MAX[c] < form.adults;
                    return (
                      <button
                        key={c}
                        type="button"
                        disabled={tooSmall}
                        onClick={() => setForm({ ...form, category: c })}
                        className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm ring-1 transition ${active ? "bg-foreground text-background ring-foreground" : "bg-background ring-border hover:bg-muted"} ${tooSmall ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        <span>{GROUP_CATEGORY_LABEL[c]}</span>
                        <span className={`tabular-nums ${active ? "text-background/80" : "text-muted-foreground"}`}>${tour.group_prices[c]}</span>
                      </button>
                    );
                  })}
                </div>
                {adultsExceedAll && (
                  <p className="mt-2 text-sm text-amber-700 bg-amber-500/10 rounded-xl p-3">
                    Your group is larger than the offered sizes. Please contact the guide to arrange a custom booking.
                  </p>
                )}
              </div>
            )}

            {availableLanguages.length > 0 && (
              <div>
                <label className="text-sm font-medium">Language</label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {availableLanguages.map((lng) => {
                    const active = currentLanguage === lng;
                    const isBase = lng === tour.base_language;
                    const mult = tour.language_multipliers[lng] ?? 0;
                    return (
                      <button
                        key={lng}
                        type="button"
                        onClick={() => setForm({ ...form, language: lng })}
                        className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm ring-1 transition ${active ? "bg-foreground text-background ring-foreground" : "bg-background ring-border hover:bg-muted"}`}
                      >
                        <span>{lng}</span>
                        <span className={`tabular-nums ${active ? "text-background/80" : "text-muted-foreground"}`}>{isBase ? "base" : mult > 0 ? `+${mult}%` : mult < 0 ? `${mult}%` : "+0%"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}


            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Your name</label>
                <input required value={form.name} onChange={handleFieldChange} name="name" className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input type="email" required={!telegramContact?.telegram_chat_id} value={form.email} onChange={handleFieldChange} name="email" className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder={telegramContact?.telegram_chat_id ? "Optional" : "you@email.com"} />
              </div>
            </div>

            <div className="rounded-2xl bg-secondary/60 p-4">
              <p className="text-sm font-medium">Telegram updates</p>
              {telegramContact?.telegram_chat_id ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Linked {telegramContact.telegram_username ? `@${telegramContact.telegram_username}` : "Telegram"}. Booking updates will arrive there.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-muted-foreground">Link Telegram if you prefer booking updates there instead of email.</p>
                  <TelegramLoginButton mode="link" onLinked={loadTelegramContact} />
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Notes for your guide (optional)</label>
              <textarea value={form.notes} onChange={handleFieldChange} name="notes" rows={4} className="mt-2 w-full rounded-xl border border-input bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Anything specific you'd love to see or do…" />
            </div>

            <button type="submit" disabled={submitting || adultsExceedAll || total === 0} className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-60">
              {submitting ? "Sending…" : isInstantMode ? `Confirm & book — $${total + fee}` : `Request booking — $${total + fee}`}
            </button>
            <p className="text-center text-xs text-muted-foreground">{isInstantMode ? "Your slot is locked in instantly." : "Your guide will review and confirm this request."}</p>
          </form>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl bg-card p-6 ring-1 ring-border/60 shadow-[var(--shadow-card)]">
              <div className="font-display text-xl font-semibold">{tour.title}</div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {tour.cities?.name && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{tour.cities.name}</span>}
                {tour.duration_hours > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{Number(tour.duration_hours)}h</span>}
                {tour.transport_included && <span className="inline-flex items-center gap-1 text-primary"><Car className="h-3 w-3" />transport</span>}
              </div>

              {guide && (
                <div className="mt-4 flex gap-3 border-t border-border/60 pt-4">
                  <img src={guide.photo_url ?? ""} alt={guide.name} width={56} height={56} loading="lazy" className="h-14 w-14 rounded-xl object-cover bg-secondary" />
                  <div>
                    <div className="font-medium">{guide.name.split(" ")[0]}</div>
                    <p className="inline-flex items-center gap-1 text-sm"><Star className="h-3.5 w-3.5 fill-accent text-accent" />{Number(guide.rating).toFixed(1)} · {guide.reviews} reviews</p>
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {hasInstantSlots && <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent"><Zap className="h-3.5 w-3.5" /> Instant</span>}
                {tour.transport_included && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"><BadgeCheck className="h-3.5 w-3.5" /> Transport included</span>}
              </div>

              <div className="mt-6 space-y-3 border-t border-border/60 pt-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {tour.title}
                    {currentLanguage && <span className="text-foreground/70"> · {currentLanguage}</span>}
                    {tour.pricing_mode === "by_group" && selectedCategory && (
                      <span className="text-foreground/70"> · {GROUP_CATEGORY_LABEL[selectedCategory]}</span>
                    )}
                  </span>
                  <span className="tabular-nums">${total}</span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">{form.adults} {form.adults === 1 ? "adult" : "adults"}{form.children > 0 ? `, ${form.children} ${form.children === 1 ? "child" : "children"}` : ""}</span><span className="tabular-nums" /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Service fee</span><span className="tabular-nums">${fee}</span></div>
                <div className="flex justify-between border-t border-border/60 pt-3 text-base font-semibold"><span>Total</span><span className="tabular-nums">${total + fee}</span></div>
              </div>
              <div className="mt-5 border-t border-border/60 pt-4">
                <PaymentMethods variant="checkout" />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
