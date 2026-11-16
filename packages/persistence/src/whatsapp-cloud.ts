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
  fetchFn?: typeof fetch;
}

export interface SendWhatsAppMessageResult {
  success: boolean;
  wamid: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  messageId?: string;
}

export async function sendMetaWhatsAppMessage(
  db: DbExecutor,
  options: SendWhatsAppMessageOptions,
): Promise<SendWhatsAppMessageResult> {
  const cleanTo = options.to.trim();
  const optedOut = await isNumberOptedOut(db, cleanTo);
  if (optedOut) {
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
  const recipientNumber = cleanTo.replace(/^\+/, '');

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

  const doFetch = options.fetchFn || fetch;
  const contentSummary =
    options.type === 'template'
      ? `Template: ${options.templateName || 'unnamed'}`
      : options.text || '[Empty message]';

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
      const created = await recordOutboundMessage(db, {
        wamid,
        fromNumber: secrets.phoneNumberId,
        toNumber: cleanTo,
        messageType: options.type,
        contentSummary,
        rawPayload: data,
        status: 'sent',
      });

      return { success: true, wamid, status: 'sent', messageId: created.id };
    }

    const errData = await res.json().catch(() => ({}));
    const errorMsg =
      (errData as { error?: { message?: string } })?.error?.message ||
      `Meta API error: HTTP ${res.status}`;
    const failedWamid = `wamid.ERR_${randomUUID()}`;

    const created = await recordOutboundMessage(db, {
      wamid: failedWamid,
      fromNumber: secrets.phoneNumberId,
      toNumber: cleanTo,
      messageType: options.type,
      contentSummary,
      rawPayload: errData,
      status: 'failed',
      errorMessage: errorMsg,
    });

    return {
      success: false,
      wamid: failedWamid,
      status: 'failed',
      error: errorMsg,
      messageId: created.id,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Network failure calling Meta API';
    const failedWamid = `wamid.ERR_${randomUUID()}`;

    const created = await recordOutboundMessage(db, {
      wamid: failedWamid,
      fromNumber: secrets.phoneNumberId,
      toNumber: cleanTo,
      messageType: options.type,
      contentSummary,
      rawPayload: { error: errorMsg },
      status: 'failed',
      errorMessage: errorMsg,
    });

    return {
      success: false,
      wamid: failedWamid,
      status: 'failed',
      error: errorMsg,
      messageId: created.id,
    };
  }
}
