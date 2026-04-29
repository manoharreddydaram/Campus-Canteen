import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

// ─── Razorpay Test Key ─────────────────────────────────────────────────────────
// 1. Sign up free at razorpay.com
// 2. Go to Settings → API Keys → Generate Test Key
// 3. Paste the key_id (starts with rzp_test_...) below:
const RAZORPAY_KEY_ID: string = 'YOUR_RAZORPAY_TEST_KEY_ID';
// ──────────────────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    Razorpay: any;
  }
}

type PaymentMode = 'pay_at_pickup' | 'online';

const CartPage: React.FC = () => {
  const { items, removeItem, updateQuantity, clearCart, total } = useCart();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [instructions, setInstructions] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('online');
  const [noRazorpayKey] = useState(RAZORPAY_KEY_ID === 'YOUR_RAZORPAY_TEST_KEY_ID');

  // Generate a unique token from current time (no Firestore read needed)
  const getNextToken = (): number => {
    const now = new Date();
    const hhmm = now.getHours() * 100 + now.getMinutes();
    const suffix = Math.floor(Math.random() * 90) + 10;
    return hhmm * 100 + suffix;
  };

  // Save the order to Firestore after payment
  const saveOrder = async (paymentId?: string) => {
    const tokenNumber = getNextToken();
    await addDoc(collection(db, 'orders'), {
      userId: userProfile!.uid,
      userName: userProfile!.displayName,
      userEmail: userProfile!.email,
      items: items.map((i) => ({
        menuItemId: i.menuItemId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
      totalAmount: total,
      status: 'placed',
      tokenNumber,
      paymentMode,
      paymentId: paymentId || null,
      paymentStatus: paymentId ? 'paid' : 'pending',
      specialInstructions: instructions.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    clearCart();
    navigate('/orders');
  };

  const placeOrder = async () => {
    if (items.length === 0) return;
    setPlacing(true);
    setError('');

    try {
      // Pay at Pickup — save order directly
      if (paymentMode === 'pay_at_pickup') {
        await saveOrder();
        return;
      }

      // Online Payment via Razorpay
      if (noRazorpayKey) {
        // No key set — simulate a successful payment for demo
        await saveOrder('demo_payment_' + Date.now());
        return;
      }

      // Open Razorpay checkout modal
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: Math.round(total * 100), // Razorpay works in paise
        currency: 'INR',
        name: 'Campus Canteen',
        description: `Order — ${items.length} item${items.length > 1 ? 's' : ''}`,
        image: 'https://via.placeholder.com/60x60/f97316/ffffff?text=C',
        handler: async (response: { razorpay_payment_id: string }) => {
          // Payment successful — save order with payment ID
          await saveOrder(response.razorpay_payment_id);
        },
        prefill: {
          name: userProfile?.displayName || '',
          email: userProfile?.email || '',
        },
        theme: { color: '#f97316' },
        modal: {
          ondismiss: () => {
            setPlacing(false);
            setError('Payment cancelled. Your order was not placed.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setError('Payment failed: ' + response.error.description);
        setPlacing(false);
      });
      rzp.open();
      // Note: setPlacing(false) is NOT called here — Razorpay modal takes over
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-6xl mb-4">🛒</p>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Add some delicious items from our menu</p>
        <button onClick={() => navigate('/menu')} className="btn-primary">
          Browse Menu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Cart</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Items */}
      <div className="card mb-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.menuItemId}
            className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
              {item.imageURL ? (
                <img
                  src={item.imageURL}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                '🍽️'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{item.name}</p>
              <p className="text-sm text-orange-600 font-semibold">₹{item.price} each</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                className="w-7 h-7 bg-gray-100 rounded-lg font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                −
              </button>
              <span className="font-semibold w-6 text-center">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                className="w-7 h-7 bg-gray-100 rounded-lg font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                +
              </button>
            </div>
            <p className="font-bold text-gray-900 w-16 text-right">
              ₹{item.price * item.quantity}
            </p>
            <button
              onClick={() => removeItem(item.menuItemId)}
              className="text-red-400 hover:text-red-600 transition-colors text-lg"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Special Instructions */}
      <div className="card mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Special Instructions (optional)
        </label>
        <textarea
          className="input resize-none"
          rows={2}
          placeholder="E.g., less spicy, no onions..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>

      {/* ── Payment Method ─────────────────────────────────────────────── */}
      <div className="card mb-4">
        <p className="font-semibold text-gray-900 mb-3">Choose Payment Method</p>

        {noRazorpayKey && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3 text-xs text-blue-700">
            🔑 <strong>Demo mode:</strong> Razorpay key not set — online payment will be simulated.
            Get a free test key at{' '}
            <a
              href="https://razorpay.com"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              razorpay.com
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Online Payment */}
          <button
            onClick={() => setPaymentMode('online')}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              paymentMode === 'online'
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  paymentMode === 'online' ? 'border-orange-500' : 'border-gray-300'
                }`}
              >
                {paymentMode === 'online' && (
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                )}
              </div>
              <span className="font-semibold text-gray-900 text-sm">Pay Online</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Instant payment — no queue at counter
            </p>
            {/* Payment logos */}
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-bold">
                GPay
              </span>
              <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded font-bold">
                PhonePe
              </span>
              <span className="text-xs bg-gray-700 text-white px-2 py-0.5 rounded font-bold">
                UPI
              </span>
              <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded font-bold">
                Card
              </span>
            </div>
          </button>

          {/* Pay at Pickup */}
          <button
            onClick={() => setPaymentMode('pay_at_pickup')}
            className={`rounded-xl border-2 p-4 text-left transition-all ${
              paymentMode === 'pay_at_pickup'
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  paymentMode === 'pay_at_pickup' ? 'border-orange-500' : 'border-gray-300'
                }`}
              >
                {paymentMode === 'pay_at_pickup' && (
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                )}
              </div>
              <span className="font-semibold text-gray-900 text-sm">Pay at Pickup</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Pay cash or UPI at the counter when order is ready
            </p>
            <div className="flex items-center gap-1">
              <span className="text-lg">💵</span>
              <span className="text-xs text-gray-500">Cash accepted</span>
            </div>
          </button>
        </div>
      </div>

      {/* Order Summary */}
      <div className="card mb-4">
        <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Payment</span>
            <span
              className={
                paymentMode === 'online' ? 'text-green-600 font-medium' : 'text-gray-600'
              }
            >
              {paymentMode === 'online' ? '💳 Online' : '💵 Pay at Pickup'}
            </span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Place Order Button */}
      <button
        onClick={placeOrder}
        disabled={placing}
        className="btn-primary w-full text-base py-3 disabled:opacity-60"
      >
        {placing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {paymentMode === 'online' ? 'Opening Payment...' : 'Placing Order...'}
          </span>
        ) : paymentMode === 'online' ? (
          `Pay ₹${total.toFixed(2)} Online →`
        ) : (
          `Place Order — ₹${total.toFixed(2)}`
        )}
      </button>
      <p className="text-center text-xs text-gray-500 mt-2">
        {paymentMode === 'online'
          ? 'Secure payment via Razorpay · GPay · PhonePe · UPI'
          : 'Pay at the pickup counter when your order is ready'}
      </p>
    </div>
  );
};

export default CartPage;
