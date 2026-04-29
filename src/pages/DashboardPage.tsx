import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Order, OrderStatus } from '../types';

interface Stats {
  totalToday: number;
  revenueToday: number;
  pending: number;
  preparing: number;
  ready: number;
}

const statusColors: Record<OrderStatus, string> = {
  placed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-yellow-100 text-yellow-700',
  ready: 'bg-green-100 text-green-700',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

const DashboardPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalToday: 0,
    revenueToday: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        let q;
        if (userProfile?.role === 'student') {
          q = query(
            collection(db, 'orders'),
            where('userId', '==', userProfile.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
        } else {
          q = query(
            collection(db, 'orders'),
            where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
            orderBy('createdAt', 'desc'),
            limit(20)
          );
        }

        const snap = await getDocs(q);
        const orders = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate(),
          updatedAt: d.data().updatedAt?.toDate(),
        })) as Order[];

        setRecentOrders(orders.slice(0, 5));

        if (userProfile?.role !== 'student') {
          const todayOrders = orders.filter((o) => {
            const created = o.createdAt instanceof Date ? o.createdAt : new Date();
            return created >= startOfDay;
          });

          setStats({
            totalToday: todayOrders.length,
            revenueToday: todayOrders
              .filter((o) => o.status !== 'cancelled')
              .reduce((s, o) => s + o.totalAmount, 0),
            pending: todayOrders.filter((o) => o.status === 'placed').length,
            preparing: todayOrders.filter((o) => o.status === 'preparing').length,
            ready: todayOrders.filter((o) => o.status === 'ready').length,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {userProfile?.displayName?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Student Dashboard */}
      {userProfile?.role === 'student' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Link
              to="/menu"
              className="card hover:shadow-md transition-shadow flex items-center gap-4 cursor-pointer"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">
                🍽️
              </div>
              <div>
                <p className="font-semibold text-gray-900">Browse Menu</p>
                <p className="text-sm text-gray-500">See today's items</p>
              </div>
            </Link>
            <Link
              to="/orders"
              className="card hover:shadow-md transition-shadow flex items-center gap-4 cursor-pointer"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                📋
              </div>
              <div>
                <p className="font-semibold text-gray-900">My Orders</p>
                <p className="text-sm text-gray-500">Track your orders</p>
              </div>
            </Link>
            <Link
              to="/cart"
              className="card hover:shadow-md transition-shadow flex items-center gap-4 cursor-pointer"
            >
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
                🛒
              </div>
              <div>
                <p className="font-semibold text-gray-900">Your Cart</p>
                <p className="text-sm text-gray-500">Review &amp; checkout</p>
              </div>
            </Link>
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Recent Orders</h2>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">🍽️</p>
                <p className="text-gray-500">No orders yet. Start ordering!</p>
                <Link to="/menu" className="btn-primary inline-block mt-3 text-sm">
                  Browse Menu
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        Token #{order.tokenNumber}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`badge ${statusColors[order.status]} capitalize`}
                      >
                        {order.status}
                      </span>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        ₹{order.totalAmount}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Staff/Admin Dashboard */}
      {(userProfile?.role === 'canteen_staff' ||
        userProfile?.role === 'canteen_admin') && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: "Today's Orders",
                value: stats.totalToday,
                icon: '📋',
                color: 'bg-blue-50 text-blue-600',
              },
              {
                label: "Revenue Today",
                value: `₹${stats.revenueToday.toFixed(0)}`,
                icon: '💰',
                color: 'bg-green-50 text-green-600',
              },
              {
                label: 'Pending',
                value: stats.pending,
                icon: '⏳',
                color: 'bg-yellow-50 text-yellow-600',
              },
              {
                label: 'Preparing',
                value: stats.preparing,
                icon: '👨‍🍳',
                color: 'bg-orange-50 text-orange-600',
              },
            ].map((s) => (
              <div key={s.label} className="card">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                  <span className="text-xl">{s.icon}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Link
              to="/kitchen"
              className="card hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">
                👨‍🍳
              </div>
              <div>
                <p className="font-semibold">Kitchen Display</p>
                <p className="text-sm text-gray-500">Live order queue</p>
              </div>
            </Link>
            <Link
              to="/menu-manage"
              className="card hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                📝
              </div>
              <div>
                <p className="font-semibold">Manage Menu</p>
                <p className="text-sm text-gray-500">Add/edit items</p>
              </div>
            </Link>
            {userProfile?.role === 'canteen_admin' && (
              <Link
                to="/ai-predict"
                className="card hover:shadow-md transition-shadow flex items-center gap-4 border-2 border-orange-200"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-400 rounded-xl flex items-center justify-center text-2xl">
                  ✨
                </div>
                <div>
                  <p className="font-semibold">AI Demand Predict</p>
                  <p className="text-sm text-gray-500">Powered by Gemini</p>
                </div>
              </Link>
            )}
          </div>

          {/* Recent orders table */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Recent Orders</h2>
              <Link to="/kitchen" className="text-sm text-orange-500 hover:underline">
                View all →
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="text-center text-gray-500 py-6">No orders today yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-100">
                      <th className="pb-2 font-medium text-gray-500">Token</th>
                      <th className="pb-2 font-medium text-gray-500">Customer</th>
                      <th className="pb-2 font-medium text-gray-500">Items</th>
                      <th className="pb-2 font-medium text-gray-500">Amount</th>
                      <th className="pb-2 font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="py-2.5 font-semibold">#{order.tokenNumber}</td>
                        <td className="py-2.5 text-gray-700">{order.userName}</td>
                        <td className="py-2.5 text-gray-500">
                          {order.items.slice(0, 2).map((i) => i.name).join(', ')}
                          {order.items.length > 2 && ` +${order.items.length - 2}`}
                        </td>
                        <td className="py-2.5 font-medium">₹{order.totalAmount}</td>
                        <td className="py-2.5">
                          <span className={`badge ${statusColors[order.status]} capitalize`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
