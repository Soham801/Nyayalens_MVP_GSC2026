import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { ArrowLeft, FileText, ScanSearch, Camera, Download } from "lucide-react";
import { t } from "@/lib/i18n";
import { formatDate, formatDateTime } from "@/lib/utils-app";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateCertificatePdf, generateComplaintPdf } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/cases")({
  component: CasesPage,
});

interface Work {
  id: string;
  certificate_id: string;
  title: string;
  image_url: string;
  ai_description: string | null;
  ai_tags: string[] | null;
  location_text: string | null;
  status: string;
  created_at: string;
}
interface Scan {
  id: string;
  scanned_image_url: string;
  similarity_score: number;
  ai_reasoning: string | null;
  matched_work_id: string | null;
  created_at: string;
  works?: { title: string; certificate_id: string } | null;
}
interface Complaint {
  id: string;
  complaint_text: string;
  status: string;
  language: string;
  created_at: string;
  works?: { title: string; certificate_id: string } | null;
}

function CasesPage() {
  const { user, profile, lang, loading } = useAuth();
  const nav = useNavigate();
  const [works, setWorks] = useState<Work[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [w, s, c] = await Promise.all([
        supabase.from("works").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase
          .from("scans")
          .select("*, works(title, certificate_id)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("complaints")
          .select("*, works(title, certificate_id)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      setWorks((w.data as Work[]) || []);
      setScans((s.data as Scan[]) || []);
      setComplaints((c.data as Complaint[]) || []);
    })();
  }, [user]);

  const downloadCert = async (w: Work) => {
    if (!profile) return;
    await generateCertificatePdf({
      certificateId: w.certificate_id,
      title: w.title,
      ownerName: profile.name,
      craftType: profile.craft_type,
      description: w.ai_description || "",
      tags: w.ai_tags || [],
      location: w.location_text,
      imageUrl: w.image_url,
      createdAt: w.created_at,
    });
  };

  const downloadComp = (c: Complaint) => {
    generateComplaintPdf({
      certificateId: c.works?.certificate_id || "NL",
      ownerName: profile?.name || "",
      complaintText: c.complaint_text,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t(lang, "backHome")}
        </Link>

        <div className="mb-6">
          <h1 className="font-serif text-4xl text-foreground">{t(lang, "cases")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {works.length} works · {scans.length} scans · {complaints.length} complaints
          </p>
        </div>

        <Tabs defaultValue="works">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="works" className="gap-1.5">
              <Camera className="h-3.5 w-3.5" /> Works
            </TabsTrigger>
            <TabsTrigger value="scans" className="gap-1.5">
              <ScanSearch className="h-3.5 w-3.5" /> Scans
            </TabsTrigger>
            <TabsTrigger value="complaints" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Complaints
            </TabsTrigger>
          </TabsList>

          <TabsContent value="works" className="mt-6 space-y-3">
            {works.length === 0 && <Empty msg="No works yet. Register your first creation." cta="/register" ctaLabel="Register a work" />}
            {works.map((w) => (
              <div
                key={w.id}
                className="flex gap-4 rounded-xl border border-border bg-card p-4 shadow-card"
              >
                <img src={w.image_url} alt={w.title} className="h-20 w-20 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-serif text-xl text-foreground truncate">{w.title}</h3>
                      <p className="font-mono text-xs text-primary">{w.certificate_id}</p>
                    </div>
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-success">
                      {t(lang, "registered")}
                    </span>
                  </div>
                  {w.ai_description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{w.ai_description}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatDate(w.created_at)}</span>
                    <Button size="sm" variant="outline" onClick={() => downloadCert(w)} className="h-7 gap-1 text-xs">
                      <Download className="h-3 w-3" /> PDF
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="scans" className="mt-6 space-y-3">
            {scans.length === 0 && <Empty msg="No scans yet." cta="/scan" ctaLabel="Scan an image" />}
            {scans.map((s) => {
              const high = s.similarity_score >= 70;
              return (
                <div key={s.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <div className="flex gap-4">
                    <img
                      src={s.scanned_image_url}
                      alt="Scanned"
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-serif text-lg text-foreground">
                            vs {s.works?.title || "—"}
                          </h3>
                          <p className="text-xs text-muted-foreground">{formatDateTime(s.created_at)}</p>
                        </div>
                        <span
                          className={`font-serif text-3xl ${high ? "text-destructive" : "text-success"}`}
                        >
                          {s.similarity_score}%
                        </span>
                      </div>
                      {s.ai_reasoning && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.ai_reasoning}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="complaints" className="mt-6 space-y-3">
            {complaints.length === 0 && <Empty msg="No complaints filed." cta="/scan" ctaLabel="Scan to detect copies" />}
            {complaints.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-lg text-foreground">
                      Complaint · {c.works?.certificate_id || "—"}
                    </h3>
                    <p className="text-xs text-muted-foreground">{formatDateTime(c.created_at)}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                      c.status === "submitted"
                        ? "bg-success/15 text-success"
                        : "bg-warning/20 text-warning-foreground"
                    }`}
                  >
                    {c.status === "submitted" ? t(lang, "submitted") : t(lang, "draft")}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{c.complaint_text}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadComp(c)} className="h-7 gap-1 text-xs">
                    <Download className="h-3 w-3" /> Download
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(c.complaint_text);
                      toast.success("Copied");
                    }}
                    className="h-7 text-xs"
                  >
                    Copy text
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Empty({ msg, cta, ctaLabel }: { msg: string; cta: string; ctaLabel: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <p className="text-sm text-muted-foreground">{msg}</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to={cta}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
