import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { ImageDropzone } from "@/components/ImageDropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, MapPin, ArrowLeft, Sparkles, CheckCircle2, Download } from "lucide-react";
import { generateCertificateId, simplePerceptualHash } from "@/lib/utils-app";
import { generateCertificatePdf } from "@/lib/pdf";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/register")({
  component: RegisterWork,
});

interface CreatedWork {
  id: string;
  certificate_id: string;
  title: string;
  ai_description: string | null;
  ai_tags: string[] | null;
  image_url: string;
  location_text: string | null;
  created_at: string;
}

function RegisterWork() {
  const { user, profile, lang, loading } = useAuth();
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [created, setCreated] = useState<CreatedWork | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        toast.success("Location captured");
      },
      () => toast.error("Could not get location")
    );
  };

  const submit = async () => {
    if (!user || !file || !title.trim()) {
      toast.error("Please add an image and title");
      return;
    }
    setBusy(true);
    try {
      // 1. Hash
      setStage("Hashing image…");
      const phash = await simplePerceptualHash(file);

      // 2. Upload
      setStage("Uploading…");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("artisan-works")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("artisan-works").getPublicUrl(path);
      const imageUrl = pub.publicUrl;

      // 3. AI description
      setStage("Analyzing with AI…");
      let description = "";
      let tags: string[] = [];
      try {
        const { data: aiData, error: aiErr } = await supabase.functions.invoke("ai-process", {
          body: { task: "describe_image", payload: { imageUrl } },
        });
        if (aiErr) throw aiErr;
        description = aiData?.description || "";
        tags = aiData?.tags || [];
      } catch (e) {
        console.warn("AI description failed", e);
        description = "Artisan creation. (AI description temporarily unavailable.)";
      }

      // 4. Insert work
      setStage("Issuing certificate…");
      const certificateId = generateCertificateId();
      const { data: work, error: insErr } = await supabase
        .from("works")
        .insert({
          user_id: user.id,
          certificate_id: certificateId,
          title: title.trim(),
          image_url: imageUrl,
          image_path: path,
          perceptual_hash: phash,
          ai_description: description,
          ai_tags: tags,
          location_text: location || null,
          status: "registered",
        })
        .select()
        .single();
      if (insErr) throw insErr;

      setCreated(work as CreatedWork);
      toast.success("Certificate issued!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to register work");
    } finally {
      setBusy(false);
      setStage("");
    }
  };

  const downloadPdf = async () => {
    if (!created || !profile) return;
    await generateCertificatePdf({
      certificateId: created.certificate_id,
      title: created.title,
      ownerName: profile.name,
      craftType: profile.craft_type,
      description: created.ai_description || "",
      tags: created.ai_tags || [],
      location: created.location_text,
      imageUrl: created.image_url,
      createdAt: created.created_at,
    });
  };

  // ---- Success screen ----
  if (created) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className="mx-auto max-w-2xl px-4 py-10">
          <div className="mb-6 flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Work registered successfully</span>
          </div>

          {/* Certificate preview card */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-warm p-8 shadow-warm">
            <div className="seal-stamp absolute -right-4 -top-4 flex h-24 w-24 rotate-12 flex-col items-center justify-center rounded-full text-center">
              <span className="font-serif text-[10px] italic text-primary">verified</span>
              <span className="font-serif text-xs font-bold text-primary">
                {created.certificate_id.split("-")[2]}
              </span>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {t(lang, "certificate")}
              </p>
              <h2 className="mt-1 font-serif text-3xl italic text-foreground">{created.title}</h2>
              <p className="mt-1 text-xs font-mono text-primary">{created.certificate_id}</p>
            </div>

            <img
              src={created.image_url}
              alt={created.title}
              className="mx-auto mt-5 max-h-72 rounded-xl border border-border object-contain shadow-card"
            />

            {created.ai_description && (
              <div className="mt-5 rounded-lg bg-card/60 p-4">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary">
                  <Sparkles className="h-3 w-3" /> AI Description
                </div>
                <p className="text-sm leading-relaxed text-foreground">{created.ai_description}</p>
                {created.ai_tags && created.ai_tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {created.ai_tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-accent/40 px-2 py-0.5 text-[10px] font-medium text-accent-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Owner: </span>
                <span className="font-medium">{profile?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Date: </span>
                <span className="font-medium">
                  {new Date(created.created_at).toLocaleDateString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button onClick={downloadPdf} size="lg" className="flex-1 gap-2">
              <Download className="h-4 w-4" /> {t(lang, "download")}
            </Button>
            <Button asChild variant="outline" size="lg" className="flex-1">
              <Link to="/cases">View My Cases</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ---- Form ----
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t(lang, "backHome")}
        </Link>

        <div className="mb-6">
          <h1 className="font-serif text-4xl text-foreground">{t(lang, "register")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Photograph your work, and we'll issue a tamper-proof certificate.
          </p>
        </div>

        <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <ImageDropzone
            preview={preview}
            onFile={(f, url) => {
              setFile(f);
              setPreview(url);
            }}
            onClear={() => {
              setFile(null);
              setPreview(null);
            }}
            label={t(lang, "uploadImage")}
            hint={t(lang, "captureOrUpload")}
          />

          <div>
            <Label htmlFor="title">{t(lang, "title")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Madhubani Lotus"
            />
          </div>

          <div>
            <Label htmlFor="loc">{t(lang, "location")}</Label>
            <div className="flex gap-2">
              <Input
                id="loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Madhubani, Bihar"
              />
              <Button type="button" variant="outline" size="icon" onClick={detectLocation}>
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            onClick={submit}
            disabled={busy || !file || !title.trim()}
            size="lg"
            className="w-full"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {stage || t(lang, "analyzing")}
              </>
            ) : (
              "Issue Certificate"
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
