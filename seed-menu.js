/**
 * Firestore Menu Seed Script
 * Run with: node seed-menu.js
 *
 * This populates the `menuItems` collection so the menu page shows food.
 * Only run ONCE. Safe to re-run — it uses addDoc so it won't overwrite.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// ─── IMPORTANT ────────────────────────────────────────────────────────────────
// Download your service account key from:
// Firebase Console → Project Settings → Service Accounts → Generate new private key
// Save it as serviceAccountKey.json in this same folder (campus-canteen/)
// ──────────────────────────────────────────────────────────────────────────────
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const menuItems = [
  // ── BREAKFAST ───────────────────────────────────────────────────────────────
  {
    name: 'Masala Dosa',
    description: 'Crispy golden dosa stuffed with spiced potato and onion filling, served with coconut chutney and sambar.',
    price: 40,
    category: 'breakfast',
    available: true,
    preparationTime: 10,
    imageURL: '',
    tags: ['veg', 'popular', 'south-indian'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Idli Sambar (3 pcs)',
    description: 'Soft steamed rice cakes served with hot sambar and two chutneys. Light and healthy.',
    price: 30,
    category: 'breakfast',
    available: true,
    preparationTime: 5,
    imageURL: '',
    tags: ['veg', 'healthy', 'south-indian'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Poha',
    description: 'Flattened rice cooked with mustard seeds, onions, green chillies, turmeric and peanuts.',
    price: 25,
    category: 'breakfast',
    available: true,
    preparationTime: 5,
    imageURL: '',
    tags: ['veg', 'light'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Upma',
    description: 'Semolina cooked with vegetables and seasoned with mustard, curry leaves and coriander.',
    price: 25,
    category: 'breakfast',
    available: true,
    preparationTime: 8,
    imageURL: '',
    tags: ['veg'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },

  // ── LUNCH ───────────────────────────────────────────────────────────────────
  {
    name: 'Veg Biryani',
    description: 'Fragrant basmati rice cooked with mixed vegetables, whole spices and saffron. Served with raita.',
    price: 80,
    category: 'lunch',
    available: true,
    preparationTime: 15,
    imageURL: '',
    tags: ['veg', 'popular'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Chicken Biryani',
    description: 'Aromatic basmati rice slow-cooked with tender chicken pieces and dum spices. Served with raita.',
    price: 110,
    category: 'lunch',
    available: true,
    preparationTime: 20,
    imageURL: '',
    tags: ['non-veg', 'bestseller'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Paneer Butter Masala + Roti (2)',
    description: 'Creamy tomato-based gravy with soft paneer cubes, served with two freshly made rotis.',
    price: 90,
    category: 'lunch',
    available: true,
    preparationTime: 12,
    imageURL: '',
    tags: ['veg', 'popular'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Dal Rice + Sabzi',
    description: 'Comfort meal: yellow dal tadka, steamed rice and one seasonal vegetable side dish.',
    price: 60,
    category: 'lunch',
    available: true,
    preparationTime: 10,
    imageURL: '',
    tags: ['veg', 'budget-friendly'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Egg Rice',
    description: 'Scrambled eggs tossed with fried rice, spring onions and soy sauce.',
    price: 70,
    category: 'lunch',
    available: true,
    preparationTime: 10,
    imageURL: '',
    tags: ['egg', 'popular'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },

  // ── SNACKS ──────────────────────────────────────────────────────────────────
  {
    name: 'Samosa (2 pcs)',
    description: 'Crispy fried pastry filled with spiced potatoes and peas. Served with mint chutney.',
    price: 20,
    category: 'snacks',
    available: true,
    preparationTime: 5,
    imageURL: '',
    tags: ['veg', 'popular', 'fried'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Vada Pav',
    description: 'Mumbai-style street food — spiced potato patty in a soft bun with chutneys.',
    price: 20,
    category: 'snacks',
    available: true,
    preparationTime: 5,
    imageURL: '',
    tags: ['veg', 'street-food'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Bread Omelette',
    description: 'Two-egg omelette with vegetables sandwiched between buttered bread slices.',
    price: 35,
    category: 'snacks',
    available: true,
    preparationTime: 7,
    imageURL: '',
    tags: ['egg', 'filling'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Maggi Noodles',
    description: 'Classic 2-minute noodles cooked with vegetables and masala. Campus comfort food.',
    price: 30,
    category: 'snacks',
    available: true,
    preparationTime: 5,
    imageURL: '',
    tags: ['veg', 'comfort'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },

  // ── BEVERAGES ───────────────────────────────────────────────────────────────
  {
    name: 'Chai (Masala Tea)',
    description: 'Hot spiced milk tea with ginger, cardamom and elaichi. Classic campus fuel.',
    price: 10,
    category: 'beverages',
    available: true,
    preparationTime: 3,
    imageURL: '',
    tags: ['hot', 'popular', 'veg'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Cold Coffee',
    description: 'Chilled coffee blended with milk and ice cream. Perfect for hot days.',
    price: 45,
    category: 'beverages',
    available: true,
    preparationTime: 5,
    imageURL: '',
    tags: ['cold', 'popular'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Fresh Lime Soda',
    description: 'Freshly squeezed lime with chilled soda water. Sweet or salted.',
    price: 30,
    category: 'beverages',
    available: true,
    preparationTime: 3,
    imageURL: '',
    tags: ['cold', 'refreshing'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Lassi (Sweet)',
    description: 'Thick and creamy yoghurt drink blended with sugar and a hint of cardamom.',
    price: 35,
    category: 'beverages',
    available: true,
    preparationTime: 3,
    imageURL: '',
    tags: ['cold', 'veg'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },

  // ── DINNER ──────────────────────────────────────────────────────────────────
  {
    name: 'Roti Sabzi (2 rotis)',
    description: 'Two freshly made whole-wheat rotis with choice of seasonal vegetable curry.',
    price: 50,
    category: 'dinner',
    available: true,
    preparationTime: 10,
    imageURL: '',
    tags: ['veg', 'healthy'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Fried Rice',
    description: 'Wok-tossed rice with mixed vegetables, eggs and sauces. Available veg or egg.',
    price: 70,
    category: 'dinner',
    available: true,
    preparationTime: 12,
    imageURL: '',
    tags: ['popular'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },

  // ── SPECIALS ────────────────────────────────────────────────────────────────
  {
    name: "Chef's Special Thali",
    description: "Complete meal — 3 rotis, rice, dal, paneer curry, salad, papad and dessert. Today's special!",
    price: 120,
    category: 'specials',
    available: true,
    preparationTime: 15,
    imageURL: '',
    tags: ['veg', 'value', 'complete-meal'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Gulab Jamun (2 pcs)',
    description: 'Soft milk-solid dumplings soaked in rose-flavoured sugar syrup. Served warm.',
    price: 25,
    category: 'specials',
    available: true,
    preparationTime: 2,
    imageURL: '',
    tags: ['veg', 'dessert', 'sweet'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
];

async function seed() {
  console.log(`\n🌱 Seeding ${menuItems.length} menu items to Firestore...\n`);
  const col = db.collection('menuItems');
  for (const item of menuItems) {
    const ref = await col.add(item);
    console.log(`  ✅ Added: ${item.name}  (id: ${ref.id})`);
  }
  console.log(`\n🎉 Done! ${menuItems.length} items added to Firestore.\n`);
  console.log('📱 Refresh your app — the menu should now show all items!\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
