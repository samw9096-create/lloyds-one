const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const allowedActions = new Map([
  ["/home", "Open home"],
  ["/insights", "Open insights"],
  ["/spending-wrapped", "View wrapped"],
  ["/budget-pots", "Open budget pots"],
  ["/deal-dash", "Open Deal Nest"],
  ["/shopping-list", "Open shopping list"],
  ["/payments", "Open payments"],
  ["/friends", "Check friends"],
  ["/dms", "Open DMs"],
  ["/learn", "Open Money Minutes"],
  ["/practice-investing", "Open practice investing"],
  ["/settings", "Open settings"]
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function compactSnapshot(snapshot: Record<string, unknown>) {
  const recentTransactions = Array.isArray(snapshot?.recentTransactions)
    ? snapshot.recentTransactions.slice(0, 8).map((tx) => ({
        amount: Number(tx?.amount || 0),
        reference: String(tx?.reference || "").slice(0, 80),
        counterpartyName: String(tx?.counterpartyName || "").slice(0, 80),
        created_at: String(tx?.created_at || "").slice(0, 40)
      }))
    : [];

  return {
    userName: String(snapshot?.userName || "there").slice(0, 80),
    balance: Number(snapshot?.balance || 0),
    interests: Array.isArray(snapshot?.interests) ? snapshot.interests.slice(0, 8) : [],
    confidence: String(snapshot?.confidence || "comfortable").slice(0, 40),
    topCategory: String(snapshot?.topCategory || "General").slice(0, 80),
    topCategoryAmount: Number(snapshot?.topCategoryAmount || 0),
    topMerchant: String(snapshot?.topMerchant || "No merchant data yet").slice(0, 80),
    topMerchantAmount: Number(snapshot?.topMerchantAmount || 0),
    potsCount: Number(snapshot?.potsCount || 0),
    potTotal: Number(snapshot?.potTotal || 0),
    unreadThreads: Number(snapshot?.unreadThreads || 0),
    practiceCash: Number(snapshot?.practiceCash || 0),
    practicePositions: Number(snapshot?.practicePositions || 0),
    recentTransactions
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

function sanitizeResponse(value: Record<string, unknown>) {
  const rawActions = Array.isArray(value?.actions) ? value.actions : [];
  const actions = rawActions
    .map((action) => {
      const route = String(action?.route || "");
      if (!allowedActions.has(route)) return null;
      return {
        label: String(action?.label || allowedActions.get(route) || "Open").slice(0, 28),
        route
      };
    })
    .filter(Boolean)
    .slice(0, 3);

  return {
    source: "gemini",
    intent: String(value?.intent || "overview").slice(0, 40),
    title: String(value?.title || "Money brief").slice(0, 80),
    body: String(value?.body || "Here is the most useful next step based on your current app context.").slice(0, 420),
    bullets: (Array.isArray(value?.bullets) ? value.bullets : [])
      .map((item) => String(item || "").slice(0, 180))
      .filter(Boolean)
      .slice(0, 4),
    actions
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed." }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY") || "";
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  if (!apiKey) return jsonResponse({ ok: false, error: "Missing GEMINI_API_KEY." }, 500);

  const body = await req.json().catch(() => ({}));
  const question = String(body?.question || "").trim().slice(0, 1200);
  if (!question) return jsonResponse({ ok: false, error: "Missing question." }, 400);

  const snapshot = compactSnapshot(body?.snapshot || {});
  const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
  const path = String(body?.path || "/home").slice(0, 80);

  const prompt = `
You are the Lloyds One in-app money assistant for a student banking prototype.
Answer the user's question using the supplied app context. Be concise, practical, and UK-focused.
Do not claim to perform real banking actions, provide regulated financial advice, or guarantee outcomes.
For investing, make clear this app uses practice/fake money when relevant.

Return only valid JSON in this exact shape:
{
  "intent": "overview|savings|deals|payments|learning|investing|insights",
  "title": "short title",
  "body": "one concise paragraph",
  "bullets": ["up to four concrete bullets"],
  "actions": [{"label":"short label","route":"/one-of-the-allowed-routes"}]
}

Allowed routes: ${Array.from(allowedActions.keys()).join(", ")}
Current route: ${path}
User question: ${question}
Recent chat history: ${JSON.stringify(history)}
App context: ${JSON.stringify(snapshot)}
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
        temperature: 0.45,
        maxOutputTokens: 700,
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

  const text = geminiBody?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part?.text || "")
    .join("")
    .trim() || "";
  const parsed = parseGeminiJson(text);
  if (!parsed) return jsonResponse({ ok: false, error: "Gemini returned an unreadable response." }, 502);

  return jsonResponse({ ok: true, response: sanitizeResponse(parsed) });
});
