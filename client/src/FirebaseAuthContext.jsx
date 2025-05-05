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
    
    // Cấu hình lại provider Google để đảm bảo nhận được các quyền cần thiết
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    const result = await signInWithPopup(auth, googleProvider);
    
    // Lấy token ngay sau khi đăng nhập thành công
    const token = await result.user.getIdToken();
    localStorage.setItem('firebaseToken', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Đăng ký người dùng trong backend
    try {
      await axios.post('/register-firebase-user', {
        uid: result.user.uid,
        name: result.user.displayName || 'Người dùng Google',
        email: result.user.email,
        photoURL: result.user.photoURL,
        role: 'participant'
      });
      console.log("Đăng ký người dùng Firebase thành công");
    } catch (error) {
      // Bỏ qua lỗi nếu người dùng đã tồn tại (mã lỗi 409)
      if (!error.response || error.response.status !== 409) {
        console.error("Lỗi khi đăng ký người dùng Firebase:", error);
        // Không ném lỗi ở đây - vẫn cho phép đăng nhập ngay cả khi đăng ký backend thất bại
      }
    }
    
    return result.user;
  } catch (error) {
    console.error("Chi tiết lỗi đăng nhập Google:", error);
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

    // Thêm hàm này vào FirebaseAuthContext.jsx
  const refreshToken = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Force token refresh
        const newToken = await currentUser.getIdToken(true);
        localStorage.setItem('firebaseToken', newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        return newToken;
      }
      return null;
    } catch (error) {
      console.error("Lỗi khi làm mới token:", error);
      return null;
    }
  };
  
  // Thêm interceptor này bên trong FirebaseAuthProvider
  useEffect(() => {
    // Interceptor để tự động làm mới token khi hết hạn
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        
        if (error.response && 
            error.response.status === 401 && 
            !originalRequest._retry) {
          
          originalRequest._retry = true;
          
          // Thử làm mới token
          const newToken = await refreshToken();
          
          if (newToken) {
            // Cập nhật header và thử lại request
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return axios(originalRequest);
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    return () => axios.interceptors.response.eject(interceptor);
  }, []);
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
