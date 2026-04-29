/**
 * Create demo accounts for Admin and Staff
 * Run with: node create-demo-accounts.js
 *
 * Creates:
 * - admin@canteen.com / admin123 → canteen_admin
 * - staff@canteen.com / staff123 → canteen_staff
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const authAdmin = getAuth();
const db = getFirestore();

const demoAccounts = [
  {
    email: 'admin@canteen.com',
    password: 'admin123',
    displayName: 'Canteen Admin',
    role: 'canteen_admin',
  },
  {
    email: 'staff@canteen.com',
    password: 'staff123',
    displayName: 'Canteen Staff',
    role: 'canteen_staff',
  },
];

async function createAccounts() {
  console.log('\n👤 Creating demo accounts...\n');

  for (const account of demoAccounts) {
    try {
      // Try to get existing user first
      let user;
      try {
        user = await authAdmin.getUserByEmail(account.email);
        console.log(`  ⚠️  ${account.email} already exists (uid: ${user.uid})`);
      } catch {
        // User doesn't exist — create them
        user = await authAdmin.createUser({
          email: account.email,
          password: account.password,
          displayName: account.displayName,
          emailVerified: true,
        });
        console.log(`  ✅ Created: ${account.email} (uid: ${user.uid})`);
      }

      // Set role in Firestore (always update to ensure correct role)
      await db.collection('users').doc(user.uid).set(
        {
          uid: user.uid,
          email: account.email,
          displayName: account.displayName,
          role: account.role,
          createdAt: Timestamp.now(),
        },
        { merge: true }
      );
      console.log(`  ✅ Set role: ${account.role} for ${account.email}`);
    } catch (err) {
      console.error(`  ❌ Failed for ${account.email}:`, err.message);
    }
  }

  console.log('\n🎉 Done! You can now login with:');
  console.log('   Admin: admin@canteen.com / admin123');
  console.log('   Staff: staff@canteen.com / staff123\n');
  process.exit(0);
}

createAccounts().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
