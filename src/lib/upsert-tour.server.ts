/**
 * Shared upsert-tour core. Used by:
 *  - `upsertTour` server function (web guide portal)
 *  - `/api/public/hooks/upsert-tour` route (mobile client via JWT)
 *
 * Handles: partial updates, auto-translation of texts (only when texts
 * or base_language changed), price_by_language recomputation (only when
 * pricing / languages / base_language changed), legacy columns, slug
 * generation on create, and tour_categories sync.
 *
 * Server-only: imports the service-role admin client. NEVER import this
 * module from a client-reachable path — the filename ends in `.server.ts`
 * so the build blocks that anyway.
 */

import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { translateTourFields, mapBaseLanguage } from "@/lib/translate-tour.server";

// ---------- Input schema (fully partial; id optional) ----------

const groupTierSchema = z.object({
  min: z.number().int().min(1).max(500),
  max: z.number().int().min(1).max(500),
  price: z.number().min(0).max(100000),
});

const localeStr = z.string().trim().max(2000).optional();
const localeArr = z.array(z.string().trim().min(1).max(1000)).max(30).optional();

export const upsertTourInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  short_description: z.string().trim().max(500).optional(),
  cover_url: z.string().trim().max(2000).nullable().optional(),
  city_id: z.string().uuid().optional(),
  duration_hours: z.number().min(0.5).max(72).optional(),
  pricing_modes: z.array(z.enum(["fixed", "per_person", "by_group"])).min(1).max(3).optional(),
  fixed_price: z.number().min(0).max(100000).nullable().optional(),
  fixed_max_guests: z.number().int().min(1).max(500).nullable().optional(),
  per_person_price: z.number().min(0).max(100000).nullable().optional(),
  group_tiers: z.array(groupTierSchema).max(20).optional(),
  max_guests: z.number().int().min(1).max(500).nullable().optional(),
  base_language: z.string().trim().min(1).max(40).optional(),
  pricing_base_language: z.string().trim().min(1).max(40).optional(),
  language_multipliers: z
    .record(z.string().min(1).max(40), z.number().min(-50).max(500))
    .optional(),
  children_free_under: z.number().int().min(0).max(21).optional(),
  languages: z.array(z.string().min(1).max(40)).max(20).optional(),
  transport_included: z.boolean().optional(),
  highlights: z.array(z.string().trim().min(1).max(1000)).max(30).optional(),
  included: z.array(z.string().trim().min(1).max(1000)).max(30).optional(),
  not_included: z.array(z.string().trim().min(1).max(1000)).max(30).optional(),
  meeting_point: z.string().trim().max(500).optional(),
  end_point: z.string().trim().max(500).optional(),
  meeting_lat: z.number().min(-90).max(90).nullable().optional(),
  meeting_lng: z.number().min(-180).max(180).nullable().optional(),
  end_lat: z.number().min(-90).max(90).nullable().optional(),
  end_lng: z.number().min(-180).max(180).nullable().optional(),
  end_same_as_meeting: z.boolean().optional(),
  published: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(1000).optional(),
  category_ids: z.array(z.string().uuid()).max(20).optional(),

  // Manual per-locale overrides. When provided, they take priority over
  // AI translation for that locale and are written verbatim.
  title_ru: localeStr, title_en: localeStr, title_uz: localeStr,
  short_description_ru: localeStr, short_description_en: localeStr, short_description_uz: localeStr,
  highlights_ru: localeArr, highlights_en: localeArr, highlights_uz: localeArr,
  included_ru: localeArr, included_en: localeArr, included_uz: localeArr,
  not_included_ru: localeArr, not_included_en: localeArr, not_included_uz: localeArr,

  // When true, do NOT run auto-translation on this save. Manual overrides
  // (title_<lng> etc.) are still written; other locales are left untouched.
  skip_translate: z.boolean().optional(),
});


export type UpsertTourInput = z.infer<typeof upsertTourInputSchema>;

const GROUP_KEYS = ["private", "small", "group", "large"] as const;

