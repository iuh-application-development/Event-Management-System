import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useFirebaseAuth } from "../FirebaseAuthContext";
import { FcGoogle } from "react-icons/fc"; // Cài đặt react-icons nếu chưa có

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [redirect, setRedirect] = useState(false);
  const [error, setError] = useState(null);
  
  const { loginWithEmail, loginWithGoogle, loading } = useFirebaseAuth();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError("Vui lòng điền đầy đủ email và mật khẩu");
      return;
    }
    
    try {
      await loginWithEmail(email, password);
      setRedirect(true);
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      if (error.code === 'auth/user-not-found') {
        setError("Không tìm thấy tài khoản với email này");
      } else if (error.code === 'auth/wrong-password') {
        setError("Mật khẩu không đúng");
      } else if (error.code === 'auth/invalid-email') {
        setError("Email không hợp lệ");
      } else {
        setError("Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập");
      }
    }
  };
  
  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await loginWithGoogle();
      setRedirect(true);
    } catch (error) {
      console.error("Lỗi đăng nhập Google:", error);
      setError("Đăng nhập với Google thất bại. Vui lòng thử lại");
    }
  };

  if (redirect) {
    return <Navigate to={"/"} />;
  }

  return (
    <div className="mt-4 grow flex items-center justify-around">
      <div className="mb-64">
        <h1 className="text-4xl text-center mb-4">Đăng nhập</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form className="max-w-md mx-auto" onSubmit={handleLoginSubmit}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            disabled={loading}
            className="w-full border my-1 py-2 px-3 rounded-2xl"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            disabled={loading}
            className="w-full border my-1 py-2 px-3 rounded-2xl"
          />
          
          <button 
            type="submit"
            disabled={loading}
            className="bg-primary w-full p-2 text-white rounded-2xl">
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <p className="text-gray-500 mb-4">Hoặc đăng nhập với</p>
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center bg-white border border-gray-300 rounded-2xl py-2 px-4 w-full max-w-md mx-auto hover:bg-gray-50">
            <FcGoogle className="text-2xl mr-2" />
            <span>Đăng nhập với Google</span>
          </button>
        </div>
        
        <div className="text-center py-2 text-gray-500">
          Chưa có tài khoản? {" "}
          <Link className="underline text-black" to={"/register"}>
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}