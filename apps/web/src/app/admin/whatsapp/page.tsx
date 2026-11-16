'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type {
  SendWhatsAppMessageRequest,
  UpdateWhatsAppConfigRequest,
  WhatsAppConfig,
  WhatsAppMessageListItem,
  WhatsAppOptOutListItem,
} from '@palnadu/contracts';
import { apiClient } from '../../../lib/api-client';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { WhatsAppConfigCard } from '../../../components/whatsapp/whatsapp-config-card';
import { WhatsAppMessageLog } from '../../../components/whatsapp/whatsapp-message-log';
import { WhatsAppOptOutsCard } from '../../../components/whatsapp/whatsapp-opt-outs-card';
import { WhatsAppSendModal } from '../../../components/whatsapp/whatsapp-send-modal';

export default function WhatsAppPage() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessageListItem[]>([]);
  const [optOuts, setOptOuts] = useState<WhatsAppOptOutListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cfg, msgs, opts] = await Promise.all([
        apiClient.whatsapp.getConfig(),
        apiClient.whatsapp.listMessages({ limit: 50 }),
        apiClient.whatsapp.listOptOuts(),
      ]);
      setConfig(cfg);
      setMessages(msgs);
      setOptOuts(opts);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load WhatsApp data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateConfig = async (updates: UpdateWhatsAppConfigRequest) => {
    const updated = await apiClient.whatsapp.updateConfig(updates);
    setConfig(updated);
  };

  const handleSendMessage = async (req: SendWhatsAppMessageRequest) => {
    await apiClient.whatsapp.sendMessage(req);
    const updatedMsgs = await apiClient.whatsapp.listMessages({ limit: 50 });
    setMessages(updatedMsgs);
  };

  if (isLoading) {
    return <LoadingState label="Loading WhatsApp configuration..." />;
  }

  if (error || !config) {
    return (
      <ErrorState
        title="Failed to load WhatsApp integration"
        message={error || 'Could not retrieve WhatsApp integration settings.'}
        retry={loadData}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-slate-900 tracking-tight">
            WhatsApp Cloud API &amp; Customer Enquiries
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Dedicated WhatsApp Business integration, Meta webhooks, and customer messaging audit.
          </p>
        </div>

        {config.enabled && (
          <button
            type="button"
            onClick={() => setIsSendModalOpen(true)}
            className="touch-target inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 font-medium text-sm text-white hover:bg-emerald-700"
          >
            + Send Message
          </button>
        )}
      </div>

      <WhatsAppConfigCard config={config} onUpdate={handleUpdateConfig} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WhatsAppMessageLog messages={messages} />
        </div>
        <div>
          <WhatsAppOptOutsCard optOuts={optOuts} />
        </div>
      </div>

      <WhatsAppSendModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        onSubmit={handleSendMessage}
        optOuts={optOuts}
      />
    </div>
  );
}
