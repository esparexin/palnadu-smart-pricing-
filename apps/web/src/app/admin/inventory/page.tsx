'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type {
  CreateStockMovementRequest,
  InventoryAlertResponse,
  InventoryBalanceResponse,
  InventoryConfig,
  UpdateInventoryConfigRequest,
} from '@palnadu/contracts';
import { apiClient } from '../../../lib/api-client';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { InventoryConfigCard } from '../../../components/inventory/inventory-config-card';
import { InventoryAlertsSection } from '../../../components/inventory/inventory-alerts-section';
import { InventoryBalancesTable } from '../../../components/inventory/inventory-balances-table';
import { StockMovementModal } from '../../../components/inventory/stock-movement-modal';

export default function InventoryPage() {
  const [config, setConfig] = useState<InventoryConfig | null>(null);
  const [balances, setBalances] = useState<InventoryBalanceResponse[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlertResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cfg, bals, alrts] = await Promise.all([
        apiClient.inventory.getConfig(),
        apiClient.inventory.listBalances({ limit: 100 }),
        apiClient.inventory.listAlerts({ state: 'active', limit: 50 }),
      ]);
      setConfig(cfg);
      setBalances(bals);
      setAlerts(alrts);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateConfig = async (updates: UpdateInventoryConfigRequest) => {
    const updated = await apiClient.inventory.updateConfig(updates);
    setConfig(updated);
    // Reload balances/alerts as threshold change may affect statuses
    const [bals, alrts] = await Promise.all([
      apiClient.inventory.listBalances({ limit: 100 }),
      apiClient.inventory.listAlerts({ state: 'active', limit: 50 }),
    ]);
    setBalances(bals);
    setAlerts(alrts);
  };

  const handleRecordMovement = async (req: CreateStockMovementRequest) => {
    await apiClient.inventory.recordMovement(req);
    await loadData();
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    await apiClient.inventory.acknowledgeAlert(alertId);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const openMovementModal = (variantId?: string) => {
    setSelectedVariantId(variantId);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <LoadingState label="Loading inventory..." />;
  }

  if (error || !config) {
    return (
      <ErrorState
        title="Failed to load inventory"
        message={error || 'Could not retrieve inventory settings.'}
        retry={loadData}
      />
    );
  }

  const isErpOwnership = config.stockOwnership === 'external_erp';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl text-slate-900 tracking-tight">
            Inventory &amp; Stock Levels
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Optional stock tracking, low-inventory thresholds, and ERP synchronization settings.
          </p>
        </div>

        {!isErpOwnership && (
          <button
            type="button"
            onClick={() => openMovementModal()}
            className="touch-target inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 font-medium text-sm text-white hover:bg-emerald-700"
          >
            + Record Movement
          </button>
        )}
      </div>

      <InventoryConfigCard config={config} onUpdate={handleUpdateConfig} />

      <InventoryAlertsSection alerts={alerts} onAcknowledge={handleAcknowledgeAlert} />

      <InventoryBalancesTable
        balances={balances}
        onRecordMovement={(variantId) => openMovementModal(variantId)}
        isErpOwnership={isErpOwnership}
      />

      <StockMovementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleRecordMovement}
        balances={balances}
        initialVariantId={selectedVariantId}
        isErpOwnership={isErpOwnership}
      />
    </div>
  );
}
