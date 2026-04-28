import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { ImageDropzone } from "@/components/ImageDropzone";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Download,
  Share2,
} from "lucide-react";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/utils-app";
import { generateComplaintPdf } from "@/lib/pdf";

export const Route = createFileRoute("/scan")({
  component: ScanPage,
});

interface Work {
  id: string;
  certificate_id: string;
  title: string;
  image_url: string;
  ai_description: string | null;
  created_at: string;
  location_text: string | null;
}

interface ScanResult {
  scanId: string;
  scannedUrl: string;
  bestWork: Work | null;
  similarity: number;
  reasoning: string;
}

const THRESHOLD = 70;

function ScanPage() {
  const { user, profile, lang, loading } = useAuth();
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [works, setWorks] = useState<Work[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [complaintBusy, setComplaintBusy] = useState(false);
  const [complaintText, setComplaintText] = useState<string | null>(null);
  const [complaintId, setComplaintId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("works")
      .select("id,certificate_id,title,image_url,ai_description,created_at,location_text")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setWorks((data as Work[]) || []));
  }, [user]);

  const submit = async () => {
    if (!user || !file) {
      toast.error("Add an image to scan");
      return;
    }
    if (works.length === 0) {
      toast.error("Register at least one work first to compare against");
      return;
    }
    setBusy(true);
    setResult(null);
    setComplaintText(null);
    try {
      // Upload scanned image
      setStage("Uploading…");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/scan_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("artisan-works")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("artisan-works").getPublicUrl(path);
      const scannedUrl = pub.publicUrl;

      // Compare against each registered work; take the highest score (cap at 4 to keep it snappy)
      setStage("Analyzing with AI…");
      const candidates = works.slice(0, 4);
      let best: { work: Work; similarity: number; reasoning: string } | null = null;

      for (const w of candidates) {
        try {
          const { data, error } = await supabase.functions.invoke("ai-process", {
            body: {
              task: "compare_images",
              payload: { originalUrl: w.image_url, suspectUrl: scannedUrl },
            },
          });
          if (error) continue;
          const sim = Number(data?.similarity ?? 0);
          if (!best || sim > best.similarity) {
            best = { work: w, similarity: sim, reasoning: data?.reasoning || "" };
          }
          if (sim >= 90) break; // very confident match — stop early
        } catch (e) {
          console.warn("compare failed for", w.id, e);
        }
      }

      // Save scan
      const { data: scan, error: scErr } = await supabase
        .from("scans")
        .insert({
          user_id: user.id,
          scanned_image_url: scannedUrl,
          scanned_image_path: path,
          matched_work_id: best?.work.id || null,
          similarity_score: best?.similarity || 0,
          ai_reasoning: best?.reasoning || "",
        })
        .select()
        .single();
      if (scErr) throw scErr;

      setResult({
        scanId: scan.id,
        scannedUrl,
        bestWork: best?.work || null,
        similarity: best?.similarity || 0,
        reasoning: best?.reasoning || "",
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Scan failed");
    } finally {
      setBusy(false);
      setStage("");
    }
  };

  const generateComplaint = async () => {
    if (!user || !profile || !result || !result.bestWork) return;
    setComplaintBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-process", {
        body: {
          task: "generate_complaint",
          payload: {
            complainantName: profile.name,
            craftType: profile.craft_type,
            certificateId: result.bestWork.certificate_id,
            registrationDate: formatDate(result.bestWork.created_at),
            location: result.bestWork.location_text || profile.craft_type,
            similarityScore: result.similarity,
            aiReasoning: result.reasoning,
            language: lang,
          },
        },
      });
      if (error) throw error;
      const text = data?.complaint || "";
      setComplaintText(text);

      const { data: comp, error: ce } = await supabase
        .from("complaints")
        .insert({
          user_id: user.id,
          scan_id: result.scanId,
          work_id: result.bestWork.id,
          language: lang,
          complaint_text: text,
          status: "draft",
        })
        .select()
        .single();
      if (ce) throw ce;
      setComplaintId(comp.id);
      toast.success("Complaint drafted");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to generate complaint");
    } finally {
      setComplaintBusy(false);
    }
  };

  const downloadComplaint = () => {
    if (!complaintText || !result?.bestWork || !profile) return;
    generateComplaintPdf({
      certificateId: result.bestWork.certificate_id,
      ownerName: profile.name,
      complaintText,
    });
  };

  const shareWhatsApp = async () => {
    if (!complaintText) return;
    const url = `https://wa.me/?text=${encodeURIComponent(complaintText.slice(0, 1500))}`;
    if (complaintId) {
      await supabase.from("complaints").update({ status: "submitted" }).eq("id", complaintId);
    }
    window.open(url, "_blank");
  };

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
          <h1 className="font-serif text-4xl text-foreground">{t(lang, "scan")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload an image — we'll compare it with your {works.length} registered work
            {works.length === 1 ? "" : "s"}.
          </p>
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card">
          <ImageDropzone
            preview={preview}
            onFile={(f, url) => {
              setFile(f);
              setPreview(url);
              setResult(null);
              setComplaintText(null);
            }}
            onClear={() => {
              setFile(null);
              setPreview(null);
              setResult(null);
            }}
            label="Upload suspect image"
            hint="The one you think is a copy"
          />

          <Button onClick={submit} disabled={busy || !file} size="lg" className="w-full">
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {stage || t(lang, "analyzing")}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Compare with my works
              </>
            )}
          </Button>
        </div>

        {result && (
          <div className="mt-6 space-y-4">
            <ResultCard result={result} />

            {result.similarity >= THRESHOLD && result.bestWork && !complaintText && (
              <Button
                onClick={generateComplaint}
                disabled={complaintBusy}
                size="lg"
                variant="destructive"
                className="w-full gap-2"
              >
                {complaintBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {complaintBusy ? t(lang, "generating") : t(lang, "fileComplaint")}
              </Button>
            )}

            {complaintText && (
              <div className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="flex items-center gap-2 text-primary">
                  <FileText className="h-4 w-4" />
                  <h3 className="font-serif text-2xl text-foreground">{t(lang, "complaint")}</h3>
                </div>
                <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg bg-background/60 p-4 text-sm leading-relaxed text-foreground">
                  {complaintText}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={downloadComplaint} className="flex-1 gap-2">
                    <Download className="h-4 w-4" /> {t(lang, "download")}
                  </Button>
                  <Button
                    onClick={shareWhatsApp}
                    variant="outline"
                    className="flex-1 gap-2 border-green-600 text-green-700 hover:bg-green-50"
                  >
                    <Share2 className="h-4 w-4" /> {t(lang, "share")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ResultCard({ result }: { result: ScanResult }) {
  const high = result.similarity >= THRESHOLD;
  const tone = high ? "destructive" : "success";
  const Icon = high ? AlertTriangle : CheckCircle2;

  return (
    <div
      className={`rounded-2xl border-2 p-6 shadow-card ${
        high ? "border-destructive/40 bg-destructive/5" : "border-success/40 bg-success/5"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 text-${tone}`} />
        <h3 className="font-serif text-2xl text-foreground">
          {high ? "Potential Copy Detected" : "No Significant Match"}
        </h3>
      </div>

      <div className="mt-4 flex items-end gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Similarity
          </div>
          <div
            className={`font-serif text-6xl ${high ? "text-destructive" : "text-success"}`}
          >
            {result.similarity}%
          </div>
        </div>
        <div className="mb-2 flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${high ? "bg-destructive" : "bg-success"}`}
              style={{ width: `${Math.min(100, result.similarity)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            <span>Threshold {THRESHOLD}%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {result.bestWork && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Thumb label="Suspect image" url={result.scannedUrl} />
          <Thumb
            label={`Your work · ${result.bestWork.certificate_id}`}
            url={result.bestWork.image_url}
            title={result.bestWork.title}
            date={formatDate(result.bestWork.created_at)}
          />
        </div>
      )}

      {result.reasoning && (
        <div className="mt-4 rounded-lg bg-card/80 p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary">
            <Sparkles className="h-3 w-3" /> AI Reasoning
          </div>
          <p className="text-sm leading-relaxed text-foreground">{result.reasoning}</p>
        </div>
      )}
    </div>
  );
}

function Thumb({
  label,
  url,
  title,
  date,
}: {
  label: string;
  url: string;
  title?: string;
  date?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-2">
      <img src={url} alt={label} className="h-32 w-full rounded-md object-cover" />
      <div className="mt-1.5 px-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        {title && <p className="text-sm font-medium text-foreground">{title}</p>}
        {date && <p className="text-xs text-muted-foreground">{date}</p>}
      </div>
    </div>
  );
}
