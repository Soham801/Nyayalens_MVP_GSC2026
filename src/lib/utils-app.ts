// App-specific helpers
export function generateCertificateId(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `NL-${year}-${rand}`;
}

export function simplePerceptualHash(file: File): Promise<string> {
  // Lightweight client-side "perceptual hash" — hashes file size + name + first bytes
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(buf).slice(0, 1024);
      let h = 5381;
      for (let i = 0; i < bytes.length; i++) h = ((h << 5) + h + bytes[i]) | 0;
      resolve(`ph_${(h >>> 0).toString(16).padStart(8, "0")}_${file.size.toString(36)}`);
    };
    reader.readAsArrayBuffer(file.slice(0, 1024));
  });
}

export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(d: string | Date): string {
  return new Date(d).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
