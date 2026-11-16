'use client';

import React, { useState, useEffect } from 'react';
import type { CreateStockMovementRequest, InventoryBalanceResponse } from '@palnadu/contracts';

export interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: CreateStockMovementRequest) => Promise<void>;
  balances: InventoryBalanceResponse[];
  initialVariantId?: string;
  isErpOwnership: boolean;
}

export function StockMovementModal({
  isOpen,
  onClose,
  onSubmit,
  balances,
  initialVariantId,
  isErpOwnership,
}: StockMovementModalProps) {
  const [variantId, setVariantId] = useState(initialVariantId || '');
  const [movementType, setMovementType] = useState<
    'opening_stock' | 'inward' | 'outward' | 'adjustment'
  >('inward');
  const [quantity, setQuantity] = useState<string>('1');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialVariantId) {
      setVariantId(initialVariantId);
    } else if (balances.length > 0 && !variantId) {
      setVariantId(balances[0].variantId);
    }
  }, [initialVariantId, balances, variantId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty === 0) {
      setError('Please provide a valid non-zero quantity.');
      return;
    }

    if (!variantId) {
      setError('Please select a product variant.');
      return;
    }

    const effectiveQty = movementType === 'outward' ? -Math.abs(qty) : qty;

    setIsSubmitting(true);
    try {
      await onSubmit({
        variantId,
        movementType,
        quantity: effectiveQty,
        externalReference: reference.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record movement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="movement-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 id="movement-modal-title" className="font-semibold text-lg text-slate-900">
            Record Stock Movement
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="touch-target text-slate-400 hover:text-slate-600 focus:outline-none"
            aria-label="Close dialog"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        {isErpOwnership ? (
          <div className="mt-4 rounded-md bg-amber-50 p-4 text-xs text-amber-800">
            <strong>Stock movements are locked.</strong> Inventory is configured with external ERP
            ownership. Manual movements in Smart Pricing are disabled.
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="touch-target rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-xs text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="variantId" className="block font-medium text-xs text-slate-700">
                Product / Variant
              </label>
              <select
                id="variantId"
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                disabled={Boolean(initialVariantId) || isSubmitting}
                className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                {balances.map((b) => (
                  <option key={b.variantId} value={b.variantId}>
                    {b.productName} {b.sku ? `(${b.sku})` : ''} - Current: {b.availableQuantity}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="movementType" className="block font-medium text-xs text-slate-700">
                  Movement Type
                </label>
                <select
                  id="movementType"
                  value={movementType}
                  onChange={(e) =>
                    setMovementType(
                      e.target.value as 'opening_stock' | 'inward' | 'outward' | 'adjustment',
                    )
                  }
                  disabled={isSubmitting}
                  className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="inward">Inward (Stock In)</option>
                  <option value="outward">Outward (Dispatch / Scrap)</option>
                  <option value="adjustment">Count Adjustment (+/-)</option>
                  <option value="opening_stock">Opening Stock</option>
                </select>
              </div>

              <div>
                <label htmlFor="quantity" className="block font-medium text-xs text-slate-700">
                  Quantity {movementType === 'outward' ? '(Will deduct)' : ''}
                </label>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reference" className="block font-medium text-xs text-slate-700">
                Document / PO / Invoice Ref (Optional)
              </label>
              <input
                type="text"
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. PO-84920 or INV-1032"
                disabled={isSubmitting}
                className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="reason" className="block font-medium text-xs text-slate-700">
                Audit Reason / Notes (Optional)
              </label>
              <input
                type="text"
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for adjustment"
                disabled={isSubmitting}
                className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-600">{error}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="touch-target rounded-md border border-slate-300 px-4 py-2 font-medium text-xs text-slate-700 hover:bg-slate-50 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="touch-target rounded-md bg-emerald-600 px-4 py-2 font-medium text-xs text-white hover:bg-emerald-700 focus:outline-none disabled:opacity-50"
              >
                {isSubmitting ? 'Recording...' : 'Submit Movement'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
