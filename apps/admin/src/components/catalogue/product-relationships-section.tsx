'use client';

import React, { useState } from 'react';
import type { ProductRelationshipType, RelationshipResponse } from '@palnadu/contracts';
import { apiClient } from '../../lib/api-client';

export interface ProductRelationshipsSectionProps {
  productId: string;
  relationships: RelationshipResponse[];
  onRefresh: () => void;
}

export function ProductRelationshipsSection({
  productId,
  relationships,
  onRefresh,
}: ProductRelationshipsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [targetProductId, setTargetProductId] = useState('');
  const [relationshipType, setRelationshipType] = useState<ProductRelationshipType>('related');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!targetProductId.trim()) {
      setError('Target product ID is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.catalogue.createRelationship(productId, {
        targetProductId: targetProductId.trim(),
        relationshipType,
        confirmedByAdmin: true,
        notes: notes.trim() || undefined,
      });
      setTargetProductId('');
      setNotes('');
      setIsAdding(false);
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create relationship');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (relId: string) => {
    if (!confirm('Are you sure you want to remove this relationship?')) return;
    try {
      await apiClient.catalogue.deleteRelationship(productId, relId);
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete relationship');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-semibold text-base text-slate-900">Curated Product Relationships</h3>
          <p className="text-xs text-slate-500">
            Link complementary or related items (e.g. CCTV camera with junction box or mount).
          </p>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="touch-target rounded-md bg-slate-900 px-3 py-1.5 font-medium text-xs text-white hover:bg-slate-800"
          >
            + Add Link
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-2.5 text-red-800 text-xs" role="alert">
          {error}
        </div>
      )}

      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="rel-target" className="block font-medium text-slate-700 text-xs">
                Target Product UUID *
              </label>
              <input
                id="rel-target"
                type="text"
                required
                value={targetProductId}
                onChange={(e) => setTargetProductId(e.target.value)}
                placeholder="Target product UUID"
                className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="rel-type" className="block font-medium text-slate-700 text-xs">
                Relationship Type
              </label>
              <select
                id="rel-type"
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value as ProductRelationshipType)}
                className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="related">Related Product</option>
                <option value="complementary">Complementary (Recommended Addon)</option>
                <option value="compatible">Compatible Hardware</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="rel-notes" className="block font-medium text-slate-700 text-xs">
              Curation Notes (Optional)
            </label>
            <input
              id="rel-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Wall mount bracket for this dome camera model"
              className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="touch-target rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 text-xs hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="touch-target rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Relationship'}
            </button>
          </div>
        </form>
      )}

      {relationships.length === 0 && !isAdding ? (
        <p className="text-xs text-slate-400 italic">No curated relationships established.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {relationships.map((rel) => (
            <div key={rel.id} className="flex items-center justify-between py-2.5 text-xs">
              <div>
                <span className="font-mono text-slate-700">
                  {rel.targetProductId.slice(0, 8)}...
                </span>
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-[10px] text-slate-700 capitalize">
                  {rel.relationshipType}
                </span>
                {rel.notes && <span className="ml-2 text-slate-500 italic">“{rel.notes}”</span>}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(rel.id)}
                className="touch-target text-red-600 hover:text-red-800 font-medium px-2 py-1"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
