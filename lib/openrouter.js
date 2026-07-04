const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `You are a B2B company research analyst. You will be given
raw crawled website text and web search snippets about a company. Analyze them
and return ONLY a single valid JSON object (no markdown fences, no commentary)
with exactly this shape:

{
  "companyName": string,
  "website": string,
  "phone": string | null,
  "address": string | null,
  "productsServices": string[],
  "summary": string,
  "painPoints": string[],
  "competitors": [{ "name": string, "website": string }]
}

Rules:
- Base every field only on the provided material; if something is not present, use null (or an empty array for lists).
- painPoints: 3-5 realistic, specific business/operational challenges this company likely faces, inferred from its products, market and positioning.
- competitors: 3-5 real companies operating in the same country/industry with similar products or services. Include their websites.
- Do not invent phone numbers or addresses that are not supported by the source material.
- Return raw JSON only.`;

async function analyzeCompany({ apiKey, model, crawledPages, searchContext, companyHint }) {
  if (!apiKey) throw new Error("Missing OpenRouter API key");

  const crawledText = crawledPages
    .map((p) => `--- PAGE (${p.type}): ${p.url} ---\nTitle: ${p.title}\n${p.content}`)
    .join("\n\n")
    .slice(0, 18000);

  const userPrompt = `Company (as provided by user): ${companyHint}

CRAWLED WEBSITE CONTENT:
${crawledText || "(no crawlable content found)"}

WEB SEARCH CONTEXT:
${JSON.stringify(searchContext).slice(0, 6000)}

Analyze the above and return the JSON object described in your instructions.`;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://relu-company-research.vercel.app",
      "X-Title": "Relu Company Research Assistant",
    },
    body: JSON.stringify({
      model: model || "anthropic/claude-3.5-sonnet",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  return parseModelJson(raw);
}

function parseModelJson(raw) {
  // Models sometimes wrap JSON in ```json fences despite instructions — strip defensively.
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Last resort: try to find the outermost { ... } block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    throw new Error("AI model did not return valid JSON");
  }
}

module.exports = { analyzeCompany };
