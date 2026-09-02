import test from "node:test";
import assert from "node:assert/strict";

import { createConfirmationToken } from "../functions/api/subscribe.js";
import { onRequestPost as confirmSubscription, verifyConfirmationToken } from "../functions/api/confirm-subscription.js";

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

test("sends subscriber and owner emails after confirmation", async () => {
  const token = await createConfirmationToken("subscriber@example.com", SECRET, NOW);
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options, body: options.body ? JSON.parse(options.body) : null });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const response = await confirmSubscription({
      request: new Request("https://donghotheagent.com/api/confirm-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }),
      env: {
        RESEND_API_KEY: "re_test",
        RESEND_CONSUMER_SEGMENT_ID: "seg_test",
        SUBSCRIPTION_CONFIRM_SECRET: SECRET,
        SUBSCRIPTION_FROM_EMAIL: "Dongho Lee <updates@donghotheagent.com>",
        CONTACT_TO_EMAIL: "contact@donlee.realtor",
      },
    });

    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const emails = requests.filter((request) => request.url === "https://api.resend.com/emails").map((request) => request.body);
  assert.equal(emails.length, 2);
  assert.ok(emails.some((email) => email.to === "subscriber@example.com" && email.subject === "이메일 구독이 완료되었습니다 | Dongho Lee Real Estate"));
  assert.ok(emails.some((email) => email.to === "contact@donlee.realtor" && email.subject === "새 이메일 구독이 확인되었습니다"));
});
