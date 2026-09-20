import test from "node:test";
import assert from "node:assert/strict";
import { getSearchResults } from "../src/Search.js";
import { searchXhamster } from "../src/xhamster/XhamsterSearch.js";

const enabled = process.env.LIVE_PROVIDER_TESTS === "1";

test("EPorner live search returns structured results", { skip: !enabled, timeout: 30000 }, async () => {
  const r = await getSearchResults("test", "3", "1", "medium", "latest", "0", "1");
  assert.ok(r?.json?.details, "provider returned no structured payload");
  assert.ok(Array.isArray(r.json.details.videos), "videos must be an array");
});

test("XHamster upstream diagnostics", { skip: !enabled, timeout: 30000 }, async () => {
  const response = await fetch("https://xhamster.com/search/test?page=1", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9"
    },
    redirect: "follow"
  });
  const html = await response.text();
  const diagnostics = {
    status: response.status,
    contentType: response.headers.get("content-type"),
    length: html.length,
    hasInitials: html.includes("initials-script"),
    hasWindowInitials: html.includes("window.initials"),
    hasSearchResult: html.includes("searchResult"),
    hasVideoThumbProps: html.includes("videoThumbProps"),
    hasChallenge: /captcha|cloudflare|challenge/i.test(html)
  };
  console.log("XHAMSTER_DIAGNOSTICS", JSON.stringify(diagnostics));
  assert.equal(response.status, 200, "upstream did not return HTTP 200");
});

test("XHamster live search returns structured results", { skip: !enabled, timeout: 30000 }, async () => {
  const r = await searchXhamster("test", "1");
  assert.ok(r?.success, "provider returned no successful payload");
  assert.ok(Array.isArray(r.data) && r.data.length > 0, "provider returned no results");
});
