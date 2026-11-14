import React from 'react';
import { Menu, RefreshCw, Calendar } from 'lucide-react';
import { TabType } from './Sidebar';

interface HeaderProps {
  currentTab: TabType;
  onOpenMobileSidebar: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const TAB_TITLES: Record<TabType, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Monthly Business Dashboard',
    subtitle: 'Overview of monthly orders, delivered sales, and recorded expenses',
  },
  catalog: {
    title: 'Items & Categories',
    subtitle: 'Manage grocery items, availability, prices, and catalog categories',
  },
  orders: {
    title: 'Order Processing & Dispatch',
    subtitle: 'Inspect incoming orders, mark items dispatched, and confirm deliveries',
  },
  customers: {
    title: 'Customer Directory',
    subtitle: 'Registered customer profiles and verified order histories',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileSidebar,
  onRefresh,
  isRefreshing,
}) => {
  const current = TAB_TITLES[currentTab];
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {current.title}
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block mt-0.5">
              {current.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{today}</span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh Data"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
