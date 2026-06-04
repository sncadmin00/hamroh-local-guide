import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import ogDefault from "@/assets/og-default.jpg";
import favicon from "@/assets/favicon.png.asset.json";
import { I18nProvider } from "@/lib/i18n";
import { useTrackSource } from "@/hooks/useTrackSource";
import { useCaptureReferral } from "@/hooks/useCaptureReferral";
import { Toaster } from "@/components/ui/sonner";

const SITE_URL = "https://hamroh-local-guide.lovable.app";
const OG_IMAGE = `${SITE_URL}${ogDefault}`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This trail doesn't exist on our map.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please try again.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a href="/" className="rounded-full border border-input px-5 py-2.5 text-sm font-medium">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0f172a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Hamroh" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "google-site-verification", content: "SGfarfVZaA-dwBPMwRnOquK8BriqN96NlCoVkn2kvt8" },
      { title: "Hamroh — Explore places with locals" },
      { name: "description", content: "Book verified local guides in cities around the world. Authentic experiences, multiple languages, instant booking." },
      { property: "og:site_name", content: "Hamroh" },
      { property: "og:title", content: "Hamroh — Explore places with locals" },
      { property: "og:description", content: "Book verified local guides in cities around the world. Authentic experiences, multiple languages, instant booking." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:title", content: "Hamroh — Explore places with locals" },
      { name: "twitter:description", content: "Book verified local guides in cities around the world. Authentic experiences, multiple languages, instant booking." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/43b121e8-819d-416f-b67f-6e3584753257/id-preview-c71dad3b--6fe4ded5-fad3-4138-b141-63c14b76e50f.lovable.app-1780379370290.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/43b121e8-819d-416f-b67f-6e3584753257/id-preview-c71dad3b--6fe4ded5-fad3-4138-b141-63c14b76e50f.lovable.app-1780379370290.png" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: favicon.url },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useTrackSource();
  useCaptureReferral();
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Outlet />
        <Toaster />
      </I18nProvider>
    </QueryClientProvider>
  );
}
