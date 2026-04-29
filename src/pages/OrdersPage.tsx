import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Order, OrderStatus } from '../types';
import FeedbackModal from '../components/FeedbackModal';
import QRCode from 'react-qr-code';

const statusSteps: OrderStatus[] = ['placed', 'preparing', 'ready', 'delivered'];

const statusColors: Record<OrderStatus, string> = {
  placed: 'bg-blue-100 text-blue-700 border-blue-200',
  preparing: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  ready: 'bg-green-100 text-green-700 border-green-200',
  delivered: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-red-100 text-red-600 border-red-200',
};

const statusEmoji: Record<OrderStatus, string> = {
  placed: '📋',
  preparing: '👨‍🍳',
  ready: '✅',
  delivered: '🎉',
  cancelled: '❌',
};

const OrdersPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { addItem, clearCart } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackOrder, setFeedbackOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!userProfile) return;

    // Request notification permission if not already granted or denied
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userProfile.uid),
      orderBy('createdAt', 'desc')
    );
    
    let isFirstLoad = true;

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate(),
        updatedAt: d.data().updatedAt?.toDate(),
      })) as Order[];
      
      // Check for newly ready orders to trigger notification
      if (!isFirstLoad && 'Notification' in window && Notification.permission === 'granted') {
        const previousOrders = orders;
        data.forEach(newOrder => {
          const oldOrder = previousOrders.find(o => o.id === newOrder.id);
          if (oldOrder && oldOrder.status !== 'ready' && newOrder.status === 'ready') {
            new Notification('Order Ready! 🎉', {
              body: `Your order #${newOrder.tokenNumber} is ready for pickup!`,
              icon: '/favicon.ico'
            });
          }
        });
      }
      
      setOrders(data);
      setLoading(false);
      isFirstLoad = false;
    });
    return unsub;
  }, [userProfile, orders]);

  const reorder = (order: Order) => {
    clearCart();
    // We need menu items — just add order items to cart as-is
    order.items.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        addItem({
          id: item.menuItemId,
          name: item.name,
          price: item.price,
          description: '',
          category: 'lunch',
          imageURL: '',
          available: true,
          preparationTime: 10,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">📋</p>
          <p className="text-gray-500 font-medium">No orders yet</p>
          <button
            onClick={() => navigate('/menu')}
            className="btn-primary mt-4"
          >
            Start Ordering
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{statusEmoji[order.status]}</span>
                    <span className="font-bold text-gray-900">
                      Token #{order.tokenNumber}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {order.createdAt instanceof Date
                      ? order.createdAt.toLocaleString('en-IN')
                      : 'Just now'}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`badge border ${statusColors[order.status]} capitalize`}
                  >
                    {order.status}
                  </span>
                  <p className="font-bold text-gray-900 mt-1">₹{order.totalAmount}</p>
                </div>
              </div>

              {/* QR Code & Wait time info for active orders */}
              {(order.status === 'placed' || order.status === 'preparing' || order.status === 'ready') && (
                <div className="flex items-center gap-4 bg-orange-50/50 rounded-lg p-3 mb-4 border border-orange-100">
                  <div className="bg-white p-1 rounded shadow-sm border border-orange-200">
                    <QRCode value={`${window.location.origin}/verify/${order.id}`} size={64} />
                  </div>
                  <div>
                    {order.status === 'ready' ? (
                      <p className="text-sm font-semibold text-green-600 animate-pulse">
                        Show this QR code at the counter!
                      </p>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-900">Estimated wait: ~15 mins</p>
                        <p className="text-xs text-gray-500">We'll notify you when it's ready.</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Progress bar (active orders) */}
              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <div className="flex items-center gap-1 mb-3">
                  {statusSteps.map((step, i) => {
                    const current = statusSteps.indexOf(order.status);
                    return (
                      <React.Fragment key={step}>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            i <= current
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {i < current ? '✓' : i + 1}
                        </div>
                        {i < statusSteps.length - 1 && (
                          <div
                            className={`flex-1 h-1 rounded ${
                              i < current ? 'bg-orange-500' : 'bg-gray-100'
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* Items */}
              <div className="text-sm text-gray-600 mb-3">
                {order.items.map((item) => (
                  <span key={item.menuItemId} className="mr-3">
                    {item.name} × {item.quantity}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => reorder(order)}
                  className="btn-secondary text-sm py-1.5 px-3"
                >
                  🔄 Reorder
                </button>
                {order.status === 'delivered' && (
                  <button
                    onClick={() => setFeedbackOrder(order)}
                    className="btn-primary text-sm py-1.5 px-3"
                  >
                    ⭐ Rate Order
                  </button>
                )}
                {order.status === 'ready' && (
                  <span className="text-sm text-green-600 font-medium animate-pulse">
                    🔔 Your order is ready for pickup!
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackOrder && (
        <FeedbackModal
          order={feedbackOrder}
          onClose={() => setFeedbackOrder(null)}
        />
      )}
    </div>
  );
};

export default OrdersPage;
