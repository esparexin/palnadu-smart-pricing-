'use client';

import React, { useMemo, useState } from 'react';
import type { InventoryBalanceResponse } from '@palnadu/contracts';

export interface InventoryBalancesTableProps {
  balances: InventoryBalanceResponse[];
  onRecordMovement: (variantId: string) => void;
  isErpOwnership: boolean;
}

export function InventoryBalancesTable({
  balances,
  onRecordMovement,
  isErpOwnership,
}: InventoryBalancesTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredBalances = useMemo(() => {
    return balances.filter((b) => {
      const matchesSearch =
        !search.trim() ||
        b.productName.toLowerCase().includes(search.toLowerCase()) ||
        (b.sku && b.sku.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || b.stockStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [balances, search, statusFilter]);

  const getStatusBadge = (status: InventoryBalanceResponse['stockStatus']) => {
    switch (status) {
      case 'in_stock':
        return (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            In Stock
          </span>
        );
      case 'low_stock':
        return (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Low Stock
          </span>
        );
      case 'critical':
        return (
          <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
            Critical
          </span>
        );
      case 'out_of_stock':
        return (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            Out of Stock
          </span>
        );
      default:
        return (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            Untracked
          </span>
        );
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4 sm:flex sm:items-center sm:justify-between">
        <h3 className="font-semibold text-base text-slate-900">Current Stock Balances</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3 sm:mt-0">
          <input
            type="text"
            placeholder="Search by product or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="touch-target rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="touch-target rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="critical">Critical</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Product / SKU</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Available</th>
              <th className="px-4 py-3 text-right">Reserved</th>
              <th className="px-4 py-3 text-right">Low Stock Threshold</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBalances.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-xs text-slate-400">
                  No inventory balances match the selected criteria.
                </td>
              </tr>
            ) : (
              filteredBalances.map((item) => (
                <tr key={item.variantId} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{item.productName}</div>
                    {item.sku && <div className="font-mono text-xs text-slate-500">{item.sku}</div>}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(item.stockStatus)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {item.availableQuantity}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">{item.reservedQuantity}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{item.lowStockThreshold}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      disabled={isErpOwnership}
                      onClick={() => onRecordMovement(item.variantId)}
                      className="touch-target inline-flex items-center justify-center rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none disabled:opacity-40"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
