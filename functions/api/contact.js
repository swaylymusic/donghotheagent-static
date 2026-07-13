const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function clean(value, maxLength = 2000) {
  return String(value || "").trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function parsePayload(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
}

async function verifyTurnstile(token, env, request) {
  if (!env.TURNSTILE_SECRET_KEY) {
    return { ok: true, skipped: true };
  }

  if (!token) {
    return { ok: false, message: "스팸 방지 확인에 실패했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요." };
  }

  const formData = new FormData();
  formData.append("secret", env.TURNSTILE_SECRET_KEY);
  formData.append("response", token);
  formData.append("remoteip", request.headers.get("CF-Connecting-IP") || "");

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();
  return result.success
    ? { ok: true }
    : { ok: false, message: "스팸 방지 확인에 실패했습니다. 다시 시도해 주세요." };
}

function buildEmailHtml(data) {
  const rows = [
    ["사용자 유형", data.clientType],
    ["이름", data.name],
    ["이메일", data.email],
    ["전화번호", data.phone || "-"],
    ["희망 지역", data.area || "-"],
    ["용건", data.message],
  ];

  const items = rows
    .map(([label, value]) => `<p><strong>${label}</strong><br>${escapeHtml(value).replaceAll("\n", "<br>")}</p>`)
    .join("");

  return `
    <h2>New Contact Form Submission</h2>
    ${items}
  `;
}

async function sendEmail(data, env, request) {
  if (!env.RESEND_API_KEY) {
    const url = new URL(request.url);
    const localHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);

    if (localHost) {
      return { skipped: true };
    }

    throw new Error("Email service is not configured.");
  }

  const to = env.CONTACT_TO_EMAIL || "contact@donlee.realtor";
  const from = env.CONTACT_FROM_EMAIL || "Dongho The Agent <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: data.email,
      subject: `New real estate consultation request from ${data.name}`,
      html: buildEmailHtml(data),
      text: [
        "New Contact Form Submission",
        `사용자 유형: ${data.clientType}`,
        `이름: ${data.name}`,
        `이메일: ${data.email}`,
        `전화번호: ${data.phone || "-"}`,
        `희망 지역: ${data.area || "-"}`,
        `용건: ${data.message}`,
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    throw new Error("Email delivery failed.");
  }

  return response.json();
}

export async function onRequestPost({ request, env }) {
  let payload;

  try {
    payload = await parsePayload(request);
  } catch {
    return jsonResponse({ message: "Invalid form submission." }, 400);
  }

  if (clean(payload.company, 200)) {
    return jsonResponse({ message: "감사합니다. 상담 요청이 접수되었습니다." });
  }

  const data = {
    clientType: clean(payload.clientType, 80),
    name: clean(payload.name, 120),
    email: clean(payload.email, 180),
    phone: clean(payload.phone, 80),
    area: clean(payload.area, 160),
    message: clean(payload.message, 3000),
    privacyConsent: clean(payload.privacyConsent, 20),
  };

  if (!data.clientType || !data.name || !data.email || !data.message) {
    return jsonResponse({ message: "필수 항목을 모두 입력해 주세요." }, 400);
  }

  if (data.privacyConsent !== "yes") {
    return jsonResponse({ message: "개인정보 수집 및 이용 동의가 필요합니다." }, 400);
  }

  if (!EMAIL_PATTERN.test(data.email)) {
    return jsonResponse({ message: "올바른 이메일 주소를 입력해 주세요." }, 400);
  }

  const turnstile = await verifyTurnstile(payload["cf-turnstile-response"], env, request);
  if (!turnstile.ok) {
    return jsonResponse({ message: turnstile.message }, 400);
  }

  try {
    const emailResult = await sendEmail(data, env, request);
    const preview = Boolean(emailResult.skipped);

    return jsonResponse({
      ok: true,
      preview,
      message: preview
        ? "로컬 테스트 모드입니다. 폼 제출은 정상 처리되었고, 배포 후 RESEND_API_KEY를 설정하면 이메일이 발송됩니다."
        : "감사합니다. 상담 요청이 접수되었습니다.",
    });
  } catch (error) {
    return jsonResponse({
      message: "There was an error trying to submit your form. Please try again.",
    }, 502);
  }
}

export function onRequestGet() {
  return jsonResponse({ message: "Method not allowed." }, 405);
}
