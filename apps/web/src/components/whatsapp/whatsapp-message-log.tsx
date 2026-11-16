'use client';

import React, { useMemo, useState } from 'react';
import type { WhatsAppMessageListItem } from '@palnadu/contracts';

export interface WhatsAppMessageLogProps {
  messages: WhatsAppMessageListItem[];
}

export function WhatsAppMessageLog({ messages }: WhatsAppMessageLogProps) {
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all');

  const filtered = useMemo(() => {
    return messages.filter((m) => {
      const matchesDir = directionFilter === 'all' || m.direction === directionFilter;
      const matchesSearch =
        !search.trim() ||
        m.fromNumber.includes(search) ||
        m.toNumber.includes(search) ||
        m.contentSummary.toLowerCase().includes(search.toLowerCase()) ||
        m.wamid.toLowerCase().includes(search.toLowerCase());
      return matchesDir && matchesSearch;
    });
  }, [messages, search, directionFilter]);

  const getStatusBadge = (status: WhatsAppMessageListItem['status']) => {
    switch (status) {
      case 'read':
        return (
          <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
            Read
          </span>
        );
      case 'delivered':
        return (
          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
            Delivered
          </span>
        );
      case 'sent':
        return (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
            Sent
          </span>
        );
      case 'received':
        return (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            Received
          </span>
        );
      case 'failed':
        return (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            Failed
          </span>
        );
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4 sm:flex sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-base text-slate-900">Message Audit Trail</h3>
          <p className="text-xs text-slate-500">
            Inbound customer requests and outbound quotation alerts.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 sm:mt-0">
          <input
            type="text"
            placeholder="Search number or text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="touch-target rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value as 'all' | 'inbound' | 'outbound')}
            className="touch-target rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Directions</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Direction</th>
              <th className="px-4 py-3">From / To</th>
              <th className="px-4 py-3">Summary</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-xs text-slate-400">
                  No WhatsApp events match the selected criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 font-medium text-xs ${
                        item.direction === 'inbound'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-slate-900">From: {item.fromNumber}</div>
                    <div className="font-mono text-xs text-slate-500">To: {item.toNumber}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-md truncate text-xs text-slate-900">
                      {item.contentSummary}
                    </div>
                    {item.errorMessage && (
                      <div className="text-[11px] text-red-600">{item.errorMessage}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleString()}
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
