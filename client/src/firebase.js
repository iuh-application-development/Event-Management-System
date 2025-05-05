import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

// Thông tin cấu hình từ Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyC6LlFGNEBctABqJL3kDgo_JGV0NMvhMrs",
    authDomain: "event-management-system-f6e0b.firebaseapp.com",
    projectId: "event-management-system-f6e0b",
    storageBucket: "event-management-system-f6e0b.firebasestorage.app",
    messagingSenderId: "65180226523",
    appId: "1:65180226523:web:bd10ca3f439e4e5a3d0dfe",
    measurementId: "G-FFS6EJJ63P"
  };;

  const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app);
  
  // Cấu hình Google Provider
  export const googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('profile');
  googleProvider.addScope('email');
  
  export default app;