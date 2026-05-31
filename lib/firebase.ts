import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBgXgH9LSrtQWMl_g5uaU3fYEh2iL-vXsM",
  authDomain: "electropro-20854.firebaseapp.com",
  projectId: "electropro-20854",
  storageBucket: "electropro-20854.firebasestorage.app",
  messagingSenderId: "699946230667",
  appId: "1:699946230667:web:d2d6374e9d32f61b48058e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);