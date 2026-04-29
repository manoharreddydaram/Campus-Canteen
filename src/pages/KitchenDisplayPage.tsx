import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Order, OrderStatus } from '../types';

const ACTIVE_STATUSES: OrderStatus[] = ['placed', 'preparing', 'ready'];

const statusColors: Record<OrderStatus, string> = {
  placed: 'border-blue-400 bg-blue-50',
  preparing: 'border-yellow-400 bg-yellow-50',
  ready: 'border-green-400 bg-green-50',
  delivered: 'border-gray-200 bg-gray-50',
  cancelled: 'border-red-200 bg-red-50',
};

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

const nextLabel: Partial<Record<OrderStatus, string>> = {
  placed: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Mark Delivered',
};

const KitchenDisplayPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('status', 'in', ACTIVE_STATUSES),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate(),
        updatedAt: d.data().updatedAt?.toDate(),
      })) as Order[];
      setOrders(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setUpdating(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!window.confirm('Cancel this order?')) return;
    setUpdating(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  const filtered =
    filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const counts: Record<string, number> = {
    placed: orders.filter((o) => o.status === 'placed').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    ready: orders.filter((o) => o.status === 'ready').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kitchen Display</h1>
          <p className="text-gray-500 text-sm">Live order queue — updates in real time</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-green-600 font-medium">Live</span>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { status: 'placed' as OrderStatus, label: 'New Orders', emoji: '📋', color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { status: 'preparing' as OrderStatus, label: 'Preparing', emoji: '👨‍🍳', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { status: 'ready' as OrderStatus, label: 'Ready', emoji: '✅', color: 'bg-green-50 border-green-200 text-green-700' },
        ].map(({ status, label, emoji, color }) => (
          <button
            key={status}
            onClick={() => setFilter(filter === status ? 'all' : status)}
            className={`p-3 rounded-xl border-2 text-center transition-all ${color} ${
              filter === status ? 'scale-105 shadow-md' : 'opacity-80 hover:opacity-100'
            }`}
          >
            <p className="text-2xl">{emoji}</p>
            <p className="font-bold text-2xl">{counts[status]}</p>
            <p className="text-xs font-medium">{label}</p>
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">🎉</p>
          <p className="text-gray-500 font-medium">
            {filter === 'all'
              ? 'No active orders right now'
              : `No ${filter} orders`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((order) => (
            <div
              key={order.id}
              className={`rounded-xl border-2 p-4 ${statusColors[order.status]}`}
            >
              {/* Token + time + payment */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-2xl font-black text-gray-900">
                    #{order.tokenNumber}
                  </span>
                  <p className="text-xs text-gray-500">
                    {order.createdAt instanceof Date
                      ? order.createdAt.toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">{order.userName}</p>
                  <span
                    className={`badge capitalize ${
                      order.status === 'placed'
                        ? 'bg-blue-100 text-blue-700'
                        : order.status === 'preparing'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {order.status}
                  </span>
                  {/* Payment badge */}
                  <div className="mt-1">
                    {(order as any).paymentMode === 'online' ? (
                      <span className="badge bg-green-100 text-green-700 text-xs">
                        ✅ Paid Online
                      </span>
                    ) : (
                      <span className="badge bg-orange-100 text-orange-700 text-xs">
                        💵 Pay at Pickup
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-1 mb-3 border-t border-white/60 pt-3">
                {order.items.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700">{item.name}</span>
                    <span className="font-bold text-gray-900">× {item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Special instructions */}
              {order.specialInstructions && (
                <div className="bg-white/60 rounded-lg px-3 py-2 mb-3 text-xs text-gray-600">
                  📝 {order.specialInstructions}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                {nextStatus[order.status] && (
                  <button
                    onClick={() =>
                      updateStatus(order.id, nextStatus[order.status]!)
                    }
                    disabled={updating === order.id}
                    className="flex-1 btn-primary text-base py-3 sm:py-2 shadow-sm disabled:opacity-50"
                  >
                    {updating === order.id
                      ? '...'
                      : nextLabel[order.status]}
                  </button>
                )}
                {order.status === 'placed' && (
                  <button
                    onClick={() => cancelOrder(order.id)}
                    disabled={updating === order.id}
                    className="btn-danger text-base py-3 sm:py-2 px-4 shadow-sm"
                  >
                    ✕ Cancel
                  </button>
                )}
                {order.status === 'ready' && (
                  <button
                    onClick={() =>
                      updateStatus(order.id, 'delivered')
                    }
                    disabled={updating === order.id}
                    className="btn-secondary text-base py-3 sm:py-2 px-4 shadow-sm"
                  >
                    📱 Scan QR
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KitchenDisplayPage;
