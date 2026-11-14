import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './views/LoginView';
import { Sidebar, TabType } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './views/DashboardView';
import { ProductsAndCategoriesView } from './views/ProductsAndCategoriesView';
import { OrdersView } from './views/OrdersView';
import { CustomersView } from './views/CustomersView';
import { Toast, ToastMessage } from './components/Toast';
import { api } from './api/client';

function getTabFromPath(): TabType {
  const path = window.location.pathname.toLowerCase();
  if (path.includes('/orders')) return 'orders';
  if (path.includes('/catalog') || path.includes('/products') || path.includes('/categories')) return 'catalog';
  if (path.includes('/customers')) return 'customers';
  return 'dashboard';
}

function MainDashboardLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabType>(getTabFromPath);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Update browser URL on tab change without full reload
  const handleSelectTab = (tab: TabType) => {
    setCurrentTab(tab);
    const targetPath = tab === 'dashboard' ? '/admin' : `/admin/${tab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentTab(getTabFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch pending count periodically
  const fetchPendingCount = async () => {
    try {
      const res = await api.get<{ success: boolean; counts: { pending: number } }>('/admin/orders?limit=1');
      if (res.success && res.counts) {
        setPendingOrdersCount(res.counts.pending || 0);
      }
    } catch {
      // Ignore background count errors
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, refreshKey]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    await fetchPendingCount();
    setTimeout(() => setIsRefreshing(false), 500);
    showToast('Data refreshed', 'info');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-300">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-xs font-semibold tracking-wider uppercase">Loading QuickMart Admin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        pendingOrdersCount={pendingOrdersCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentTab={currentTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto" key={refreshKey}>
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigateToTab={handleSelectTab}
              showToast={showToast}
            />
          )}

          {currentTab === 'catalog' && (
            <ProductsAndCategoriesView showToast={showToast} />
          )}

          {currentTab === 'orders' && (
            <OrdersView
              showToast={showToast}
              onPendingCountChange={setPendingOrdersCount}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersView showToast={showToast} />
          )}
        </main>
      </div>

      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainDashboardLayout />
    </AuthProvider>
  );
}
