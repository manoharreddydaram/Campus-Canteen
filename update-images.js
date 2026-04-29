/**
 * Update existing menu items with real food images
 * Run with: node update-images.js
 *
 * This updates the imageURL field for all items in the menuItems collection
 * using high-quality Unsplash images.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Map of item names → real food image URLs (Unsplash — free, no attribution needed for hotlinking)
const imageMap = {
  'Masala Dosa': 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&h=300&fit=crop',
  'Idli Sambar (3 pcs)': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=300&fit=crop',
  'Idli Sambar': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=300&fit=crop',
  'Poha': 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400&h=300&fit=crop',
  'Upma': 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&h=300&fit=crop',
  'Veg Biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop',
  'Chicken Biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop',
  'Paneer Butter Masala + Roti (2)': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop',
  'Paneer Butter Masala + Roti': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop',
  'Dal Rice + Sabzi': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop',
  'Dal Rice': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop',
  'Egg Rice': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop',
  'Samosa (2 pcs)': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop',
  'Vada Pav': 'https://images.unsplash.com/photo-1606491956689-2ea866880049?w=400&h=300&fit=crop',
  'Bread Omelette': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
  'Bread Pakoda': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
  'Maggi Noodles': 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=300&fit=crop',
  'Chai (Masala Tea)': 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=300&fit=crop',
  'Masala Chai': 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=300&fit=crop',
  'Cold Coffee': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop',
  'Fresh Lime Soda': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&h=300&fit=crop',
  'Lassi (Sweet)': 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=400&h=300&fit=crop',
  'Roti Sabzi (2 rotis)': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
  'Fried Rice': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop',
  "Chef's Special Thali": 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop',
  'Special Thali': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop',
  'Gulab Jamun (2 pcs)': 'https://images.unsplash.com/photo-1666190050267-bf4e5a872bdd?w=400&h=300&fit=crop',
};

async function updateImages() {
  console.log('\n🖼️  Updating menu item images...\n');

  const snapshot = await db.collection('menuItems').get();
  let updated = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const name = data.name;
    const newURL = imageMap[name];

    if (newURL) {
      await docSnap.ref.update({ imageURL: newURL });
      console.log(`  ✅ ${name} — image updated`);
      updated++;
    } else {
      console.log(`  ⏭️  ${name} — no matching image found, skipping`);
      skipped++;
    }
  }

  console.log(`\n🎉 Done! Updated: ${updated}, Skipped: ${skipped}\n`);
  process.exit(0);
}

updateImages().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
