import { randomUUID } from 'node:crypto';
import type { DbExecutor } from './client.js';
import { recordOutboundMessage } from './whatsapp-inbound.js';
import { getDecryptedWhatsAppSecrets, isNumberOptedOut } from './whatsapp-service.js';

export interface SendWhatsAppMessageOptions {
  to: string;
  type: 'text' | 'template';
  text?: string;
  templateName?: string;
  templateLanguage?: string;
  quotationId?: string | null;
  fetchFn?: typeof fetch;
}

export interface SendWhatsAppMessageResult {
  success: boolean;
  wamid: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  messageId?: string;
}

function buildMetaPayload(options: SendWhatsAppMessageOptions, recipientNumber: string) {
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientNumber,
    type: options.type,
  };

  if (options.type === 'text') {
    payload.text = { preview_url: false, body: options.text || '' };
  } else if (options.type === 'template') {
    payload.template = {
      name: options.templateName,
      language: { code: options.templateLanguage || 'en' },
    };
  }

  return payload;
}

async function recordFailure(
  db: DbExecutor,
  phoneNumberId: string,
  to: string,
  options: SendWhatsAppMessageOptions,
  errorMsg: string,
  rawPayload: unknown,
): Promise<SendWhatsAppMessageResult> {
  const failedWamid = `wamid.ERR_${randomUUID()}`;
  const summary =
    options.type === 'template'
      ? `Template: ${options.templateName || 'unnamed'}`
      : options.text || '[Empty]';

  const created = await recordOutboundMessage(db, {
    wamid: failedWamid,
    fromNumber: phoneNumberId,
    toNumber: to,
    messageType: options.type,
    contentSummary: summary,
    rawPayload,
    status: 'failed',
    errorMessage: errorMsg,
    quotationId: options.quotationId,
  });

  return {
    success: false,
    wamid: failedWamid,
    status: 'failed',
    error: errorMsg,
    messageId: created.id,
  };
}

export async function sendMetaWhatsAppMessage(
  db: DbExecutor,
  options: SendWhatsAppMessageOptions,
): Promise<SendWhatsAppMessageResult> {
  const cleanTo = options.to.trim();
  if (await isNumberOptedOut(db, cleanTo)) {
    return {
      success: false,
      wamid: '',
      status: 'failed',
      error: 'Recipient has opted out of WhatsApp messages',
    };
  }

  const secrets = await getDecryptedWhatsAppSecrets(db);
  if (!secrets?.enabled) {
    return {
      success: false,
      wamid: '',
      status: 'failed',
      error: 'WhatsApp integration is disabled',
    };
  }
  if (!secrets.accessToken || !secrets.phoneNumberId) {
    return {
      success: false,
      wamid: '',
      status: 'failed',
      error: 'WhatsApp Cloud API credentials are not configured',
    };
  }

  const apiVersion = secrets.apiVersion || 'v20.0';
  const url = `https://graph.facebook.com/${apiVersion}/${secrets.phoneNumberId}/messages`;
  const payload = buildMetaPayload(options, cleanTo.replace(/^\+/, ''));
  const doFetch = options.fetchFn || fetch;

  try {
    const res = await doFetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secrets.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = (await res.json()) as { messages?: Array<{ id: string }> };
      const wamid = data?.messages?.[0]?.id || `wamid.OUT_${randomUUID()}`;
      const summary =
        options.type === 'template'
          ? `Template: ${options.templateName || 'unnamed'}`
          : options.text || '[Empty]';

      const created = await recordOutboundMessage(db, {
        wamid,
        fromNumber: secrets.phoneNumberId,
        toNumber: cleanTo,
        messageType: options.type,
        contentSummary: summary,
        rawPayload: data,
        status: 'sent',
        quotationId: options.quotationId,
      });

      return { success: true, wamid, status: 'sent', messageId: created.id };
    }

    const errData = await res.json().catch(() => ({}));
    const errorMsg =
      (errData as { error?: { message?: string } })?.error?.message ||
      `Meta API error: HTTP ${res.status}`;
    return recordFailure(db, secrets.phoneNumberId, cleanTo, options, errorMsg, errData);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Network failure calling Meta API';
    return recordFailure(db, secrets.phoneNumberId, cleanTo, options, errorMsg, {
      error: errorMsg,
    });
  }
}
