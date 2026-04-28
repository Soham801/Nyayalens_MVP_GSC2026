import jsPDF from "jspdf";

interface CertData {
  certificateId: string;
  title: string;
  ownerName: string;
  craftType?: string | null;
  description: string;
  tags?: string[];
  location?: string | null;
  imageUrl: string;
  createdAt: string;
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateCertificatePdf(data: CertData) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  // Background — parchment
  pdf.setFillColor(248, 240, 224);
  pdf.rect(0, 0, W, H, "F");

  // Decorative borders
  pdf.setDrawColor(160, 82, 45);
  pdf.setLineWidth(3);
  pdf.rect(28, 28, W - 56, H - 56);
  pdf.setLineWidth(0.6);
  pdf.rect(36, 36, W - 72, H - 72);

  // Header
  pdf.setTextColor(61, 40, 23);
  pdf.setFont("times", "italic");
  pdf.setFontSize(34);
  pdf.text("Certificate of Creation", W / 2, 100, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(120, 90, 60);
  pdf.text("ISSUED BY NYAYALENS · ARTISAN IP PROTECTION", W / 2, 120, { align: "center" });

  // Decorative line
  pdf.setDrawColor(196, 142, 94);
  pdf.setLineWidth(0.8);
  pdf.line(W / 2 - 60, 130, W / 2 + 60, 130);

  // Image
  const imgData = await loadImageDataUrl(data.imageUrl);
  const imgX = (W - 280) / 2;
  const imgY = 150;
  if (imgData) {
    try {
      pdf.addImage(imgData, "JPEG", imgX, imgY, 280, 200, undefined, "FAST");
    } catch {
      try {
        pdf.addImage(imgData, "PNG", imgX, imgY, 280, 200, undefined, "FAST");
      } catch {
        // skip
      }
    }
    pdf.setDrawColor(160, 82, 45);
    pdf.setLineWidth(1.2);
    pdf.rect(imgX, imgY, 280, 200);
  } else {
    pdf.setDrawColor(160, 82, 45);
    pdf.setFillColor(232, 220, 200);
    pdf.rect(imgX, imgY, 280, 200, "FD");
    pdf.setFontSize(11);
    pdf.text("(Image preview unavailable)", W / 2, imgY + 100, { align: "center" });
  }

  // Title
  pdf.setFont("times", "italic");
  pdf.setFontSize(22);
  pdf.setTextColor(61, 40, 23);
  pdf.text(data.title, W / 2, 380, { align: "center" });

  // Description
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(80, 60, 45);
  const descLines = pdf.splitTextToSize(data.description || "Artisan creation.", W - 140);
  pdf.text(descLines.slice(0, 4), W / 2, 405, { align: "center" });

  // Details table
  const details: [string, string][] = [
    ["Certificate ID", data.certificateId],
    ["Owner", data.ownerName],
    ["Craft Type", data.craftType || "—"],
    ["Date of Creation", new Date(data.createdAt).toLocaleString("en-IN")],
    ["Location", data.location || "—"],
  ];

  let y = 480;
  pdf.setFontSize(10);
  details.forEach(([k, v]) => {
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(140, 80, 40);
    pdf.text(k.toUpperCase(), 80, y);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(40, 30, 20);
    pdf.text(v, 220, y);
    y += 18;
  });

  // Seal
  const sealX = W - 110;
  const sealY = H - 130;
  pdf.setDrawColor(160, 82, 45);
  pdf.setLineWidth(1.5);
  pdf.circle(sealX, sealY, 38);
  pdf.setLineWidth(0.5);
  pdf.circle(sealX, sealY, 33);
  pdf.setFont("times", "italic");
  pdf.setFontSize(9);
  pdf.setTextColor(160, 82, 45);
  pdf.text("VERIFIED", sealX, sealY - 4, { align: "center" });
  pdf.text("NYAYALENS", sealX, sealY + 8, { align: "center" });
  pdf.setFontSize(7);
  pdf.text(data.certificateId, sealX, sealY + 18, { align: "center" });

  // Footer
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(120, 90, 60);
  pdf.text(
    "This digital certificate establishes proof of creation under the Indian Copyright Act, 1957.",
    W / 2,
    H - 50,
    { align: "center" }
  );

  pdf.save(`Certificate-${data.certificateId}.pdf`);
}

export function generateComplaintPdf(opts: {
  certificateId: string;
  ownerName: string;
  complaintText: string;
}) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(252, 248, 240);
  pdf.rect(0, 0, W, pdf.internal.pageSize.getHeight(), "F");

  pdf.setFont("times", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(61, 40, 23);
  pdf.text("LEGAL COMPLAINT", W / 2, 60, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(120, 90, 60);
  pdf.text(`Filed via NyayaLens · Ref: ${opts.certificateId}`, W / 2, 78, { align: "center" });

  pdf.setDrawColor(196, 142, 94);
  pdf.line(60, 90, W - 60, 90);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(40, 30, 20);
  const lines = pdf.splitTextToSize(opts.complaintText, W - 120);
  pdf.text(lines, 60, 115, { lineHeightFactor: 1.5 });

  pdf.save(`Complaint-${opts.certificateId}.pdf`);
}
