import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Clock,
  Truck,
  CheckCircle2,
  TrendingUp,
  Receipt,
  Plus,
  Trash2,
  ArrowRight,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { api } from '../api/client';
import { IDashboardSummary, IExpense } from '../types';
import { TabType } from '../components/Sidebar';

interface DashboardViewProps {
  onNavigateToTab: (tab: TabType) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToTab,
  showToast,
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  const [summary, setSummary] = useState<IDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expense modal states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean } & IDashboardSummary>(
        `/admin/dashboard/summary?year=${selectedYear}&month=${selectedMonth}`
      );
      if (res.success) {
        setSummary(res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedYear, selectedMonth]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim() || !expenseAmount) return;

    setIsSubmittingExpense(true);
    try {
      const res = await api.post<{ success: boolean; expense: IExpense }>('/admin/expenses', {
        description: expenseDesc.trim(),
        amount: Number(expenseAmount),
        date: new Date(expenseDate).toISOString(),
      });

      if (res.success) {
        showToast('Expense recorded successfully', 'success');
        setIsExpenseModalOpen(false);
        setExpenseDesc('');
        setExpenseAmount('');
        fetchSummary();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to record expense', 'error');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;

    try {
      const res = await api.delete<{ success: boolean }>(`/admin/expenses/${id}`);
      if (res.success) {
        showToast('Expense record deleted', 'success');
        fetchSummary();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete expense', 'error');
    }
  };

  const metrics = summary?.metrics;

  return (
    <div className="space-y-6">
      {/* Month & Year Selection Bar */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Reporting Period
          </span>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              {MONTHS[selectedMonth - 1]} {selectedYear}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer transition-colors"
          >
            {MONTHS.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer transition-colors"
          >
            {[2024, 2025, 2026, 2027].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSelectedMonth(currentDate.getMonth() + 1);
              setSelectedYear(currentDate.getFullYear());
            }}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-colors"
          >
            This Month
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 6 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {/* 1. Total Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Orders
            </p>
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 mt-2">
              {isLoading ? '...' : metrics?.totalOrders ?? 0}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Placed in {MONTHS[selectedMonth - 1]}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* 2. Pending Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pending Orders
            </p>
            <h3 className="text-2xl md:text-3xl font-black text-amber-600 mt-2">
              {isLoading ? '...' : metrics?.pendingOrders ?? 0}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Awaiting dispatch or preparation
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* 3. Dispatched Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Dispatched Orders
            </p>
            <h3 className="text-2xl md:text-3xl font-black text-indigo-600 mt-2">
              {isLoading ? '...' : metrics?.dispatchedOrders ?? 0}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Out for delivery
            </p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* 4. Delivered Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Delivered Orders
            </p>
            <h3 className="text-2xl md:text-3xl font-black text-emerald-600 mt-2">
              {isLoading ? '...' : metrics?.deliveredOrders ?? 0}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Successfully fulfilled
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* 5. Total Delivered Sales */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Delivered Sales (COD)
            </p>
            <h3 className="text-2xl md:text-3xl font-black text-emerald-800 mt-2">
              {isLoading ? '...' : `₹${(metrics?.totalDeliveredSales ?? 0).toLocaleString('en-IN')}`}
            </h3>
            <p className="text-xs text-emerald-600 mt-1">
              Cash collected from delivered orders
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* 6. Total Recorded Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Recorded Expenses
            </p>
            <h3 className="text-2xl md:text-3xl font-black text-slate-800 mt-2">
              {isLoading ? '...' : `₹${(metrics?.totalExpenses ?? 0).toLocaleString('en-IN')}`}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {summary?.expenses.length || 0} manual entry(s) this month
            </p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Grid: Recorded Expenses Management & Recent Month Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses Section */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                Monthly Expenses
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record store running costs (crates, packing, local travel)
              </p>
            </div>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense</span>
            </button>
          </div>

          <div className="flex-1 overflow-x-auto mt-3">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading expenses...</div>
            ) : !summary?.expenses || summary.expenses.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center">
                <Receipt className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                <p className="text-sm font-semibold text-slate-600 mt-2">No expenses recorded</p>
                <p className="text-xs text-slate-400 mt-0.5 max-w-xs">
                  Click "Add Expense" to track monthly operational expenses for {MONTHS[selectedMonth - 1]}.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {summary.expenses.map((exp) => (
                  <div key={exp._id} className="py-3 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{exp.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(exp.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-slate-900">
                        ₹{exp.amount.toLocaleString('en-IN')}
                      </span>
                      <button
                        onClick={() => handleDeleteExpense(exp._id)}
                        title="Delete expense"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Month Orders */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                Recent Orders in {MONTHS[selectedMonth - 1]}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest customer orders placed this calendar month
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('orders')}
              className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto mt-3">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading orders...</div>
            ) : !summary?.recentOrders || summary.recentOrders.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center">
                <ShoppingBag className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                <p className="text-sm font-semibold text-slate-600 mt-2">No orders this month</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Orders placed by customers will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {summary.recentOrders.map((order) => (
                  <div key={order._id} className="py-3 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-800">
                          #{order.orderNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            order.status === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'Out for Delivery'
                              ? 'bg-indigo-100 text-indigo-800'
                              : order.status === 'Cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {order.deliveryAddress?.customerName} • {order.items?.length || 0} items
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-slate-900">
                        ₹{order.totalAmount}
                      </p>
                      <p className="text-[11px] text-slate-400">COD</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Add Store Expense
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Record a manual operational expense for {MONTHS[selectedMonth - 1]} {selectedYear}.
            </p>

            <form onSubmit={handleAddExpense} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Packing bags, fuel for delivery bike"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="250"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Expense Date
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-60"
                >
                  {isSubmittingExpense ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
