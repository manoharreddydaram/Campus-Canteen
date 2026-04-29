import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Order } from '../types';

const OrderVerifyPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { userProfile } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError('No order ID provided');
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'orders', orderId));
        if (!snap.exists()) {
          setError('Order not found');
        } else {
          setOrder({
            id: snap.id,
            ...snap.data(),
            createdAt: snap.data().createdAt?.toDate(),
            updatedAt: snap.data().updatedAt?.toDate(),
          } as Order);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const markDelivered = async () => {
    if (!orderId) return;
    setMarking(true);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'delivered',
        updatedAt: serverTimestamp(),
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update order');
    } finally {
      setMarking(false);
    }
  };

  const isStaff =
    userProfile?.role === 'canteen_staff' ||
    userProfile?.role === 'canteen_admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">❌</p>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-6xl mb-4">🎉</p>
        <h2 className="text-xl font-bold text-green-700 mb-2">
          Order Delivered Successfully!
        </h2>
        <p className="text-gray-500">
          Token #{order?.tokenNumber} has been marked as delivered.
        </p>
      </div>
    );
  }

  if (!order) return null;

  const statusBg: Record<string, string> = {
    placed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-yellow-100 text-yellow-700',
    ready: 'bg-green-100 text-green-700',
    delivered: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-600',
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="card">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-3xl">🍽️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Order Verification</h1>
          <p className="text-sm text-gray-500">Campus Canteen Ordering System</p>
        </div>

        {/* Order Info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl font-black text-gray-900">
              #{order.tokenNumber}
            </span>
            <span
              className={`badge capitalize ${statusBg[order.status] || 'bg-gray-100'}`}
            >
              {order.status}
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <span className="text-gray-400">Customer:</span>{' '}
              <span className="font-medium text-gray-900">{order.userName}</span>
            </p>
            <p>
              <span className="text-gray-400">Placed:</span>{' '}
              {order.createdAt instanceof Date
                ? order.createdAt.toLocaleString('en-IN')
                : 'N/A'}
            </p>
            <p>
              <span className="text-gray-400">Payment:</span>{' '}
              <span className="font-medium">
                {(order as any).paymentMode === 'online'
                  ? '✅ Paid Online'
                  : '💵 Pay at Pickup'}
              </span>
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
            Items Ordered
          </h3>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={item.menuItemId}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <span className="text-sm text-gray-900">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  ₹{item.price * item.quantity}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
            <span className="font-bold text-gray-900">Total</span>
            <span className="font-bold text-lg text-orange-600">
              ₹{order.totalAmount}
            </span>
          </div>
        </div>

        {/* Action buttons (only for staff) */}
        {isStaff && order.status === 'ready' && (
          <button
            onClick={markDelivered}
            disabled={marking}
            className="btn-primary w-full py-3 text-base"
          >
            {marking ? 'Marking...' : '✅ Confirm Delivery'}
          </button>
        )}

        {isStaff && order.status === 'delivered' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center text-green-700 text-sm font-medium">
            ✅ This order has already been delivered
          </div>
        )}

        {!isStaff && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center text-blue-700 text-sm">
            Show this screen to the canteen staff to collect your order
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderVerifyPage;
