// Edge function: handles AI tasks using Lovable AI Gateway (Gemini)
// Tasks: describe_image | compare_images | generate_complaint

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callGemini(messages: any[], model = "google/gemini-2.5-flash") {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Response(JSON.stringify({ error: `AI gateway error: ${res.status} ${text}` }), {
      status: res.status === 429 || res.status === 402 ? res.status : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    const { task, payload } = await req.json();

    if (task === "describe_image") {
      const { imageUrl } = payload;
      const content = await callGemini([
        {
          role: "system",
          content:
            "You are an expert in Indian artisan crafts. Describe artwork concisely in 3-4 sentences, noting patterns, colors, materials, technique, and regional style. Return ONLY the description text.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this artisan work in structured detail." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ]);

      // Generate 3-5 tags too
      const tagsRaw = await callGemini([
        {
          role: "system",
          content:
            "Return a JSON array of 3-5 short lowercase tags describing the craft (e.g. [\"madhubani\",\"folk-art\",\"floral\"]). Return ONLY the JSON array, no markdown.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Tag this artisan work." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ]);
      let tags: string[] = [];
      try {
        const cleaned = tagsRaw.replace(/```json|```/g, "").trim();
        tags = JSON.parse(cleaned);
      } catch {
        tags = [];
      }

      return new Response(JSON.stringify({ description: content, tags }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (task === "compare_images") {
      const { originalUrl, suspectUrl } = payload;
      const result = await callGemini([
        {
          role: "system",
          content:
            'You are an expert in detecting copied artwork. Compare two artisan works and estimate visual similarity. Consider patterns, composition, colors, motifs, and style. Respond ONLY with valid JSON: {"similarity": <0-100 integer>, "reasoning": "<one short paragraph explaining matching elements>"}. No markdown.',
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Image 1 (original):" },
            { type: "image_url", image_url: { url: originalUrl } },
            { type: "text", text: "Image 2 (suspect copy):" },
            { type: "image_url", image_url: { url: suspectUrl } },
          ],
        },
      ]);
      let parsed = { similarity: 0, reasoning: "" };
      try {
        const cleaned = result.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { similarity: 0, reasoning: result };
      }
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (task === "generate_complaint") {
      const {
        complainantName,
        craftType,
        certificateId,
        registrationDate,
        location,
        similarityScore,
        aiReasoning,
        language,
      } = payload;
      const langName = language === "hi" ? "Hindi (Devanagari script)" : "English";
      const complaint = await callGemini(
        [
          {
            role: "system",
            content: `You are a legal drafting assistant specializing in Indian copyright law. Generate a formal legal complaint in ${langName} under the Indian Copyright Act, 1957. Include sections: (1) To: Officer-in-Charge, (2) Complainant Details, (3) Subject, (4) Facts of the Case, (5) Evidence, (6) Prayer/Relief Sought, (7) Declaration. Be formal but clear. Return ONLY the complaint text, ready to print. No markdown headers, just plain formal letter format.`,
          },
          {
            role: "user",
            content: `Complainant: ${complainantName}
Craft Type: ${craftType || "Traditional artisan work"}
Certificate of Creation ID: ${certificateId}
Original Registration Date: ${registrationDate}
Location: ${location || "India"}
Similarity to suspect copy: ${similarityScore}%
AI evidence summary: ${aiReasoning}

Draft the complaint now.`,
          },
        ],
        "google/gemini-2.5-flash"
      );
      return new Response(JSON.stringify({ complaint }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown task" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("ai-process error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
