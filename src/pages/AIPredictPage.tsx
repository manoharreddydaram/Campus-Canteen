import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { DemandPrediction, Order } from '../types';

// ─── Gemini API key ────────────────────────────────────────────────────────────
// Get your FREE key at: https://aistudio.google.com → Get API Key
// Paste it below between the quotes:
const GEMINI_API_KEY: string = 'AIzaSyB1N4jVKBGVxnS_L9JCs4rLl7EVuvJIM2o';
// ──────────────────────────────────────────────────────────────────────────────

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// ── Types ─────────────────────────────────────────────────────────────────────
interface PredictionResult {
  menuItemId: string;
  itemName: string;
  predictedQuantity: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

// ── Intelligent local fallback (used if AI call fails) ───────────────────────
function buildFallbackPredictions(
  itemTotals: Record<string, { name: string; totalQty: number; dayCount: number }>
): PredictionResult[] {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isWeekend = tomorrow.getDay() === 0 || tomorrow.getDay() === 6;
  const multiplier = isWeekend ? 0.7 : 1.0;

  if (Object.keys(itemTotals).length === 0) {
    return [
      { menuItemId: 'est_masala_dosa', itemName: 'Masala Dosa', predictedQuantity: 50, confidence: 'medium', reasoning: 'Standard campus breakfast staple. Prepare 50 as baseline.' },
      { menuItemId: 'est_veg_biryani', itemName: 'Veg Biryani', predictedQuantity: 40, confidence: 'medium', reasoning: 'Popular lunch option. Prepare 40 portions.' },
      { menuItemId: 'est_samosa', itemName: 'Samosa', predictedQuantity: 60, confidence: 'medium', reasoning: 'High snack demand 3–5 PM. Prepare 60 pieces.' },
      { menuItemId: 'est_chai', itemName: 'Chai', predictedQuantity: 100, confidence: 'high', reasoning: 'Tea demand peaks morning and evening. Prepare 100 cups.' },
      { menuItemId: 'est_cold_coffee', itemName: 'Cold Coffee', predictedQuantity: 30, confidence: 'low', reasoning: 'Weather-dependent. Prepare 30 as base, scale up if warm.' },
    ];
  }

  return Object.entries(itemTotals).map(([id, info]) => {
    const avgPerDay = info.totalQty / Math.max(info.dayCount, 1);
    const predicted = Math.max(Math.round(avgPerDay * 1.1 * multiplier), 5);
    const confidence: 'high' | 'medium' | 'low' =
      info.dayCount >= 5 ? 'high' : info.dayCount >= 3 ? 'medium' : 'low';
    return {
      menuItemId: id,
      itemName: info.name,
      predictedQuantity: predicted,
      confidence,
      reasoning: `Based on ${info.dayCount}-day history with avg ${avgPerDay.toFixed(1)} portions/day. Added 10% safety buffer${isWeekend ? ' (weekend −30%)' : ''}.`,
    };
  });
}

// ── Main component ────────────────────────────────────────────────────────────
const AIPredictPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [predictions, setPredictions] = useState<DemandPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastPrediction, setLastPrediction] = useState<DemandPrediction | null>(null);
  const [noKeyWarning, setNoKeyWarning] = useState(false);

  useEffect(() => {
    setNoKeyWarning(GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE');

    const fetchPredictions = async () => {
      try {
        const q = query(
          collection(db, 'demandPredictions'),
          orderBy('generatedAt', 'desc'),
          limit(5)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          generatedAt: d.data().generatedAt?.toDate(),
        })) as DemandPrediction[];
        setPredictions(data);
        if (data.length > 0) setLastPrediction(data[0]);
      } catch (err) {
        console.error('Failed to load past predictions:', err);
      }
    };
    fetchPredictions();
  }, []);

  const generatePrediction = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch last 7 days of orders for context
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const ordersSnap = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', Timestamp.fromDate(since)),
          orderBy('createdAt', 'desc')
        )
      );
      const orders = ordersSnap.docs.map((d) => d.data()) as Order[];

      // Aggregate order data by menu item
      const itemTotals: Record<string, { name: string; totalQty: number; dayCount: number; days: Set<string> }> = {};
      orders.forEach((order) => {
        if (order.status === 'cancelled') return;
        let dateStr = new Date().toISOString().split('T')[0];
        if ((order.createdAt as any)?.seconds) {
          dateStr = new Date((order.createdAt as any).seconds * 1000).toISOString().split('T')[0];
        }
        order.items.forEach((item) => {
          if (!itemTotals[item.menuItemId]) {
            itemTotals[item.menuItemId] = { name: item.name, totalQty: 0, dayCount: 0, days: new Set() };
          }
          itemTotals[item.menuItemId].totalQty += item.quantity;
          itemTotals[item.menuItemId].days.add(dateStr);
        });
      });
      // Convert Set size to number
      Object.values(itemTotals).forEach((v) => { (v as any).dayCount = v.days.size; });

      // Build summary for Gemini prompt
      const summaryLines = Object.entries(itemTotals).map(([id, info]) => {
        const avg = (info.totalQty / Math.max(info.days.size, 1)).toFixed(1);
        return `- ${info.name} (id: ${id}): total ${info.totalQty} ordered over ${info.days.size} days, avg ${avg}/day`;
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const dayName = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });

      const prompt = `You are a food demand analyst for a college campus canteen serving 500+ students daily.
Based on the past 7 days of order data, predict how many portions of each menu item to prepare for tomorrow (${dayName}, ${tomorrowStr}).

Order history summary:
${summaryLines.join('\n') || 'No historical data — use typical Indian college canteen estimates.'}

Instructions:
- Predict realistic quantities for a college canteen
- Account for day-of-week patterns (weekends ~30% lower)
- Add ~10% buffer to avoid stockouts
- Be specific in reasoning

Respond ONLY with a valid JSON array. No markdown code blocks, no extra text:
[
  {
    "menuItemId": "exact_id_from_data",
    "itemName": "Item Name",
    "predictedQuantity": 45,
    "confidence": "high",
    "reasoning": "1-2 sentence explanation with specific numbers."
  }
]`;

      let finalPredictions: PredictionResult[];

      // If no API key, use fallback immediately
      if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        finalPredictions = buildFallbackPredictions(
          Object.fromEntries(
            Object.entries(itemTotals).map(([k, v]) => [k, { ...v, dayCount: v.days.size }])
          )
        );
        setError('⚠️ No Gemini API key set — showing intelligent estimate based on order history. Get a free key at aistudio.google.com');
      } else {
        // Call Gemini REST API directly from the browser
        try {
          const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                maxOutputTokens: 2048,
                temperature: 0.3,
              },
            }),
          });

          if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
          }

          const geminiData = await response.json();
          const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
          // Strip markdown code fences if present
          const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed: PredictionResult[] = JSON.parse(cleaned);
          finalPredictions = Array.isArray(parsed) && parsed.length > 0
            ? parsed
            : buildFallbackPredictions(
              Object.fromEntries(
                Object.entries(itemTotals).map(([k, v]) => [k, { ...v, dayCount: v.days.size }])
              )
            );
        } catch (aiErr) {
          console.error('Gemini API call failed, using fallback:', aiErr);
          finalPredictions = buildFallbackPredictions(
            Object.fromEntries(
              Object.entries(itemTotals).map(([k, v]) => [k, { ...v, dayCount: v.days.size }])
            )
          );
          setError('⚠️ Gemini API call failed — showing intelligent estimate based on order history.');
        }
      }

      // Save prediction to Firestore
      const docRef = await addDoc(collection(db, 'demandPredictions'), {
        date: tomorrowStr,
        predictions: finalPredictions,
        generatedAt: serverTimestamp(),
        generatedBy: userProfile!.uid,
      });

      const newPred: DemandPrediction = {
        id: docRef.id,
        date: tomorrowStr,
        predictions: finalPredictions,
        generatedAt: new Date(),
        generatedBy: userProfile!.uid,
      };

      setLastPrediction(newPred);
      setPredictions((prev) => [newPred, ...prev.slice(0, 4)]);
    } catch (err: any) {
      setError(err.message || 'Failed to generate prediction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const confidenceColor = {
    high: 'text-green-600 bg-green-50 border-green-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    low: 'text-red-500 bg-red-50 border-red-200',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-400 rounded-xl flex items-center justify-center text-2xl">
            ✨
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Demand Prediction</h1>
            <p className="text-sm text-gray-500">Powered by Google Gemini</p>
          </div>
        </div>
        <p className="text-gray-600 text-sm">
          Gemini analyses past order patterns and predicts how many of each menu item to prepare
          tomorrow — reducing waste and avoiding stockouts.
        </p>
      </div>

      {/* API Key warning banner */}
      {noKeyWarning && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3">
          <span className="text-2xl">🔑</span>
          <div>
            <p className="font-semibold text-blue-800 text-sm">Set your free Gemini API key to enable live AI predictions</p>
            <p className="text-blue-600 text-xs mt-1">
              1. Go to{' '}
              <a
                href="https://aistudio.google.com"
                target="_blank"
                rel="noreferrer"
                className="underline font-medium"
              >
                aistudio.google.com
              </a>{' '}
              → Get API Key (free, no billing needed)
              <br />
              2. Open <code className="bg-blue-100 px-1 rounded">src/pages/AIPredictPage.tsx</code>
              <br />
              3. Replace <code className="bg-blue-100 px-1 rounded">YOUR_GEMINI_API_KEY_HERE</code> with your key
              <br />
              4. Run <code className="bg-blue-100 px-1 rounded">npm run build && firebase deploy --only hosting</code>
            </p>
          </div>
        </div>
      )}

      {/* Generate button */}
      <div className="card mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">Generate Tomorrow's Forecast</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Analyses last 7 days of order data using Gemini 2.0 Flash
            </p>
          </div>
          <button
            onClick={generatePrediction}
            disabled={loading}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analysing...
              </>
            ) : (
              <>✨ Predict Now</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Current Prediction */}
      {lastPrediction && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900">
                Prediction for{' '}
                {new Date(lastPrediction.date + 'T00:00:00').toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Generated{' '}
                {lastPrediction.generatedAt instanceof Date
                  ? lastPrediction.generatedAt.toLocaleString('en-IN')
                  : 'just now'}
              </p>
            </div>
            <span className="badge bg-purple-100 text-purple-700">✨ AI Generated</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lastPrediction.predictions.map((pred) => (
              <div
                key={pred.menuItemId}
                className="p-4 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-gray-900">{pred.itemName}</p>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-2xl font-black text-orange-600">{pred.predictedQuantity}</p>
                    <p className="text-xs text-gray-400">portions</p>
                  </div>
                </div>
                <span
                  className={`badge border text-xs ${confidenceColor[pred.confidence]
                    } capitalize mb-2`}
                >
                  {pred.confidence} confidence
                </span>
                <p className="text-xs text-gray-500 mt-2">{pred.reasoning}</p>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 p-3 bg-orange-50 rounded-xl border border-orange-200">
            <p className="text-sm font-semibold text-orange-800 mb-1">📊 Preparation Summary</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {lastPrediction.predictions.map((pred) => (
                <div key={pred.menuItemId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate">{pred.itemName}</span>
                  <span className="font-bold text-orange-600 ml-2">{pred.predictedQuantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {predictions.length > 1 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Prediction History</h2>
          <div className="space-y-2">
            {predictions.slice(1).map((pred) => (
              <div
                key={pred.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
              >
                <span className="text-gray-700">
                  {new Date(pred.date + 'T00:00:00').toLocaleDateString('en-IN', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="text-gray-500">{pred.predictions.length} items predicted</span>
                <span className="text-xs text-gray-400">
                  {pred.generatedAt instanceof Date ? pred.generatedAt.toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="card mt-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
        <h2 className="font-semibold text-gray-900 mb-3">How the AI Works</h2>
        <div className="space-y-3">
          {[
            {
              step: '1',
              title: 'Data Collection',
              desc: 'Collects last 7 days of order data from Firestore — items ordered, quantities, times.',
            },
            {
              step: '2',
              title: 'Gemini Analysis',
              desc: 'Google Gemini 2.0 Flash analyses patterns: popular items, peak hours, weekly trends, seasonal variations.',
            },
            {
              step: '3',
              title: 'Prediction Generation',
              desc: "Returns item-level quantity predictions with confidence scores and human-readable reasoning for tomorrow's preparation.",
            },
            {
              step: '4',
              title: 'Waste Reduction',
              desc: 'Staff prepare exactly what is needed — no over-stocking (waste) or under-stocking (lost revenue).',
            },
          ].map((s) => (
            <div key={s.step} className="flex gap-3">
              <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {s.step}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIPredictPage;
