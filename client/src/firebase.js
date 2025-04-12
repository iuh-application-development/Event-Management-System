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

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Khởi tạo Firebase Authentication
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Cấu hình provider Google
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { auth, googleProvider };
