import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Wklej tu konfigurację ze swojego projektu Firebase (Project settings -> General -> Your apps).
const firebaseConfig = {
  apiKey: 'TWOJ_API_KEY',
  authDomain: 'TWOJ_PROJEKT.firebaseapp.com',
  projectId: 'TWOJ_PROJEKT',
  storageBucket: 'TWOJ_PROJEKT.appspot.com',
  messagingSenderId: 'TWOJ_SENDER_ID',
  appId: 'TWOJ_APP_ID',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
