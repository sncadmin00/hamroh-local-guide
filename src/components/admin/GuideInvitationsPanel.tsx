import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Search, Loader2, Send, Plus, Trash2, RefreshCw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n, type Lang } from "@/lib/i18n";
import {
  searchExistingGuides,
  createGuideInvitations,
  listGuideInvitations,
  resendGuideInvitation,
} from "@/lib/guide-invitations.functions";

type InviteLocale = "ru" | "uz" | "en";

type Invitation = {
  id: string;
  email: string;
  name: string | null;
  city: string | null;
  source: string;
  source_url: string | null;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  registered_at: string | null;
  created_at: string;
};

type SearchResult = {
  title: string;
  url: string;
  content: string;
  emails: string[];
};

type Draft = {
  email: string;
  name: string;
  city: string;
  source: "manual" | "web";
  source_url: string;
  locale: InviteLocale;
};

const toInviteLocale = (l: Lang): InviteLocale => (l === "uz" || l === "en" ? l : "ru");
const makeEmptyDraft = (locale: InviteLocale): Draft => ({
  email: "", name: "", city: "", source: "manual", source_url: "", locale,
});

export function GuideInvitationsPanel() {
  const { lang } = useI18n();
  const defaultLocale = toInviteLocale(lang);
  const search = useServerFn(searchExistingGuides);
  const create = useServerFn(createGuideInvitations);
  const list = useServerFn(listGuideInvitations);
  const resend = useServerFn(resendGuideInvitation);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);

  // Search
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  // Drafts (items queued to send)
  const [drafts, setDrafts] = useState<Draft[]>([makeEmptyDraft(defaultLocale)]);
  const [sending, setSending] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await list();
      setInvitations(res.invitations as Invitation[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => { reload(); }, [reload]);

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await search({ data: { query: query.trim() } });
      setResults(res.results);
      if (res.results.length === 0) toast.info("Ничего не найдено");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Поиск не удался");
    } finally {
      setSearching(false);
    }
  };

  const addFromSearch = (email: string, title: string, url: string) => {
    setDrafts((d) => [
      ...d.filter((x) => x.email.trim()),
      { email, name: title.slice(0, 100), city: "", source: "web", source_url: url, locale: defaultLocale },
    ]);
    toast.success(`Добавлено: ${email}`);
  };

  const updateDraft = (i: number, patch: Partial<Draft>) => {
    setDrafts((d) => d.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  };
  const removeDraft = (i: number) => setDrafts((d) => d.filter((_, idx) => idx !== i));
  const addDraft = () => setDrafts((d) => [...d, makeEmptyDraft(defaultLocale)]);

  const sendAll = async () => {
    const items = drafts.filter((d) => d.email.trim() && /.+@.+\..+/.test(d.email));
    if (items.length === 0) {
      toast.error("Добавьте хотя бы один email");
      return;
    }
    setSending(true);
    try {
      const res = await create({ data: { items } });
      toast.success(`Отправлено: ${res.sent}, пропущено (уже приглашены): ${res.skipped}`);
      if (res.errors.length) console.warn("Invite errors:", res.errors);
      setDrafts([makeEmptyDraft(defaultLocale)]);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setSending(false);
    }
  };

  const doResend = async (id: string, locale: InviteLocale = defaultLocale) => {
    try {
      const res = await resend({ data: { id, locale } });
      if (res.ok) toast.success("Письмо отправлено повторно");
      else toast.error("Не удалось отправить (возможно, email в списке отписавшихся)");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const statusBadge = (s: string) => {
    const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
    if (s === "registered") return `${base} bg-green-100 text-green-700`;
    if (s === "opened") return `${base} bg-blue-100 text-blue-700`;
    if (s === "bounced") return `${base} bg-red-100 text-red-700`;
    return `${base} bg-secondary text-muted-foreground`;
  };

  return (
    <div className="mt-6 space-y-8">
      {/* Tavily search */}
      <section className="rounded-2xl bg-card p-5 ring-1 ring-border/60">
        <h2 className="font-medium mb-3 flex items-center gap-2">
          <Search className="h-4 w-4" /> Поиск гидов в интернете
        </h2>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
            placeholder="например: tour guides Samarkand"
            className="flex-1 h-10 rounded-md border border-border px-3 text-sm"
          />
          <Button onClick={runSearch} disabled={searching} className="rounded-md">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Искать"}
          </Button>
        </div>
        {results.length > 0 && (
          <div className="mt-4 space-y-3">
            {results.map((r, idx) => (
              <div key={idx} className="rounded-lg border border-border p-3">
                <a href={r.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">
                  {r.title || r.url}
                </a>
                <p className="text-xs text-muted-foreground mt-1">{r.content}</p>
                {r.emails.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.emails.map((em) => (
                      <button
                        key={em}
                        onClick={() => addFromSearch(em, r.title, r.url)}
                        className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs hover:bg-primary hover:text-primary-foreground"
                      >
                        <Plus className="h-3 w-3" /> {em}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2 italic">email не найден на странице</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Drafts to send */}
      <section className="rounded-2xl bg-card p-5 ring-1 ring-border/60">
        <h2 className="font-medium mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4" /> Кому отправить приглашение
        </h2>
        <div className="space-y-2">
          {drafts.map((d, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_90px_auto] gap-2">
              <input
                type="email"
                placeholder="email@example.com"
                value={d.email}
                onChange={(e) => updateDraft(i, { email: e.target.value })}
                className="h-9 rounded-md border border-border px-2 text-sm"
              />
              <input
                placeholder="Имя (необязательно)"
                value={d.name}
                onChange={(e) => updateDraft(i, { name: e.target.value })}
                className="h-9 rounded-md border border-border px-2 text-sm"
              />
              <input
                placeholder="Город (необязательно)"
                value={d.city}
                onChange={(e) => updateDraft(i, { city: e.target.value })}
                className="h-9 rounded-md border border-border px-2 text-sm"
              />
              <select
                value={d.locale}
                onChange={(e) => updateDraft(i, { locale: e.target.value as InviteLocale })}
                className="h-9 rounded-md border border-border px-2 text-sm bg-background"
                title="Язык письма"
              >
                <option value="ru">RU</option>
                <option value="uz">UZ</option>
                <option value="en">EN</option>
              </select>
              <button
                onClick={() => removeDraft(i)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                title="Удалить"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" onClick={addDraft} className="rounded-md">
            <Plus className="h-4 w-4 mr-1" /> Ещё одного
          </Button>
          <Button onClick={sendAll} disabled={sending} className="rounded-md">
            {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Отправить приглашения
          </Button>
        </div>
      </section>

      {/* Sent invitations */}
      <section className="rounded-2xl bg-card p-5 ring-1 ring-border/60">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Отправленные приглашения ({invitations.length})</h2>
          <Button variant="ghost" size="sm" onClick={reload} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        {invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока никого не приглашали.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2 pr-2">Email</th>
                  <th className="py-2 pr-2">Имя</th>
                  <th className="py-2 pr-2">Город</th>
                  <th className="py-2 pr-2">Источник</th>
                  <th className="py-2 pr-2">Статус</th>
                  <th className="py-2 pr-2">Отправлено</th>
                  <th className="py-2 pr-2"></th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/60">
                    <td className="py-2 pr-2 font-medium">{inv.email}</td>
                    <td className="py-2 pr-2">{inv.name ?? "—"}</td>
                    <td className="py-2 pr-2">{inv.city ?? "—"}</td>
                    <td className="py-2 pr-2 text-xs text-muted-foreground">{inv.source}</td>
                    <td className="py-2 pr-2"><span className={statusBadge(inv.status)}>{inv.status}</span></td>
                    <td className="py-2 pr-2 text-xs text-muted-foreground">
                      {inv.sent_at ? new Date(inv.sent_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-2 pr-2">
                      <button
                        onClick={() => doResend(inv.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        Повторно
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
