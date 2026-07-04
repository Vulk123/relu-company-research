/**
 * Thin wrapper around the Serper.dev "search" endpoint.
 * Docs: https://serper.dev/
 */

const SERPER_URL = "https://google.serper.dev/search";

async function serperSearch(apiKey, query, num = 8) {
  if (!apiKey) throw new Error("Missing Serper.dev API key");

  const res = await fetch(SERPER_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Serper.dev request failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Try to resolve a company name to its most likely official website
 * using Serper's organic + knowledge graph results.
 */
async function findOfficialWebsite(apiKey, companyName) {
  const data = await serperSearch(apiKey, `${companyName} official website`, 5);

  if (data.knowledgeGraph?.website) {
    return normalizeUrl(data.knowledgeGraph.website);
  }

  const firstOrganic = data.organic?.[0];
  if (firstOrganic?.link) {
    return normalizeUrl(firstOrganic.link);
  }

  return null;
}

/** General company info search (phone, address, overview snippets). */
async function searchCompanyInfo(apiKey, companyName) {
  const [general, contact] = await Promise.all([
    serperSearch(apiKey, `${companyName} company overview`, 6),
    serperSearch(apiKey, `${companyName} phone number address contact`, 5),
  ]);
  return { general, contact };
}

/** Search used to help identify competitors. */
async function searchCompetitors(apiKey, companyName, industryHint = "") {
  const query = industryHint
    ? `${companyName} competitors alternatives ${industryHint}`
    : `${companyName} competitors alternatives`;
  return serperSearch(apiKey, query, 8);
}

function normalizeUrl(url) {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return null;
  }
}

module.exports = {
  serperSearch,
  findOfficialWebsite,
  searchCompanyInfo,
  searchCompetitors,
  normalizeUrl,
};
