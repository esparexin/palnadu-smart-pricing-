'use client';

import React, { useEffect, useState } from 'react';
import type { ImageCandidateResponse } from '@palnadu/contracts';
import { apiClient } from '../../lib/api-client';

export interface ImageDiscoveryModalProps {
  productId: string;
  isOpen: boolean;
  onClose: () => void;
  onImageApproved: () => void;
}

export function ImageDiscoveryModal({
  productId,
  isOpen,
  onClose,
  onImageApproved,
}: ImageDiscoveryModalProps) {
  const [candidates, setCandidates] = useState<ImageCandidateResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCandidates();
    }
  }, [isOpen, productId]);

  const loadCandidates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.media.listCandidates(productId);
      setCandidates(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load candidates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscover = async () => {
    setIsDiscovering(true);
    setError(null);
    try {
      const data = await apiClient.media.discoverImages(productId);
      setCandidates(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Discovery search failed');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleApprove = async (candidateId: string) => {
    try {
      await apiClient.media.approveCandidate(productId, candidateId, { isPrimary: false });
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, status: 'approved' } : c)),
      );
      onImageApproved();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to approve candidate');
    }
  };

  const handleReject = async (candidateId: string) => {
    try {
      await apiClient.media.rejectCandidate(productId, candidateId);
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, status: 'rejected' } : c)),
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to reject candidate');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Hybrid Product Image Discovery
            </h3>
            <p className="text-xs text-slate-500">
              Discover official manufacturer and authorized distributor images with rights metadata.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target text-slate-400 hover:text-slate-600 font-bold p-1"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-600">
              Search official brand catalogs and distributor feeds for matching models.
            </span>
            <button
              type="button"
              disabled={isDiscovering}
              onClick={handleDiscover}
              className="touch-target rounded-md bg-emerald-600 px-4 py-2 font-medium text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isDiscovering ? 'Searching...' : 'Run Image Discovery'}
            </button>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-red-800 text-xs" role="alert">
              {error}
            </div>
          )}

          {isLoading ? (
            <p className="text-xs text-slate-500 py-6 text-center">Loading candidate images...</p>
          ) : candidates.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No discovered image candidates yet. Click &ldquo;Run Image Discovery&rdquo; to search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  className="rounded-lg border border-slate-200 p-3 flex flex-col justify-between space-y-2 bg-white"
                >
                  <div className="h-32 w-full bg-slate-100 rounded flex items-center justify-center overflow-hidden">
                    <img
                      src={cand.thumbnailUrl || cand.sourceUrl}
                      alt={cand.modelMatched || 'Discovered asset'}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex flex-wrap gap-1">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          cand.matchConfidence === 'exact_model'
                            ? 'bg-emerald-100 text-emerald-800'
                            : cand.matchConfidence === 'prefix_match'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {cand.matchConfidence === 'exact_model'
                          ? `Exact: ${cand.modelMatched || 'Model'}`
                          : cand.matchConfidence}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                        {cand.sourceType}
                      </span>
                    </div>
                    {cand.attributionText && (
                      <p
                        className="text-[11px] text-slate-500 truncate"
                        title={cand.attributionText}
                      >
                        {cand.attributionText}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    {cand.status === 'approved' ? (
                      <span className="text-emerald-600 font-semibold text-[11px]">✓ Approved</span>
                    ) : cand.status === 'rejected' ? (
                      <span className="text-slate-400 text-[11px]">Rejected</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReject(cand.id)}
                          className="touch-target text-slate-500 hover:text-red-600 px-2 py-1 font-medium"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(cand.id)}
                          className="touch-target rounded bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1 font-medium"
                        >
                          Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 text-xs hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
