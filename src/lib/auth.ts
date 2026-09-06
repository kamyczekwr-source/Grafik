import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { app } from '../firebase';

export const auth = getAuth(app);

export function watchAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
