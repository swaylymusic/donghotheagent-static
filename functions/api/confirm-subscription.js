const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function base64UrlToBytes(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

export async function verifyConfirmationToken(token, secret, now = Date.now()) {
  const [payload, signature, extra] = String(token || "").split(".");
  if (!payload || !signature || extra) return null;

  let suppliedSignature;
  let data;
  try {
    suppliedSignature = base64UrlToBytes(signature);
    data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
  } catch {
    return null;
  }

  const expectedSignature = await sign(payload, secret);
  if (!constantTimeEqual(suppliedSignature, expectedSignature)) return null;
  if (!EMAIL_PATTERN.test(data.email || "") || !Number.isFinite(data.exp) || data.exp < Math.floor(now / 1000)) return null;
  return { email: data.email.toLowerCase(), exp: data.exp };
}

async function updateContact(email, env) {
  const response = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ unsubscribed: false }),
  });
  if (!response.ok) throw new Error(`Contact activation failed with status ${response.status}: ${(await response.text()).slice(0, 500)}`);
}

async function addToSegment(email, env) {
  if (!env.RESEND_CONSUMER_SEGMENT_ID) return;
  const response = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(env.RESEND_CONSUMER_SEGMENT_ID)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
  });
  if (!response.ok && response.status !== 409) throw new Error(`Segment activation failed with status ${response.status}: ${(await response.text()).slice(0, 500)}`);
}

async function notifyOwner(email, env) {
  const to = env.CONTACT_TO_EMAIL || "contact@donlee.realtor";
  const from = env.SUBSCRIPTION_FROM_EMAIL || env.CONTACT_FROM_EMAIL || "Dongho Lee <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: "새 이메일 구독이 확인되었습니다",
      html: `<h2>새 이메일 구독 확인</h2><p><strong>이메일</strong><br>${email}</p><p>확인 시각(UTC): ${new Date().toISOString()}</p>`,
      text: `새 이메일 구독이 확인되었습니다.\n이메일: ${email}\n확인 시각(UTC): ${new Date().toISOString()}`,
    }),
  });
  if (!response.ok) throw new Error(`Owner notification failed with status ${response.status}: ${(await response.text()).slice(0, 500)}`);
}

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY) return jsonResponse({ message: "구독 서비스 설정이 완료되지 않았습니다." }, 503);

  let token;
  try {
    const payload = await request.json();
    token = payload.token;
  } catch {
    return jsonResponse({ message: "올바르지 않은 요청입니다." }, 400);
  }

  const secret = env.SUBSCRIPTION_CONFIRM_SECRET || env.RESEND_API_KEY;
  const confirmation = await verifyConfirmationToken(token, secret);
  if (!confirmation) return jsonResponse({ message: "확인 링크가 올바르지 않거나 만료되었습니다. 구독 페이지에서 다시 신청해 주세요." }, 400);

  try {
    await updateContact(confirmation.email, env);
    await addToSegment(confirmation.email, env);
    await notifyOwner(confirmation.email, env);
    return jsonResponse({ ok: true, message: "이메일 구독이 확인되었습니다. 다음 업데이트부터 보내드리겠습니다." });
  } catch (error) {
    console.error("Subscription confirmation failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonResponse({ message: "구독 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
}

export function onRequestGet() {
  return jsonResponse({ message: "Method not allowed." }, 405);
}
