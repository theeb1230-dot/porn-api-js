import test from "node:test";
import assert from "node:assert/strict";
import { start } from "../index.js";

test("web lab, search UI, API metadata, health, readiness and diagnostics work offline", async (t) => {
  const server = start(0);
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const health = await fetch(base + "/health");
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, "ok");

  const root = await fetch(base + "/");
  assert.equal(root.status, 200);
  assert.match(root.headers.get("content-type") || "", /text\/html/);
  const html = await root.text();
  assert.match(html, /API Lab/);
  assert.match(html, /Professional player demo/);
  assert.match(html, /<video[^>]+controls/);
  assert.match(html, /HLS Auto/);
  assert.match(html, /externalUrl/);
  assert.match(html, /Load URL/);
  assert.match(html, /Raw API response/);
  assert.match(html, /data-tab="search"/);
  assert.match(html, /searchProvider/);
  assert.match(html, /searchTags/);
  assert.match(html, /multiple tags/);
  assert.match(html, /inspectResult/);
  assert.match(html, /data-tag/);
  assert.match(html, /v\.title/);
  assert.match(html, /v\.image/);
  assert.match(html, /data-result/);
  assert.match(html, /Open details/);
  assert.match(html, /scrollIntoView/);
  assert.match(html, /Diagnostics/);

  const meta = await fetch(base + "/api");
  assert.equal(meta.status, 200);
  const body = await meta.json();
  assert.ok(body.providers.eporner);
  assert.ok(body.providers.xhamster);

  const ready = await fetch(base + "/ready");
  assert.equal(ready.status, 200);
  const readyBody = await ready.json();
  assert.equal(readyBody.status, "ready");
  assert.ok(readyBody.providers.eporner);
  assert.ok(readyBody.providers.xhamster);

  const diagnostics = await fetch(base + "/api/diagnostics");
  assert.equal(diagnostics.status, 200);
  assert.equal((await diagnostics.json()).success, true);
});
