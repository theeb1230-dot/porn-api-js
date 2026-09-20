import test from "node:test";
import assert from "node:assert/strict";
import { start } from "../index.js";

test("root and health endpoints work without provider network", async (t) => {
  const server = start(0);
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => server.close());
  const { port } = server.address();

  const health = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok", service: "porn-api-js" });

  const root = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(root.status, 200);
  const body = await root.json();
  assert.ok(body.providers.eporner);
  assert.ok(body.providers.xhamster);
});
