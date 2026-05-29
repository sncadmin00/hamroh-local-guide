import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/become-a-guide")({
  head: () => ({
    meta: [
      { title: "Become a Guide — Sancho" },
      { name: "description", content: "Join Sancho as a local guide and share your city with travelers." },
    ],
  }),
  component: BecomeAGuidePage,
});

function BecomeAGuidePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Become a Guide
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Share your local knowledge, meet travelers from around the world, and earn on your own schedule.
        </p>

        <div className="mt-10 grid gap-6 text-left sm:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-secondary/30 p-6">
            <h3 className="font-semibold text-lg">Flexible schedule</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Accept bookings when it suits you. You are in control of your time.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-secondary/30 p-6">
            <h3 className="font-semibold text-lg">Fair earnings</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Set your own rates and keep a generous share of every tour.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-secondary/30 p-6">
            <h3 className="font-semibold text-lg">Verified platform</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              We verify every guide to build trust with travelers.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-secondary/30 p-6">
            <h3 className="font-semibold text-lg">Grow your network</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect with a global community of curious travelers.
            </p>
          </div>
        </div>

        <div className="mt-12">
          <Button size="lg" className="rounded-full px-8">
            Apply now
          </Button>
          <p className="mt-3 text-sm text-muted-foreground">
            We will review your application within 2 business days.
          </p>
        </div>
      </div>
    </div>
  );
}
