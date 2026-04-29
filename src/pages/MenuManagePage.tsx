import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem, MenuCategory } from '../types';

const CATEGORIES: MenuCategory[] = [
  'breakfast',
  'lunch',
  'snacks',
  'beverages',
  'dinner',
  'specials',
];

const emptyForm = {
  name: '',
  description: '',
  price: '',
  category: 'lunch' as MenuCategory,
  imageURL: '',
  available: true,
  preparationTime: '10',
  tags: '',
};

const MenuManagePage: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'menuItems'), orderBy('category'));
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

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError('');
  };

  const openEdit = (item: MenuItem) => {
    setForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      category: item.category,
      imageURL: item.imageURL || '',
      available: item.available,
      preparationTime: String(item.preparationTime),
      tags: item.tags?.join(', ') || '',
    });
    setEditingId(item.id);
    setShowForm(true);
    setError('');
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) {
      setError('Name and price are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        category: form.category,
        imageURL: form.imageURL.trim(),
        available: form.available,
        preparationTime: parseInt(form.preparationTime, 10) || 10,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'menuItems', editingId), data);
      } else {
        await addDoc(collection(db, 'menuItems'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailable = async (item: MenuItem) => {
    await updateDoc(doc(db, 'menuItems', item.id), {
      available: !item.available,
      updatedAt: serverTimestamp(),
    });
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm('Delete this item?')) return;
    await deleteDoc(doc(db, 'menuItems', id));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Menu</h1>
          <p className="text-gray-500 text-sm">{items.length} items total</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          + Add Item
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                {editingId ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Masala Dosa"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="Brief description..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    className="input"
                    placeholder="0.00"
                    min="0"
                    step="0.5"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prep Time (min)
                  </label>
                  <input
                    type="number"
                    className="input"
                    placeholder="10"
                    min="1"
                    value={form.preparationTime}
                    onChange={(e) =>
                      setForm({ ...form, preparationTime: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  className="input"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as MenuCategory })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://..."
                  value={form.imageURL}
                  onChange={(e) => setForm({ ...form, imageURL: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="veg, spicy, popular"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="available"
                  checked={form.available}
                  onChange={(e) =>
                    setForm({ ...form, available: e.target.checked })
                  }
                  className="w-4 h-4 accent-orange-500"
                />
                <label htmlFor="available" className="text-sm font-medium text-gray-700">
                  Available for ordering
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving ? 'Saving...' : editingId ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">🍽️</p>
          <p className="text-gray-500">No menu items yet. Add your first item!</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                    Item
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                    Category
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                    Price
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {item.imageURL ? (
                            <img
                              src={item.imageURL}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  'none';
                              }}
                            />
                          ) : (
                            <span className="text-xl">🍽️</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-400 truncate max-w-xs">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-gray-100 text-gray-600 capitalize">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      ₹{item.price}
                    </td>
                    <td className="px-4 py-3">
                      {/* Toggle switch */}
                      <button
                        onClick={() => toggleAvailable(item)}
                        title={item.available ? 'Click to mark Unavailable' : 'Click to mark Available'}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
                          item.available ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                            item.available ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <p className={`text-xs mt-1 font-medium ${
                        item.available ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {item.available ? 'Available' : 'Unavailable'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-sm text-red-500 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagePage;
