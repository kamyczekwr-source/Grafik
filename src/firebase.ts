import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Wklej tu konfigurację ze swojego projektu Firebase (Project settings -> General -> Your apps).
const firebaseConfig = {
  apiKey: "AIzaSyCBsm7cq8Z9k0Av-uyMvz6cPwyHAX1-LF4",
  authDomain: "grafik-3c804.firebaseapp.com",
  projectId: "grafik-3c804",
  storageBucket: "grafik-3c804.firebasestorage.app",
  messagingSenderId: "518288369420",
  appId: "1:518288369420:web:039452a258802f26508b29"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
