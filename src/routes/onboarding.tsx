import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const CRAFTS = [
  "Madhubani painting",
  "Pattachitra",
  "Warli art",
  "Kalamkari",
  "Tanjore painting",
  "Block printing",
  "Pottery",
  "Wood carving",
  "Metal craft",
  "Embroidery",
  "Weaving",
  "Jewelry making",
  "Other",
];

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { user, profile, lang, setLang, refreshProfile, loading } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [craft, setCraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
    if (profile?.name) setName(profile.name);
    if (profile?.craft_type) setCraft(profile.craft_type);
  }, [loading, user, profile, nav]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name, craft_type: craft, language: lang })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("Profile saved");
    nav({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto max-w-md px-4 pt-12">
        <div className="mb-8">
          <h1 className="font-serif text-4xl text-foreground">Tell us about your craft</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We'll use this to personalize your certificates and complaints.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card"
        >
          <div>
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sita Devi"
            />
          </div>

          <div>
            <Label>Craft Type</Label>
            <Select value={craft} onValueChange={setCraft} required>
              <SelectTrigger>
                <SelectValue placeholder="Select your craft" />
              </SelectTrigger>
              <SelectContent>
                {CRAFTS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Language / भाषा</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  lang === "en"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                <div className="font-medium">English</div>
                <div className="text-xs text-muted-foreground">Default</div>
              </button>
              <button
                type="button"
                onClick={() => setLang("hi")}
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  lang === "hi"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                <div className="font-medium">हिंदी</div>
                <div className="text-xs text-muted-foreground">Hindi</div>
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={busy || !name || !craft}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </form>
      </main>
    </div>
  );
}
