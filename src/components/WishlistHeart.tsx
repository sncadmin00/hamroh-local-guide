import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWishlist, type WishlistType } from "@/hooks/useWishlist";
import { useI18n } from "@/lib/i18n";

type Props = {
  type: WishlistType;
  id: string | undefined | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "overlay" | "ghost";
};

const sizeMap = {
  sm: { btn: "h-7 w-7", icon: "h-3.5 w-3.5" },
  md: { btn: "h-9 w-9", icon: "h-[18px] w-[18px]" },
  lg: { btn: "h-11 w-11", icon: "h-5 w-5" },
};

export function WishlistHeart({ type, id, className, size = "md", variant = "overlay" }: Props) {
  const { isWishlisted, toggle } = useWishlist();
  const { t } = useI18n();
  if (!id) return null;
  const active = isWishlisted(type, id);
  const s = sizeMap[size];

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowActive = await toggle(type, id);
    toast.success(nowActive ? t("wishlist.saved") : t("wishlist.removed"));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? t("wishlist.removed") : t("wishlist.saved")}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-all active:scale-90",
        s.btn,
        variant === "overlay"
          ? "bg-black/30 text-white backdrop-blur-sm hover:bg-black/45"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/70",
        className,
      )}
    >
      <Heart
        className={cn(
          s.icon,
          "transition-colors",
          active ? "fill-rose-500 text-rose-500" : "",
        )}
        strokeWidth={2}
      />
    </button>
  );
}
