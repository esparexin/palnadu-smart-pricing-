'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type {
  CreateErpConnectorRequest,
  ErpConnectorConfig,
  ErpSyncJob,
  TriggerSyncRequest,
} from '@palnadu/contracts';
import { apiClient } from '../../../lib/api-client';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { ConnectorCard } from '../../../components/integrations/connector-card';
import { ConnectorFormModal } from '../../../components/integrations/connector-form-modal';
import { SyncModal } from '../../../components/integrations/sync-modal';
import { SyncJobsTable } from '../../../components/integrations/sync-jobs-table';

export default function IntegrationsPage() {
  const [connectors, setConnectors] = useState<ErpConnectorConfig[]>([]);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ErpSyncJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingConnector, setEditingConnector] = useState<ErpConnectorConfig | null>(null);
  const [syncingConnector, setSyncingConnector] = useState<ErpConnectorConfig | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await apiClient.integrations.listConnectors();
      setConnectors(list);

      const activeId = selectedConnectorId || (list.length > 0 ? list[0].id : null);
      if (activeId) {
        setSelectedConnectorId(activeId);
        const jobList = await apiClient.integrations.listSyncJobs(activeId, 20);
        setJobs(jobList);
      } else {
        setJobs([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations data.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedConnectorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveConnector = async (data: CreateErpConnectorRequest) => {
    if (editingConnector) {
      await apiClient.integrations.updateConnector(editingConnector.id, data);
    } else {
      await apiClient.integrations.createConnector(data);
    }
    await loadData();
  };

  const handleDeleteConnector = async (connector: ErpConnectorConfig) => {
    if (!window.confirm(`Are you sure you want to delete connector "${connector.name}"?`)) {
      return;
    }
    await apiClient.integrations.deleteConnector(connector.id);
    if (selectedConnectorId === connector.id) {
      setSelectedConnectorId(null);
    }
    await loadData();
  };

  const handleTriggerSync = async (connectorId: string, req: TriggerSyncRequest) => {
    await apiClient.integrations.triggerSync(connectorId, req);
    await loadData();
  };

  if (isLoading && connectors.length === 0) {
    return <LoadingState label="Loading ERP connectors..." />;
  }

  if (error && connectors.length === 0) {
    return <ErrorState message={error} retry={loadData} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-slate-900">ERP &amp; Tally Synchronization</h1>
          <p className="mt-1 text-slate-500 text-sm">
            Configure on-premise TallyPrime gateways, external ERP connectors, and entity Source of
            Truth rules.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingConnector(null);
            setIsFormModalOpen(true);
          }}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-sm text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Add ERP Connector
        </button>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
        <p className="font-semibold">Architectural SSOT Guidelines:</p>
        <p className="mt-1">
          When <strong>Palnadu Smart Pricing</strong> is the Source of Truth, external updates never
          overwrite catalog product definitions. When <strong>External ERP</strong> is the Source of
          Truth for inventory or rates, available stocks and variant prices are synchronized
          directly into the operational database.
        </p>
      </div>

      {connectors.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <h3 className="font-medium text-slate-900 text-sm">No ERP Connectors Configured</h3>
          <p className="mt-1 text-slate-500 text-xs">
            Add a connector to synchronize stock items with TallyPrime or generic ERP webhooks.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                setEditingConnector(null);
                setIsFormModalOpen(true);
              }}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-blue-600 px-4 py-2 font-medium text-white text-xs hover:bg-blue-700"
            >
              Configure First Connector
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connectors.map((connector) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              onEdit={(c) => {
                setEditingConnector(c);
                setIsFormModalOpen(true);
              }}
              onSync={(c) => setSyncingConnector(c)}
              onDelete={handleDeleteConnector}
            />
          ))}
        </div>
      )}

      {selectedConnectorId && (
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base text-slate-900">
              Audit &amp; Synchronization History
            </h2>
            <button
              type="button"
              onClick={loadData}
              className="min-h-[44px] px-3 font-medium text-blue-600 text-xs hover:text-blue-800"
            >
              Refresh Logs
            </button>
          </div>
          <SyncJobsTable jobs={jobs} />
        </div>
      )}

      {isFormModalOpen && (
        <ConnectorFormModal
          connector={editingConnector}
          onClose={() => setIsFormModalOpen(false)}
          onSave={handleSaveConnector}
        />
      )}

      {syncingConnector && (
        <SyncModal
          connector={syncingConnector}
          onClose={() => setSyncingConnector(null)}
          onTrigger={handleTriggerSync}
        />
      )}
    </div>
  );
}
