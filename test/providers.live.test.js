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
test("XHamster live search returns structured results", { skip: !enabled, timeout: 30000 }, async () => {
  const r = await searchXhamster("test", "1");
  assert.ok(r?.success, "provider returned no successful payload");
  assert.ok(Array.isArray(r.data) && r.data.length > 0, "provider returned no results");
});
