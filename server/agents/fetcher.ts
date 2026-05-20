import https from "https";
import http from "http";

// Social platform URL patterns — match on href attributes directly
const SOCIAL_PATTERNS: Record<string, RegExp> = {
  facebook:  /https?:\/\/(www\.)?(facebook\.com|fb\.com|fb\.me)\/[^\s"'<>]+/gi,
  instagram: /https?:\/\/(www\.)?instagram\.com\/[^\s"'<>]+/gi,
  linkedin:  /https?:\/\/(www\.)?linkedin\.com\/(company|in|school)\/[^\s"'<>]+/gi,
  twitter:   /https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^\s"'<>]+/gi,
  tiktok:    /https?:\/\/(www\.)?tiktok\.com\/@[^\s"'<>]+/gi,
  youtube:   /https?:\/\/(www\.)?youtube\.com\/(channel|c|user|@)[^\s"'<>]+/gi,
  pinterest: /https?:\/\/(www\.)?pinterest\.(com|com\.au|co\.uk)\/[^\s"'<>]+/gi,
  bluesky:   /https?:\/\/(www\.)?bsky\.app\/profile\/[^\s"'<>]+/gi,
};

/**
 * Extract all social media profile URLs found in raw HTML href attributes.
 * This runs BEFORE stripping HTML so icon-only links (no text) are captured.
 */
function extractSocialLinks(html: string): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
    pattern.lastIndex = 0; // reset regex state
    const match = pattern.exec(html);
    if (match) {
      // Clean trailing slashes, query strings, and common junk
      let url = match[0].replace(/[?#].*$/, "").replace(/\/+$/, "");
      // Skip generic/share pages
      if (/\/(sharer|share|intent|dialog|login|signup|register)/i.test(url)) continue;
      result[platform] = url;
    } else {
      result[platform] = null;
    }
  }
  return result;
}

/**
 * Fetch the text content of a URL, stripping HTML tags.
 * Also extracts social media links from href attributes before stripping.
 * Returns up to 8000 chars to stay within LLM context limits.
 */
export async function fetchPageText(
  url: string,
  _depth = 0
): Promise<{ title: string; text: string; url: string; socialLinks: Record<string, string | null> }> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const req = protocol.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-AU,en;q=0.9",
        },
      },
      (res) => {
        // Follow redirects (up to 5)
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location &&
          _depth < 5
        ) {
          const next = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          fetchPageText(next, _depth + 1).then(resolve).catch(reject);
          return;
        }

        let html = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          html += chunk;
          // Stop collecting after 500 KB to avoid memory issues
          if (html.length > 500_000) req.destroy();
        });
        res.on("end", () => {
          // ── 1. Extract social links from raw HTML BEFORE stripping ──────────
          const socialLinks = extractSocialLinks(html);

          // ── 2. Extract title ─────────────────────────────────────────────────
          const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";

          // ── 3. Strip scripts, styles, nav, footer, then all tags ─────────────
          let cleaned = html
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
            .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
            .replace(/<header[\s\S]*?<\/header>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, " ")
            .replace(/\s{2,}/g, " ")
            .trim();

          if (cleaned.length > 8000) cleaned = cleaned.slice(0, 8000) + "...";

          resolve({ title, text: cleaned, url, socialLinks });
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(12000, () => {
      req.destroy();
      reject(new Error("Fetch timeout"));
    });
  });
}
