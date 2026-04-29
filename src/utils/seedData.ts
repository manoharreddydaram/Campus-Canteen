/**
 * Run this once to seed initial menu items and demo user roles.
 * Call seedMenuItems() from browser console or admin page.
 */
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const seedMenuItems = async () => {
  const items = [
    {
      name: 'Masala Dosa',
      description: 'Crispy rice crepe stuffed with spiced potato filling, served with coconut chutney and sambar',
      price: 35,
      category: 'breakfast',
      imageURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Masala_dosa.jpg/320px-Masala_dosa.jpg',
      available: true,
      preparationTime: 8,
      tags: ['veg', 'popular', 'south-indian'],
    },
    {
      name: 'Idli Sambar',
      description: 'Soft steamed rice cakes with lentil soup and chutneys. Light and healthy breakfast',
      price: 25,
      category: 'breakfast',
      imageURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Idli_Sambar.jpg/320px-Idli_Sambar.jpg',
      available: true,
      preparationTime: 5,
      tags: ['veg', 'healthy', 'south-indian'],
    },
    {
      name: 'Veg Biryani',
      description: 'Fragrant basmati rice cooked with fresh vegetables and aromatic spices. Served with raita',
      price: 70,
      category: 'lunch',
      imageURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Hyderabadi-Veg-Biryani.jpg/320px-Hyderabadi-Veg-Biryani.jpg',
      available: true,
      preparationTime: 15,
      tags: ['veg', 'popular', 'rice'],
    },
    {
      name: 'Chicken Biryani',
      description: 'Tender chicken pieces layered with basmati rice and saffron. A house special',
      price: 100,
      category: 'lunch',
      imageURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Chicken_biryani_in_hyderabadi_style.jpg/320px-Chicken_biryani_in_hyderabadi_style.jpg',
      available: true,
      preparationTime: 20,
      tags: ['non-veg', 'popular', 'special'],
    },
    {
      name: 'Dal Rice',
      description: 'Comforting yellow lentil curry with steamed white rice. A wholesome meal',
      price: 50,
      category: 'lunch',
      imageURL: '',
      available: true,
      preparationTime: 10,
      tags: ['veg', 'healthy'],
    },
    {
      name: 'Samosa (2 pcs)',
      description: 'Crispy fried pastry filled with spiced potatoes and peas. Served with mint chutney',
      price: 20,
      category: 'snacks',
      imageURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Samosachutney.jpg/320px-Samosachutney.jpg',
      available: true,
      preparationTime: 3,
      tags: ['veg', 'popular', 'fried'],
    },
    {
      name: 'Bread Pakoda',
      description: 'Bread slices stuffed with potato, dipped in spiced chickpea batter and fried',
      price: 20,
      category: 'snacks',
      imageURL: '',
      available: true,
      preparationTime: 5,
      tags: ['veg', 'snack'],
    },
    {
      name: 'Vada Pav',
      description: 'Mumbai street food — spiced potato patty in a soft bun with chutneys',
      price: 25,
      category: 'snacks',
      imageURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Vada_pav_in_mumbai.jpg/320px-Vada_pav_in_mumbai.jpg',
      available: true,
      preparationTime: 5,
      tags: ['veg', 'street-food', 'popular'],
    },
    {
      name: 'Masala Chai',
      description: 'Hot spiced Indian tea with ginger, cardamom, and fresh milk',
      price: 15,
      category: 'beverages',
      imageURL: '',
      available: true,
      preparationTime: 3,
      tags: ['hot', 'popular'],
    },
    {
      name: 'Cold Coffee',
      description: 'Chilled coffee blended with milk and sugar. Refreshing campus favourite',
      price: 40,
      category: 'beverages',
      imageURL: '',
      available: true,
      preparationTime: 5,
      tags: ['cold', 'coffee'],
    },
    {
      name: 'Paneer Butter Masala + Roti',
      description: 'Rich tomato-based paneer curry with 2 butter rotis. A filling dinner option',
      price: 80,
      category: 'dinner',
      imageURL: '',
      available: true,
      preparationTime: 15,
      tags: ['veg', 'popular', 'rich'],
    },
    {
      name: 'Special Thali',
      description: 'Complete meal: rice, 2 curries, dal, roti, papad, pickle and dessert',
      price: 90,
      category: 'specials',
      imageURL: '',
      available: true,
      preparationTime: 10,
      tags: ['veg', 'value', 'complete-meal'],
    },
  ];

  console.log('Seeding menu items...');
  for (const item of items) {
    await addDoc(collection(db, 'menuItems'), {
      ...item,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`Added: ${item.name}`);
  }
  console.log('✅ Menu seeded successfully!');
};

export const setUserRole = async (uid: string, role: 'student' | 'canteen_staff' | 'canteen_admin') => {
  await setDoc(doc(db, 'users', uid), { role }, { merge: true });
  console.log(`✅ Set ${uid} to role: ${role}`);
};