// Columns fetched on final read; matches guide portal listing.
const TOUR_SELECT = `
  id, guide_id, slug,
  title, short_description, description_md,
  title_ru, title_en, title_uz,
  short_description_ru, short_description_en, short_description_uz,
  description_md_ru, description_md_en, description_md_uz,
  cover_url, city_id, duration_hours,
  price_from, price_by_language,
  pricing_mode, pricing_modes,
  fixed_price, fixed_max_guests, per_person_price,
  group_tiers, group_prices, max_guests,
  base_language, pricing_base_language, language_multipliers, languages,
  children_free_under, transport_included,
  highlights, highlights_ru, highlights_en, highlights_uz,
  included, included_ru, included_en, included_uz,
  not_included, not_included_ru, not_included_en, not_included_uz,
  meeting_point, end_point,
  meeting_lat, meeting_lng, end_lat, end_lng, end_same_as_meeting,
  published, sort_order,
  rating, reviews_count,
  tour_categories(category_id)
`;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "tour";
}

function pick<T>(a: T | undefined, b: T): T {
  return a === undefined ? b : a;
}

/**
 * Upsert a tour on behalf of `userId` (must be linked to a guide profile).
 * Returns the full saved tour row.
 */
export async function upsertTourCore(input: UpsertTourInput, userId: string) {
  // 1. Resolve guide by user
  const { data: guide, error: guideErr } = await supabaseAdmin
    .from("guides")
    .select("id, slug")
    .eq("user_id", userId)
    .maybeSingle();
  if (guideErr) throw new Error(guideErr.message);
  if (!guide) throw new Error("You are not linked to a guide profile yet.");

  // 2. Load current row for update; forbid touching other guides' tours
  let current: any = null;
  if (input.id) {
    const { data, error } = await supabaseAdmin
      .from("tours")
      .select("*")
      .eq("id", input.id)
      .eq("guide_id", guide.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Tour not found or not owned by this guide.");
    current = data;
  }

  const isCreate = !current;

  // 3. Effective values (merged with current row on update)
  const eff = {
    title: pick(input.title, current?.title ?? ""),
    short_description: pick(input.short_description, current?.short_description ?? ""),
    cover_url: pick(input.cover_url, current?.cover_url ?? null),
    city_id: pick(input.city_id, current?.city_id ?? ""),
    duration_hours: pick(input.duration_hours, Number(current?.duration_hours ?? 0)),
    pricing_modes: pick(input.pricing_modes, (current?.pricing_modes ?? []) as Array<"fixed" | "per_person" | "by_group">),
    fixed_price: pick(input.fixed_price, current?.fixed_price ?? null) as number | null,
    fixed_max_guests: pick(input.fixed_max_guests, current?.fixed_max_guests ?? null) as number | null,
    per_person_price: pick(input.per_person_price, current?.per_person_price ?? null) as number | null,
    group_tiers: pick(input.group_tiers, (current?.group_tiers ?? []) as Array<{ min: number; max: number; price: number }>),
    max_guests: pick(input.max_guests, current?.max_guests ?? null) as number | null,
    base_language: pick(input.base_language, current?.base_language ?? "Russian"),
    pricing_base_language: pick(
      input.pricing_base_language,
      current?.pricing_base_language ?? pick(input.base_language, current?.base_language ?? "Russian"),
    ),
    language_multipliers: pick(
      input.language_multipliers,
      (current?.language_multipliers ?? {}) as Record<string, number>,
    ),
    children_free_under: pick(input.children_free_under, Number(current?.children_free_under ?? 16)),
    languages: pick(input.languages, (current?.languages ?? []) as string[]),
    transport_included: pick(input.transport_included, !!current?.transport_included),
    highlights: pick(input.highlights, (current?.highlights ?? []) as string[]),
    included: pick(input.included, (current?.included ?? []) as string[]),
    not_included: pick(input.not_included, (current?.not_included ?? []) as string[]),
    meeting_point: pick(input.meeting_point, current?.meeting_point ?? ""),
    end_point: pick(input.end_point, current?.end_point ?? ""),
    meeting_lat: pick(input.meeting_lat, current?.meeting_lat ?? null) as number | null,
    meeting_lng: pick(input.meeting_lng, current?.meeting_lng ?? null) as number | null,
    end_lat: pick(input.end_lat, current?.end_lat ?? null) as number | null,
    end_lng: pick(input.end_lng, current?.end_lng ?? null) as number | null,
    end_same_as_meeting: pick(input.end_same_as_meeting, !!current?.end_same_as_meeting),
    published: pick(input.published, current?.published ?? (isCreate ? true : false)),
    sort_order: pick(input.sort_order, Number(current?.sort_order ?? 0)),
  };

  // 4. Required-on-create checks
  if (isCreate) {
    if (!eff.title) throw new Error("title is required");
    if (!eff.city_id) throw new Error("city_id is required");
    if (!eff.duration_hours || eff.duration_hours <= 0) throw new Error("duration_hours is required");
    if (!eff.pricing_modes || eff.pricing_modes.length === 0) {
      throw new Error("pricing_modes must include at least one mode");
    }
  }

  // 5. Which recomputes to run
  const textChanged =
    input.title !== undefined ||
    input.short_description !== undefined ||
    input.highlights !== undefined ||
    input.included !== undefined ||
    input.not_included !== undefined ||
    input.base_language !== undefined;
  const shouldTranslate = isCreate || textChanged;

  const priceChanged =
    input.pricing_modes !== undefined ||
    input.fixed_price !== undefined ||
    input.per_person_price !== undefined ||
    input.group_tiers !== undefined ||
    input.fixed_max_guests !== undefined ||
    input.max_guests !== undefined ||
    input.languages !== undefined ||
    input.language_multipliers !== undefined ||
    input.base_language !== undefined ||
    input.pricing_base_language !== undefined;
  const shouldRecomputePrice = isCreate || priceChanged;

  // 6. Build partial DB payload; only set fields we intend to change
  const payload: Record<string, unknown> = {};

  // Scalar/array fields — write only if the caller provided them (or on create)
  const maybeSet = <K extends keyof typeof eff>(key: K, col?: string) => {
    if (isCreate || (input as any)[key] !== undefined) {
      payload[col ?? (key as string)] = eff[key];
    }
  };
  maybeSet("title");
  maybeSet("short_description");
  if (isCreate) payload.description_md = "";
  maybeSet("cover_url");
  maybeSet("city_id");
  maybeSet("duration_hours");
  maybeSet("children_free_under");
  maybeSet("transport_included");
  maybeSet("meeting_point");
  maybeSet("end_point");
  maybeSet("meeting_lat");
  maybeSet("meeting_lng");
  maybeSet("end_lat");
  maybeSet("end_lng");
  maybeSet("end_same_as_meeting");
  maybeSet("published");
  maybeSet("sort_order");
  if (isCreate || input.highlights !== undefined) payload.highlights = eff.highlights;
  if (isCreate || input.included !== undefined) payload.included = eff.included;
  if (isCreate || input.not_included !== undefined) payload.not_included = eff.not_included;
  if (isCreate || input.languages !== undefined) payload.languages = eff.languages;
  if (isCreate || input.base_language !== undefined) payload.base_language = eff.base_language;
  if (isCreate || input.pricing_base_language !== undefined) payload.pricing_base_language = eff.pricing_base_language;

  // 7. Pricing normalization + legacy columns (only when we're recomputing)
  let priceFrom: number = Number(current?.price_from ?? 0);
  let normalizedTiers: Array<{ min: number; max: number; price: number }> =
    (eff.group_tiers ?? []) as Array<{ min: number; max: number; price: number }>;

  if (shouldRecomputePrice) {
    const modes = eff.pricing_modes;
    const candidatePrices: number[] = [];

    if (modes.includes("fixed")) {
      if (eff.fixed_price == null || eff.fixed_price <= 0) {
        throw new Error("Set a fixed price or turn off the fixed pricing mode.");
      }
      candidatePrices.push(eff.fixed_price);
    }
    if (modes.includes("per_person")) {
      if (eff.per_person_price == null || eff.per_person_price <= 0) {
        throw new Error("Set a per-person price or turn off the per-person pricing mode.");
      }
      candidatePrices.push(eff.per_person_price);
    }
    normalizedTiers = [];
    if (modes.includes("by_group")) {
      if (!eff.group_tiers || eff.group_tiers.length === 0) {
        throw new Error("Add at least one group tier or turn off the group pricing mode.");
      }
      const sorted = [...eff.group_tiers].sort((a, b) => a.min - b.min);
      let prevMax = 0;
      for (const t of sorted) {
        if (t.min > t.max) throw new Error(`Invalid tier: min (${t.min}) is greater than max (${t.max}).`);
        if (t.price <= 0) throw new Error("Every group tier needs a price above zero.");
        if (t.min <= prevMax) throw new Error("Group tiers must not overlap.");
        prevMax = t.max;
        candidatePrices.push(t.price);
      }
      normalizedTiers = sorted;
    }

    // Derive max_guests when not provided
    let maxGuests = eff.max_guests;
    if (maxGuests == null && modes.includes("by_group") && normalizedTiers.length > 0) {
      maxGuests = normalizedTiers[normalizedTiers.length - 1].max;
    }
    if (maxGuests != null && modes.includes("by_group") && normalizedTiers.length > 0) {
      const tierMax = normalizedTiers[normalizedTiers.length - 1].max;
      if (maxGuests < tierMax) {
        throw new Error("Max guests must be at least as large as the biggest group tier.");
      }
    }

    // Clean language multipliers (drop base language)
    const cleanedMults: Record<string, number> = {};
    for (const [k, v] of Object.entries(eff.language_multipliers ?? {})) {
      if (k === eff.base_language) continue;
      if (Number.isFinite(v)) cleanedMults[k] = v as number;
    }

    priceFrom = candidatePrices.length > 0 ? Math.min(...candidatePrices) : 0;

    const priceByLanguage: Record<string, number> = {};
    for (const lng of eff.languages ?? []) {
      const mult = lng === eff.base_language ? 0 : Number(cleanedMults[lng] ?? 0);
      priceByLanguage[lng] = Math.round(priceFrom * (1 + mult / 100) * 100) / 100;
    }

    // Legacy columns
    const legacyPricingMode: "fixed" | "by_group" = modes.includes("by_group") ? "by_group" : "fixed";
    const legacyGroupPrices: Record<string, number> = {};
    if (legacyPricingMode === "by_group") {
      const CAT_MAX: Record<string, number> = { private: 2, small: 6, group: 12, large: 25 };
      for (const cat of GROUP_KEYS) {
        const t = normalizedTiers.find((tr) => tr.max <= CAT_MAX[cat]);
        if (t) legacyGroupPrices[cat] = t.price;
      }
      if (Object.keys(legacyGroupPrices).length === 0 && normalizedTiers[0]) {
        legacyGroupPrices.large = normalizedTiers[0].price;
      }
    } else if (eff.fixed_price != null) {
      legacyGroupPrices.fixed = eff.fixed_price;
    } else if (priceFrom > 0) {
      legacyGroupPrices.fixed = priceFrom;
    }

    payload.pricing_modes = modes;
    payload.fixed_price = modes.includes("fixed") ? eff.fixed_price : null;
    payload.fixed_max_guests = modes.includes("fixed") ? eff.fixed_max_guests : null;
    payload.per_person_price = modes.includes("per_person") ? eff.per_person_price : null;
    payload.group_tiers = modes.includes("by_group") ? normalizedTiers : [];
    payload.max_guests = maxGuests;
    payload.pricing_mode = legacyPricingMode;
    payload.group_prices = legacyGroupPrices;
    payload.language_multipliers = cleanedMults;
    payload.price_from = priceFrom;
    payload.price_by_language = priceByLanguage;
  }

  // 8. Translation of texts + localized columns
  //
  // Manual per-locale overrides (title_<lng>, short_description_<lng>, ...)
  // always win over auto-translation for the locales they cover. When
  // `skip_translate=true`, we do NOT call the AI at all — only manual
  // overrides are written; other locales stay untouched (on update) or
  // are seeded from source (on create).
  const LOCALE_FIELDS = ["title", "short_description", "highlights", "included", "not_included"] as const;
  type LocaleField = typeof LOCALE_FIELDS[number];

  const manualOverride = (lng: "ru" | "en" | "uz", field: LocaleField) => {
    const key = `${field}_${lng}` as keyof UpsertTourInput;
    return (input as any)[key] as string | string[] | undefined;
  };
  const hasAnyManual = (["ru", "en", "uz"] as const).some((lng) =>
    LOCALE_FIELDS.some((f) => manualOverride(lng, f) !== undefined),
  );

  const skipTranslate = input.skip_translate === true;
  const runTranslate = shouldTranslate && !skipTranslate;

  const writeLocaleFromSource = (lng: "ru" | "en" | "uz") => {
    payload[`title_${lng}`] = eff.title;
    payload[`short_description_${lng}`] = eff.short_description;
    payload[`description_md_${lng}`] = "";
    payload[`highlights_${lng}`] = eff.highlights;
    payload[`included_${lng}`] = eff.included;
    payload[`not_included_${lng}`] = eff.not_included;
  };

  const applyManualOverride = (lng: "ru" | "en" | "uz") => {
    for (const f of LOCALE_FIELDS) {
      const v = manualOverride(lng, f);
      if (v !== undefined) payload[`${f}_${lng}`] = v;
    }
  };

  if (runTranslate) {
    const sourceLang = mapBaseLanguage(eff.base_language);
    const result = await translateTourFields({
      sourceLang,
      title: eff.title,
      short_description: eff.short_description,
      description_md: "",
      highlights: eff.highlights,
      included: eff.included,
      not_included: eff.not_included,
    });
    if (!result.ok || result.error) {
      console.error(
        `[upsertTourCore] translation ${result.ok ? "partial" : "failed"} ` +
          `(tourId=${current?.id ?? "new"}, sourceLang=${sourceLang}, base_language=${eff.base_language}, ` +
          `attempts=${result.attempts}): ${result.error}`,
      );
    }
    for (const lng of ["ru", "en", "uz"] as const) {
      if (lng === sourceLang) {
        writeLocaleFromSource(lng);
        continue;
      }
      const t = result.translations[lng];
      if (t) {
        payload[`title_${lng}`] = t.title || (isCreate ? eff.title : (current?.[`title_${lng}`] ?? eff.title));
        payload[`short_description_${lng}`] = t.short_description !== undefined && t.short_description !== ""
          ? t.short_description
          : (isCreate ? eff.short_description : (current?.[`short_description_${lng}`] ?? eff.short_description));
        payload[`description_md_${lng}`] = t.description_md ?? (isCreate ? "" : (current?.[`description_md_${lng}`] ?? ""));
        payload[`highlights_${lng}`] = t.highlights?.length
          ? t.highlights
          : (isCreate ? eff.highlights : (current?.[`highlights_${lng}`] ?? eff.highlights));
        payload[`included_${lng}`] = t.included?.length
          ? t.included
          : (isCreate ? eff.included : (current?.[`included_${lng}`] ?? eff.included));
        payload[`not_included_${lng}`] = t.not_included?.length
          ? t.not_included
          : (isCreate ? eff.not_included : (current?.[`not_included_${lng}`] ?? eff.not_included));
      } else if (isCreate) {
        writeLocaleFromSource(lng);
      }
      // Update + no translation for this lang → leave previously-saved translation intact.
    }
    // Manual overrides win over anything translation just wrote.
    for (const lng of ["ru", "en", "uz"] as const) applyManualOverride(lng);
  } else if (isCreate) {
    // Create with skip_translate or no text: seed every locale from source,
    // then let manual overrides win.
    for (const lng of ["ru", "en", "uz"] as const) writeLocaleFromSource(lng);
    for (const lng of ["ru", "en", "uz"] as const) applyManualOverride(lng);
  } else if (hasAnyManual) {
    // Pure manual edit on an existing tour: write only the overridden columns,
    // leave other locales untouched.
    for (const lng of ["ru", "en", "uz"] as const) applyManualOverride(lng);
  }


  // 9. Persist
  let tourId: string;
  if (current) {
    const { error } = await (supabaseAdmin as any)
      .from("tours")
      .update(payload)
      .eq("id", current.id)
      .eq("guide_id", guide.id);
    if (error) throw new Error(error.message);
    tourId = current.id as string;
  } else {
    const base = `${guide.slug}-${slugify(eff.title)}`;
    let slug = base;
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await supabaseAdmin
        .from("tours").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
    const { data: inserted, error } = await (supabaseAdmin as any)
      .from("tours")
      .insert({ ...payload, slug, guide_id: guide.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    tourId = (inserted as { id: string }).id;
  }

  // 10. Sync tour_categories only when caller sent category_ids
  if (input.category_ids !== undefined) {
    const { error: delErr } = await supabaseAdmin
      .from("tour_categories").delete().eq("tour_id", tourId);
    if (delErr) throw new Error(delErr.message);
    if (input.category_ids.length > 0) {
      const rows = input.category_ids.map((cid) => ({ tour_id: tourId, category_id: cid }));
      const { error: insErr } = await supabaseAdmin
        .from("tour_categories").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }
  }

  // 11. Return full row
  const { data: saved, error: readErr } = await supabaseAdmin
    .from("tours")
    .select(TOUR_SELECT)
    .eq("id", tourId)
    .single();
  if (readErr) throw new Error(readErr.message);

  const row: any = saved;
  const category_ids = ((row.tour_categories ?? []) as Array<{ category_id: string }>)
    .map((tc) => tc.category_id);
  return { ...row, category_ids };
}
