import test from "node:test";
import assert from "node:assert/strict";

import { createConfirmationToken } from "../functions/api/subscribe.js";
import { verifyConfirmationToken } from "../functions/api/confirm-subscription.js";

const SECRET = "test-only-confirmation-secret";
const NOW = Date.UTC(2026, 8, 2, 12, 0, 0);

test("creates a confirmation token that activates the intended address", async () => {
  const token = await createConfirmationToken("Subscriber@Example.com", SECRET, NOW);
  const result = await verifyConfirmationToken(token, SECRET, NOW + 60_000);

  assert.equal(result.email, "subscriber@example.com");
  assert.ok(result.exp > NOW / 1000);
});

test("rejects a token whose payload was changed", async () => {
  const token = await createConfirmationToken("subscriber@example.com", SECRET, NOW);
  const [payload, signature] = token.split(".");
  const changedPayload = `${payload.slice(0, -1)}${payload.endsWith("a") ? "b" : "a"}`;

  assert.equal(await verifyConfirmationToken(`${changedPayload}.${signature}`, SECRET, NOW), null);
});

test("rejects an expired confirmation token", async () => {
  const token = await createConfirmationToken("subscriber@example.com", SECRET, NOW);
  const afterExpiry = NOW + (49 * 60 * 60 * 1000);

  assert.equal(await verifyConfirmationToken(token, SECRET, afterExpiry), null);
});
