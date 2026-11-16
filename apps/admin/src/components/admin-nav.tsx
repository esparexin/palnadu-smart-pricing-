'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { NAV_ITEMS, type NavItem } from './admin-nav-items';

export type { NavItem };

export interface AdminNavProps {
  onItemClick?: () => void;
}

export function AdminNav({ onItemClick }: AdminNavProps) {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.requiredPermission) return true;
    return (
      hasPermission(item.requiredPermission) ||
      hasPermission('catalogue:manage') ||
      hasPermission('admin:manage')
    );
  });

  return (
    <nav aria-label="Admin Navigation" className="space-y-1">
      {visibleItems.map((item) => {
        const isActive =
          item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            aria-current={isActive ? 'page' : undefined}
            className={`touch-target group flex w-full items-center gap-3 rounded-md px-3 py-2.5 font-medium text-sm transition-colors ${
              isActive
                ? 'bg-emerald-50 text-emerald-800 font-semibold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <item.icon
              className={`h-5 w-5 shrink-0 transition-colors ${
                isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
              }`}
            />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
