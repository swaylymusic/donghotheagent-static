const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const ALLOWED_ORIGINS = new Set(["https://donghotheagent.com", "https://www.donghotheagent.com", "https://dongholee.ca", "https://www.dongholee.ca"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONFIRMATION_TTL_SECONDS = 60 * 60 * 48;

function responseHeaders(request) {
  const origin = request.headers.get("origin");
  return origin && ALLOWED_ORIGINS.has(origin) ? { ...JSON_HEADERS, "Access-Control-Allow-Origin": origin, Vary: "Origin" } : JSON_HEADERS;
}

function jsonResponse(body, status = 200, request) {
  return new Response(JSON.stringify(body), { status, headers: request ? responseHeaders(request) : JSON_HEADERS });
}

function clean(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

async function parsePayload(request) {
  if ((request.headers.get("content-type") || "").includes("application/json")) return request.json();
  return Object.fromEntries((await request.formData()).entries());
}

async function addToConsumerSegment(email, segmentId, apiKey) {
  if (!segmentId) return true;
  const response = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return response.ok || response.status === 409;
}

async function createContact(body, apiKey) {
  return fetch("https://api.resend.com/contacts", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function stringToBase64Url(value) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

export async function createConfirmationToken(email, secret, now = Date.now()) {
  const payload = stringToBase64Url(JSON.stringify({
    email,
    exp: Math.floor(now / 1000) + CONFIRMATION_TTL_SECONDS,
  }));
  return `${payload}.${await sign(payload, secret)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendConfirmationEmail({ email, firstName, confirmationUrl }, env) {
  const from = env.SUBSCRIPTION_FROM_EMAIL || env.CONTACT_FROM_EMAIL || "Dongho Lee <onboarding@resend.dev>";
  const greeting = firstName ? `${escapeHtml(firstName)}님,` : "안녕하세요,";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: email,
      reply_to: env.CONTACT_TO_EMAIL || "contact@donlee.realtor",
      subject: "이메일 구독을 확인해 주세요 | Dongho Lee Real Estate",
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:Arial,'Noto Sans KR',sans-serif;color:#17283a;line-height:1.7">
          <h1 style="color:#10243a;font-size:26px">이메일 구독을 확인해 주세요</h1>
          <p>${greeting}</p>
          <p>온타리오 부동산 시장 업데이트와 실전 가이드 구독 신청이 접수되었습니다.</p>
          <p>아래 버튼을 눌러야 구독이 최종 활성화됩니다.</p>
          <p style="margin:28px 0"><a href="${confirmationUrl}" style="display:inline-block;background:#10243a;color:#fff;text-decoration:none;padding:13px 22px;border-radius:6px;font-weight:700">구독 확인하기</a></p>
          <p style="font-size:13px;color:#5b6875">이 링크는 48시간 동안 유효합니다. 본인이 신청하지 않았다면 아무 조치 없이 이 메일을 삭제해 주세요.</p>
          <hr style="border:0;border-top:1px solid #dbe3ea;margin:28px 0">
          <p style="font-size:13px;color:#5b6875">Dongho Lee 이동호, Broker, REALTOR®<br>HomeLife Frontier Realty Inc., Brokerage<br>7620 Yonge St #400, Thornhill, ON L4J 1V9<br>416-625-8241 · contact@donlee.realtor</p>
        </div>`,
      text: `${firstName ? `${firstName}님,\n\n` : ""}온타리오 부동산 시장 업데이트 구독을 확인해 주세요.\n\n${confirmationUrl}\n\n이 링크는 48시간 동안 유효합니다. 본인이 신청하지 않았다면 이 메일을 삭제해 주세요.`,
    }),
  });

  if (!response.ok) throw new Error(`Confirmation email failed with status ${response.status}: ${(await response.text()).slice(0, 500)}`);
}

async function markPending(email, contact, env) {
  let response = await createContact({ ...contact, unsubscribed: true }, env.RESEND_API_KEY);
  if (response.status === 409) {
    response = await fetch(`https://api.resend.com/contacts/${encodeURIComponent(email)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ unsubscribed: true }),
    });
  }
  return response;
}

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await parsePayload(request);
  } catch {
    return jsonResponse({ message: "올바르지 않은 요청입니다." }, 400);
  }

  if (clean(payload.company, 200)) return jsonResponse({ ok: true, message: "구독 신청이 완료되었습니다." });

  const email = clean(payload.email, 180).toLowerCase();
  const firstName = clean(payload.firstName, 80);
  const interest = clean(payload.interest, 80) || "Ontario real estate updates";
  const source = clean(payload.source, 160) || "website_updates";

  if (!EMAIL_PATTERN.test(email)) return jsonResponse({ message: "올바른 이메일 주소를 입력해 주세요." }, 400);
  if (clean(payload.consent, 20) !== "yes") return jsonResponse({ message: "이메일 수신 동의가 필요합니다." }, 400);

  if (!env.RESEND_API_KEY) {
    const host = new URL(request.url).hostname;
    if (["localhost", "127.0.0.1", "::1"].includes(host)) {
      return jsonResponse({ ok: true, preview: true, message: "로컬 테스트가 완료되었습니다. 배포 환경의 Resend 설정 후 실제 저장됩니다." });
    }
    return jsonResponse({ message: "이메일 구독 서비스 설정이 아직 완료되지 않았습니다." }, 503);
  }

  const contact = {
    email,
    firstName: firstName || undefined,
    unsubscribed: true,
    properties: {
      subscriber_type: "real_estate_consumer",
      interest,
      signup_source: source,
      consent_recorded_at: new Date().toISOString(),
    },
  };
  let response = await markPending(email, contact, env);

  // Custom properties must exist in Resend before values can be saved. Keep
  // subscriber acquisition working while those optional fields are configured.
  if ([400, 422].includes(response.status)) response = await markPending(email, {
    email,
    firstName: firstName || undefined,
    unsubscribed: true,
  }, env);

  if (!response.ok) {
    return jsonResponse({ message: "구독 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }

  try {
    const secret = env.SUBSCRIPTION_CONFIRM_SECRET || env.RESEND_API_KEY;
    const token = await createConfirmationToken(email, secret);
    const confirmationUrl = new URL("/confirm-subscription/", request.url);
    confirmationUrl.protocol = "https:";
    confirmationUrl.hostname = "donghotheagent.com";
    confirmationUrl.port = "";
    confirmationUrl.searchParams.set("token", token);
    await sendConfirmationEmail({ email, firstName, confirmationUrl: confirmationUrl.toString() }, env);
  } catch (error) {
    console.error("Subscription confirmation email failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonResponse({ message: "확인 이메일을 발송하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }

  return jsonResponse({ ok: true, pending: true, message: "확인 이메일을 보냈습니다. 이메일의 확인 버튼을 눌러 구독을 완료해 주세요." });
}

export function onRequestOptions({ request }) {
  const headers = responseHeaders(request);
  headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  headers["Access-Control-Allow-Headers"] = "Content-Type";
  return new Response(null, { status: 204, headers });
}

export function onRequestGet() {
  return jsonResponse({ message: "Method not allowed." }, 405);
}
