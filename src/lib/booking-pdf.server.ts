// Server-only helpers for booking PDF generation.
// Imports pdf-lib (~1.8MB), kept out of client bundles via .server.ts naming.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import regularAsset from '@/assets/fonts/NotoSans-Regular.ttf.asset.json';
import boldAsset from '@/assets/fonts/NotoSans-Bold.ttf.asset.json';
import {
  type PdfLocale,
  normalizePdfLocale,
  tt,
  localizedTour,
} from '@/lib/booking-pdf-i18n';

// ----------------- HMAC token helpers -----------------

function getPdfSecret(): string {
  // Reuse service role key as HMAC seed (server-only, stable per project).
  // Avoids requiring an additional secret.
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!s) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for PDF token signing');
  return `booking-pdf::${s}`;
}

export function signBookingPdfToken(bookingId: string): string {
  return createHmac('sha256', getPdfSecret()).update(bookingId).digest('hex');
}

export function verifyBookingPdfToken(bookingId: string, token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const expected = signBookingPdfToken(bookingId);
  try {
    const a = Buffer.from(token, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ----------------- Font loading -----------------

let _fontCache: { regular: Uint8Array; bold: Uint8Array } | null = null;

async function loadFonts(origin: string): Promise<{ regular: Uint8Array; bold: Uint8Array }> {
  if (_fontCache) return _fontCache;
  const [reg, bold] = await Promise.all([
    fetch(new URL(regularAsset.url, origin).toString()).then((r) => r.arrayBuffer()),
    fetch(new URL(boldAsset.url, origin).toString()).then((r) => r.arrayBuffer()),
  ]);
  _fontCache = { regular: new Uint8Array(reg), bold: new Uint8Array(bold) };
  return _fontCache;
}

// ----------------- Data loading -----------------

interface FullBooking {
  booking: any;
  tour: any | null;
  guide: any | null;
  city: { name: string } | null;
  guideTelegram: { telegram_username: string | null } | null;
  categoryNames: string[];
}

export async function loadFullBooking(bookingId: string): Promise<FullBooking | null> {
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .maybeSingle();
  if (!booking) return null;

  const [tourRes, guideRes] = await Promise.all([
    booking.tour_id
      ? supabaseAdmin
          .from('tours')
          .select('*, tour_categories(category_id, categories(name))')
          .eq('id', booking.tour_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabaseAdmin
      .from('guides')
      .select('id, name, photo_url, rating, reviews, identity_phone, user_id, city_id')
      .eq('id', booking.guide_id)
      .maybeSingle(),
  ]);

  const tour: any = tourRes.data;
  const guide: any = guideRes.data;

  // City: prefer tour.city_id else guide.city_id
  const cityId = tour?.city_id ?? guide?.city_id ?? null;
  const cityRes = cityId
    ? await supabaseAdmin.from('cities').select('name').eq('id', cityId).maybeSingle()
    : { data: null };

  // Guide's telegram (optional)
  let guideTelegram: { telegram_username: string | null } | null = null;
  if (guide?.user_id) {
    const r = await supabaseAdmin
      .from('telegram_accounts')
      .select('telegram_username')
      .eq('user_id', guide.user_id)
      .maybeSingle();
    guideTelegram = (r.data as any) ?? null;
  }

  const categoryNames: string[] = ((tour?.tour_categories ?? []) as any[])
    .map((tc) => tc?.categories?.name)
    .filter((x: any): x is string => typeof x === 'string' && x.length > 0);

  return {
    booking,
    tour,
    guide,
    city: (cityRes.data as any) ?? null,
    guideTelegram,
    categoryNames,
  };
}

// ----------------- PDF rendering -----------------

const PAGE_W = 595.28; // A4 width in points
const PAGE_H = 841.89;
const MARGIN_X = 48;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;
const COLOR_TEXT = rgb(0.13, 0.13, 0.15);
const COLOR_MUTED = rgb(0.45, 0.45, 0.5);
const COLOR_PRIMARY = rgb(0.09, 0.4, 0.85);
const COLOR_BORDER = rgb(0.88, 0.88, 0.9);
const COLOR_OK = rgb(0.13, 0.55, 0.27);

interface Cursor {
  page: PDFPage;
  y: number;
  doc: PDFDocument;
  regular: PDFFont;
  bold: PDFFont;
}

function ensureSpace(c: Cursor, needed: number) {
  if (c.y - needed < MARGIN_BOTTOM) {
    c.page = c.doc.addPage([PAGE_W, PAGE_H]);
    c.y = PAGE_H - MARGIN_TOP;
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const cleaned = String(text ?? '').replace(/\r\n/g, '\n');
  const out: string[] = [];
  for (const rawLine of cleaned.split('\n')) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) { out.push(''); continue; }
    let line = '';
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      const width = font.widthOfTextAtSize(candidate, size);
      if (width > maxWidth && line) {
        out.push(line);
        line = w;
      } else {
        line = candidate;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

function drawText(c: Cursor, text: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; maxWidth?: number; lineGap?: number; indent?: number } = {}) {
  const size = opts.size ?? 10;
  const font = opts.bold ? c.bold : c.regular;
  const color = opts.color ?? COLOR_TEXT;
  const maxWidth = opts.maxWidth ?? PAGE_W - MARGIN_X * 2 - (opts.indent ?? 0);
  const lineGap = opts.lineGap ?? 3;
  const lines = wrapText(text, font, size, maxWidth);
  for (const line of lines) {
    ensureSpace(c, size + lineGap);
    c.page.drawText(line, {
      x: MARGIN_X + (opts.indent ?? 0),
      y: c.y - size,
      size,
      font,
      color,
    });
    c.y -= size + lineGap;
  }
}

function drawLabelValue(c: Cursor, label: string, value: string) {
  if (!value) return;
  const labelSize = 9;
  const valueSize = 10;
  const labelText = `${label}:`;
  const labelWidth = c.bold.widthOfTextAtSize(labelText, labelSize);
  ensureSpace(c, valueSize + 4);
  c.page.drawText(labelText, {
    x: MARGIN_X,
    y: c.y - valueSize,
    size: labelSize,
    font: c.bold,
    color: COLOR_MUTED,
  });
  const valueMaxWidth = PAGE_W - MARGIN_X * 2 - labelWidth - 6;
  const lines = wrapText(value, c.regular, valueSize, valueMaxWidth);
  c.page.drawText(lines[0] ?? '', {
    x: MARGIN_X + labelWidth + 6,
    y: c.y - valueSize,
    size: valueSize,
    font: c.regular,
    color: COLOR_TEXT,
  });
  c.y -= valueSize + 4;
  for (let i = 1; i < lines.length; i++) {
    ensureSpace(c, valueSize + 4);
    c.page.drawText(lines[i], {
      x: MARGIN_X + labelWidth + 6,
      y: c.y - valueSize,
      size: valueSize,
      font: c.regular,
      color: COLOR_TEXT,
    });
    c.y -= valueSize + 4;
  }
}

function drawDivider(c: Cursor) {
  ensureSpace(c, 14);
  c.y -= 6;
  c.page.drawLine({
    start: { x: MARGIN_X, y: c.y },
    end: { x: PAGE_W - MARGIN_X, y: c.y },
    thickness: 0.6,
    color: COLOR_BORDER,
  });
  c.y -= 10;
}

function drawSectionHeading(c: Cursor, title: string) {
  ensureSpace(c, 24);
  c.y -= 6;
  c.page.drawText(title, {
    x: MARGIN_X,
    y: c.y - 13,
    size: 13,
    font: c.bold,
    color: COLOR_TEXT,
  });
  c.y -= 13 + 6;
}

function drawBullets(c: Cursor, items: string[]) {
  for (const it of items) {
    if (!it) continue;
    const size = 10;
    const maxWidth = PAGE_W - MARGIN_X * 2 - 14;
    const lines = wrapText(it, c.regular, size, maxWidth);
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(c, size + 4);
      const prefix = i === 0 ? '• ' : '  ';
      c.page.drawText(prefix + lines[i], {
        x: MARGIN_X,
        y: c.y - size,
        size,
        font: c.regular,
        color: COLOR_TEXT,
      });
      c.y -= size + 4;
    }
  }
}

function groupLabel(key: string, locale: PdfLocale): string {
  switch (key) {
    case 'private': return tt('groupPrivate', locale);
    case 'small': return tt('groupSmall', locale);
    case 'group': return tt('groupGroup', locale);
    case 'large': return tt('groupLarge', locale);
    default: return key;
  }
}

function formatDate(iso: string | null | undefined, locale: PdfLocale): string {
  if (!iso) return '';
  try {
    const d = new Date(iso + 'T00:00:00');
    const localeTag = locale === 'ru' ? 'ru-RU' : locale === 'uz' ? 'uz-UZ' : 'en-US';
    return d.toLocaleDateString(localeTag, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  } catch { return String(iso); }
}

export async function buildBookingPdf(
  data: FullBooking,
  opts: { origin: string; locale?: PdfLocale },
): Promise<Uint8Array> {
  const locale: PdfLocale = opts.locale ?? normalizePdfLocale(data.booking.locale);
  const { regular, bold } = await loadFonts(opts.origin);

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontRegular = await doc.embedFont(regular, { subset: true });
  const fontBold = await doc.embedFont(bold, { subset: true });

  doc.setTitle(`${tt('docTitle', locale)} — Hamroh`);
  doc.setAuthor('Hamroh');
  doc.setCreator('Hamroh');

  const page = doc.addPage([PAGE_W, PAGE_H]);
  const c: Cursor = { page, y: PAGE_H - MARGIN_TOP, doc, regular: fontRegular, bold: fontBold };

  // Header
  c.page.drawText('Hamroh', { x: MARGIN_X, y: c.y - 20, size: 22, font: fontBold, color: COLOR_PRIMARY });
  c.page.drawText(tt('docTitle', locale), {
    x: MARGIN_X,
    y: c.y - 38,
    size: 12,
    font: fontRegular,
    color: COLOR_MUTED,
  });
  // Status badge top-right
  const badgeText = tt('statusConfirmed', locale).toUpperCase();
  const badgeSize = 10;
  const badgeW = fontBold.widthOfTextAtSize(badgeText, badgeSize) + 16;
  const badgeH = 20;
  const badgeX = PAGE_W - MARGIN_X - badgeW;
  const badgeY = c.y - 24;
  c.page.drawRectangle({
    x: badgeX, y: badgeY, width: badgeW, height: badgeH,
    color: rgb(0.91, 0.97, 0.93),
    borderColor: COLOR_OK,
    borderWidth: 0.8,
  });
  c.page.drawText(badgeText, {
    x: badgeX + 8, y: badgeY + 6, size: badgeSize, font: fontBold, color: COLOR_OK,
  });
  // Booking number (short)
  const shortId = String(data.booking.id).slice(0, 8).toUpperCase();
  c.page.drawText(`${tt('bookingNo', locale)}${shortId}`, {
    x: badgeX, y: badgeY - 14, size: 9, font: fontRegular, color: COLOR_MUTED,
  });
  c.y -= 60;
  drawDivider(c);

  // ----- Tour block -----
  const tour = data.tour;
  const titleI18n = tour ? localizedTour(tour, locale) : { title: data.booking.experience, short: '', description: '' };

  drawSectionHeading(c, tt('tour', locale));
  drawText(c, titleI18n.title || data.booking.experience || '', { size: 14, bold: true });
  if (data.city?.name) drawLabelValue(c, tt('city', locale), data.city.name);
  if (tour) {
    drawLabelValue(c, tt('duration', locale), `${Number(tour.duration_hours)} ${tt('hours', locale)}`);
    drawLabelValue(c, tt('transport', locale), tour.transport_included ? tt('transportYes', locale) : tt('transportNo', locale));
    if ((tour.languages ?? []).length) drawLabelValue(c, tt('languages', locale), (tour.languages as string[]).join(', '));
    if (data.categoryNames.length) drawLabelValue(c, tt('categories', locale), data.categoryNames.join(', '));
  }

  if (titleI18n.short) {
    c.y -= 4;
    drawText(c, titleI18n.short, { size: 10, color: COLOR_MUTED });
  }
  if (titleI18n.description) {
    c.y -= 4;
    drawText(c, titleI18n.description, { size: 10 });
  }

  if (tour) {
    if ((tour.highlights ?? []).length) {
      c.y -= 4;
      drawText(c, tt('highlights', locale), { size: 11, bold: true });
      drawBullets(c, tour.highlights as string[]);
    }
    if ((tour.included ?? []).length) {
      c.y -= 4;
      drawText(c, tt('included', locale), { size: 11, bold: true });
      drawBullets(c, tour.included as string[]);
    }
    if ((tour.not_included ?? []).length) {
      c.y -= 4;
      drawText(c, tt('notIncluded', locale), { size: 11, bold: true });
      drawBullets(c, tour.not_included as string[]);
    }
  }

  drawDivider(c);

  // ----- Booking details -----
  drawSectionHeading(c, tt('bookingDetails', locale));
  drawLabelValue(c, tt('date', locale), formatDate(data.booking.date, locale));
  if (data.booking.start_time) {
    drawLabelValue(c, tt('startTime', locale), String(data.booking.start_time).slice(0, 5));
  }
  drawLabelValue(
    c, tt('duration', locale),
    `${Math.round((Number(data.booking.duration_minutes ?? 120) / 60) * 10) / 10} ${tt('hours', locale)}`,
  );

  const meeting = (tour?.meeting_point ?? '').trim() || tt('notSpecified', locale);
  const end = (tour?.end_point ?? '').trim() || tt('notSpecified', locale);
  drawLabelValue(c, tt('meetingPoint', locale), meeting);
  drawLabelValue(c, tt('endPoint', locale), end);

  const adults = Number(data.booking.adults ?? 1);
  const children = Number(data.booking.children ?? 0);
  const guestsLine = `${adults} ${tt('adults', locale)}${children > 0 ? `, ${children} ${tt('children', locale)}` : ''}`;
  drawLabelValue(c, tt('guests', locale), guestsLine);

  if (data.booking.group_category) {
    drawLabelValue(c, tt('groupType', locale), groupLabel(data.booking.group_category, locale));
  }
  if (data.booking.language) {
    drawLabelValue(c, tt('tourLanguage', locale), String(data.booking.language));
  }
  drawLabelValue(c, tt('total', locale), `$${Number(data.booking.total ?? 0).toFixed(0)}`);

  if (data.booking.notes && String(data.booking.notes).trim()) {
    c.y -= 4;
    drawText(c, tt('clientNotes', locale), { size: 11, bold: true });
    drawText(c, String(data.booking.notes), { size: 10 });
  }

  drawDivider(c);

  // ----- Guide -----
  if (data.guide) {
    drawSectionHeading(c, tt('guideBlock', locale));
    drawText(c, data.guide.name ?? '', { size: 12, bold: true });
    if (data.guide.rating != null) {
      drawLabelValue(
        c, tt('rating', locale),
        `${Number(data.guide.rating).toFixed(1)} / 5 (${data.guide.reviews ?? 0})`,
      );
    }
    if (data.guide.identity_phone) drawLabelValue(c, tt('phone', locale), String(data.guide.identity_phone));
    if (data.guideTelegram?.telegram_username) {
      drawLabelValue(c, tt('telegram', locale), `@${data.guideTelegram.telegram_username}`);
    }
  }

  // ----- Footer on every page -----
  const pages = doc.getPages();
  const footerText = tt('footerLine', locale);
  const generatedAt = new Date().toLocaleString(locale === 'ru' ? 'ru-RU' : locale === 'uz' ? 'uz-UZ' : 'en-US');
  for (const p of pages) {
    p.drawText(footerText, { x: MARGIN_X, y: 28, size: 8, font: fontRegular, color: COLOR_MUTED });
    p.drawText(`${tt('generated', locale)}: ${generatedAt}`, {
      x: MARGIN_X, y: 16, size: 8, font: fontRegular, color: COLOR_MUTED,
    });
  }

  return await doc.save();
}

export function buildBookingPdfUrl(origin: string, bookingId: string): string {
  const token = signBookingPdfToken(bookingId);
  return `${origin.replace(/\/$/, '')}/api/public/bookings/${bookingId}/pdf?token=${token}`;
}
