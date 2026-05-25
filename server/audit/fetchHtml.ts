export type FetchHtmlResult = {
  html: string;
  finalUrl: string;
  statusCode: number;
};

const USER_AGENT =
  "Mozilla/5.0 (compatible; BlastlyAuditBot/1.0; +https://blastly.ai) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";

const MAX_HTML_BYTES = 800_000;
const FETCH_TIMEOUT_MS = Number(process.env.AUDIT_FETCH_TIMEOUT_MS ?? 20_000);
const MAX_REDIRECTS = 5;

/** Fetch raw HTML with redirect following and a hard timeout. */
export async function fetchHtml(url: string, depth = 0): Promise<FetchHtmlResult> {
  if (depth > MAX_REDIRECTS) {
    throw new Error("Too many redirects");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      await res.arrayBuffer().catch(() => undefined);
      if (location) {
        const next = location.startsWith("http") ? location : new URL(location, url).href;
        return fetchHtml(next, depth + 1);
      }
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error("Empty response body");
    }

    const decoder = new TextDecoder("utf-8");
    let html = "";
  readLoop: while (html.length < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (html.length >= MAX_HTML_BYTES) {
        html = html.slice(0, MAX_HTML_BYTES);
        break readLoop;
      }
    }
    reader.cancel().catch(() => undefined);

    return {
      html,
      finalUrl: res.url || url,
      statusCode: res.status,
    };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`Fetch timeout after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
