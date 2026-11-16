'use client';

import React from 'react';
import type { ErpSyncJob } from '@palnadu/contracts';

export interface SyncJobsTableProps {
  jobs: ErpSyncJob[];
}

export function SyncJobsTable({ jobs }: SyncJobsTableProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
        No synchronization jobs recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
        <thead className="bg-slate-50 font-medium text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3">
              Timestamp
            </th>
            <th scope="col" className="px-4 py-3">
              Job Scope
            </th>
            <th scope="col" className="px-4 py-3">
              Status
            </th>
            <th scope="col" className="px-4 py-3">
              Processed
            </th>
            <th scope="col" className="px-4 py-3">
              Created / Updated
            </th>
            <th scope="col" className="px-4 py-3">
              Failed
            </th>
            <th scope="col" className="px-4 py-3">
              Details
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-slate-50/50">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-slate-500">
                {new Date(job.startedAt).toLocaleString()}
              </td>
              <td className="px-4 py-3 font-medium uppercase text-slate-900">{job.jobType}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-[11px] ${
                    job.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : job.status === 'failed'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {job.status}
                </span>
              </td>
              <td className="px-4 py-3 font-mono">{job.itemsProcessed}</td>
              <td className="px-4 py-3 font-mono">
                <span className="text-emerald-600">+{job.itemsCreated}</span>
                {' / '}
                <span className="text-blue-600">~{job.itemsUpdated}</span>
              </td>
              <td className="px-4 py-3 font-mono">
                {job.itemsFailed > 0 ? (
                  <span className="font-semibold text-red-600">{job.itemsFailed}</span>
                ) : (
                  <span className="text-slate-400">0</span>
                )}
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-slate-500">
                {job.errorLog ? (
                  <span className="text-red-600" title={job.errorLog}>
                    {job.errorLog}
                  </span>
                ) : (
                  <span className="text-slate-400">Success</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
