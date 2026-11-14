import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  Eye,
  Phone,
  MapPin,
  Calendar,
  X,
  Banknote,
} from 'lucide-react';
import { api } from '../api/client';
import { IOrder } from '../types';

interface OrdersViewProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onPendingCountChange?: (count: number) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  showToast,
  onPendingCountChange,
}) => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    dispatched: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelBoxOpen, setIsCancelBoxOpen] = useState(false);

  // COD Delivery Confirmation Modal
  const [orderToDeliver, setOrderToDeliver] = useState<IOrder | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      let url = `/admin/orders?limit=100`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await api.get<{
        success: boolean;
        orders: IOrder[];
        counts: {
          all: number;
          pending: number;
          dispatched: number;
          delivered: number;
          cancelled: number;
        };
      }>(url);

      if (res.success) {
        setOrders(res.orders);
        if (res.counts) {
          setCounts(res.counts);
          if (onPendingCountChange) {
            onPendingCountChange(res.counts.pending);
          }
        }
      }
    } catch (err: any) {
      showToast('Failed to load orders', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, searchQuery]);

  // Handle Mark as Dispatched
  const handleMarkDispatched = async (orderId: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await api.patch<{ success: boolean; message: string; order: IOrder }>(
        `/admin/orders/${orderId}/dispatch`
      );
      if (res.success) {
        showToast(res.message, 'success');
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(res.order);
        }
        fetchOrders();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch order', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Mark as Delivered with explicit COD collection confirmation
  const handleConfirmDelivery = async (orderId: string, cashCollected: boolean) => {
    setIsUpdatingStatus(true);
    try {
      const res = await api.patch<{ success: boolean; message: string; order: IOrder }>(
        `/admin/orders/${orderId}/deliver`,
        { cashCollected }
      );
      if (res.success) {
        showToast(res.message, 'success');
        setOrderToDeliver(null);
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(res.order);
        }
        fetchOrders();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update delivery status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Cancel Order
  const handleCancelOrder = async (orderId: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await api.patch<{ success: boolean; message: string; order: IOrder }>(
        `/admin/orders/${orderId}/cancel`,
        { reason: cancelReason.trim() || 'Store admin cancelled order' }
      );
      if (res.success) {
        showToast(res.message, 'success');
        setIsCancelBoxOpen(false);
        setCancelReason('');
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder(res.order);
        }
        fetchOrders();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel order', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Out for Delivery':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Preparing Your Order':
      case 'Order Accepted':
      case 'Order Placed':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Orders ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Pending ({counts.pending})
          </button>
          <button
            onClick={() => setStatusFilter('dispatched')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'dispatched'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
            }`}
          >
            Dispatched ({counts.dispatched})
          </button>
          <button
            onClick={() => setStatusFilter('delivered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'delivered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Delivered ({counts.delivered})
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'cancelled'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Cancelled ({counts.cancelled})
          </button>
        </div>

        {/* Search Input */}
        <div className="w-full md:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order ID or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <ShoppingBag className="w-10 h-10 text-slate-300 stroke-[1.5] mx-auto mb-2" />
                    <p className="font-semibold text-sm">No orders matching your criteria</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Check back when customers place orders on the Android mobile application.
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isPending = ['Order Placed', 'Order Accepted', 'Preparing Your Order'].includes(o.status);
                  const isDispatched = o.status === 'Out for Delivery';
                  const isDelivered = o.status === 'Delivered';
                  const isCancelled = o.status === 'Cancelled';

                  return (
                    <tr key={o._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-900">
                        #{o.orderNumber}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {o.deliveryAddress?.customerName || (typeof o.user === 'object' ? o.user?.name : 'Customer')}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        +91 {o.deliveryAddress?.customerMobile || (typeof o.user === 'object' ? o.user?.mobile : '')}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {new Date(o.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        •{' '}
                        {new Date(o.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <span className="font-bold text-slate-800">{o.items?.length || 0}</span> items
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 leading-snug">
                          ₹{o.totalAmount}
                        </div>
                        <div
                          className={`text-[10px] font-bold uppercase ${
                            o.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          COD {o.paymentStatus === 'PAID' ? '(PAID)' : '(UNPAID)'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                            o.status
                          )}`}
                        >
                          {o.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <button
                              onClick={() => handleMarkDispatched(o._id)}
                              disabled={isUpdatingStatus}
                              title="Mark as Dispatched"
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Dispatch</span>
                            </button>
                          )}

                          {isDispatched && (
                            <button
                              onClick={() => setOrderToDeliver(o)}
                              disabled={isUpdatingStatus}
                              title="Mark as Delivered"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Deliver</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedOrder(o)}
                            title="Inspect Order Details"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 my-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Order #{selectedOrder.orderNumber}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(
                      selectedOrder.status
                    )}`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    Placed on{' '}
                    {new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}{' '}
                    at{' '}
                    {new Date(selectedOrder.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setIsCancelBoxOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-5 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
              {/* Customer & Delivery Information */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Customer & Delivery Location
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-bold text-slate-900">
                      {selectedOrder.deliveryAddress?.customerName}
                    </p>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>+91 {selectedOrder.deliveryAddress?.customerMobile}</span>
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-700 flex items-start gap-1.5 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        {selectedOrder.deliveryAddress?.houseNumber},{' '}
                        {selectedOrder.deliveryAddress?.streetArea},{' '}
                        {selectedOrder.deliveryAddress?.villageTown}
                        {selectedOrder.deliveryAddress?.landmark && (
                          <span className="block text-slate-400 mt-0.5">
                            Landmark: {selectedOrder.deliveryAddress.landmark}
                          </span>
                        )}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Ordered Items Breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Ordered Items ({selectedOrder.items?.length || 0})
                </h4>
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                              Item
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-snug">{item.name}</p>
                          <p className="text-xs text-slate-400">
                            {item.unit} • ₹{item.price} each
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-slate-900">
                          Qty: {item.quantity}
                        </p>
                        <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                          ₹{item.total || item.price * item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Pricing Snapshot */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">₹{selectedOrder.subtotal}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Delivery Charges</span>
                  <span className="font-semibold text-slate-800">
                    {selectedOrder.deliveryFee === 0 ? 'FREE' : `₹${selectedOrder.deliveryFee}`}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/80 flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-black text-slate-900">Final Amount</span>
                    <span
                      className={`text-[11px] font-bold ml-2 px-2 py-0.5 rounded-full ${
                        selectedOrder.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      COD • {selectedOrder.paymentStatus === 'PAID' ? 'PAID' : 'PAYMENT PENDING'}
                    </span>
                  </div>
                  <span className="text-lg font-black text-emerald-800">
                    ₹{selectedOrder.totalAmount}
                  </span>
                </div>
              </div>

              {/* Status History Timeline */}
              {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Status Timeline
                  </h4>
                  <div className="space-y-2 pl-2 border-l-2 border-slate-200">
                    {selectedOrder.statusHistory.map((h, i) => (
                      <div key={i} className="text-xs pl-3 relative">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -left-[17px] top-1" />
                        <span className="font-bold text-slate-800">{h.status}</span>
                        <span className="text-slate-400 ml-2">
                          {new Date(h.timestamp).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        {h.note && <p className="text-slate-500 mt-0.5">{h.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Action Workflow Buttons */}
              <div className="pt-4 border-t border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Order Actions
                </h4>
                <div className="flex flex-wrap items-center gap-3">
                  {['Order Placed', 'Order Accepted', 'Preparing Your Order'].includes(
                    selectedOrder.status
                  ) && (
                    <button
                      onClick={() => handleMarkDispatched(selectedOrder._id)}
                      disabled={isUpdatingStatus}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Mark as Dispatched</span>
                    </button>
                  )}

                  {selectedOrder.status === 'Out for Delivery' && (
                    <button
                      onClick={() => setOrderToDeliver(selectedOrder)}
                      disabled={isUpdatingStatus}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark as Delivered</span>
                    </button>
                  )}

                  {selectedOrder.status !== 'Delivered' && selectedOrder.status !== 'Cancelled' && (
                    <button
                      onClick={() => setIsCancelBoxOpen(!isCancelBoxOpen)}
                      className="py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>

                {/* Cancel Order reason box */}
                {isCancelBoxOpen && (
                  <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 mt-3 animate-in fade-in">
                    <p className="text-xs font-bold text-rose-800 mb-1">
                      Reason for cancellation:
                    </p>
                    <input
                      type="text"
                      placeholder="e.g. Out of stock, customer requested cancellation"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 mb-2"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsCancelBoxOpen(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200/60"
                      >
                        Nevermind
                      </button>
                      <button
                        onClick={() => handleCancelOrder(selectedOrder._id)}
                        disabled={isUpdatingStatus}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
                      >
                        Confirm Cancellation
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* COD Payment Confirmation Dialog */}
      {orderToDeliver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Banknote className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Confirm COD Payment Collection
                </h3>
                <p className="text-xs text-slate-500">
                  Order #{orderToDeliver.orderNumber} • Amount: ₹{orderToDeliver.totalAmount}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed mb-6">
              Was the Cash on Delivery (COD) amount of{' '}
              <strong className="text-slate-900">₹{orderToDeliver.totalAmount}</strong> actually collected from{' '}
              <strong>{orderToDeliver.deliveryAddress?.customerName || 'the customer'}</strong> upon delivery?
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleConfirmDelivery(orderToDeliver._id, true)}
                disabled={isUpdatingStatus}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Cash Collected (Mark as PAID & Delivered)</span>
              </button>

              <button
                type="button"
                onClick={() => handleConfirmDelivery(orderToDeliver._id, false)}
                disabled={isUpdatingStatus}
                className="w-full py-3 px-4 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Clock className="w-4 h-4" />
                <span>Cash Not Collected (Mark Delivered, Unpaid)</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderToDeliver(null)}
                disabled={isUpdatingStatus}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors mt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
