import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';

admin.initializeApp();

interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface OrderData {
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
}

interface PredictionResult {
  menuItemId: string;
  itemName: string;
  predictedQuantity: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

// AI Demand Prediction using Vertex AI Gemini 2.0
export const predictDemand = onCall(
  { region: 'us-central1', timeoutSeconds: 60 },
  async (request) => {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    // Role check — only admins
    const userDoc = await admin
      .firestore()
      .collection('users')
      .doc(request.auth.uid)
      .get();

    const userRole = userDoc.data()?.role;
    if (userRole !== 'canteen_admin') {
      throw new HttpsError('permission-denied', 'Only admins can generate predictions');
    }

    const orders: OrderData[] = (request.data as { orders: OrderData[] }).orders || [];

    // Aggregate order data by menu item
    const itemTotals: Record<string, { name: string; totalQty: number; days: Set<string> }> = {};

    orders.forEach((order) => {
      if (order.status === 'cancelled') return;

      let dateStr = new Date().toISOString().split('T')[0];
      if (order.createdAt?.seconds) {
        dateStr = new Date(order.createdAt.seconds * 1000).toISOString().split('T')[0];
      }

      order.items.forEach((item) => {
        if (!itemTotals[item.menuItemId]) {
          itemTotals[item.menuItemId] = {
            name: item.name,
            totalQty: 0,
            days: new Set(),
          };
        }
        itemTotals[item.menuItemId].totalQty += item.quantity;
        itemTotals[item.menuItemId].days.add(dateStr);
      });
    });

    // Build summary for Gemini prompt
    const summaryLines = Object.entries(itemTotals).map(([id, info]) => {
      const avgPerDay = (info.totalQty / Math.max(info.days.size, 1)).toFixed(1);
      return `- ${info.name} (id: ${id}): total ${info.totalQty} ordered over ${info.days.size} days, avg ${avgPerDay}/day`;
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayName = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });

    const prompt = `You are a food demand analyst for a college campus canteen serving 500+ students daily. Based on the past 7 days of order data, predict how many portions of each menu item to prepare for tomorrow (${dayName}, ${tomorrowStr}).

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

    try {
      const vertexAI = new VertexAI({
        project: 'campus-canteen-ordering-21c7a',
        location: 'us-central1',
      });

      const model = vertexAI.getGenerativeModel({
        model: 'gemini-2.0-flash-001',
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 2048,
          temperature: 0.3,
        },
      });

      const result = await model.generateContent(prompt);
      const rawText =
        result.response.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

      let predictions: PredictionResult[] = JSON.parse(rawText);

      if (!Array.isArray(predictions) || predictions.length === 0) {
        predictions = getIntelligentFallback(itemTotals, tomorrowStr);
      }

      logger.info(`Generated ${predictions.length} demand predictions`);
      return { date: tomorrowStr, predictions };
    } catch (error) {
      logger.error('Vertex AI prediction error:', error);
      return {
        date: tomorrowStr,
        predictions: getIntelligentFallback(itemTotals, tomorrowStr),
      };
    }
  }
);

// Clean up predictions older than 30 days
export const cleanupOldPredictions = onSchedule(
  {
    schedule: '0 0 * * *',
    timeZone: 'Asia/Kolkata',
    region: 'us-central1',
  },
  async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const snapshot = await admin
      .firestore()
      .collection('demandPredictions')
      .where('generatedAt', '<', thirtyDaysAgo)
      .get();

    if (snapshot.empty) return;

    const batch = admin.firestore().batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    logger.info(`Deleted ${snapshot.size} stale demand predictions`);
  }
);

function getIntelligentFallback(
  itemTotals: Record<string, { name: string; totalQty: number; days: Set<string> }>,
  date: string
): PredictionResult[] {
  const d = new Date(date + 'T00:00:00');
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
  const multiplier = isWeekend ? 0.7 : 1.0;

  if (Object.keys(itemTotals).length === 0) {
    // Default predictions for empty data
    return [
      { menuItemId: 'default_masala_dosa', itemName: 'Masala Dosa', predictedQuantity: 50, confidence: 'medium', reasoning: 'Standard campus breakfast staple. Prepare 50 as baseline.' },
      { menuItemId: 'default_veg_biryani', itemName: 'Veg Biryani', predictedQuantity: 40, confidence: 'medium', reasoning: 'Popular lunch option. Prepare 40 portions.' },
      { menuItemId: 'default_samosa', itemName: 'Samosa', predictedQuantity: 60, confidence: 'medium', reasoning: 'High snack demand 3-5 PM. Prepare 60 pieces.' },
      { menuItemId: 'default_chai', itemName: 'Chai', predictedQuantity: 100, confidence: 'high', reasoning: 'Tea demand peaks morning and evening. Prepare 100 cups.' },
      { menuItemId: 'default_cold_coffee', itemName: 'Cold Coffee', predictedQuantity: 30, confidence: 'low', reasoning: 'Weather-dependent. Prepare 30 as baseline, scale up if warm.' },
    ];
  }

  return Object.entries(itemTotals).map(([id, info]) => {
    const avgPerDay = info.totalQty / Math.max(info.days.size, 1);
    const predicted = Math.max(Math.round(avgPerDay * 1.1 * multiplier), 5);
    const confidence: 'high' | 'medium' | 'low' =
      info.days.size >= 5 ? 'high' : info.days.size >= 3 ? 'medium' : 'low';

    return {
      menuItemId: id,
      itemName: info.name,
      predictedQuantity: predicted,
      confidence,
      reasoning: `Based on ${info.days.size}-day history with avg ${avgPerDay.toFixed(1)} portions/day. Added 10% safety buffer.`,
    };
  });
}
