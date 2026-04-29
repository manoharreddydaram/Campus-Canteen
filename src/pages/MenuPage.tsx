import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem, MenuCategory } from '../types';
import { useCart } from '../contexts/CartContext';

const CATEGORIES: { key: MenuCategory | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '🍽️' },
  { key: 'breakfast', label: 'Breakfast', emoji: '🥞' },
  { key: 'lunch', label: 'Lunch', emoji: '🍛' },
  { key: 'snacks', label: 'Snacks', emoji: '🍟' },
  { key: 'beverages', label: 'Beverages', emoji: '☕' },
  { key: 'dinner', label: 'Dinner', emoji: '🍲' },
  { key: 'specials', label: 'Specials', emoji: '⭐' },
];

const MenuPage: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [filtered, setFiltered] = useState<MenuItem[]>([]);
  const [category, setCategory] = useState<MenuCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { addItem, items: cartItems, updateQuantity } = useCart();

  useEffect(() => {
    const q = query(
      collection(db, 'menuItems'),
      orderBy('category')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate(),
        updatedAt: d.data().updatedAt?.toDate(),
      })) as MenuItem[];
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    let result = items;
    if (category !== 'all') result = result.filter((i) => i.category === category);
    if (search.trim())
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.description.toLowerCase().includes(search.toLowerCase())
      );
    setFiltered(result);
  }, [items, category, search]);

  const getCartQty = (itemId: string) =>
    cartItems.find((i) => i.menuItemId === itemId)?.quantity || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Today's Menu</h1>
        <p className="text-gray-500 text-sm mt-1">
          Fresh food prepared in our campus kitchen
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          className="input max-w-md"
          placeholder="🔍 Search food items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              category === cat.key
                ? 'bg-orange-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">🍽️</p>
          <p className="text-gray-500 font-medium">No items found</p>
          <p className="text-gray-400 text-sm">
            Try a different category or search term
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item) => {
            const qty = getCartQty(item.id);
            const unavailable = !item.available;
            return (
              <div
                key={item.id}
                className={`card flex flex-col transition-shadow ${
                  unavailable ? 'opacity-60' : 'hover:shadow-md'
                }`}
              >
                {/* Image */}
                <div className="relative w-full h-40 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg mb-3 overflow-hidden">
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
                    <div className="w-full h-full flex items-center justify-center text-5xl">
                      🍽️
                    </div>
                  )}
                  {/* Unavailable overlay badge */}
                  {unavailable && (
                    <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center rounded-lg">
                      <span className="bg-white text-gray-800 text-xs font-bold px-3 py-1 rounded-full">
                        🚫 Unavailable Today
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <span className="text-orange-600 font-bold whitespace-nowrap">
                      ₹{item.price}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">
                      ⏱ {item.preparationTime} min
                    </span>
                    {item.tags?.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Add to Cart — hidden when unavailable */}
                <div className="mt-3">
                  {unavailable ? (
                    <div className="w-full text-center text-xs text-gray-400 py-2 bg-gray-50 rounded-lg">
                      Not available right now
                    </div>
                  ) : qty === 0 ? (
                    <button
                      onClick={() => addItem(item)}
                      className="btn-primary w-full text-sm py-2"
                    >
                      Add to Cart
                    </button>
                  ) : (
                    <div className="flex items-center justify-between bg-orange-50 rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item.id, qty - 1)}
                        className="w-8 h-8 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition-colors"
                      >
                        −
                      </button>
                      <span className="font-semibold text-orange-700">{qty}</span>
                      <button
                        onClick={() => addItem(item)}
                        className="w-8 h-8 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MenuPage;
