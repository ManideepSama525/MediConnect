import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";  // 👈 add this

const firebaseConfig = {
  apiKey: "AIzaSyBWdcihLufWzLhohfq10BUG4ca_VO5vAiQ",
  authDomain: "mediconnect-17394.firebaseapp.com",
  projectId: "mediconnect-17394",
  storageBucket: "mediconnect-17394.firebasestorage.app",
  messagingSenderId: "943492859221",
  appId: "1:943492859221:web:aa09859c43f63e00b1dbdc"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app); // 👈 add this line
