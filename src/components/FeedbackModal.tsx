import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Order } from '../types';

interface Props {
  order: Order;
  onClose: () => void;
}

const FeedbackModal: React.FC<Props> = ({ order, onClose }) => {
  const { userProfile } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await addDoc(collection(db, 'feedback'), {
        orderId: order.id,
        userId: userProfile!.uid,
        userName: userProfile!.displayName,
        rating,
        comment: comment.trim(),
        menuItemIds: order.items.map((i) => i.menuItemId),
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        {submitted ? (
          <div className="text-center py-4">
            <p className="text-5xl mb-3">🎉</p>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Thank you for your feedback!
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Your review helps us improve our service.
            </p>
            <button onClick={onClose} className="btn-primary">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Rate Your Order</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-1">Order #{order.tokenNumber}</p>
            <p className="text-sm text-gray-700 mb-4">
              {order.items.map((i) => i.name).join(', ')}
            </p>

            {/* Stars */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  className="text-4xl transition-transform hover:scale-110"
                >
                  {star <= (hover || rating) ? '⭐' : '☆'}
                </button>
              ))}
            </div>

            {rating > 0 && (
              <p className="text-center text-sm text-orange-500 font-medium mb-4">
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'][rating]}
              </p>
            )}

            {/* Comment */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comment (optional)
              </label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Tell us about your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm mb-3">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
