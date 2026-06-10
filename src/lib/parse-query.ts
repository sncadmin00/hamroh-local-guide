// Heuristic parser to extract city + date range from a free-form user query
// (English / Russian / Uzbek). Used when switching from AI to manual search.

const MONTHS: Record<string, number> = {
  // English
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sept: 9, sep: 9, october: 10, oct: 10, november: 11, nov: 11,
  december: 12, dec: 12,
  // Russian (stems — match any suffix)
  "январ": 1, "феврал": 2, "март": 3, "апрел": 4, "мая": 5, "май": 5,
  "июн": 6, "июл": 7, "август": 8, "сентябр": 9, "октябр": 10, "ноябр": 11, "декабр": 12,
  // Uzbek Latin
  yanvar: 1, fevral: 2, mart: 3, aprel: 4, iyun: 6, iyul: 7,
  avgust: 8, sentyabr: 9, oktyabr: 10, noyabr: 11, dekabr: 12,
};

function findMonth(text: string): { month: number; index: number; length: number } | null {
  const lower = text.toLowerCase();
  let best: { month: number; index: number; length: number } | null = null;
  for (const [key, month] of Object.entries(MONTHS)) {
    const idx = lower.indexOf(key);
    if (idx === -1) continue;
    if (!best || idx < best.index || (idx === best.index && key.length > best.length)) {
      best = { month, index: idx, length: key.length };
    }
  }
  return best;
}

function toISO(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function parseDateRange(text: string): { from?: string; to?: string } {
  const m = findMonth(text);
  if (!m) return {};
  // Look for "5-7", "5 - 7", "5—7", "from 5 to 7" within ±30 chars
  const windowStr = text.slice(Math.max(0, m.index - 30), m.index + m.length + 30);
  const range = windowStr.match(/(\d{1,2})\s*[-–—to]+\s*(\d{1,2})/i);
  const single = windowStr.match(/(\d{1,2})/);
  const now = new Date();
  let year = now.getFullYear();
  if (m.month < now.getMonth() + 1) year += 1;
  if (range) {
    const a = Math.min(Number(range[1]), Number(range[2]));
    const b = Math.max(Number(range[1]), Number(range[2]));
    if (a >= 1 && a <= 31 && b >= 1 && b <= 31) {
      return { from: toISO(year, m.month, a), to: toISO(year, m.month, b) };
    }
  }
  if (single) {
    const d = Number(single[1]);
    if (d >= 1 && d <= 31) return { from: toISO(year, m.month, d) };
  }
  return {};
}

export function parseCity(text: string, cityNames: string[]): string | undefined {
  const lower = text.toLowerCase();
  // Sort longest first to prefer "New York" over "York"
  const sorted = [...cityNames].sort((a, b) => b.length - a.length);
  for (const c of sorted) {
    if (!c) continue;
    const cl = c.toLowerCase();
    if (lower.includes(cl)) return c;
    // Match Russian dative/prepositional "в Самарканде" by stripping last 1-2 chars
    if (cl.length > 4) {
      const stem = cl.slice(0, -1);
      if (lower.includes(stem)) return c;
    }
  }
  return undefined;
}

export function parseSearchQuery(text: string, cityNames: string[]): { city?: string; from?: string; to?: string } {
  return {
    city: parseCity(text, cityNames),
    ...parseDateRange(text),
  };
}
