import { NextResponse } from "next/server";
import { findOfficialWebsite, searchCompanyInfo, searchCompetitors, normalizeUrl } from "../../../lib/serper";
import { crawlWebsite } from "../../../lib/crawler";
import { analyzeCompany } from "../../../lib/openrouter";

export const runtime = "nodejs";
export const maxDuration = 60;

function isUrl(input) {
  return /^https?:\/\//i.test(input.trim()) || /^[\w-]+\.[a-z]{2,}(\/.*)?$/i.test(input.trim());
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      input,
      serperApiKey = process.env.SERPER_API_KEY,
      openRouterApiKey = process.env.OPENROUTER_API_KEY,
      model = process.env.NEXT_PUBLIC_DEFAULT_MODEL || "anthropic/claude-3.5-sonnet",
    } = body;

    if (!input || !input.trim()) {
      return NextResponse.json({ error: "Please provide a company name or website URL." }, { status: 400 });
    }
    if (!serperApiKey) {
      return NextResponse.json({ error: "Missing Serper.dev API key." }, { status: 400 });
    }
    if (!openRouterApiKey) {
      return NextResponse.json({ error: "Missing OpenRouter API key." }, { status: 400 });
    }

    const trimmed = input.trim();
    let websiteUrl = null;
    let companyNameGuess = trimmed;

    // Step 1: resolve official website
    if (isUrl(trimmed)) {
      websiteUrl = normalizeUrl(trimmed);
      companyNameGuess = new URL(websiteUrl).hostname.replace("www.", "").split(".")[0];
    } else {
      websiteUrl = await findOfficialWebsite(serperApiKey, trimmed);
      if (!websiteUrl) {
        return NextResponse.json(
          { error: `Could not find an official website for "${trimmed}".` },
          { status: 404 }
        );
      }
    }

    // Step 2: crawl the site (parallel with search context gathering)
    const [crawlResult, companyInfo, competitorSearch] = await Promise.all([
      crawlWebsite(websiteUrl),
      searchCompanyInfo(serperApiKey, companyNameGuess),
      searchCompetitors(serperApiKey, companyNameGuess),
    ]);

    // Step 3: AI analysis
    const analysis = await analyzeCompany({
      apiKey: openRouterApiKey,
      model,
      crawledPages: crawlResult.pages,
      searchContext: { companyInfo, competitorSearch },
      companyHint: trimmed,
    });

    // Ensure website field is populated even if the model omits it
    if (!analysis.website) analysis.website = websiteUrl;

    return NextResponse.json({
      result: analysis,
      meta: {
        crawledPages: crawlResult.pages.map((p) => ({ url: p.url, type: p.type })),
        crawlError: crawlResult.error,
      },
    });
  } catch (err) {
    console.error("Research error:", err);
    return NextResponse.json({ error: err.message || "Research failed." }, { status: 500 });
  }
}
