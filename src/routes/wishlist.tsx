import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, Clock, Heart, FolderPlus, Folder, Trash2, MoreVertical, Check } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { GuideCard } from "@/components/GuideCard";
import { WishlistHeart } from "@/components/WishlistHeart";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useWishlist, type WishlistCollection, type WishlistItem } from "@/hooks/useWishlist";
import { useGuides, useTours, useCities } from "@/lib/content-queries";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "My wishlist · Hamroh" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WishlistPage,
});

const EMOJIS = ["❤️", "⭐", "🌆", "🏛️", "🍽️", "🎨", "🏔️", "🕌", "☕", "🎒", "📸", "🌙"];

function WishlistPage() {
  const { t } = useI18n();
  const {
    items,
    collections,
    ready,
    userId,
    createCollection,
    deleteCollection,
    moveItem,
  } = useWishlist();
  const { data: guides = [] } = useGuides();
  const { data: tours = [] } = useTours();
  const { data: cities = [] } = useCities();

  // "all" | "uncategorized" | collectionId
  const [activeCollection, setActiveCollection] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("❤️");

  const filterByCollection = (list: WishlistItem[]) => {
    if (activeCollection === "all") return list;
    if (activeCollection === "uncategorized")
      return list.filter((i) => !i.collectionId);
    return list.filter((i) => i.collectionId === activeCollection);
  };

  const savedGuides = useMemo(() => {
    const scoped = filterByCollection(items.filter((i) => i.type === "guide"));
    const map = new Map(scoped.map((i) => [i.id, i]));
    return guides
      .filter((g) => map.has(g.dbId))
      .map((g) => ({ guide: g, wl: map.get(g.dbId)! }));
  }, [items, guides, activeCollection]);

  const savedTours = useMemo(() => {
    const scoped = filterByCollection(items.filter((i) => i.type === "tour"));
    const map = new Map(scoped.map((i) => [i.id, i]));
    return tours
      .filter((tr) => map.has(tr.id))
      .map((tr) => ({ tour: tr, wl: map.get(tr.id)! }));
  }, [items, tours, activeCollection]);

  const savedCities = useMemo(() => {
    const scoped = filterByCollection(items.filter((i) => i.type === "city"));
    const map = new Map(scoped.map((i) => [i.id, i]));
    return cities
      .filter((c) => map.has(c.id))
      .map((c) => ({ city: c, wl: map.get(c.id)! }));
  }, [items, cities, activeCollection]);

  const total = savedGuides.length + savedTours.length + savedCities.length;
  const uncategorizedCount = items.filter((i) => !i.collectionId).length;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const col = await createCollection(newName, newEmoji);
      toast.success("Collection created");
      setNewName("");
      setNewEmoji("❤️");
      setCreateOpen(false);
      if (col) setActiveCollection(col.id);
    } catch (e: any) {
      toast.error(e?.message || "Could not create collection");
    }
  };

  const handleDeleteCollection = async (col: WishlistCollection) => {
    if (!confirm(`Delete collection "${col.name}"? Items stay in your wishlist.`)) return;
    await deleteCollection(col.id);
    if (activeCollection === col.id) setActiveCollection("all");
    toast.success("Collection deleted");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      <main className="flex-1 px-6 py-10 md:py-14">
        <div className="max-w-6xl mx-auto">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
                {t("wishlist.title")}
              </h1>
              {ready && items.length === 0 && (
                <p className="mt-3 text-muted-foreground">{t("wishlist.empty")}</p>
              )}
            </div>

            {userId && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <FolderPlus className="h-4 w-4" />
                    New collection
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create a collection</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Emoji</label>
                      <div className="flex flex-wrap gap-2">
                        {EMOJIS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => setNewEmoji(e)}
                            className={cn(
                              "h-10 w-10 rounded-lg text-lg transition-colors",
                              newEmoji === e
                                ? "bg-primary/20 ring-2 ring-primary"
                                : "bg-secondary hover:bg-secondary/70",
                            )}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Name</label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Weekend in Samarkand"
                        maxLength={80}
                        autoFocus
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={!newName.trim()}>
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </header>

          {/* Collections bar */}
          {userId && items.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              <CollectionPill
                active={activeCollection === "all"}
                onClick={() => setActiveCollection("all")}
                label="All"
                count={items.length}
                emoji="✨"
              />
              {collections.map((col) => {
                const count = items.filter((i) => i.collectionId === col.id).length;
                return (
                  <CollectionPill
                    key={col.id}
                    active={activeCollection === col.id}
                    onClick={() => setActiveCollection(col.id)}
                    label={col.name}
                    count={count}
                    emoji={col.emoji}
                    onDelete={() => handleDeleteCollection(col)}
                  />
                );
              })}
              {uncategorizedCount > 0 && (
                <CollectionPill
                  active={activeCollection === "uncategorized"}
                  onClick={() => setActiveCollection("uncategorized")}
                  label="Unsorted"
                  count={uncategorizedCount}
                  emoji="📥"
                />
              )}
            </div>
          )}

          {ready && total > 0 ? (
            <Tabs defaultValue="guides">
              <TabsList className="mb-8 rounded-full bg-secondary/70 p-1 h-11">
                <TabsTrigger value="guides" className="rounded-full px-4 h-9">
                  {t("wishlist.tabs.guides")} ({savedGuides.length})
                </TabsTrigger>
                <TabsTrigger value="tours" className="rounded-full px-4 h-9">
                  {t("wishlist.tabs.tours")} ({savedTours.length})
                </TabsTrigger>
                <TabsTrigger value="cities" className="rounded-full px-4 h-9">
                  {t("wishlist.tabs.cities")} ({savedCities.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="guides">
                {savedGuides.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedGuides.map(({ guide: g, wl }) => (
                      <div key={g.id} className="relative">
                        <div className="absolute top-3 right-3 z-10 flex gap-1.5">
                          <MoveMenu
                            wl={wl}
                            collections={collections}
                            onMove={moveItem}
                          />
                          <WishlistHeart type="guide" id={g.dbId} />
                        </div>
                        <GuideCard guide={g} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyMini />
                )}
              </TabsContent>

              <TabsContent value="tours">
                {savedTours.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedTours.map(({ tour, wl }) => (
                      <div key={tour.id} className="relative">
                        <div className="absolute top-3 right-3 z-10 flex gap-1.5">
                          <MoveMenu
                            wl={wl}
                            collections={collections}
                            onMove={moveItem}
                          />
                          <WishlistHeart type="tour" id={tour.id} />
                        </div>
                        <Link
                          to="/tours/$slug"
                          params={{ slug: tour.slug }}
                          className="group block rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
                        >
                          <div className="aspect-[4/3] bg-secondary overflow-hidden">
                            {tour.cover_url ? (
                              <img src={tour.cover_url} alt={tour.title} loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform" />
                            ) : null}
                          </div>
                          <div className="p-4">
                            <h3 className="font-display text-base font-semibold text-foreground line-clamp-2">{tour.title}</h3>
                            {tour.cities?.name ? (
                              <p className="mt-1 text-xs text-muted-foreground">{tour.cities.name}</p>
                            ) : null}
                            <div className="mt-3 flex items-center justify-between text-sm">
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <Clock className="size-3.5" />
                                {Number(tour.duration_hours)} {t("tours.hours")}
                              </span>
                              {Number(tour.price_from) > 0 ? (
                                <span className="font-medium text-foreground">
                                  {t("tours.priceFrom")} ${Number(tour.price_from)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyMini />
                )}
              </TabsContent>

              <TabsContent value="cities">
                {savedCities.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {savedCities.map(({ city: c, wl }) => (
                      <div key={c.id} className="inline-flex items-center gap-2 rounded-full bg-card ring-1 ring-border pl-4 pr-2 py-2">
                        <Link
                          to="/guides"
                          search={{ city: c.name }}
                          className="inline-flex items-center gap-2 text-sm font-medium text-foreground"
                        >
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          {c.name}
                        </Link>
                        <MoveMenu wl={wl} collections={collections} onMove={moveItem} />
                        <WishlistHeart type="city" id={c.id} size="sm" variant="ghost" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyMini />
                )}
              </TabsContent>
            </Tabs>
          ) : ready && items.length > 0 ? (
            <EmptyMini />
          ) : null}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function CollectionPill({
  active,
  onClick,
  label,
  count,
  emoji,
  onDelete,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  emoji: string;
  onDelete?: () => void;
}) {
  return (
    <div
      className={cn(
        "group inline-flex items-center gap-2 rounded-full pl-3 pr-2 py-1.5 text-sm transition-colors ring-1",
        active
          ? "bg-primary text-primary-foreground ring-primary"
          : "bg-card text-foreground ring-border hover:bg-secondary/70",
      )}
    >
      <button type="button" onClick={onClick} className="inline-flex items-center gap-2">
        <span className="text-base leading-none">{emoji}</span>
        <span className="font-medium">{label}</span>
        <span className={cn("text-xs", active ? "opacity-80" : "text-muted-foreground")}>
          {count}
        </span>
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className={cn(
            "opacity-0 group-hover:opacity-100 rounded-full p-1 transition-opacity",
            active ? "hover:bg-white/20" : "hover:bg-secondary",
          )}
          aria-label="Delete collection"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function MoveMenu({
  wl,
  collections,
  onMove,
}: {
  wl: WishlistItem;
  collections: WishlistCollection[];
  onMove: (dbId: string, collectionId: string | null) => Promise<void>;
}) {
  if (!wl.dbId) return null;
  const current = collections.find((c) => c.id === wl.collectionId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.preventDefault()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/45"
          aria-label="Move to collection"
        >
          {current ? (
            <span className="text-base leading-none">{current.emoji}</span>
          ) : (
            <Folder className="h-[18px] w-[18px]" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Move to collection</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onMove(wl.dbId!, null)}>
          <span className="mr-2">📥</span> Unsorted
          {!wl.collectionId && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        {collections.length > 0 && <DropdownMenuSeparator />}
        {collections.map((c) => (
          <DropdownMenuItem key={c.id} onClick={() => onMove(wl.dbId!, c.id)}>
            <span className="mr-2">{c.emoji}</span> {c.name}
            {wl.collectionId === c.id && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        {collections.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Create a collection first
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyMini() {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center text-sm text-muted-foreground inline-flex flex-col items-center gap-3 w-full">
      <Heart className="h-8 w-8 text-muted-foreground/50" />
      {t("wishlist.empty")}
    </div>
  );
}
