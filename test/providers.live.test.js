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


test("EPorner live details and sources resolve", { skip: !enabled, timeout: 30000 }, async () => {
  const search = await getSearchResults("test", "1", "1", "medium", "latest", "0", "1");
  const id = search?.json?.details?.videos?.[0]?.id;
  assert.ok(id, "search did not yield an id");
  const { getVideoDetails } = await import("../src/MediaDetails.js");
  const { getVideoSources } = await import("../src/Resolver.js");
  const details = await getVideoDetails(id, "medium");
  const sources = await getVideoSources(id);
  assert.ok(details?.json?.details?.id, "details did not resolve");
  assert.ok(Array.isArray(sources?.sources) || typeof sources?.sources === "object", "sources did not resolve");
});

test("XHamster live details resolves from a live search id", { skip: !enabled, timeout: 30000 }, async () => {
  const search = await searchXhamster("test", "1");
  const id = search?.data?.[0]?.id;
  assert.ok(id, "search did not yield an id");
  const { getXhamsterVideo } = await import("../src/xhamster/XhamsterGet.js");
  const details = await getXhamsterVideo(id);
  assert.ok(details?.success, "details did not resolve");
  assert.equal(details.data.id, id, "resolved id mismatch");
  assert.ok(Array.isArray(details.data.sources), "sources must be an array");
});
