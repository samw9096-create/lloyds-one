const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function money(value: unknown) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function compactPeriodData(data: Record<string, unknown>) {
  const categories = Array.isArray(data?.categories)
    ? data.categories.slice(0, 6).map((category) => ({
        name: String(category?.name || "Other").slice(0, 60),
        amount: money(category?.amount)
      }))
    : [];

  const trend = Array.isArray(data?.trend)
    ? data.trend.slice(-14).map((point) => ({
        label: String(point?.label || "").slice(0, 24),
        value: money(point?.value)
      }))
    : [];

  return {
    total: money(data?.total),
    income: money(data?.income),
    safeToSpend: money(data?.safeToSpend),
    categories,
    trend
  };
}

function parseGeminiJson(text: string) {
  const cleaned = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function firstJsonCandidate(body: any) {
  const candidate = body?.candidates?.[0];
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => {
    if (typeof part?.text === "string") return part.text;
    if (part?.functionCall || part?.inlineData) return JSON.stringify(part);
    return "";
  }).join("").trim();
}

function sanitize(value: Record<string, unknown>, context: Record<string, unknown>) {
  const insights = (Array.isArray(value?.insights) ? value.insights : [])
    .map((item) => String(item || "").replace(/\s+/g, " ").trim().slice(0, 180))
    .filter(Boolean)
    .slice(0, 4);

  return {
    ok: true,
    source: "gemini",
    meta: String(
      value?.meta ||
      `Gemini analysis built from ${Number(context?.realTxCount || 0)} recent account transactions + ${Number(context?.syntheticTxCount || 0)} simulated finance records.`
    ).slice(0, 180),
    insights
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed." }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY") || "";
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  if (!apiKey) return jsonResponse({ ok: false, error: "Missing GEMINI_API_KEY." }, 500);

  const body = await req.json().catch(() => ({}));
  const period = String(body?.period || "week").slice(0, 20);
  const periodData = compactPeriodData(body?.periodData || {});
  const context = {
    realTxCount: Number(body?.context?.realTxCount || 0),
    syntheticTxCount: Number(body?.context?.syntheticTxCount || 0),
    currency: String(body?.context?.currency || "GBP").slice(0, 8)
  };

  const prompt = `
You generate the Analysis section for the Lloyds One AI Insights page.
Use the supplied spending data only. Be concise, practical, student-friendly, and UK-focused.
Do not provide regulated financial advice, guarantees, or instructions to buy financial products.
Mention simulated records only in meta, not every insight.

Return only valid JSON in this exact shape:
{
  "meta": "short source label",
  "insights": [
    "first concrete insight",
    "second concrete insight",
    "third concrete insight",
    "fourth concrete insight"
  ]
}

Requirements:
- Exactly 4 insights.
- Include net movement, trend/momentum, top category pressure, and one next action.
- Use GBP amounts with the pound symbol.
- Keep each insight under 26 words.

Period: ${period}
Context: ${JSON.stringify(context)}
Spending data: ${JSON.stringify(periodData)}
`;

  const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 1024,
        responseMimeType: "application/json"
      }
    })
  });

  const geminiBody = await geminiRes.json().catch(() => ({}));
  if (!geminiRes.ok) {
    return jsonResponse({
      ok: false,
      error: geminiBody?.error?.message || "Gemini request failed."
    }, 502);
  }

  const text = firstJsonCandidate(geminiBody);
  const parsed = parseGeminiJson(text);
  if (!parsed) {
    return jsonResponse({
      ok: false,
      error: geminiBody?.candidates?.[0]?.finishReason === "MAX_TOKENS"
        ? "Gemini response was cut off before valid JSON completed."
        : "Gemini returned an unreadable response."
    }, 502);
  }

  const response = sanitize(parsed, context);
  if (!response.insights.length) return jsonResponse({ ok: false, error: "Gemini returned no insights." }, 502);
  return jsonResponse(response);
});
