// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDJbyL7_gN26gqP_w1N2cAm-2rz_ByHorc",
  authDomain: "todo-firebase-458a5.firebaseapp.com",
  projectId: "todo-firebase-458a5",
  storageBucket: "todo-firebase-458a5.firebasestorage.app",
  messagingSenderId: "237126230905",
  appId: "1:237126230905:web:2b1c6e995ae530150805a8",
  measurementId: "G-0KNF1TF9YG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;