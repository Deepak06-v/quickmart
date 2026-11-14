import React from 'react';
import {
  LayoutDashboard,
  Layers,
  ShoppingBag,
  Users,
  LogOut,
  Store,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type TabType = 'dashboard' | 'catalog' | 'orders' | 'customers';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  pendingOrdersCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  pendingOrdersCount = 0,
}) => {
  const { admin, logout } = useAuth();

  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      icon: LayoutDashboard,
      desc: 'Monthly business & expenses',
    },
    {
      id: 'catalog' as TabType,
      label: 'Items & Categories',
      icon: Layers,
      desc: 'Products, prices & categories',
    },
    {
      id: 'orders' as TabType,
      label: 'Orders',
      icon: ShoppingBag,
      desc: 'Dispatch & process deliveries',
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
    },
    {
      id: 'customers' as TabType,
      label: 'Customers',
      icon: Users,
      desc: 'Registered users & history',
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand & Store Header */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">QuickMart</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Grocery Management Hub</p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live status badge */}
        <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100/80">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-emerald-800 truncate">
            Anand Rural Hub • Store Live
          </span>
        </div>
      </div>

      {/* Navigation Modules (Only 4 primary modules) */}
      <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Main Modules
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium transition-all text-left ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <div>
                  <div className={`text-sm font-semibold leading-none ${isActive ? 'text-white' : 'text-slate-800'}`}>
                    {item.label}
                  </div>
                  <div className={`text-[11px] mt-1 line-clamp-1 ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                    {item.desc}
                  </div>
                </div>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white text-emerald-700'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Admin User Footer & Logout */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/70">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {admin?.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                {admin?.name || 'Store Admin'}
              </p>
              <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                {admin?.email || 'admin@quickmart.in'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:block w-72 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile drawer backdrop and sheet */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] shadow-2xl z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
