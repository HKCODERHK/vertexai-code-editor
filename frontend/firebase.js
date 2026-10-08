import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "vertex-ai-e6bcf.firebaseapp.com",
  projectId: "vertex-ai-e6bcf",
  storageBucket: "vertex-ai-e6bcf.firebasestorage.app",
  messagingSenderId: "352467354478",
  appId: "1:352467354478:web:7a368b23df2b8e2693777f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth=getAuth(app)
export const googleProvider=new GoogleAuthProvider()