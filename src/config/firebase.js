import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore"; // Đổi import ở đây

const firebaseConfig = {
  apiKey: "AIzaSyDLlp27xoMfYg8VdkwqqYRs8bHMcF_VA-U",
  authDomain: "polite-38fd5.firebaseapp.com",
  projectId: "polite-38fd5",
  storageBucket: "polite-38fd5.firebasestorage.app",
  messagingSenderId: "247789638291",
  appId: "1:247789638291:web:ebb36262f6696abcfe7366",
  measurementId: "G-7Z2N2XKMYG"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);

// FIX LỖI "OFFLINE" BẰNG CÁCH ÉP DÙNG LONG POLLING
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

export const googleProvider = new GoogleAuthProvider();