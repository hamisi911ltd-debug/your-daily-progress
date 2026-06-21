import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCTZjGb-WSk5-z4w4GakZ64VRl7cx_QD9c",
  authDomain: "daily-progress-ad412.firebaseapp.com",
  projectId: "daily-progress-ad412",
  storageBucket: "daily-progress-ad412.firebasestorage.app",
  messagingSenderId: "487660252596",
  appId: "1:487660252596:web:9487e7db79b07388ecd6e1",
};

// Avoid re-initialising on hot reloads
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
