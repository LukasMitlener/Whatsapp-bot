// Tenký klient pro odesílání WhatsApp zpráv přes Meta Graph API.

const GRAPH_VERSION = "v21.0";

export interface SendResult {
  ok: boolean;
  waMessageId?: string;
  errorCode?: string;
  errorDetail?: string;
}

export async function sendText(
  phoneNumberId: string,
  token: string,
  to: string,
  body: string,
): Promise<SendResult> {
  const toDigits = to.startsWith("+") ? to.slice(1) : to;

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toDigits,
        type: "text",
        text: { body },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const err = data?.error ?? {};
      return {
        ok: false,
        errorCode: String(err.code ?? res.status),
        errorDetail: err.message ?? JSON.stringify(data),
      };
    }

    return { ok: true, waMessageId: data?.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, errorCode: "network", errorDetail: String(err) };
  }
}

// Úvodní/re-engagement template dle jazyka — stejná dvojice jako v
// scripts/outreach.ts (Node-side má vlastní kopii, runtime split Deno/Node).
export const TEMPLATE_BY_LANGUAGE: Record<string, { name: string; code: string }> = {
  cs: { name: "imperium_datacenters_intro_cs", code: "cs" },
  en: { name: "imperium_datacenters_intro_en", code: "en_US" },
};

export async function sendTemplate(
  phoneNumberId: string,
  token: string,
  to: string,
  contactName: string,
  language: string,
): Promise<SendResult> {
  const toDigits = to.startsWith("+") ? to.slice(1) : to;
  const tpl = TEMPLATE_BY_LANGUAGE[language] ?? TEMPLATE_BY_LANGUAGE.cs;

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toDigits,
        type: "template",
        template: {
          name: tpl.name,
          language: { code: tpl.code },
          components: [{ type: "body", parameters: [{ type: "text", text: contactName }] }],
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const err = data?.error ?? {};
      return {
        ok: false,
        errorCode: String(err.code ?? res.status),
        errorDetail: err.message ?? JSON.stringify(data),
      };
    }

    return { ok: true, waMessageId: data?.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, errorCode: "network", errorDetail: String(err) };
  }
}
