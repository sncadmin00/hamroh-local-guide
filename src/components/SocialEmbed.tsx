import { useEffect } from "react";
import { Instagram, Youtube, Music2, Twitter, ExternalLink } from "lucide-react";

type Platform = "instagram" | "tiktok" | "youtube" | "x";

function youtubeIdFrom(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/(?:embed|shorts)\/([^/?#]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export function SocialEmbed({ platform, url, caption }: { platform: Platform; url: string; caption?: string }) {
  // Load embed scripts as needed
  useEffect(() => {
    const sources: Record<string, string> = {
      instagram: "https://www.instagram.com/embed.js",
      tiktok: "https://www.tiktok.com/embed.js",
      x: "https://platform.twitter.com/widgets.js",
    };
    const src = sources[platform];
    if (!src) return;
    if (document.querySelector(`script[src="${src}"]`)) {
      // re-process existing embeds
      const w = window as unknown as { instgrm?: { Embeds?: { process: () => void } }; twttr?: { widgets?: { load: () => void } } };
      w.instgrm?.Embeds?.process?.();
      w.twttr?.widgets?.load?.();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    document.body.appendChild(s);
  }, [platform, url]);

  const Wrap = ({ children, icon: Icon, label }: { children: React.ReactNode; icon: React.ComponentType<{ className?: string }>; label: string }) => (
    <div className="rounded-2xl bg-card ring-1 ring-border/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className="h-4 w-4" /> {label}
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Open" className="text-muted-foreground hover:text-foreground">
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <div className="p-3">{children}</div>
      {caption && <p className="px-4 pb-4 text-sm text-muted-foreground">{caption}</p>}
    </div>
  );

  if (platform === "youtube") {
    const id = youtubeIdFrom(url);
    return (
      <Wrap icon={Youtube} label="YouTube">
        {id ? (
          <div className="aspect-video w-full overflow-hidden rounded-lg">
            <iframe
              src={`https://www.youtube.com/embed/${id}`}
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        ) : (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">Open video</a>
        )}
      </Wrap>
    );
  }

  if (platform === "instagram") {
    return (
      <Wrap icon={Instagram} label="Instagram">
        <blockquote
          className="instagram-media"
          data-instgrm-permalink={url}
          data-instgrm-version="14"
          style={{ background: "#FFF", border: 0, margin: 0, padding: 0, width: "100%" }}
        >
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">View on Instagram</a>
        </blockquote>
      </Wrap>
    );
  }

  if (platform === "tiktok") {
    return (
      <Wrap icon={Music2} label="TikTok">
        <blockquote className="tiktok-embed" cite={url} style={{ margin: 0 }}>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">View on TikTok</a>
        </blockquote>
      </Wrap>
    );
  }

  // x / twitter
  return (
    <Wrap icon={Twitter} label="X">
      <blockquote className="twitter-tweet">
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">View post</a>
      </blockquote>
    </Wrap>
  );
}
