'use client';

import React, { useState } from 'react';
import type {
  CreateErpConnectorRequest,
  EntitySourceOfTruth,
  ErpConnectorConfig,
  ErpProviderType,
} from '@palnadu/contracts';
import { ConnectorBasicInputs } from './connector-basic-inputs';
import { ConnectorSsotFields } from './connector-ssot-fields';

export interface ConnectorFormModalProps {
  connector?: ErpConnectorConfig | null;
  onClose: () => void;
  onSave: (data: CreateErpConnectorRequest) => Promise<void>;
}

interface FormState {
  name: string;
  provider: ErpProviderType;
  enabled: boolean;
  endpointUrl: string;
  productSsot: EntitySourceOfTruth;
  inventorySsot: EntitySourceOfTruth;
  priceSsot: EntitySourceOfTruth;
}

function getInitialFormState(connector?: ErpConnectorConfig | null): FormState {
  if (!connector) {
    return {
      name: '',
      provider: 'tally_prime',
      enabled: true,
      endpointUrl: '',
      productSsot: 'palnadu_smart_pricing',
      inventorySsot: 'external_erp',
      priceSsot: 'palnadu_smart_pricing',
    };
  }
  return {
    name: connector.name,
    provider: connector.provider,
    enabled: connector.enabled,
    endpointUrl: connector.endpointUrl || '',
    productSsot: connector.productSsot,
    inventorySsot: connector.inventorySsot,
    priceSsot: connector.priceSsot,
  };
}

export function ConnectorFormModal({ connector, onClose, onSave }: ConnectorFormModalProps) {
  const isEditing = Boolean(connector);
  const initial = getInitialFormState(connector);

  const [name, setName] = useState(initial.name);
  const [provider, setProvider] = useState<ErpProviderType>(initial.provider);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [endpointUrl, setEndpointUrl] = useState(initial.endpointUrl);
  const [authSecret, setAuthSecret] = useState('');
  const [productSsot, setProductSsot] = useState<EntitySourceOfTruth>(initial.productSsot);
  const [inventorySsot, setInventorySsot] = useState<EntitySourceOfTruth>(initial.inventorySsot);
  const [priceSsot, setPriceSsot] = useState<EntitySourceOfTruth>(initial.priceSsot);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Connector name is required');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        provider,
        enabled,
        endpointUrl: endpointUrl.trim() || undefined,
        authSecret: authSecret.trim() || undefined,
        productSsot,
        inventorySsot,
        priceSsot,
        fieldMappings: {},
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save connector');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="font-semibold text-lg text-slate-900">
            {isEditing ? 'Edit ERP Connector' : 'Add New ERP Connector'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-slate-400 hover:text-slate-600"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <ConnectorBasicInputs
            name={name}
            provider={provider}
            enabled={enabled}
            endpointUrl={endpointUrl}
            authSecret={authSecret}
            isEditing={isEditing}
            onNameChange={setName}
            onProviderChange={setProvider}
            onEnabledChange={setEnabled}
            onEndpointUrlChange={setEndpointUrl}
            onAuthSecretChange={setAuthSecret}
          />

          <ConnectorSsotFields
            productSsot={productSsot}
            inventorySsot={inventorySsot}
            priceSsot={priceSsot}
            onProductSsotChange={setProductSsot}
            onInventorySsotChange={setInventorySsot}
            onPriceSsotChange={setPriceSsot}
          />

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 text-xs hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-blue-600 px-4 py-2 font-medium text-white text-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Connector' : 'Create Connector'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
