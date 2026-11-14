import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Eye,
  Calendar,
  ShoppingBag,
  MapPin,
  X,
  Phone,
} from 'lucide-react';
import { api } from '../api/client';
import { ICustomer, IOrder } from '../types';

interface CustomersViewProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenOrderFromCustomer?: (orderId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  showToast,
  onOpenOrderFromCustomer,
}) => {
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Customer Details Modal
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<{
    customer: ICustomer & { addresses: any[] };
    orders: IOrder[];
  } | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      let url = `/admin/customers?limit=100`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await api.get<{ success: boolean; customers: ICustomer[] }>(url);
      if (res.success) {
        setCustomers(res.customers);
      }
    } catch (err: any) {
      showToast('Failed to load customers', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const handleOpenCustomerDetail = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setIsLoadingDetail(true);
    try {
      const res = await api.get<{
        success: boolean;
        customer: ICustomer & { addresses: any[] };
        orders: IOrder[];
      }>(`/admin/customers/${customerId}`);
      if (res.success) {
        setCustomerDetail(res);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch customer profile', 'error');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
            Registered Customers
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Total of {customers.length} customer(s) registered in Anand Rural Hub
          </p>
        </div>

        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4">Registered On</th>
                <th className="py-3 px-4">Total Orders</th>
                <th className="py-3 px-4">Delivered Spend</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Loading customer directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 text-slate-300 stroke-[1.5] mx-auto mb-2" />
                    <p className="font-semibold text-sm">No customers found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Customers who register on the mobile app will be listed here.
                    </p>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {c.name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-snug">
                            {c.name || 'QuickMart Customer'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {c.defaultAddress?.villageTown
                              ? `${c.defaultAddress.villageTown}`
                              : 'No saved address'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700">
                      +91 {c.mobile}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        <ShoppingBag className="w-3 h-3 text-slate-500" />
                        <span>{c.totalOrders} order(s)</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      ₹{c.totalSpent.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenCustomerDetail(c._id)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Profile & Orders</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 my-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-extrabold text-base flex items-center justify-center shrink-0">
                  {customerDetail?.customer?.name?.charAt(0) || 'C'}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    {customerDetail?.customer?.name || 'Customer Profile'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>+91 {customerDetail?.customer?.mobile}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedCustomerId(null);
                  setCustomerDetail(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingDetail || !customerDetail ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Loading customer details & order history...
              </div>
            ) : (
              <div className="mt-5 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                {/* Metrics Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Total Orders
                    </p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {customerDetail.customer.totalOrders}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Total Spent (Delivered)
                    </p>
                    <p className="text-lg font-black text-emerald-800 mt-0.5">
                      ₹{customerDetail.customer.totalSpent.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Member Since
                    </p>
                    <p className="text-xs font-bold text-slate-700 mt-1">
                      {new Date(customerDetail.customer.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Saved Delivery Addresses */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Saved Addresses ({customerDetail.customer.addresses?.length || 0})
                  </h4>
                  {customerDetail.customer.addresses?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No saved delivery addresses</p>
                  ) : (
                    <div className="space-y-2">
                      {customerDetail.customer.addresses.map((addr, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2 text-xs text-slate-700"
                        >
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800">
                              {addr.houseNumber}, {addr.streetArea}, {addr.villageTown}
                            </p>
                            {addr.landmark && (
                              <p className="text-slate-400 mt-0.5">Landmark: {addr.landmark}</p>
                            )}
                          </div>
                          {addr.isDefault && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Default
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Customer Order History */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Order History ({customerDetail.orders?.length || 0})
                  </h4>
                  {customerDetail.orders?.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No orders placed by this customer yet.
                    </div>
                  ) : (
                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100">
                      {customerDetail.orders.map((o) => (
                        <div key={o._id} className="p-3.5 flex items-center justify-between gap-3 text-sm">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-slate-900">
                                #{o.orderNumber}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  o.status === 'Delivered'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : o.status === 'Out for Delivery'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : o.status === 'Cancelled'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {o.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(o.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}{' '}
                              • {o.items?.length || 0} item(s)
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-extrabold text-slate-900">₹{o.totalAmount}</p>
                            <p className="text-[10px] font-bold text-emerald-700">COD</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
