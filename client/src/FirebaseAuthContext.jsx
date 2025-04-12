import { createContext, useContext, useEffect, useState } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import axios from "axios";

export const FirebaseAuthContext = createContext({});

export function FirebaseAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lắng nghe sự thay đổi trạng thái đăng nhập
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Người dùng đã đăng nhập, lấy token
        const token = await firebaseUser.getIdToken();
        
        // Lưu token vào localStorage
        localStorage.setItem('firebaseToken', token);
        
        // Đặt token vào header cho mọi request tới server
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        try {
          // Lấy thông tin chi tiết về người dùng từ server
          const { data } = await axios.get('/profile');
          setUser({
            ...data,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
          });
        } catch (error) {
          console.error("Lỗi khi lấy thông tin người dùng:", error);
        }
      } else {
        // Người dùng chưa đăng nhập
        setUser(null);
        localStorage.removeItem('firebaseToken');
        delete axios.defaults.headers.common['Authorization'];
      }
      
      setReady(true);
      setLoading(false);
    });
  
    return () => unsubscribe();
  }, []);

  // Hàm đăng ký người dùng mới bằng email/password
  const registerWithEmail = async (name, email, password) => {
    try {
      setLoading(true);
      // Tạo người dùng trong Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Cập nhật tên hiển thị
      await updateProfile(userCredential.user, { displayName: name });
      
      // Gửi thông tin người dùng lên server để lưu trong MongoDB
      await axios.post('/register-firebase-user', {
        uid: userCredential.user.uid,
        name,
        email,
        role: 'participant'
      });
      
      return userCredential.user;
    } catch (error) {
      console.error("Lỗi đăng ký:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Hàm đăng nhập bằng email/password
  const loginWithEmail = async (email, password) => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Lỗi đăng nhập email:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Hàm đăng nhập bằng Google
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      
      // Kiểm tra xem đã đăng ký chưa, nếu chưa thì đăng ký
      try {
        await axios.post('/register-firebase-user', {
          uid: result.user.uid,
          name: result.user.displayName || 'Người dùng Google',
          email: result.user.email,
          photoURL: result.user.photoURL,
          role: 'participant'
        });
      } catch (error) {
        // Nếu lỗi không phải do trùng lặp, ném lỗi
        if (!error.response || error.response.status !== 409) {
          throw error;
        }
        // Nếu lỗi do trùng lặp (409), nghĩa là người dùng đã tồn tại, bỏ qua
      }
      
      return result.user;
    } catch (error) {
      console.error("Lỗi đăng nhập Google:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Hàm đăng xuất
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
      throw error;
    }
  };

  // Giá trị context để cung cấp
  const contextValue = {
    user,
    ready,
    loading,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    logout
  };

  return (
    <FirebaseAuthContext.Provider value={contextValue}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

// Hook để dễ dàng sử dụng context
export function useFirebaseAuth() {
  return useContext(FirebaseAuthContext);
}