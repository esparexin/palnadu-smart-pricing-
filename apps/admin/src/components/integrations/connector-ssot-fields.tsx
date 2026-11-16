'use client';

import React from 'react';
import type { EntitySourceOfTruth } from '@palnadu/contracts';

export interface ConnectorSsotFieldsProps {
  productSsot: EntitySourceOfTruth;
  inventorySsot: EntitySourceOfTruth;
  priceSsot: EntitySourceOfTruth;
  onProductSsotChange: (val: EntitySourceOfTruth) => void;
  onInventorySsotChange: (val: EntitySourceOfTruth) => void;
  onPriceSsotChange: (val: EntitySourceOfTruth) => void;
}

export function ConnectorSsotFields({
  productSsot,
  inventorySsot,
  priceSsot,
  onProductSsotChange,
  onInventorySsotChange,
  onPriceSsotChange,
}: ConnectorSsotFieldsProps) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <h4 className="font-medium text-slate-800 text-xs">Source of Truth (SSOT) Rules</h4>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div>
          <label htmlFor="conn-prod-ssot" className="block text-[11px] text-slate-500">
            Products
          </label>
          <select
            id="conn-prod-ssot"
            value={productSsot}
            onChange={(e) => onProductSsotChange(e.target.value as EntitySourceOfTruth)}
            className="mt-1 block min-h-[44px] w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
          >
            <option value="palnadu_smart_pricing">Smart Pricing</option>
            <option value="external_erp">External ERP</option>
          </select>
        </div>

        <div>
          <label htmlFor="conn-inv-ssot" className="block text-[11px] text-slate-500">
            Inventory
          </label>
          <select
            id="conn-inv-ssot"
            value={inventorySsot}
            onChange={(e) => onInventorySsotChange(e.target.value as EntitySourceOfTruth)}
            className="mt-1 block min-h-[44px] w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
          >
            <option value="external_erp">External ERP</option>
            <option value="palnadu_smart_pricing">Smart Pricing</option>
          </select>
        </div>

        <div>
          <label htmlFor="conn-price-ssot" className="block text-[11px] text-slate-500">
            Prices
          </label>
          <select
            id="conn-price-ssot"
            value={priceSsot}
            onChange={(e) => onPriceSsotChange(e.target.value as EntitySourceOfTruth)}
            className="mt-1 block min-h-[44px] w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
          >
            <option value="palnadu_smart_pricing">Smart Pricing</option>
            <option value="external_erp">External ERP</option>
          </select>
        </div>
      </div>
    </div>
  );
}
