import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Order, Feedback } from '../types';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#eab308'];

const ReportsPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 14 | 30>(7);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - range);

      const [ordersSnap, feedbackSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, 'orders'),
            where('createdAt', '>=', Timestamp.fromDate(since)),
            orderBy('createdAt', 'desc')
          )
        ),
        getDocs(
          query(
            collection(db, 'feedback'),
            where('createdAt', '>=', Timestamp.fromDate(since)),
            orderBy('createdAt', 'desc')
          )
        ),
      ]);

      setOrders(
        ordersSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate(),
        })) as Order[]
      );
      setFeedbacks(
        feedbackSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate(),
        })) as Feedback[]
      );
      setLoading(false);
    };
    fetchData();
  }, [range]);

  // Process orders by day
  const dailyData = (() => {
    const map: Record<string, { date: string; orders: number; revenue: number }> = {};
    const since = new Date();
    since.setDate(since.getDate() - range);
    for (let i = 0; i < range; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      map[key] = { date: key, orders: 0, revenue: 0 };
    }
    orders
      .filter((o) => o.status !== 'cancelled')
      .forEach((o) => {
        const d = o.createdAt instanceof Date ? o.createdAt : new Date();
        const key = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        if (map[key]) {
          map[key].orders++;
          map[key].revenue += o.totalAmount;
        }
      });
    return Object.values(map);
  })();

  // Popular items
  const itemCounts: Record<string, number> = {};
  orders
    .filter((o) => o.status !== 'cancelled')
    .forEach((o) =>
      o.items.forEach((i) => {
        itemCounts[i.name] = (itemCounts[i.name] || 0) + i.quantity;
      })
    );
  const topItems = Object.entries(itemCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  // Avg rating
  const avgRating =
    feedbacks.length > 0
      ? feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length
      : 0;

  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <div className="flex gap-2">
          {([7, 14, 30] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                range === r
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Orders', value: orders.length, icon: '📋' },
              { label: 'Revenue', value: `₹${totalRevenue.toFixed(0)}`, icon: '💰' },
              { label: 'Avg Rating', value: `${avgRating.toFixed(1)} ⭐`, icon: '⭐' },
              { label: 'Feedbacks', value: feedbacks.length, icon: '💬' },
            ].map((s) => (
              <div key={s.label} className="card text-center">
                <p className="text-2xl mb-1">{s.icon}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Daily Orders & Revenue */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Daily Orders</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    interval={range === 30 ? 4 : 0}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#f97316" radius={4} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Popular Items */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">
                Popular Items (by quantity)
              </h2>
              {topItems.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={topItems}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      nameKey="name"
                    >
                      {topItems.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      formatter={(value) =>
                        value.length > 15 ? value.slice(0, 15) + '…' : value
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Revenue chart */}
          <div className="card mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Daily Revenue (₹)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  interval={range === 30 ? 4 : 0}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₹${v}`} />
                <Bar dataKey="revenue" fill="#22c55e" radius={4} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Feedback */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Recent Feedback</h2>
            {feedbacks.length === 0 ? (
              <p className="text-center text-gray-400 py-6">No feedback yet</p>
            ) : (
              <div className="space-y-3">
                {feedbacks.slice(0, 5).map((fb) => (
                  <div
                    key={fb.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-sm font-bold text-orange-600 flex-shrink-0">
                      {fb.userName?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {fb.userName}
                        </p>
                        <span className="text-yellow-500">
                          {'⭐'.repeat(fb.rating)}
                        </span>
                      </div>
                      {fb.comment && (
                        <p className="text-sm text-gray-600 mt-0.5">{fb.comment}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
