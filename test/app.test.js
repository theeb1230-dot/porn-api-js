import test from "node:test";
import assert from "node:assert/strict";
import { start } from "../index.js";

test("web console, API metadata and health work without provider network", async (t) => {
  const server = start(0);
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => server.close());
  const { port } = server.address();

  const health = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok", service: "porn-api-js" });

  const root = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(root.status, 200);
  assert.match(root.headers.get("content-type") || "", /text\/html/);
  const html = await root.text();
  assert.match(html, /API Test Console/);
  assert.match(html, /Professional player demo/);
  assert.match(html, /<video[^>]+controls/);
  assert.match(html, /"720p"/);
  assert.match(html, /demoSources/);

  const meta = await fetch(`http://127.0.0.1:${port}/api`);
  const ready = await fetch(`http://127.0.0.1:${port}/ready`);\n  assert.equal(ready.status, 200);\n  const diagnostics = await fetch(`http://127.0.0.1:${port}/api/diagnostics`);\n  assert.equal(diagnostics.status, 200);\n\n  assert.equal(meta.status, 200);
  const body = await meta.json();
  assert.ok(body.providers.eporner);
  assert.ok(body.providers.xhamster);
});
