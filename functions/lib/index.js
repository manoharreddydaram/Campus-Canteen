"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldPredictions = exports.predictDemand = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
const vertexai_1 = require("@google-cloud/vertexai");
admin.initializeApp();
// AI Demand Prediction using Vertex AI Gemini 2.0
exports.predictDemand = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 60 }, async (request) => {
    var _a, _b, _c, _d, _e, _f;
    // Authentication check
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    // Role check — only admins
    const userDoc = await admin
        .firestore()
        .collection('users')
        .doc(request.auth.uid)
        .get();
    const userRole = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (userRole !== 'canteen_admin') {
        throw new https_1.HttpsError('permission-denied', 'Only admins can generate predictions');
    }
    const orders = request.data.orders || [];
    // Aggregate order data by menu item
    const itemTotals = {};
    orders.forEach((order) => {
        var _a;
        if (order.status === 'cancelled')
            return;
        let dateStr = new Date().toISOString().split('T')[0];
        if ((_a = order.createdAt) === null || _a === void 0 ? void 0 : _a.seconds) {
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
        const vertexAI = new vertexai_1.VertexAI({
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
        const rawText = ((_f = (_e = (_d = (_c = (_b = result.response.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text) || '[]';
        let predictions = JSON.parse(rawText);
        if (!Array.isArray(predictions) || predictions.length === 0) {
            predictions = getIntelligentFallback(itemTotals, tomorrowStr);
        }
        firebase_functions_1.logger.info(`Generated ${predictions.length} demand predictions`);
        return { date: tomorrowStr, predictions };
    }
    catch (error) {
        firebase_functions_1.logger.error('Vertex AI prediction error:', error);
        return {
            date: tomorrowStr,
            predictions: getIntelligentFallback(itemTotals, tomorrowStr),
        };
    }
});
// Clean up predictions older than 30 days
exports.cleanupOldPredictions = (0, scheduler_1.onSchedule)({
    schedule: '0 0 * * *',
    timeZone: 'Asia/Kolkata',
    region: 'us-central1',
}, async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const snapshot = await admin
        .firestore()
        .collection('demandPredictions')
        .where('generatedAt', '<', thirtyDaysAgo)
        .get();
    if (snapshot.empty)
        return;
    const batch = admin.firestore().batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    firebase_functions_1.logger.info(`Deleted ${snapshot.size} stale demand predictions`);
});
function getIntelligentFallback(itemTotals, date) {
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
        const confidence = info.days.size >= 5 ? 'high' : info.days.size >= 3 ? 'medium' : 'low';
        return {
            menuItemId: id,
            itemName: info.name,
            predictedQuantity: predicted,
            confidence,
            reasoning: `Based on ${info.days.size}-day history with avg ${avgPerDay.toFixed(1)} portions/day. Added 10% safety buffer.`,
        };
    });
}
//# sourceMappingURL=index.js.map