import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { t } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { Camera, ScanSearch, FolderOpen, Sparkles, ShieldCheck, FileText } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { user, profile, lang, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    // Redirect to onboarding if logged in but no profile name
    if (!loading && user && profile && !profile.craft_type) {
      nav({ to: "/onboarding" });
    }
  }, [loading, user, profile, nav]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  // ---- Logged-out hero ----
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:pt-20">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
                <Sparkles className="h-3 w-3 text-primary" /> AI-powered IP protection
              </div>
              <h1 className="font-serif text-5xl leading-tight text-foreground sm:text-6xl md:text-7xl">
                Protect what your{" "}
                <span className="italic text-primary">hands create</span>.
              </h1>
              <p className="max-w-md text-lg text-muted-foreground">
                NyayaLens helps Indian artisans register their work, detect copies, and file
                copyright complaints — in minutes, in their own language.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3.5 font-medium text-primary-foreground shadow-warm transition hover:bg-primary/90"
                >
                  Get started — it's free
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3.5 font-medium text-foreground transition hover:bg-accent/30"
                >
                  Sign in
                </Link>
              </div>
              <div className="flex items-center gap-6 pt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Indian Copyright Act
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" /> Powered by Gemini
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-clay opacity-40 blur-2xl" />
              <div className="relative rounded-3xl border-2 border-border/60 bg-card p-8 shadow-warm">
                <div className="seal-stamp absolute -right-4 -top-4 flex h-24 w-24 rotate-12 flex-col items-center justify-center rounded-full text-center">
                  <span className="font-serif text-[10px] italic text-primary">verified</span>
                  <span className="font-serif text-xs font-bold text-primary">NL-2026</span>
                  <span className="font-serif text-[9px] text-primary">XXXX</span>
                </div>
                <div className="mb-4 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Certificate of Creation
                  </p>
                  <h3 className="font-serif text-2xl italic text-foreground">Madhubani Lotus</h3>
                </div>
                <div className="aspect-square rounded-xl bg-gradient-to-br from-amber-100 via-orange-200 to-rose-300 shadow-inner" />
                <div className="mt-4 space-y-1.5 text-xs">
                  <div className="flex justify-between border-b border-dashed border-border pb-1">
                    <span className="text-muted-foreground">Owner</span>
                    <span className="font-medium text-foreground">Sita Devi</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-border pb-1">
                    <span className="text-muted-foreground">Craft</span>
                    <span className="font-medium text-foreground">Madhubani painting</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Issued</span>
                    <span className="font-medium text-foreground">Today</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* features */}
          <div className="mt-24 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Camera,
                title: "Register",
                desc: "Photograph your work. AI describes it. Get a tamper-proof certificate.",
              },
              {
                icon: ScanSearch,
                title: "Detect copies",
                desc: "Upload any image — Gemini compares it against your registered works.",
              },
              {
                icon: FileText,
                title: "File complaints",
                desc: "Auto-generate a formal copyright complaint in English or Hindi.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-card"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-clay">
                  <f.icon className="h-5 w-5 text-umber" />
                </div>
                <h3 className="font-serif text-2xl text-foreground">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ---- Logged-in dashboard ----
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-10">
        <div className="mb-10">
          <p className="text-sm text-muted-foreground">{t(lang, "welcome")},</p>
          <h1 className="font-serif text-4xl text-foreground sm:text-5xl">
            {profile?.name || "Artisan"}
          </h1>
          {profile?.craft_type && (
            <p className="mt-1 text-sm italic text-muted-foreground">{profile.craft_type}</p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <ActionCard
            to="/register"
            icon={Camera}
            label={t(lang, "register")}
            desc={t(lang, "registerDesc")}
            variant="primary"
          />
          <ActionCard
            to="/scan"
            icon={ScanSearch}
            label={t(lang, "scan")}
            desc={t(lang, "scanDesc")}
            variant="accent"
          />
          <ActionCard
            to="/cases"
            icon={FolderOpen}
            label={t(lang, "cases")}
            desc={t(lang, "casesDesc")}
            variant="muted"
          />
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-serif text-xl text-foreground">How NyayaLens works</h3>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  <span className="font-semibold text-foreground">1.</span> Register each piece you
                  create — get a unique certificate.
                </li>
                <li>
                  <span className="font-semibold text-foreground">2.</span> When you suspect a copy,
                  scan the image to compare.
                </li>
                <li>
                  <span className="font-semibold text-foreground">3.</span> If similarity is high,
                  generate a legal complaint instantly.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ActionCard({
  to,
  icon: Icon,
  label,
  desc,
  variant,
}: {
  to: string;
  icon: typeof Camera;
  label: string;
  desc: string;
  variant: "primary" | "accent" | "muted";
}) {
  const styles = {
    primary: "bg-gradient-terracotta text-primary-foreground shadow-warm hover:shadow-xl",
    accent: "bg-gradient-clay text-umber shadow-card hover:shadow-warm",
    muted: "bg-card text-foreground border border-border shadow-card hover:shadow-warm",
  }[variant];

  return (
    <Link
      to={to}
      className={`group relative flex flex-col gap-3 overflow-hidden rounded-2xl p-6 transition-all hover:-translate-y-0.5 ${styles}`}
    >
      <Icon className="h-8 w-8" strokeWidth={1.5} />
      <div>
        <h3 className="font-serif text-2xl leading-tight">{label}</h3>
        <p className="mt-1 text-sm opacity-80">{desc}</p>
      </div>
      <div className="mt-auto pt-2 text-xs font-medium uppercase tracking-wider opacity-70 group-hover:opacity-100">
        Open →
      </div>
    </Link>
  );
}
