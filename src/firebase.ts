import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBnbkjJqJzkEohK6LsfuuA9SvegI3rRZEg',
  authDomain: 'campus-canteen-ordering-21c7a.firebaseapp.com',
  projectId: 'campus-canteen-ordering-21c7a',
  storageBucket: 'campus-canteen-ordering-21c7a.firebasestorage.app',
  messagingSenderId: '313839024755',
  appId: '1:313839024755:web:c024860121d4faa7f64806',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;

