const cheerio = require("cheerio");

// Pages we actively want to discover and read.
const TARGET_KEYWORDS = [
  { key: "home", patterns: ["^/$", "^/home"] },
  { key: "about", patterns: ["about"] },
  { key: "products", patterns: ["product"] },
  { key: "services", patterns: ["service"] },
  { key: "solutions", patterns: ["solution"] },
  { key: "contact", patterns: ["contact"] },
  { key: "pricing", patterns: ["pricing", "plans"] },
];

// Pages we never want to fetch.
const IGNORE_PATTERNS = [
  "login",
  "signin",
  "sign-in",
  "signup",
  "sign-up",
  "register",
  "logout",
  "account",
  "cart",
  "checkout",
  "privacy",
  "terms",
  "cookie",
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".svg",
  ".zip",
  "mailto:",
  "tel:",
  "javascript:",
];

const MAX_PAGES = 6;
const FETCH_TIMEOUT_MS = 8000;
const MAX_CHARS_PER_PAGE = 4000;

async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ReluResearchBot/1.0; +https://relu.example)",
        ...(opts.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function classifyPath(pathname) {
  const lower = pathname.toLowerCase();
  for (const target of TARGET_KEYWORDS) {
    if (target.patterns.some((p) => new RegExp(p).test(lower))) {
      return target.key;
    }
  }
  return null;
}

function shouldIgnore(href) {
  const lower = href.toLowerCase();
  return IGNORE_PATTERNS.some((p) => lower.includes(p));
}

function extractVisibleText($) {
  $("script, style, noscript, nav, footer, svg, iframe").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return text.slice(0, MAX_CHARS_PER_PAGE);
}

/**
 * Crawl a site starting at its homepage, discover important pages
 * (about/products/services/solutions/contact/pricing), dedupe them,
 * and extract meaningful text content from each.
 */
async function crawlWebsite(baseUrl) {
  const origin = new URL(baseUrl).origin;
  const visited = new Set();
  const pages = [];

  // 1. Fetch homepage
  const homeRes = await fetchWithTimeout(origin).catch(() => null);
  if (!homeRes || !homeRes.ok) {
    return { pages: [], error: `Could not reach ${origin}` };
  }
  const homeHtml = await homeRes.text();
  const $home = cheerio.load(homeHtml);
  visited.add(origin);
  pages.push({
    url: origin,
    type: "home",
    title: $home("title").first().text().trim(),
    content: extractVisibleText($home),
  });

  // 2. Discover candidate links on the homepage
  const candidates = new Map(); // type -> url
  $home("a[href]").each((_, el) => {
    const href = $home(el).attr("href");
    if (!href || shouldIgnore(href)) return;

    let absolute;
    try {
      absolute = new URL(href, origin).toString();
    } catch {
      return;
    }

    const url = new URL(absolute);
    if (url.origin !== origin) return; // stay on the same site

    const type = classifyPath(url.pathname);
    if (!type || type === "home") return;
    if (!candidates.has(type)) {
      candidates.set(type, `${url.origin}${url.pathname}`);
    }
  });

  // 3. Fetch each discovered page (deduped by type & URL, capped at MAX_PAGES)
  for (const [type, url] of candidates) {
    if (pages.length >= MAX_PAGES) break;
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) continue;
      const html = await res.text();
      const $ = cheerio.load(html);
      pages.push({
        url,
        type,
        title: $("title").first().text().trim(),
        content: extractVisibleText($),
      });
    } catch {
      // ignore unreachable pages, continue crawling others
    }
  }

  return { pages, error: null };
}

module.exports = { crawlWebsite };
