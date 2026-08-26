const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
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

  const segments = env.RESEND_CONSUMER_SEGMENT_ID ? [{ id: env.RESEND_CONSUMER_SEGMENT_ID }] : undefined;
  const contact = {
    email,
    firstName: firstName || undefined,
    unsubscribed: false,
    segments,
  };
  let response = await createContact({
    ...contact,
    properties: {
      subscriber_type: "real_estate_consumer",
      interest,
      signup_source: source,
      consent_recorded_at: new Date().toISOString(),
    },
  }, env.RESEND_API_KEY);

  // Custom properties must exist in Resend before values can be saved. Keep
  // subscriber acquisition working while those optional fields are configured.
  if ([400, 422].includes(response.status)) response = await createContact(contact, env.RESEND_API_KEY);

  if (!response.ok && response.status !== 409) {
    return jsonResponse({ message: "구독 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
  if (response.status === 409 && !(await addToConsumerSegment(email, env.RESEND_CONSUMER_SEGMENT_ID, env.RESEND_API_KEY))) {
    return jsonResponse({ message: "구독 목록 연결 중 오류가 발생했습니다." }, 502);
  }

  return jsonResponse({ ok: true, message: "구독이 완료되었습니다. 다음 시장 업데이트부터 보내드리겠습니다." });
}

export function onRequestGet() {
  return jsonResponse({ message: "Method not allowed." }, 405);
}
